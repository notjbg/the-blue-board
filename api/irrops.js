// Server-side IRROPS aggregation — fetches schedule data for all UA hubs
// via the internal /api/schedule endpoint (which benefits from cron cache warming),
// computes disruption metrics, caches for 15 minutes.

import { createRateLimiter } from './_rate-limit.js';

const isRateLimited = createRateLimiter('irrops', 60);

const HUBS = ['ORD', 'DEN', 'IAH', 'EWR', 'SFO', 'IAD', 'LAX', 'NRT', 'GUM'];
const HUB_TZ = {ORD:'America/Chicago',DEN:'America/Denver',IAH:'America/Chicago',EWR:'America/New_York',SFO:'America/Los_Angeles',IAD:'America/New_York',LAX:'America/Los_Angeles',NRT:'Asia/Tokyo',GUM:'Pacific/Guam'};
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes — hub health doesn't need real-time
let cached = null;
let cacheExpires = 0;
let fetching = null;
// Persistent per-hub cache — survives full refresh failures
let hubCache = {};

const BASE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://theblueboard.co';

async function fetchHubFromScheduleAPI(hub, timestamp) {
  const url = `${BASE_URL}/api/schedule?hub=${hub}&dir=departures&timestamp=${timestamp}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'BlueBoard-IRROPS/1.0' }
    });
    clearTimeout(timeout);
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.flights || [];
  } catch (e) {
    clearTimeout(timeout);
    console.error(`IRROPS: Failed to fetch schedule for ${hub}:`, e.message);
    return [];
  }
}

export function computeMetrics(flightsByHub) {
  let allFlights = [];
  const hubMetrics = {};

  for (const [hub, flights] of Object.entries(flightsByHub)) {
    allFlights = allFlights.concat(flights);
    hubMetrics[hub] = { total: flights.length, cancellations: 0, delayed30: 0, delayed60: 0, diversions: 0, operated: 0, onTime: 0 };

    for (const fl of flights) {
      const status = fl.status?.generic?.status?.text?.toLowerCase() || '';
      if (status === 'canceled' || status === 'cancelled') { hubMetrics[hub].cancellations++; continue; }
      if (status === 'diverted') hubMetrics[hub].diversions++;

      const hasOperated = status === 'departed' || status === 'en-route' || status === 'landed' || status === 'diverted';
      const realDep = fl.time?.real?.departure;
      const estDep = fl.time?.estimated?.departure;
      if (!hasOperated && !realDep) continue;

      const actDep = realDep || (hasOperated ? estDep : null);
      if (!actDep) continue;

      hubMetrics[hub].operated++;
      const schedT = fl.time?.scheduled?.departure || 0;
      if (schedT && actDep > schedT) {
        const delayMin = Math.round((actDep - schedT) / 60);
        if (delayMin > 30) hubMetrics[hub].delayed30++;
        if (delayMin > 60) hubMetrics[hub].delayed60++;
        if (delayMin <= 30) hubMetrics[hub].onTime++;
      } else {
        hubMetrics[hub].onTime++;
      }
    }
  }

  let cancellations = 0, delayed30 = 0, delayed60 = 0, diversions = 0;
  const worstDelays = [];

  for (const fl of allFlights) {
    const status = fl.status?.generic?.status?.text?.toLowerCase() || '';
    if (status === 'canceled' || status === 'cancelled') cancellations++;
    if (status === 'diverted') diversions++;

    const schedT = fl.time?.scheduled?.departure || 0;
    const actT = fl.time?.real?.departure || fl.time?.estimated?.departure || 0;
    if (schedT && actT && actT > schedT) {
      const delayMin = Math.round((actT - schedT) / 60);
      if (delayMin > 30) delayed30++;
      if (delayMin > 60) delayed60++;
      if (delayMin > 15) {
        const ident = fl.identification?.number?.default || '?';
        const orig = fl.airport?.origin?.code?.iata || '?';
        const dest = fl.airport?.destination?.code?.iata || '?';
        worstDelays.push({ ident, route: `${orig}→${dest}`, delay: delayMin });
      }
    }
  }

  worstDelays.sort((a, b) => b.delay - a.delay);

  const totalFlights = allFlights.length;
  const score = totalFlights > 0
    ? ((cancellations * 3 + delayed60 * 2 + delayed30 + diversions * 2) / totalFlights * 100)
    : 0;

  return {
    score: parseFloat(score.toFixed(1)),
    totalFlights,
    cancellations,
    delayed30,
    delayed60,
    diversions,
    worstDelays: worstDelays.slice(0, 8),
    hubMetrics,
    hubFlights: flightsByHub,
    generatedAt: new Date().toISOString()
  };
}

export function getStartOfDayForHub(hub) {
  const tz = HUB_TZ[hub] || 'America/New_York';
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(now);
  const get = (type) => parseInt(parts.find(p => p.type === type)?.value || '0');
  const hour = get('hour'), minute = get('minute'), second = get('second');
  const secondsSinceMidnight = hour * 3600 + minute * 60 + second;
  const startOfToday = Math.floor((now.getTime() / 1000) - secondsSinceMidnight);
  // Before 6 AM local: no flights have departed yet, show yesterday's data
  if (hour < 6) return startOfToday - 86400;
  return startOfToday;
}

async function buildIrropsData() {
  const flightsByHub = {};

  // Fetch all hubs in parallel via the internal schedule API (cached by cron)
  const results = await Promise.allSettled(
    HUBS.map(async (hub) => {
      const flights = await fetchHubFromScheduleAPI(hub, getStartOfDayForHub(hub));
      return { hub, flights };
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { hub, flights } = result.value;
      if (flights && flights.length > 0) {
        flightsByHub[hub] = flights;
        hubCache[hub] = { flights, fetchedAt: Date.now() };
      } else if (hubCache[hub] && (Date.now() - hubCache[hub].fetchedAt) < 60 * 60 * 1000) {
        console.log(`IRROPS: Using cached data for ${hub} (age: ${Math.round((Date.now() - hubCache[hub].fetchedAt) / 60000)}m)`);
        flightsByHub[hub] = hubCache[hub].flights;
      } else {
        flightsByHub[hub] = [];
      }
    } else {
      const hub = HUBS[results.indexOf(result)];
      console.error(`IRROPS: Error fetching ${hub}:`, result.reason?.message);
      if (hubCache[hub] && (Date.now() - hubCache[hub].fetchedAt) < 60 * 60 * 1000) {
        flightsByHub[hub] = hubCache[hub].flights;
      } else {
        flightsByHub[hub] = [];
      }
    }
  }

  return computeMetrics(flightsByHub);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const origin = req.headers?.origin || '';
  if (origin && origin !== 'https://theblueboard.co' && !/^http:\/\/localhost(:\d+)?$/.test(origin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (isRateLimited(req)) {
    return res.status(429).json({ error: 'Rate limited — try again shortly' });
  }

  try {
    const now = Date.now();

    if (cached && now < cacheExpires) {
      res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=300');
      return res.status(200).json({ ...cached, cached: true });
    }

    if (fetching) {
      const result = await fetching;
      res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=300');
      return res.status(200).json({ ...result, cached: true });
    }

    try {
      fetching = buildIrropsData();
      const result = await fetching;
      cached = result;
      cacheExpires = now + CACHE_TTL;
      res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=300');
      return res.status(200).json({ ...result, cached: false });
    } catch (e) {
      console.error('IRROPS API error:', e);
      // Return stale cache if available
      if (cached) {
        res.setHeader('Cache-Control', 's-maxage=60');
        return res.status(200).json({ ...cached, cached: true, stale: true });
      }
      return res.status(502).json({ error: 'Failed to compute IRROPS data' });
    } finally {
      fetching = null;
    }
  } catch (e) {
    console.error('IRROPS API error:', e);
    return res.status(502).json({ error: 'Failed to compute IRROPS data' });
  }
}

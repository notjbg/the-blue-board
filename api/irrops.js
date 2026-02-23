// Server-side IRROPS aggregation — fetches schedule data for all UA hubs,
// computes disruption metrics, caches for 15 minutes.
// Fetches hubs sequentially with delays to avoid FR24 rate limiting.

import { createRateLimiter } from './_rate-limit.js';

const isRateLimited = createRateLimiter('irrops', 60);

const HUBS = ['ORD', 'DEN', 'IAH', 'EWR', 'SFO', 'IAD', 'LAX', 'NRT', 'GUM'];
const HUB_TZ = {ORD:'America/Chicago',DEN:'America/Denver',IAH:'America/Chicago',EWR:'America/New_York',SFO:'America/Los_Angeles',IAD:'America/New_York',LAX:'America/Los_Angeles',NRT:'Asia/Tokyo',GUM:'Pacific/Guam'};
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes — hub health doesn't need real-time
const INTER_HUB_DELAY = 1500; // ms between hub fetches to avoid rate limiting
const INTER_PAGE_DELAY = 800; // ms between pages within a hub
let cached = null;
let cacheExpires = 0;
let fetching = null;
// Persistent per-hub cache — survives full refresh failures
let hubCache = {};

async function rateLimitedFetch(url, retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const resp = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.flightradar24.com/',
          'Origin': 'https://www.flightradar24.com'
        }
      });
      clearTimeout(timeout);
      if (resp.status === 429 || resp.status === 403) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
        return null;
      }
      if (!resp.ok) return null;
      return resp;
    } catch (e) {
      clearTimeout(timeout);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      return null;
    }
  }
  return null;
}

async function fetchHubSchedule(hub, timestamp) {
  const dir = 'departures';
  const dayEnd = timestamp + 86400;
  const allFlights = [];
  let page = 1;
  let totalPages = 1;
  const MAX_PAGES = 5; // fewer pages = faster; 500 flights is plenty for OTP

  while (page <= totalPages && page <= MAX_PAGES) {
    const url = `https://api.flightradar24.com/common/v1/airport.json?code=${encodeURIComponent(hub)}&plugin[]=schedule&plugin-setting[schedule][mode]=${dir}&plugin-setting[schedule][timestamp]=${timestamp}&page=${page}&limit=100`;
    try {
      const resp = await rateLimitedFetch(url);
      if (!resp) break;
      const data = await resp.json();
      const sched = data?.result?.response?.airport?.pluginData?.schedule?.[dir];
      if (!sched || !sched.data || sched.data.length === 0) break;
      totalPages = sched.page?.total || 1;

      let pastDay = false;
      for (const entry of sched.data) {
        const fl = entry.flight;
        if (!fl) continue;
        if (fl.airline?.code?.iata !== 'UA') continue;
        const schedDep = fl.time?.scheduled?.departure;
        if (schedDep && schedDep >= dayEnd) { pastDay = true; break; }
        allFlights.push(fl);
      }
      if (pastDay) break;
      page++;
    } catch (e) {
      console.error(`IRROPS: Failed to fetch ${hub} page ${page}:`, e.message);
      break;
    }
    if (page <= totalPages && page <= MAX_PAGES) {
      await new Promise(r => setTimeout(r, INTER_PAGE_DELAY));
    }
  }
  return allFlights;
}

function computeMetrics(flightsByHub) {
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

function getStartOfDayForHub(hub) {
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

  // Fetch hubs SEQUENTIALLY with delays to avoid FR24 rate limiting
  for (let i = 0; i < HUBS.length; i++) {
    const hub = HUBS[i];
    try {
      const flights = await fetchHubSchedule(hub, getStartOfDayForHub(hub));
      if (flights && flights.length > 0) {
        flightsByHub[hub] = flights;
        // Update persistent per-hub cache
        hubCache[hub] = { flights, fetchedAt: Date.now() };
      } else if (hubCache[hub] && (Date.now() - hubCache[hub].fetchedAt) < 60 * 60 * 1000) {
        // FR24 returned nothing — use cached data up to 1 hour old
        console.log(`IRROPS: Using cached data for ${hub} (age: ${Math.round((Date.now() - hubCache[hub].fetchedAt) / 60000)}m)`);
        flightsByHub[hub] = hubCache[hub].flights;
      } else {
        flightsByHub[hub] = [];
      }
    } catch (e) {
      console.error(`IRROPS: Error fetching ${hub}:`, e.message);
      // Fall back to hub cache
      if (hubCache[hub] && (Date.now() - hubCache[hub].fetchedAt) < 60 * 60 * 1000) {
        flightsByHub[hub] = hubCache[hub].flights;
      } else {
        flightsByHub[hub] = [];
      }
    }
    // Delay between hubs (skip after last)
    if (i < HUBS.length - 1) {
      await new Promise(r => setTimeout(r, INTER_HUB_DELAY));
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

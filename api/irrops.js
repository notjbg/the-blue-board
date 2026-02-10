// Server-side IRROPS aggregation — fetches schedule data for all UA hubs,
// computes disruption metrics, caches for 5 minutes.

const HUBS = ['ORD', 'DEN', 'IAH', 'EWR', 'SFO', 'IAD', 'LAX'];
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://theblueboard.co';

let cached = null;
let cacheExpires = 0;
let fetching = null; // dedup concurrent requests

async function rateLimitedFetch(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'TheBlueBoardDashboard/1.0 (https://theblueboard.co)',
        'Accept': 'application/json'
      }
    });
    clearTimeout(timeout);
    return resp;
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

async function fetchHubSchedule(hub, timestamp) {
  // Fetch aggregated UA flights via the same FR24 approach as schedule.js
  const dir = 'departures';
  const dayEnd = timestamp + 86400;
  const allFlights = [];
  let page = 1;
  let totalPages = 1;
  const MAX_PAGES = 10; // fewer pages since we just need metrics

  while (page <= totalPages && page <= MAX_PAGES) {
    const url = `https://api.flightradar24.com/common/v1/airport.json?code=${encodeURIComponent(hub)}&plugin[]=schedule&plugin-setting[schedule][mode]=${dir}&plugin-setting[schedule][timestamp]=${timestamp}&page=${page}&limit=100`;
    try {
      const resp = await rateLimitedFetch(url);
      if (!resp.ok) break;
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
    // Small delay between pages to avoid rate limiting
    await new Promise(r => setTimeout(r, 1500));
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

      // Count flights that have actually operated (departed, en-route, landed)
      const hasOperated = status === 'departed' || status === 'en-route' || status === 'landed' || status === 'diverted';
      const realDep = fl.time?.real?.departure;
      const estDep = fl.time?.estimated?.departure;
      if (!hasOperated && !realDep) continue; // skip future/scheduled flights

      // Use real departure time; only fall back to estimated for operated flights
      const actDep = realDep || (hasOperated ? estDep : null);
      if (!actDep) continue; // no usable departure time

      hubMetrics[hub].operated++;
      const schedT = fl.time?.scheduled?.departure || 0;
      if (schedT && actDep > schedT) {
        const delayMin = Math.round((actDep - schedT) / 60);
        if (delayMin > 30) hubMetrics[hub].delayed30++;
        if (delayMin > 60) hubMetrics[hub].delayed60++;
        if (delayMin <= 30) hubMetrics[hub].onTime++; // 30-min threshold for on-time
      } else {
        hubMetrics[hub].onTime++; // on time or early
      }
    }
  }

  // Totals
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
    generatedAt: new Date().toISOString()
  };
}

async function buildIrropsData() {
  const now = new Date();
  // Use start of today in US Eastern time (most UA operations are eastern-biased)
  // This ensures we capture the full ops day even after midnight UTC
  const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const startOfDay = Math.floor(new Date(etNow.getFullYear(), etNow.getMonth(), etNow.getDate()).getTime() / 1000);

  const flightsByHub = {};

  // Fetch hubs in parallel batches of 2 to avoid rate limits
  for (let i = 0; i < HUBS.length; i += 2) {
    const batch = HUBS.slice(i, i + 2);
    const results = await Promise.allSettled(
      batch.map(hub => fetchHubSchedule(hub, startOfDay))
    );
    for (let j = 0; j < batch.length; j++) {
      flightsByHub[batch[j]] = results[j].status === 'fulfilled' ? results[j].value : [];
    }
  }

  return computeMetrics(flightsByHub);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const origin = req.headers?.origin || '';
  if (origin && origin !== 'https://theblueboard.co' && !origin.includes('localhost')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const now = Date.now();

    // Return cached if fresh
    if (cached && now < cacheExpires) {
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=120');
      return res.status(200).json({ ...cached, cached: true });
    }

    // Dedup: if already fetching, wait for that
    if (fetching) {
      const result = await fetching;
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=120');
      return res.status(200).json({ ...result, cached: true });
    }

    // Build fresh
    try {
      fetching = buildIrropsData();
      const result = await fetching;
      cached = result;
      cacheExpires = now + CACHE_TTL;
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=120');
      return res.status(200).json({ ...result, cached: false });
    } catch (e) {
      console.error('IRROPS API error:', e);
      return res.status(502).json({ error: 'Failed to compute IRROPS data' });
    } finally {
      fetching = null;
    }
  } catch (e) {
    console.error('IRROPS API error:', e);
    return res.status(502).json({ error: 'Failed to compute IRROPS data' });
  }
}

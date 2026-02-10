// In-memory LRU cache for FR24 schedule data
const cache = new Map();
const MAX_CACHE_SIZE = 200;
let lastFR24Request = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between FR24 requests

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://theblueboard.co';

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry;
}

function cacheSet(key, data, ttlMs) {
  if (cache.size >= MAX_CACHE_SIZE) {
    // Evict oldest
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, { data, expires: Date.now() + ttlMs, time: Date.now() });
}

async function rateLimitedFetch(url) {
  const now = Date.now();
  const wait = Math.max(0, MIN_REQUEST_INTERVAL - (now - lastFR24Request));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastFR24Request = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
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

async function fetchOnePage(hub, dir, timestamp, page) {
  const url = `https://api.flightradar24.com/common/v1/airport.json?code=${encodeURIComponent(hub)}&plugin[]=schedule&plugin-setting[schedule][mode]=${encodeURIComponent(dir)}&plugin-setting[schedule][timestamp]=${timestamp}&page=${page}&limit=100`;
  const resp = await rateLimitedFetch(url);
  if (!resp.ok) throw new Error(`FR24 returned ${resp.status}`);
  const data = await resp.json();
  const sched = data?.result?.response?.airport?.pluginData?.schedule?.[dir];
  if (!sched) throw new Error('No schedule data in response');
  return sched;
}

const pendingAggs = new Map();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const origin = req.headers?.origin || '';
  if (origin && origin !== 'https://theblueboard.co' && !origin.includes('localhost')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { hub, dir = 'departures', timestamp, page } = req.query;
    if (!hub || !timestamp) {
      return res.status(400).json({ error: 'Missing required params: hub, timestamp' });
    }
    if (!['departures', 'arrivals'].includes(dir)) {
      return res.status(400).json({ error: 'dir must be departures or arrivals' });
    }
    // Validate hub: 3-4 letter IATA/ICAO code
    if (!/^[A-Z]{3,4}$/i.test(hub)) {
      return res.status(400).json({ error: 'Invalid hub code' });
    }

    const ts = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    // Validate timestamp: must be a number, within reasonable range
    if (isNaN(ts) || ts < now - 86400 * 7 || ts > now + 86400 * 7) {
      return res.status(400).json({ error: 'Invalid timestamp' });
    }
    // If timestamp is >24h old, use longer cache
    const isOld = (now - ts) > 86400;
    const ttl = isOld ? 600000 : 300000; // 10 min (old) or 5 min (live) in-memory
    const cdnMaxAge = isOld ? 3600 : 900; // 1hr (old) or 15min (live) at CDN edge
    const swr = 300; // stale-while-revalidate: serve stale for 5min while refreshing

    // If single page requested, serve just that page (backward compat)
    if (page !== undefined) {
      const pageNum = parseInt(page, 10) || 1;
      if (pageNum < 1 || pageNum > 100) {
        return res.status(400).json({ error: 'Invalid page number' });
      }
      const cacheKey = `sched:${hub}:${dir}:${ts}:${pageNum}`;
      const cached = cacheGet(cacheKey);
      if (cached) {
        res.setHeader('Cache-Control', `s-maxage=${cdnMaxAge}, stale-while-revalidate=${swr}`);
        return res.status(200).json({ ...cached.data, cached: true });
      }
      const sched = await fetchOnePage(hub, dir, ts, pageNum);
      cacheSet(cacheKey, sched, ttl);
      res.setHeader('Cache-Control', `s-maxage=${cdnMaxAge}, stale-while-revalidate=${swr}`);
      return res.status(200).json({ ...sched, cached: false });
    }

    // Aggregation mode: fetch all pages, filter UA, return combined
    const aggKey = `agg:${hub}:${dir}:${ts}`;
    const cached = cacheGet(aggKey);
    if (cached) {
      res.setHeader('Cache-Control', `s-maxage=${cdnMaxAge}, stale-while-revalidate=${swr}`);
      return res.status(200).json({ ...cached.data, cached: true });
    }

    // Dedup concurrent aggregation requests for same key
    if (pendingAggs.has(aggKey)) {
      const result = await pendingAggs.get(aggKey);
      res.setHeader('Cache-Control', `s-maxage=${cdnMaxAge}, stale-while-revalidate=${swr}`);
      return res.status(200).json({ ...result, cached: true });
    }

    const aggPromise = (async () => {
    const dayEnd = ts + 86400;
    const allUAFlights = [];
    let pageNum = 1;
    let totalPages = 1;
    const MAX_PAGES = 20;
    let totalFetched = 0;

    while (pageNum <= totalPages && pageNum <= MAX_PAGES) {
      const sched = await fetchOnePage(hub, dir, ts, pageNum);
      totalPages = sched.page?.total || 1;
      if (!sched.data || sched.data.length === 0) break;

      let pastDay = false;
      for (const entry of sched.data) {
        const fl = entry.flight;
        if (!fl) continue;
        if (fl.airline?.code?.iata !== 'UA') continue;
        const schedDep = fl.time?.scheduled?.departure;
        const schedArr = fl.time?.scheduled?.arrival;
        const flightTime = dir === 'departures' ? schedDep : schedArr;
        if (flightTime && flightTime >= dayEnd) { pastDay = true; break; }
        allUAFlights.push(fl);
      }
      totalFetched += sched.data.length;
      if (pastDay) break;
      pageNum++;
    }

    const result = {
      flights: allUAFlights,
      total: allUAFlights.length,
      totalFetched,
      pagesScanned: Math.min(pageNum, totalPages, MAX_PAGES),
      totalPages,
      cached: false,
      hub,
      dir
    };

    cacheSet(aggKey, result, ttl);
    return result;
    })();

    pendingAggs.set(aggKey, aggPromise);
    try {
      const result = await aggPromise;
      res.setHeader('Cache-Control', `s-maxage=${cdnMaxAge}, stale-while-revalidate=${swr}`);
      return res.status(200).json(result);
    } finally {
      pendingAggs.delete(aggKey);
    }
  } catch (e) {
    console.error('Schedule API error:', e);
    if (e.name === 'AbortError') return res.status(504).json({ error: 'Upstream timeout' });
    return res.status(502).json({ error: 'Upstream service unavailable' });
  }
}

import { createRateLimiter } from './_rate-limit.js';

const isRateLimited = createRateLimiter('schedule', 30);

// In-memory LRU cache for FR24 schedule data
const cache = new Map();
const MAX_CACHE_SIZE = 200;
const BATCH_DELAY = 500; // 500ms pause between parallel batches (polite to FR24)

// Global concurrency limiter for FR24 outbound requests
// Prevents bursting FR24 when multiple hubs aggregate simultaneously
const MAX_CONCURRENT_FR24 = 4;
let activeFR24 = 0;
const fr24Queue = [];

function acquireFR24Slot() {
  if (activeFR24 < MAX_CONCURRENT_FR24) {
    activeFR24++;
    return Promise.resolve();
  }
  return new Promise(resolve => fr24Queue.push(resolve));
}

function releaseFR24Slot() {
  activeFR24--;
  if (fr24Queue.length > 0) {
    activeFR24++;
    fr24Queue.shift()();
  }
}

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

async function fetchWithTimeout(url, deadlineMs) {
  const remaining = deadlineMs ? Math.max(500, deadlineMs - Date.now()) : 45000;
  const fetchTimeout = Math.min(remaining, 45000);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), fetchTimeout);
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

async function fetchOnePage(hub, dir, timestamp, page, deadlineMs) {
  const url = `https://api.flightradar24.com/common/v1/airport.json?code=${encodeURIComponent(hub)}&plugin[]=schedule&plugin-setting[schedule][mode]=${encodeURIComponent(dir)}&plugin-setting[schedule][timestamp]=${timestamp}&page=${page}&limit=100`;
  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (deadlineMs && Date.now() > deadlineMs - 500) throw new Error('Deadline exceeded');
    await acquireFR24Slot();
    let shouldRetry = false;
    try {
      const resp = await fetchWithTimeout(url, deadlineMs);
      if (resp.ok) {
        const data = await resp.json();
        const sched = data?.result?.response?.airport?.pluginData?.schedule?.[dir];
        if (!sched) throw new Error('No schedule data in response');
        return sched;
      }
      // Retry on transient FR24 errors
      if ([429, 502, 503].includes(resp.status) && attempt < MAX_RETRIES) {
        shouldRetry = true;
      } else {
        throw new Error(`FR24 returned ${resp.status}`);
      }
    } catch (e) {
      if (attempt < MAX_RETRIES && e.name !== 'AbortError' && !e.message.includes('Deadline')) {
        shouldRetry = true;
      } else {
        throw e;
      }
    } finally {
      releaseFR24Slot();
    }
    if (shouldRetry) {
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

const pendingAggs = new Map();

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

    const HANDLER_TIMEOUT = 45000; // 45s — leaves 15s buffer within maxDuration: 60
    const BATCH_SIZE = 4; // Fetch 4 pages in parallel per batch
    const MAX_PAGES = 50; // ORD can have 30+ pages; 50 is safe with timeout as real limit
    const aggPromise = (async () => {
    const deadline = Date.now() + HANDLER_TIMEOUT;
    const dayEnd = ts + 86400;
    const allUAFlights = [];
    let totalPages = 1;
    let totalFetched = 0;
    let partial = false;
    let pagesScanned = 0;

    // Helper: extract UA flights from a page, returns true if past day boundary
    function processPage(sched) {
      if (!sched.data || sched.data.length === 0) return false;
      totalFetched += sched.data.length;
      for (const entry of sched.data) {
        const fl = entry.flight;
        if (!fl) continue;
        if (fl.airline?.code?.iata !== 'UA') continue;
        const schedDep = fl.time?.scheduled?.departure;
        const schedArr = fl.time?.scheduled?.arrival;
        const flightTime = dir === 'departures' ? schedDep : schedArr;
        if (flightTime && flightTime >= dayEnd) return true;
        allUAFlights.push(fl);
      }
      return false;
    }

    // Fetch page 1 to discover totalPages
    try {
      var firstPage = await fetchOnePage(hub, dir, ts, 1, deadline);
    } catch (e) {
      if (e.name === 'AbortError') return { flights: [], total: 0, totalFetched: 0, pagesScanned: 0, totalPages: 1, cached: false, partial: true, hub, dir };
      throw e;
    }
    totalPages = firstPage.page?.total || 1;
    pagesScanned = 1;
    const pastDay = processPage(firstPage);

    if (!pastDay && totalPages > 1) {
      const pagesToFetch = Math.min(totalPages, MAX_PAGES);
      let pageNum = 2;

      while (pageNum <= pagesToFetch) {
        if (Date.now() > deadline - 2000) { partial = true; break; }

        // Build a batch of page numbers
        const batchEnd = Math.min(pageNum + BATCH_SIZE - 1, pagesToFetch);
        const batchPages = [];
        for (let p = pageNum; p <= batchEnd; p++) batchPages.push(p);

        // Fetch batch in parallel
        const batchResults = await Promise.allSettled(
          batchPages.map(p => fetchOnePage(hub, dir, ts, p, deadline))
        );

        // Process results in order
        let batchDone = false;
        for (const result of batchResults) {
          pagesScanned++;
          if (result.status === 'rejected') {
            if (allUAFlights.length > 0) { partial = true; batchDone = true; break; }
            throw result.reason;
          }
          const sched = result.value;
          if (!sched.data || sched.data.length === 0) { batchDone = true; break; }
          if (processPage(sched)) { batchDone = true; break; }
        }
        if (batchDone) break;

        pageNum = batchEnd + 1;

        // Brief pause between batches to be polite to FR24
        if (pageNum <= pagesToFetch && Date.now() < deadline - 2000) {
          await new Promise(r => setTimeout(r, BATCH_DELAY));
        }
      }
    }

    const result = {
      flights: allUAFlights,
      total: allUAFlights.length,
      totalFetched,
      pagesScanned,
      totalPages,
      cached: false,
      partial,
      hub,
      dir
    };

    // Only cache complete results for full TTL; partial gets short TTL
    cacheSet(aggKey, result, partial ? 60000 : ttl);
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

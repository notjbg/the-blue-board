import { createRateLimiter } from './_rate-limit.js';

const isRateLimited = createRateLimiter('schedule', 30);

// In-memory LRU cache for FR24 schedule data
const cache = new Map();
const MAX_CACHE_SIZE = 200;

// Separate cache for last-known-complete aggregates (fallback when fresh fetch is partial)
const lastCompleteCache = new Map();
const MAX_COMPLETE_CACHE_SIZE = 50;
const COMPLETE_CACHE_MAX_AGE = 1800000; // 30 minutes
const BATCH_DELAY = 500; // 500ms pause between parallel batches (was 300)
const STALE_GRACE = 120000; // serve stale data for up to 2min past expiry

// Busy hubs get more time to fetch all pages (capped at 55s for Vercel's 60s maxDuration)
const HUB_TIMEOUT_MS = { ORD: 55000, EWR: 55000, IAH: 55000, SFO: 55000 };

// Global concurrency limiter for FR24 outbound requests
const MAX_CONCURRENT_FR24 = 6;
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
  if (Date.now() > entry.expires) return null;
  return entry;
}

function cacheGetStale(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires + STALE_GRACE) {
    cache.delete(key);
    return null;
  }
  return entry;
}

function saveComplete(key, data) {
  if (data.partial) return;
  if (lastCompleteCache.size >= MAX_COMPLETE_CACHE_SIZE) {
    lastCompleteCache.delete(lastCompleteCache.keys().next().value);
  }
  lastCompleteCache.set(key, { data, time: Date.now() });
}

function getLastComplete(key) {
  const entry = lastCompleteCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > COMPLETE_CACHE_MAX_AGE) {
    lastCompleteCache.delete(key);
    return null;
  }
  return entry;
}

function cacheSet(key, data, ttlMs) {
  if (cache.size >= MAX_CACHE_SIZE) {
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.flightradar24.com/',
        'Origin': 'https://www.flightradar24.com'
      }
    });
    clearTimeout(timeout);
    return resp;
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

// Resilient page fetch — returns null on failure instead of throwing (matches irrops pattern)
async function fetchOnePage(hub, dir, timestamp, page, deadlineMs) {
  const url = `https://api.flightradar24.com/common/v1/airport.json?code=${encodeURIComponent(hub)}&plugin[]=schedule&plugin-setting[schedule][mode]=${encodeURIComponent(dir)}&plugin-setting[schedule][timestamp]=${timestamp}&page=${page}&limit=100`;
  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (deadlineMs && Date.now() > deadlineMs - 500) return null;
    await acquireFR24Slot();
    try {
      const resp = await fetchWithTimeout(url, deadlineMs);
      if (resp.ok) {
        const data = await resp.json();
        const sched = data?.result?.response?.airport?.pluginData?.schedule?.[dir];
        if (!sched) return null;
        return sched;
      }
      // Retry on transient FR24 errors (including 403 — FR24 uses it for rate limiting)
      if ([403, 429, 502, 503].includes(resp.status) && attempt < MAX_RETRIES) {
        // fall through to retry
      } else if ([403, 429].includes(resp.status)) {
        console.error(`FR24 rate limited ${resp.status} for ${hub} page ${page}`);
        return { _rateLimited: true };
      } else {
        console.error(`FR24 returned ${resp.status} for ${hub} page ${page}`);
        return null;
      }
    } catch (e) {
      if (attempt >= MAX_RETRIES || e.name === 'AbortError') {
        return null;
      }
      // fall through to retry
    } finally {
      releaseFR24Slot();
    }
    const baseDelay = 750 * (attempt + 1);
    const jitter = Math.floor(Math.random() * 300);
    await new Promise(r => setTimeout(r, baseDelay + jitter));
  }
  return null;
}

const pendingAggs = new Map();

function triggerBackgroundRefresh(hub, dir, ts, aggKey, ttl) {
  if (pendingAggs.has(aggKey)) return;
  const promise = fetchAllPages(hub, dir, ts).then(result => {
    cacheSet(aggKey, result, result.partial ? 60000 : ttl);
    saveComplete(aggKey, result);
    return result;
  }).catch(e => {
    console.error(`Background refresh failed for ${hub}:`, e.message);
  }).finally(() => {
    pendingAggs.delete(aggKey);
  });
  pendingAggs.set(aggKey, promise);
}

async function fetchAllPages(hub, dir, ts, timeoutMs) {
  timeoutMs = timeoutMs || HUB_TIMEOUT_MS[hub.toUpperCase()] || 45000;
  const deadline = Date.now() + timeoutMs;
  const dayEnd = ts + 86400;
  const allUAFlights = [];
  let totalPages = 1;
  let totalFetched = 0;
  let partial = false;
  let pagesScanned = 0;
  const failedPages = [];
  const BATCH_SIZE = 4;
  const MAX_PAGES = 50;

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
  const startTime = Date.now();
  const firstPage = await fetchOnePage(hub, dir, ts, 1, deadline);
  if (!firstPage || firstPage._rateLimited) {
    return { flights: [], total: 0, totalFetched: 0, pagesScanned: 0, totalPages: 1, cached: false, partial: true, hub, dir,
      meta: { partialReason: 'first_page_failed', pagesRequested: 1, pagesSucceeded: 0, pagesFailed: 1, missingPages: [1], completeness: 0, elapsedMs: Date.now() - startTime }
    };
  }
  totalPages = firstPage.page?.total || 1;
  pagesScanned = 1;
  const pastDay = processPage(firstPage);

  if (!pastDay && totalPages > 1) {
    const pagesToFetch = Math.min(totalPages, MAX_PAGES);
    let pageNum = 2;
    let currentBatchDelay = BATCH_DELAY;

    while (pageNum <= pagesToFetch) {
      if (Date.now() > deadline - 2000) { partial = true; break; }

      const batchEnd = Math.min(pageNum + BATCH_SIZE - 1, pagesToFetch);
      const batchPages = [];
      for (let p = pageNum; p <= batchEnd; p++) batchPages.push(p);

      const batchResults = await Promise.allSettled(
        batchPages.map(p => fetchOnePage(hub, dir, ts, p, deadline))
      );

      let batchDone = false;
      for (let i = 0; i < batchResults.length; i++) {
        const result = batchResults[i];
        pagesScanned++;
        if (result.status === 'rejected' || !result.value) {
          failedPages.push(batchPages[i]);
          continue;
        }
        // Detect rate-limit sentinel and adapt delay
        if (result.value._rateLimited) {
          failedPages.push(batchPages[i]);
          currentBatchDelay = Math.min(currentBatchDelay * 2, 2000);
          continue;
        }
        const sched = result.value;
        if (!sched.data || sched.data.length === 0) { batchDone = true; break; }
        if (processPage(sched)) { batchDone = true; break; }
      }
      if (batchDone) break;

      pageNum = batchEnd + 1;

      if (pageNum <= pagesToFetch && Date.now() < deadline - 2000) {
        await new Promise(r => setTimeout(r, currentBatchDelay));
      }
    }
  }

  // Cooldown before retrying failed pages — let FR24 rate limits reset
  if (failedPages.length > 0 && Date.now() < deadline - 5000) {
    const cooldown = Math.min(1500, failedPages.length * 150);
    await new Promise(r => setTimeout(r, cooldown));
  }

  // Retry failed pages in mini-batches of 2 with gaps (avoid simultaneous blast)
  if (failedPages.length > 0 && Date.now() < deadline - 3000) {
    const RETRY_BATCH = 2;
    const RETRY_DELAY = 800;
    const stillFailed = [];

    for (let i = 0; i < failedPages.length; i += RETRY_BATCH) {
      if (Date.now() > deadline - 2000) {
        stillFailed.push(...failedPages.slice(i));
        break;
      }

      const retryBatch = failedPages.slice(i, i + RETRY_BATCH);
      const retryResults = await Promise.allSettled(
        retryBatch.map(p => fetchOnePage(hub, dir, ts, p, deadline))
      );

      for (let j = 0; j < retryResults.length; j++) {
        const result = retryResults[j];
        if (result.status === 'fulfilled' && result.value && !result.value._rateLimited) {
          processPage(result.value);
        } else {
          stillFailed.push(retryBatch[j]);
        }
      }

      if (i + RETRY_BATCH < failedPages.length && Date.now() < deadline - 2000) {
        await new Promise(r => setTimeout(r, RETRY_DELAY));
      }
    }

    failedPages.length = 0;
    failedPages.push(...stillFailed);
    if (stillFailed.length > 0) partial = true;
  } else if (failedPages.length > 0) {
    partial = true;
  }

  const elapsedMs = Date.now() - startTime;
  const pagesRequested = Math.min(totalPages, MAX_PAGES);
  let partialReason = null;
  if (partial) {
    if (Date.now() > deadline - 2000) partialReason = 'deadline_exceeded';
    else if (failedPages.length > 0) partialReason = 'page_fetch_failed';
    else partialReason = 'unknown';
  }

  return {
    flights: allUAFlights,
    total: allUAFlights.length,
    totalFetched,
    pagesScanned,
    totalPages,
    cached: false,
    partial,
    hub,
    dir,
    meta: {
      partialReason,
      pagesRequested,
      pagesSucceeded: pagesScanned - failedPages.length,
      pagesFailed: failedPages.length,
      missingPages: failedPages,
      completeness: pagesRequested > 0 ? Math.round(((pagesScanned - failedPages.length) / pagesRequested) * 100) / 100 : 1,
      elapsedMs
    }
  };
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
    const { hub, dir = 'departures', timestamp, page } = req.query;
    if (!hub || !timestamp) {
      return res.status(400).json({ error: 'Missing required params: hub, timestamp' });
    }
    if (!['departures', 'arrivals'].includes(dir)) {
      return res.status(400).json({ error: 'dir must be departures or arrivals' });
    }
    if (!/^[A-Z]{3,4}$/i.test(hub)) {
      return res.status(400).json({ error: 'Invalid hub code' });
    }

    const ts = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (isNaN(ts) || ts < now - 86400 * 7 || ts > now + 86400 * 7) {
      return res.status(400).json({ error: 'Invalid timestamp' });
    }
    const isOld = (now - ts) > 86400;
    const ttl = isOld ? 600000 : 300000;
    const cdnMaxAge = isOld ? 3600 : 900;
    const swr = 300;

    // Single page mode (backward compat)
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
      if (!sched) {
        return res.status(502).json({ error: 'Upstream service unavailable' });
      }
      cacheSet(cacheKey, sched, ttl);
      res.setHeader('Cache-Control', `s-maxage=${cdnMaxAge}, stale-while-revalidate=${swr}`);
      return res.status(200).json({ ...sched, cached: false });
    }

    // Aggregation mode: fetch all pages, filter UA, return combined
    const aggKey = `agg:${hub}:${dir}:${ts}`;

    // Fresh cache hit
    const cached = cacheGet(aggKey);
    if (cached) {
      res.setHeader('Cache-Control', `s-maxage=${cdnMaxAge}, stale-while-revalidate=${swr}`);
      return res.status(200).json({ ...cached.data, cached: true });
    }

    // Stale-while-revalidate: serve stale data immediately, refresh in background
    const stale = cacheGetStale(aggKey);
    if (stale && !stale.data.partial) {
      triggerBackgroundRefresh(hub, dir, ts, aggKey, ttl);
      res.setHeader('Cache-Control', `s-maxage=60, stale-while-revalidate=${swr}`);
      return res.status(200).json({ ...stale.data, cached: true, stale: true });
    }

    // Fallback: serve last-known-complete data if stale cache is partial or missing
    const lastComplete = getLastComplete(aggKey);
    if (lastComplete) {
      triggerBackgroundRefresh(hub, dir, ts, aggKey, ttl);
      const dataAge = Math.round((Date.now() - lastComplete.time) / 1000);
      res.setHeader('Cache-Control', `s-maxage=60, stale-while-revalidate=${swr}`);
      return res.status(200).json({ ...lastComplete.data, cached: true, stale: true, degraded: true,
        meta: { ...lastComplete.data.meta, dataAge }
      });
    }

    // Dedup concurrent aggregation requests
    if (pendingAggs.has(aggKey)) {
      const result = await pendingAggs.get(aggKey);
      if (result) {
        res.setHeader('Cache-Control', `s-maxage=${cdnMaxAge}, stale-while-revalidate=${swr}`);
        return res.status(200).json({ ...result, cached: true });
      }
    }

    // fetchAllPages NEVER throws — always returns a result (possibly partial/empty)
    const aggPromise = fetchAllPages(hub, dir, ts).then(result => {
      cacheSet(aggKey, result, result.partial ? 60000 : ttl);
      saveComplete(aggKey, result);
      return result;
    });

    pendingAggs.set(aggKey, aggPromise);
    try {
      const result = await aggPromise;
      // If fresh result is partial, prefer last-known-complete data if available
      if (result.partial) {
        const lc = getLastComplete(aggKey);
        if (lc) {
          const dataAge = Math.round((Date.now() - lc.time) / 1000);
          res.setHeader('Cache-Control', `s-maxage=60, stale-while-revalidate=${swr}`);
          return res.status(200).json({ ...lc.data, cached: true, stale: true, degraded: true,
            meta: { ...lc.data.meta, dataAge }
          });
        }
      }
      res.setHeader('Cache-Control', `s-maxage=${cdnMaxAge}, stale-while-revalidate=${swr}`);
      return res.status(200).json(result);
    } finally {
      pendingAggs.delete(aggKey);
    }
  } catch (e) {
    console.error('Schedule API error:', e);
    return res.status(502).json({ error: 'Upstream service unavailable' });
  }
}

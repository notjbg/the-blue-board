import type { VercelRequest, VercelResponse } from './types.js';
import { createRateLimiter } from './_rate-limit.js';
import { HUB_TZ } from './irrops.js';

const isRateLimited = createRateLimiter('schedule', 30);

// In-memory LRU cache for FR24 schedule data
const cache = new Map<string, { data: any; expires: number; time: number }>();
const MAX_CACHE_SIZE = 200;

// Separate cache for last-known-complete aggregates (fallback when fresh fetch is partial)
const lastCompleteCache = new Map<string, { data: any; time: number }>();
// Broader fallback cache keyed by hub+direction (survives day-key misses)
const lastCompleteByHubDir = new Map<string, { data: any; time: number; sourceKey: string }>();
const MAX_COMPLETE_CACHE_SIZE = 50;
const COMPLETE_CACHE_MAX_AGE = 1800000; // 30 minutes
const BATCH_DELAY = 250; // 250ms pause between parallel batches
const STALE_GRACE = 120000; // serve stale data for up to 2min past expiry

// Busy hubs get more time to fetch all pages (capped at 55s for Vercel's 60s maxDuration)
const HUB_TIMEOUT_MS: Record<string, number> = { ORD: 55000, EWR: 55000, IAH: 55000, SFO: 55000, LAX: 55000, DEN: 55000, IAD: 55000, NRT: 55000, GUM: 55000 };

// Global concurrency limiter for FR24 outbound requests
const MAX_CONCURRENT_FR24 = 6;
let activeFR24 = 0;
const fr24Queue: (() => void)[] = [];

function acquireFR24Slot(): Promise<void> {
  if (activeFR24 < MAX_CONCURRENT_FR24) {
    activeFR24++;
    return Promise.resolve();
  }
  return new Promise(resolve => fr24Queue.push(resolve));
}

function releaseFR24Slot(): void {
  activeFR24--;
  if (fr24Queue.length > 0) {
    activeFR24++;
    fr24Queue.shift()!();
  }
}

function cacheGet(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) return null;
  return entry;
}

function cacheGetStale(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires + STALE_GRACE) {
    cache.delete(key);
    return null;
  }
  return entry;
}

function saveComplete(key: string, data: any): void {
  if (data.partial) return;
  if (lastCompleteCache.size >= MAX_COMPLETE_CACHE_SIZE) {
    lastCompleteCache.delete(lastCompleteCache.keys().next().value!);
  }
  lastCompleteCache.set(key, { data, time: Date.now() });

  // Also populate hub+direction level cache for broader fallback
  const aggMatch = /^agg:([A-Z]{3,4}):(departures|arrivals):\d+$/i.exec(key);
  if (aggMatch) {
    const hdKey = `${aggMatch[1].toUpperCase()}:${aggMatch[2]}`;
    if (lastCompleteByHubDir.size >= MAX_COMPLETE_CACHE_SIZE) {
      lastCompleteByHubDir.delete(lastCompleteByHubDir.keys().next().value!);
    }
    lastCompleteByHubDir.set(hdKey, { data, time: Date.now(), sourceKey: key });
  }
}

function getLastComplete(key: string) {
  const entry = lastCompleteCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > COMPLETE_CACHE_MAX_AGE) {
    lastCompleteCache.delete(key);
    return null;
  }
  return entry;
}

function getLastCompleteByHubDir(hub: string, dir: string) {
  const hdKey = `${hub.toUpperCase()}:${dir}`;
  const entry = lastCompleteByHubDir.get(hdKey);
  if (!entry) return null;
  if (Date.now() - entry.time > COMPLETE_CACHE_MAX_AGE) {
    lastCompleteByHubDir.delete(hdKey);
    return null;
  }
  return entry;
}

function cacheSet(key: string, data: any, ttlMs: number): void {
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, { data, expires: Date.now() + ttlMs, time: Date.now() });
}

async function fetchWithTimeout(url: string, deadlineMs?: number): Promise<Response> {
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
async function fetchOnePage(hub: string, dir: string, timestamp: number, page: number, deadlineMs?: number): Promise<any | null> {
  const url = `https://api.flightradar24.com/common/v1/airport.json?code=${encodeURIComponent(hub)}&plugin[]=schedule&plugin-setting[schedule][mode]=${encodeURIComponent(dir)}&plugin-setting[schedule][timestamp]=${timestamp}&page=${page}&limit=100`;
  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (deadlineMs && Date.now() > deadlineMs - 500) return null;
    await acquireFR24Slot();
    try {
      const resp = await fetchWithTimeout(url, deadlineMs);
      if (resp.ok) {
        const data = await resp.json();
        const airportData = (data as any)?.result?.response?.airport;
        const sched = airportData?.pluginData?.schedule?.[dir];
        if (!sched) {
          if (airportData && page === 1) {
            return { page: { current: page, total: 1 }, data: [] };
          }
          return null;
        }
        return sched;
      }
      if ([403, 429, 502, 503].includes(resp.status) && attempt < MAX_RETRIES) {
        // fall through to retry
      } else if ([403, 429].includes(resp.status)) {
        console.error(`FR24 rate limited ${resp.status} for ${hub} page ${page}`);
        return { _rateLimited: true };
      } else {
        console.error(`FR24 returned ${resp.status} for ${hub} page ${page}`);
        return null;
      }
    } catch (e: any) {
      if (attempt >= MAX_RETRIES || e.name === 'AbortError') {
        return null;
      }
      // fall through to retry
    } finally {
      releaseFR24Slot();
    }
    const baseDelay = 1000 * Math.pow(2, attempt);
    const jitter = Math.floor(Math.random() * 500);
    await new Promise(r => setTimeout(r, baseDelay + jitter));
  }
  return null;
}

// ── Official FR24 API support ──
const FR24_API_BASE = 'https://fr24api.flightradar24.com';

function formatForFR24(date: Date): string {
  // FR24 API expects YYYY-MM-DDTHH:MM:SSZ format (with trailing Z, no milliseconds)
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function getEndOfTodayForHub(hub: string): Date {
  const tz = HUB_TZ[hub.toUpperCase()] || 'America/New_York';
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(now);
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0');
  const hour = get('hour'), minute = get('minute'), second = get('second');
  const secondsSinceMidnight = hour * 3600 + minute * 60 + second;
  const startOfTodayUnix = Math.floor(now.getTime() / 1000) - secondsSinceMidnight;
  return new Date((startOfTodayUnix + 86400 - 1) * 1000);
}

function icaoToIata(icao: string): string {
  if (!icao) return '';
  if (icao.length === 4 && icao.startsWith('K')) return icao.slice(1);
  const map: Record<string, string> = { RJAA:'NRT', RJTT:'HND', PGUM:'GUM', EGLL:'LHR', LFPG:'CDG',
                EDDF:'FRA', VHHH:'HKG', WSSS:'SIN', NZAA:'AKL', YSSY:'SYD',
                LEMD:'MAD', EHAM:'AMS', OMDB:'DXB', ZBAA:'PEK', RCTP:'TPE',
                RJBB:'KIX', RKSI:'ICN', VTBS:'BKK', WMKK:'KUL', CYYZ:'YYZ',
                CYUL:'YUL', CYVR:'YVR', MMMX:'MEX', MMUN:'CUN', TNCM:'SXM',
                TXKF:'BDA', MUHA:'HAV', LIRF:'FCO', EGKK:'LGW', EIDW:'DUB',
                LSZH:'ZRH', LOWW:'VIE', EKCH:'CPH', ENGM:'OSL', ESSA:'ARN',
                EFHK:'HEL', LPPT:'LIS', LEBL:'BCN', LGAV:'ATH', LTFM:'IST',
                VIDP:'DEL', VABB:'BOM', RPLL:'MNL', ZUUU:'CTU', ZSPD:'PVG',
                ZSSS:'SHA', VVNB:'HAN', VVTS:'SGN' };
  return map[icao] || icao;
}

const ICAO_TO_IATA_AIRLINE: Record<string, string> = { UAL:'UA', AAL:'AA', DAL:'DL', SWA:'WN', JBU:'B6', ASA:'AS', SKW:'OO', RPA:'YX', ENY:'MQ', GJS:'G7', ACA:'AC', BAW:'BA', DLH:'LH', AFR:'AF', KLM:'KL' };
function icaoFlightToIata(icaoFlight: string): string {
  if (!icaoFlight) return '';
  const match = /^([A-Z]{3})(\d+)$/.exec(icaoFlight);
  if (!match) return icaoFlight;
  const iataAirline = ICAO_TO_IATA_AIRLINE[match[1]];
  return iataAirline ? iataAirline + match[2] : icaoFlight;
}

function toUnix(val: any): number | null {
  if (!val) return null;
  if (typeof val === 'number') return val > 1e12 ? Math.floor(val / 1000) : val;
  const ms = Date.parse(val);
  return isNaN(ms) ? null : Math.floor(ms / 1000);
}

function mapStatus(f: any) {
  const s = (f.status || '').toLowerCase();
  const ended = !!f.flight_ended;
  const hasTakeoff = !!(f.datetime_takeoff || f.departure?.actual);
  const hasLanding = !!(f.datetime_landed || f.arrival?.actual);

  let text = 'scheduled';
  let type = '';
  let diverted = false;
  let live = false;
  let icon = '';

  if (s === 'canceled' || s === 'cancelled' || s === 'c') {
    type = 'canceled';
    text = 'canceled';
    icon = 'red';
  } else if (s === 'diverted' || s === 'd') {
    diverted = true;
    text = 'landed';
    icon = 'red';
  } else if (hasLanding || ended || s === 'landed' || s === 'l') {
    text = 'landed';
    icon = 'green';
  } else if (hasTakeoff || s === 'active' || s === 'en-route' || s === 'a' || s === 'en route' || s === 'airborne') {
    text = 'departed';
    live = true;
    icon = 'green';
  } else if (s === 'estimated' || s === 'delayed') {
    text = 'estimated';
    icon = 'yellow';
  }

  if (f.dest_icao_actual && f.dest_icao && f.dest_icao !== f.dest_icao_actual) {
    diverted = true;
  }

  return {
    generic: { status: { text, diverted }, type },
    text: s,
    icon,
    live
  };
}

function normalizeSummaryFlight(f: any) {
  const flightNum = f.flight_iata || f.flight_number?.iata || icaoFlightToIata(f.flight_icao || f.callsign || f.flight_number?.icao || '') || '';
  const callsign = f.callsign || f.flight_icao || f.flight_number?.icao || '';

  const origIata = f.orig_iata || f.origin?.iata || icaoToIata(f.orig_icao || f.origin?.icao || '');
  const destIata = f.dest_iata || f.destination?.iata || icaoToIata(f.dest_icao_actual || f.dest_icao || f.destination?.icao || '');
  const origName = f.origin?.name || f.orig_name || '';
  const destName = f.destination?.name || f.dest_name || '';

  const schedDep = toUnix(f.departure?.scheduled || f.scheduled_departure || f.datetime_scheduled_departure);
  const schedArr = toUnix(f.arrival?.scheduled || f.scheduled_arrival || f.datetime_scheduled_arrival);
  const realDep = toUnix(f.departure?.actual || f.actual_departure || f.datetime_takeoff || f.datetime_actual_departure);
  const realArr = toUnix(f.arrival?.actual || f.actual_arrival || f.datetime_landed || f.datetime_actual_arrival);
  const estDep = toUnix(f.departure?.estimated || f.estimated_departure || f.datetime_estimated_departure);
  const estArr = toUnix(f.arrival?.estimated || f.estimated_arrival || f.datetime_estimated_arrival);

  const acType = f.aircraft?.type || f.aircraft_type || f.type || '';
  const acReg = f.aircraft?.registration || f.registration || '';

  return {
    identification: { number: { default: flightNum }, callsign },
    airline: { code: { iata: 'UA' } },
    status: mapStatus(f),
    time: {
      scheduled: { departure: schedDep, arrival: schedArr },
      real: { departure: realDep, arrival: realArr },
      estimated: { departure: estDep, arrival: estArr }
    },
    airport: {
      origin: { code: { iata: origIata }, name: origName, info: { gate: '', terminal: '' } },
      destination: { code: { iata: destIata }, name: destName, info: { gate: '', terminal: '' } }
    },
    aircraft: { model: { code: acType, text: '' }, registration: acReg }
  };
}

const OFFICIAL_API_PAGE_SIZE = 10000; // FR24 API allows up to 20,000 per request; use 10k to get most hubs in a single page

async function fetchViaOfficialAPI(hub: string, dir: string, ts: number, timeoutMs?: number) {
  const logHub = String(hub);
  const token = process.env.FR24_API_TOKEN;
  if (!token) {
    console.log('Official FR24 API: no FR24_API_TOKEN configured');
    return null;
  }

  timeoutMs = timeoutMs || HUB_TIMEOUT_MS[logHub.toUpperCase()] || 45000;
  const startTime = Date.now();
  const deadline = startTime + timeoutMs;

  const dayStart = new Date(ts * 1000);
  let dayEnd = new Date((ts + 86400) * 1000);

  const endOfToday = getEndOfTodayForHub(logHub);
  if (dayStart > endOfToday) {
    console.log(`Official FR24 API: skipping ${logHub} ${dir} — requested date is tomorrow (ts=${ts})`);
    return null;
  }
  if (dayEnd > endOfToday) {
    dayEnd = endOfToday;
  }

  console.log(`Official FR24 API: fetching ${logHub} ${dir} (filter=${dir === 'departures' ? 'outbound' : 'inbound'}:${logHub}) from=${formatForFR24(dayStart)} to=${formatForFR24(dayEnd)} limit=${OFFICIAL_API_PAGE_SIZE}`);

  const allRawFlights: any[] = [];
  let page = 1;
  let totalPages = 1;
  let retried1 = false;
  const MAX_OFFICIAL_PAGES = 50;

  while (page <= MAX_OFFICIAL_PAGES) {
    if (Date.now() > deadline - 1000) {
      console.log(`Official FR24 API: deadline approaching for ${logHub}, stopping at page ${page}`);
      break;
    }

    // Use direction-aware airport filter: "outbound:ORD" for departures, "inbound:ORD" for arrivals
    const airportFilter = dir === 'departures' ? `outbound:${logHub}` : `inbound:${logHub}`;
    const params = new URLSearchParams({
      airports: airportFilter,
      operating_as: 'UAL',
      flight_datetime_from: formatForFR24(dayStart),
      flight_datetime_to: formatForFR24(dayEnd),
      limit: String(OFFICIAL_API_PAGE_SIZE),
      page: String(page)
    });

    const url = `${FR24_API_BASE}/api/flight-summary/light?${params}`;
    const controller = new AbortController();
    const remaining = Math.max(2000, deadline - Date.now());
    const timeout = setTimeout(() => controller.abort(), Math.min(remaining, 30000));

    try {
      const resp = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Accept-Version': 'v1',
          'User-Agent': 'TheBlueBoardDashboard/1.0 (https://theblueboard.co)',
        },
      });
      clearTimeout(timeout);

      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        console.error(`Official FR24 API returned ${resp.status} for ${logHub} (page ${page}): ${body.slice(0, 200)}`);
        if (page === 1) {
          // Retry page 1 once after a brief pause before giving up
          if (Date.now() < deadline - 5000 && !retried1) {
            retried1 = true;
            console.log(`Official FR24 API: retrying page 1 for ${logHub} after ${resp.status}`);
            await new Promise(r => setTimeout(r, 1500));
            continue;
          }
          return null;
        }
        break;
      }

      const data = await resp.json();
      const flights = (data as any)?.data || [];

      if (page === 1) {
        console.log(`Official FR24 API [${logHub}] page 1: ${flights.length} flights, keys: ${flights.length > 0 ? Object.keys(flights[0]).join(',') : 'N/A'}`);
        if (flights.length > 0) {
          const s = flights[0];
          console.log(`Official FR24 API [${logHub}] sample: ${JSON.stringify(s).slice(0, 500)}`);
        }
      } else {
        console.log(`Official FR24 API [${logHub}] page ${page}: ${flights.length} flights`);
      }

      allRawFlights.push(...flights);

      if (flights.length < OFFICIAL_API_PAGE_SIZE) break;

      page++;

      if (page <= MAX_OFFICIAL_PAGES && Date.now() < deadline - 1000) {
        await new Promise(r => setTimeout(r, 50));
      }
    } catch (e: any) {
      clearTimeout(timeout);
      if (e.name === 'AbortError') {
        console.error(`Official FR24 API timeout for ${logHub} (page ${page})`);
      } else {
        console.error(`Official FR24 API error for ${logHub} (page ${page}):`, e.message);
      }
      if (page === 1) {
        if (Date.now() < deadline - 5000 && !retried1) {
          retried1 = true;
          console.log(`Official FR24 API: retrying page 1 for ${logHub} after error`);
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
        return null;
      }
      break;
    }
  }

  totalPages = page;
  const officialPartial = page > 1 && Date.now() > deadline - 1000;

  if (!allRawFlights.length) {
    console.log(`Official FR24 API returned 0 flights for ${logHub} ${dir}`);
    return {
      flights: [],
      total: 0,
      totalFetched: 0,
      pagesScanned: totalPages,
      totalPages,
      cached: false,
      partial: false,
      hub: logHub,
      dir,
      meta: {
        partialReason: null,
        pagesRequested: totalPages,
        pagesSucceeded: totalPages,
        pagesFailed: 0,
        missingPages: [] as number[],
        completeness: 1,
        elapsedMs: Date.now() - startTime,
        source: 'official-api'
      }
    };
  }

  const hubUpper = logHub.toUpperCase();
  const hubIcao = logHub.length === 3 ? ('K' + logHub).toUpperCase() : logHub.toUpperCase();
  const allUAFlights: any[] = [];
  for (const f of allRawFlights) {
    const rawOrigIcao = (f.orig_icao || f.origin?.icao || '').toUpperCase();
    const rawDestIcao = (f.dest_icao || f.destination?.icao || '').toUpperCase();
    const rawOrigIata = (f.orig_iata || f.origin?.iata || icaoToIata(rawOrigIcao)).toUpperCase();
    const rawDestIata = (f.dest_iata || f.destination?.iata || icaoToIata(rawDestIcao)).toUpperCase();

    const origMatchesHub = rawOrigIata === hubUpper || rawOrigIcao === hubIcao || rawOrigIcao === hubUpper;
    const destMatchesHub = rawDestIata === hubUpper || rawDestIcao === hubIcao || rawDestIcao === hubUpper;

    if (dir === 'departures' && !origMatchesHub) continue;
    if (dir === 'arrivals' && !destMatchesHub) continue;

    allUAFlights.push(normalizeSummaryFlight(f));
  }

  const elapsedMs = Date.now() - startTime;
  console.log(`Official FR24 API: ${allRawFlights.length} total flights (${totalPages} pages), ${allUAFlights.length} ${dir} for ${logHub} in ${elapsedMs}ms`);

  return {
    flights: allUAFlights,
    total: allUAFlights.length,
    totalFetched: allRawFlights.length,
    pagesScanned: totalPages,
    totalPages,
    cached: false,
    partial: officialPartial,
    hub: logHub,
    dir,
    meta: {
      partialReason: officialPartial ? 'deadline_exceeded' : null,
      pagesRequested: totalPages,
      pagesSucceeded: totalPages,
      pagesFailed: 0,
      missingPages: [] as number[],
      completeness: officialPartial ? 0.9 : 1,
      elapsedMs,
      source: 'official-api'
    }
  };
}

const pendingAggs = new Map<string, Promise<any>>();

function triggerBackgroundRefresh(hub: string, dir: string, ts: number, aggKey: string, ttl: number): void {
  if (pendingAggs.has(aggKey)) return;
  const refreshHub = String(hub);
  const promise = fetchAllPages(refreshHub, dir, ts, undefined, Date.now() + 55000).then(result => {
    cacheSet(aggKey, result, result.partial ? 60000 : ttl);
    saveComplete(aggKey, result);
    return result;
  }).catch(e => {
    console.error(`Background refresh failed for ${refreshHub} [${aggKey}]:`, e.message);
  }).finally(() => {
    pendingAggs.delete(aggKey);
  });
  pendingAggs.set(aggKey, promise);
}

async function fetchAllPages(hub: string, dir: string, ts: number, timeoutMs?: number, overallDeadline?: number) {
  const logHub = String(hub);
  const now = Date.now();
  const effectiveDeadline = overallDeadline || (now + (timeoutMs || HUB_TIMEOUT_MS[logHub.toUpperCase()] || 45000));

  // Try official FR24 API first
  if (process.env.FR24_API_TOKEN) {
    try {
      const officialTimeout = Math.min(Math.floor((effectiveDeadline - Date.now()) * 0.7), 45000);
      const officialResult = await fetchViaOfficialAPI(logHub, dir, ts, officialTimeout);
      if (officialResult) return officialResult;
    } catch (e: any) {
      console.error(`Official FR24 API failed for ${logHub}, falling back to scraping:`, e.message);
    }
  }

  // Fallback: scrape unauthenticated FR24 endpoint (paginated)
  const deadline = effectiveDeadline;
  const dayEnd = ts + 86400;
  const allUAFlights: any[] = [];
  let totalPages = 1;
  let totalFetched = 0;
  let partial = false;
  let pagesScanned = 0;
  const failedPages: number[] = [];
  const rateLimitedPages: number[] = [];
  const BATCH_SIZE = 6;
  const MAX_PAGES = 50;

  function processPage(sched: any): boolean {
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

  const startTime = Date.now();
  const firstPage = await fetchOnePage(logHub, dir, ts, 1, deadline);
  if (!firstPage || firstPage._rateLimited) {
    return { flights: [], total: 0, totalFetched: 0, pagesScanned: 0, totalPages: 1, cached: false, partial: true, hub: logHub, dir,
      meta: { partialReason: 'first_page_failed', pagesRequested: 1, pagesSucceeded: 0, pagesFailed: 1, missingPages: [1], completeness: 0, elapsedMs: Date.now() - startTime }
    };
  }
  totalPages = firstPage.page?.total || 1;
  pagesScanned = 1;
  const pastDay = processPage(firstPage);

  if (!pastDay && totalPages > 1) {
    const pagesToFetch = Math.min(totalPages, MAX_PAGES);
    let pageNum = 2;

    while (pageNum <= pagesToFetch) {
      if (Date.now() > deadline - 2000) { partial = true; break; }

      const batchEnd = Math.min(pageNum + BATCH_SIZE - 1, pagesToFetch);
      const batchPages: number[] = [];
      for (let p = pageNum; p <= batchEnd; p++) batchPages.push(p);

      const batchResults = await Promise.allSettled(
        batchPages.map(p => fetchOnePage(logHub, dir, ts, p, deadline))
      );

      let batchDone = false;
      let hitRateLimit = false;
      for (let i = 0; i < batchResults.length; i++) {
        const result = batchResults[i];
        pagesScanned++;
        if (result.status === 'rejected' || !result.value) {
          failedPages.push(batchPages[i]);
          continue;
        }
        if (result.value._rateLimited) {
          rateLimitedPages.push(batchPages[i]);
          hitRateLimit = true;
          continue;
        }
        const sched = result.value;
        if (!sched.data || sched.data.length === 0) { batchDone = true; break; }
        if (processPage(sched)) { batchDone = true; break; }
      }
      if (hitRateLimit) { partial = true; break; }
      if (batchDone) break;

      pageNum = batchEnd + 1;

      if (pageNum <= pagesToFetch && Date.now() < deadline - 2000) {
        await new Promise(r => setTimeout(r, BATCH_DELAY));
      }
    }
  }

  if (rateLimitedPages.length > 0) {
    partial = true;
  }

  if (failedPages.length > 0 && rateLimitedPages.length === 0 && Date.now() < deadline - 5000) {
    const cooldown = Math.min(1500, failedPages.length * 150);
    await new Promise(r => setTimeout(r, cooldown));
  }

  if (failedPages.length > 0 && rateLimitedPages.length === 0 && Date.now() < deadline - 3000) {
    const RETRY_BATCH = 2;
    const RETRY_DELAY = 800;
    const stillFailed: number[] = [];

    for (let i = 0; i < failedPages.length; i += RETRY_BATCH) {
      if (Date.now() > deadline - 2000) {
        stillFailed.push(...failedPages.slice(i));
        break;
      }

      const retryBatch = failedPages.slice(i, i + RETRY_BATCH);
      const retryResults = await Promise.allSettled(
        retryBatch.map(p => fetchOnePage(logHub, dir, ts, p, deadline))
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

  const allFailedPages = [...failedPages, ...rateLimitedPages];
  const elapsedMs = Date.now() - startTime;
  const pagesRequested = Math.min(totalPages, MAX_PAGES);
  let partialReason: string | null = null;
  if (partial) {
    if (rateLimitedPages.length > 0) partialReason = 'rate_limited';
    else if (Date.now() > deadline - 2000) partialReason = 'deadline_exceeded';
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
    hub: logHub,
    dir,
    meta: {
      partialReason,
      pagesRequested,
      pagesSucceeded: pagesScanned - allFailedPages.length,
      pagesFailed: allFailedPages.length,
      missingPages: allFailedPages,
      completeness: pagesRequested > 0 ? Math.round(((pagesScanned - allFailedPages.length) / pagesRequested) * 100) / 100 : 1,
      elapsedMs
    }
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    const functionDeadline = Date.now() + 57000;

    const { hub, dir = 'departures', timestamp, page } = req.query as Record<string, string>;
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
    const ttl = isOld ? 600000 : 900000;
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

    // Aggregation mode
    const aggKey = `agg:${hub}:${dir}:${ts}`;

    const cached = cacheGet(aggKey);
    if (cached) {
      res.setHeader('Cache-Control', `s-maxage=${cdnMaxAge}, stale-while-revalidate=${swr}`);
      return res.status(200).json({ ...cached.data, cached: true });
    }

    const stale = cacheGetStale(aggKey);
    if (stale && !stale.data.partial) {
      triggerBackgroundRefresh(hub, dir, ts, aggKey, ttl);
      res.setHeader('Cache-Control', `s-maxage=60, stale-while-revalidate=${swr}`);
      return res.status(200).json({ ...stale.data, cached: true, stale: true });
    }

    const exactLastComplete = getLastComplete(aggKey);
    const fallbackComplete = exactLastComplete || getLastCompleteByHubDir(hub, dir);
    if (fallbackComplete) {
      triggerBackgroundRefresh(hub, dir, ts, aggKey, ttl);
      const dataAge = Math.round((Date.now() - fallbackComplete.time) / 1000);
      res.setHeader('Cache-Control', `s-maxage=60, stale-while-revalidate=${swr}`);
      return res.status(200).json({ ...fallbackComplete.data, cached: true, stale: true, degraded: true,
        meta: {
          ...fallbackComplete.data.meta,
          dataAge,
          fallbackScope: exactLastComplete ? 'exact' : 'hub_dir',
        }
      });
    }

    if (pendingAggs.has(aggKey)) {
      const result = await pendingAggs.get(aggKey);
      if (result) {
        res.setHeader('Cache-Control', `s-maxage=${cdnMaxAge}, stale-while-revalidate=${swr}`);
        return res.status(200).json({ ...result, cached: true });
      }
    }

    const aggPromise = fetchAllPages(hub, dir, ts, undefined, functionDeadline).then(result => {
      cacheSet(aggKey, result, result.partial ? 60000 : ttl);
      saveComplete(aggKey, result);
      return result;
    });

    pendingAggs.set(aggKey, aggPromise);
    try {
      const result = await aggPromise;
      if (result.partial) {
        const exactLc = getLastComplete(aggKey);
        const lc = exactLc || getLastCompleteByHubDir(hub, dir);
        if (lc) {
          const dataAge = Math.round((Date.now() - lc.time) / 1000);
          res.setHeader('Cache-Control', `s-maxage=60, stale-while-revalidate=${swr}`);
          return res.status(200).json({ ...lc.data, cached: true, stale: true, degraded: true,
            meta: {
              ...lc.data.meta,
              dataAge,
              fallbackScope: exactLc ? 'exact' : 'hub_dir',
            }
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

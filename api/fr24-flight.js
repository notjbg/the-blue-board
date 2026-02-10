// FR24 Official API — Flight Lookup Endpoint
// Usage: /api/fr24-flight?flight=UA838
//
// Endpoints (from official SDK):
//   Live positions: GET /api/live/flight-positions/full?flights={iata}
//   Flight summary: GET /api/flight-summary/light?flights={iata}

const FR24_BASE = 'https://fr24api.flightradar24.com';
const LIVE_PATH = '/api/live/flight-positions/full';
const SUMMARY_PATH = '/api/flight-summary/light';
const API_VERSION = 'v1';
const CACHE_TTL_MS = 60_000;

// Simple in-memory cache
const cache = new Map();
function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { cache.delete(key); return null; }
  return entry.data;
}
function setCache(key, data) {
  // Evict if cache too large
  if (cache.size > 200) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  cache.set(key, { data, ts: Date.now() });
}

// Rate limiting: 10 req/min
const requestLog = [];
function isRateLimited() {
  const now = Date.now();
  while (requestLog.length && requestLog[0] < now - 60_000) requestLog.shift();
  if (requestLog.length >= 10) return true;
  requestLog.push(now);
  return false;
}

function corsHeaders(req) {
  const origin = req.headers?.origin || '';
  const allowed = origin === 'https://theblueboard.co' || origin.includes('localhost');
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://theblueboard.co',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function normalizeFlightNumber(raw) {
  let q = (raw || '').trim().toUpperCase().replace(/\s+/g, '');
  // "UAL838" → "UA838"
  if (q.startsWith('UAL') && /^\d/.test(q.slice(3))) q = 'UA' + q.slice(3);
  // Bare number "838" → "UA838"
  if (/^\d{1,4}$/.test(q)) q = 'UA' + q;
  return q;
}

async function fr24Fetch(path, params) {
  const url = new URL(FR24_BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const resp = await fetch(url.toString(), {
    signal: controller.signal,
    headers: {
      'Authorization': `Bearer ${process.env.FR24_API_TOKEN}`,
      'Accept': 'application/json',
      'Accept-Version': API_VERSION,
      'User-Agent': 'TheBlueBoardDashboard/1.0 (https://theblueboard.co)',
    },
  });
  clearTimeout(timeout);
  return resp;
}

function normalizeLiveResponse(data, flightNumber) {
  // FR24 live positions return { data: [ { ... } ] }
  const flights = data?.data || [];
  if (!flights.length) return null;

  const f = flights[0];
  return {
    flightNumber: f.flight_iata || f.flight_icao || flightNumber,
    callsign: f.callsign || f.flight_icao || '',
    status: f.on_ground ? 'on-ground' : 'en-route',
    origin: {
      iata: f.orig_iata || f.origin?.iata || '',
      icao: f.orig_icao || f.origin?.icao || '',
      name: f.origin?.name || '',
    },
    destination: {
      iata: f.dest_iata || f.destination?.iata || '',
      icao: f.dest_icao || f.destination?.icao || '',
      name: f.destination?.name || '',
    },
    aircraft: {
      type: f.aircraft_type || f.type || '',
      reg: f.registration || f.reg || '',
      icao24: f.icao24 || '',
    },
    departure: {
      scheduled: f.scheduled_departure || f.dep_scheduled || '',
      actual: f.actual_departure || f.dep_actual || '',
    },
    arrival: {
      scheduled: f.scheduled_arrival || f.arr_scheduled || '',
      estimated: f.estimated_arrival || f.arr_estimated || '',
    },
    position: {
      lat: f.lat ?? f.latitude ?? null,
      lon: f.lon ?? f.longitude ?? null,
      alt: f.alt ?? f.altitude ?? null,
      speed: f.gspeed ?? f.speed ?? null,
      heading: f.heading ?? f.track ?? null,
    },
    flightId: f.flight_id || f.fr24_id || '',
    _raw: f, // include raw for debugging
  };
}

function normalizeSummaryResponse(data, flightNumber) {
  const flights = data?.data || [];
  if (!flights.length) return null;

  const f = flights[0];
  const status = f.status || '';
  return {
    flightNumber: f.flight_iata || f.flight_number?.iata || flightNumber,
    callsign: f.callsign || f.flight_number?.icao || '',
    status: status || 'unknown',
    origin: {
      iata: f.origin?.iata || f.airport?.origin?.code?.iata || '',
      icao: f.origin?.icao || '',
      name: f.origin?.name || '',
    },
    destination: {
      iata: f.destination?.iata || f.airport?.destination?.code?.iata || '',
      icao: f.destination?.icao || '',
      name: f.destination?.name || '',
    },
    aircraft: {
      type: f.aircraft?.type || f.aircraft_type || '',
      reg: f.aircraft?.registration || f.registration || '',
    },
    departure: {
      scheduled: f.departure?.scheduled || f.scheduled_departure || '',
      actual: f.departure?.actual || f.actual_departure || '',
    },
    arrival: {
      scheduled: f.arrival?.scheduled || f.scheduled_arrival || '',
      estimated: f.arrival?.estimated || f.estimated_arrival || '',
    },
    position: null,
    flightId: f.flight_id || f.fr24_id || '',
    _raw: f,
  };
}

export default async function handler(req, res) {
  const cors = corsHeaders(req);
  for (const [k, v] of Object.entries(cors)) res.setHeader(k, v);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.FR24_API_TOKEN) {
    console.error('FR24_API_TOKEN not configured');
    return res.status(500).json({ success: false, error: 'FR24 API not configured' });
  }

  const rawFlight = req.query.flight;
  if (!rawFlight) return res.status(400).json({ success: false, error: 'Missing flight parameter' });

  const flight = normalizeFlightNumber(rawFlight);
  if (!/^[A-Z]{1,3}\d{1,4}[A-Z]?$/i.test(flight)) {
    return res.status(400).json({ success: false, error: 'Invalid flight number format' });
  }

  // Check cache
  const cacheKey = `fr24:${flight}`;
  const cached = getCached(cacheKey);
  if (cached) {
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({ ...cached, cached: true });
  }

  // Rate limit
  if (isRateLimited()) {
    return res.status(429).json({ success: false, error: 'Rate limited — max 10 requests/minute' });
  }

  try {
    // 1. Try live positions first
    let flightData = null;
    let source = 'live';

    const liveResp = await fr24Fetch(LIVE_PATH, { flights: flight });
    if (liveResp.ok) {
      const liveData = await liveResp.json();
      console.log(`FR24 live response for ${flight}: status=${liveResp.status}, entries=${liveData?.data?.length || 0}`);
      flightData = normalizeLiveResponse(liveData, flight);
    } else {
      await liveResp.text().catch(() => '');
      console.error(`FR24 live error for ${flight}: status=${liveResp.status}`);
    }

    // 2. If no live data, try flight summary (requires time range per SDK docs)
    if (!flightData) {
      source = 'summary';
      const now = new Date();
      const from = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24h ago
      const to = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h ahead
      const summaryResp = await fr24Fetch(SUMMARY_PATH, {
        flights: flight,
        flight_datetime_from: from.toISOString(),
        flight_datetime_to: to.toISOString(),
      });
      if (summaryResp.ok) {
        const summaryData = await summaryResp.json();
        console.log(`FR24 summary response for ${flight}: status=${summaryResp.status}, entries=${summaryData?.data?.length || 0}`);
        flightData = normalizeSummaryResponse(summaryData, flight);
      } else {
        await summaryResp.text().catch(() => '');
        console.error(`FR24 summary error for ${flight}: status=${summaryResp.status}`);
      }
    }

    if (!flightData) {
      return res.status(404).json({ success: false, error: `No data found for ${flight}` });
    }

    // Remove raw debug data from client response
    const { _raw, ...cleanFlight } = flightData;

    const result = {
      success: true,
      flight: cleanFlight,
      source: `fr24-official-${source}`,
      cached: false,
    };

    setCache(cacheKey, result);
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(result);
  } catch (e) {
    console.error('FR24 flight lookup error:', e);
    if (e.name === 'AbortError') return res.status(504).json({ success: false, error: 'FR24 API timeout' });
    return res.status(502).json({ success: false, error: 'FR24 API unavailable' });
  }
}

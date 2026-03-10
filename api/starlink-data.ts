// Serves enriched Starlink aircraft data
// Primary: serves cached data from cron sync
// Fallback: fetches directly from upstream if cache is empty

import type { VercelRequest, VercelResponse } from './types.js';

const UPSTREAM_URL = 'https://unitedstarlinktracker.com/api/data';
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

interface StarlinkCache {
  aircraft: Array<{ tail: string; fleet: string; type: string; operator: string }>;
  totalCount: number;
  fleetStats: { mainline: number; express: number; total: number } | null;
  flightsByTail: Record<string, Array<{ flight_number: string; origin: string; destination: string; departure_time: string }>>;
  lastUpdated: string;
  syncedAt: string;
}

let inMemoryCache: StarlinkCache | null = null;
let lastFetch = 0;

async function fetchUpstream(): Promise<StarlinkCache> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const resp = await fetch(UPSTREAM_URL, {
    signal: controller.signal,
    headers: { 'User-Agent': 'BlueBoard-StarlinkData/1.0' },
  });
  clearTimeout(timeout);

  if (!resp.ok) throw new Error(`Upstream ${resp.status}`);

  const upstream = await resp.json() as any;
  const aircraft = (upstream.starlinkPlanes || []).map((p: any) => ({
    tail: p.tail_number,
    fleet: p.fleet || 'Express',
    type: p.aircraft_type || 'Unknown',
    operator: p.operator || 'United Airlines',
  }));

  return {
    aircraft,
    totalCount: upstream.totalCount || aircraft.length,
    fleetStats: upstream.fleetStats || null,
    flightsByTail: upstream.flightsByTail || {},
    lastUpdated: upstream.lastUpdated || new Date().toISOString(),
    syncedAt: new Date().toISOString(),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check cron-populated global cache first
    const cronCache = (globalThis as any).__starlinkCache as StarlinkCache | undefined;
    if (cronCache) {
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
      return res.status(200).json(cronCache);
    }

    // Fall back to in-memory cache with TTL
    if (inMemoryCache && Date.now() - lastFetch < CACHE_TTL) {
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
      return res.status(200).json(inMemoryCache);
    }

    // Fetch fresh
    inMemoryCache = await fetchUpstream();
    lastFetch = Date.now();

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
    return res.status(200).json(inMemoryCache);
  } catch (err: any) {
    // If we have stale cache, serve it rather than failing
    if (inMemoryCache) {
      res.setHeader('Cache-Control', 'public, s-maxage=300');
      return res.status(200).json(inMemoryCache);
    }
    console.error('Starlink data error:', err);
    return res.status(502).json({ error: 'Failed to fetch Starlink data' });
  }
}

// Vercel Cron Job: syncs Starlink aircraft data from unitedstarlinktracker.com
// Writes enriched data (aircraft list, fleet stats, flights) to /tmp for edge caching
// Config in vercel.json: { "path": "/api/cron/sync-starlink", "schedule": "0 */4 * * *" }

import type { VercelRequest, VercelResponse } from '../types.js';

const UPSTREAM_URL = 'https://unitedstarlinktracker.com/api/data';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret in production
  if (process.env.CRON_SECRET && req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const resp = await fetch(UPSTREAM_URL, {
      signal: controller.signal,
      headers: { 'User-Agent': 'BlueBoard-StarlinkSync/1.0' },
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      return res.status(502).json({ error: `Upstream returned ${resp.status}` });
    }

    const upstream = await resp.json() as {
      totalCount: number;
      starlinkPlanes: Array<{ tail_number: string; aircraft_type: string; fleet: string; operator: string }>;
      lastUpdated: string;
      fleetStats: { mainline: number; express: number; total: number };
      flightsByTail: Record<string, Array<{ flight_number: string; origin: string; destination: string; departure_time: string }>>;
    };

    // Transform to our format: keep backwards-compatible starlink.json shape + extras
    const aircraft = (upstream.starlinkPlanes || []).map(p => ({
      tail: p.tail_number,
      fleet: p.fleet || 'Express',
      type: p.aircraft_type || 'Unknown',
      operator: p.operator || 'United Airlines',
    }));

    const enriched = {
      aircraft,
      totalCount: upstream.totalCount || aircraft.length,
      fleetStats: upstream.fleetStats || null,
      flightsByTail: upstream.flightsByTail || {},
      lastUpdated: upstream.lastUpdated || new Date().toISOString(),
      syncedAt: new Date().toISOString(),
    };

    // Store in global for the /api/starlink-data endpoint to serve
    (globalThis as any).__starlinkCache = enriched;

    return res.status(200).json({
      status: 'ok',
      aircraft_count: aircraft.length,
      fleet_stats: upstream.fleetStats,
      synced_at: enriched.syncedAt,
    });
  } catch (err: any) {
    console.error('Starlink sync error:', err);
    return res.status(500).json({ error: err.message || 'Sync failed' });
  }
}

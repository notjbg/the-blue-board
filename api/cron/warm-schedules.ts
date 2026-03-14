// Vercel Cron Job: warms schedule CDN + in-memory cache for all UA hubs.
// Runs every 15 minutes to ensure users always hit warm cache.
// Config in vercel.json: { "path": "/api/cron/warm-schedules", "schedule": "*/15 * * * *" }

import type { VercelRequest, VercelResponse } from '../types.js';
import { getStartOfDayForHub } from '../irops.js';

const HUBS = ['ORD', 'DEN', 'IAH', 'EWR', 'SFO', 'IAD', 'LAX', 'NRT', 'GUM'];
const BASE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://theblueboard.co';

async function warmOne(hub: string, dir: string, timestamp: number, label: string): Promise<{ key: string; result: any }> {
  const key = `${hub}-${dir}-${label}`;
  const url = `${BASE_URL}/api/schedule?hub=${hub}&dir=${dir}&timestamp=${timestamp}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'BlueBoard-CronWarmer/1.0' }
    });
    clearTimeout(timeout);
    const cdnStatus = resp.headers.get('x-vercel-cache') || 'unknown';
    if (resp.ok) {
      const data = await resp.json() as any;
      return { key, result: { status: 'ok', flights: data.total || 0, partial: data.partial || false, cached: data.cached || false, cdn: cdnStatus } };
    }
    return { key, result: { status: `http_${resp.status}`, cdn: cdnStatus } };
  } catch (e: any) {
    return { key, result: { status: 'error', message: e.message } };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel cron sends authorization header with CRON_SECRET
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results: Record<string, any> = {};
  let warmed = 0;
  let failed = 0;

  // Warm today departures for all hubs. Arrivals are less viewed and load on-demand.
  // Tomorrow's data also loads on-demand — warming it here would exceed Vercel's 300s cron limit.
  for (const hub of HUBS) {
    const todayTs = getStartOfDayForHub(hub);
    const { key, result } = await warmOne(hub, 'departures', todayTs, 'today');
    results[key] = result;
    if (result.status === 'ok') warmed++; else failed++;
    // Pause between hubs to avoid FR24 rate limiting
    await new Promise(r => setTimeout(r, 12000));
  }

  // Phase 1.5: warm Starlink data cache (single fast request)
  try {
    const slController = new AbortController();
    const slTimeout = setTimeout(() => slController.abort(), 20000);
    const slResp = await fetch(`${BASE_URL}/api/starlink-data`, {
      signal: slController.signal,
      headers: { 'User-Agent': 'BlueBoard-CronWarmer/1.0' },
    });
    clearTimeout(slTimeout);
    results['starlink-data'] = { status: slResp.ok ? 'ok' : `http_${slResp.status}` };
    if (slResp.ok) warmed++; else failed++;
  } catch (e: any) {
    results['starlink-data'] = { status: 'error', message: e.message };
    failed++;
  }

  // Tomorrow's data loads on-demand when users navigate to it.
  // Warming it here would push cron runtime past Vercel's 300s limit.

  console.log(`Cron warm-schedules: ${warmed} warmed, ${failed} failed`, results);
  return res.status(200).json({ warmed, failed, results, timestamp: new Date().toISOString() });
}

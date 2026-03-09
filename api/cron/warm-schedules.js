// Vercel Cron Job: warms schedule CDN + in-memory cache for all UA hubs.
// Runs every 5 minutes to ensure users always hit warm cache.
// Config in vercel.json: { "path": "/api/cron/warm-schedules", "schedule": "*/5 * * * *" }

import { getStartOfDayForHub } from '../irrops.js';

const HUBS = ['ORD', 'DEN', 'IAH', 'EWR', 'SFO', 'IAD', 'LAX', 'NRT', 'GUM'];
const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'https://theblueboard.co';

export default async function handler(req, res) {
  // Vercel cron sends authorization header with CRON_SECRET
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results = {};
  let warmed = 0;
  let failed = 0;

  const DIRS = ['departures', 'arrivals'];
  for (const hub of HUBS) {
    const timestamp = getStartOfDayForHub(hub);
    for (const dir of DIRS) {
      const key = `${hub}-${dir}`;
      const url = `${BASE_URL}/api/schedule?hub=${hub}&dir=${dir}&timestamp=${timestamp}`;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 55000);
        const resp = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'BlueBoard-CronWarmer/1.0' }
        });
        clearTimeout(timeout);
        if (resp.ok) {
          const data = await resp.json();
          results[key] = { status: 'ok', flights: data.total || 0, partial: data.partial || false, cached: data.cached || false };
          warmed++;
        } else {
          results[key] = { status: `http_${resp.status}` };
          failed++;
        }
      } catch (e) {
        results[key] = { status: 'error', message: e.message };
        failed++;
      }
      // 2s pause between requests to avoid overwhelming FR24
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`Cron warm-schedules: ${warmed} warmed, ${failed} failed`, results);
  return res.status(200).json({ warmed, failed, results, timestamp: new Date().toISOString() });
}

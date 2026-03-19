import type { VercelRequest, VercelResponse } from './types.js';
import { createRateLimiter } from './_rate-limit.js';
import { normalizeMetarPayload } from '../src/lib/metar.js';

const isRateLimited = createRateLimiter('metar', 60);

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
    const ids = (req.query.ids as string) || 'KORD';
    // Validate: comma-separated ICAO codes, max 200 chars
    if (!/^[A-Z0-9,]{1,200}$/i.test(ids)) {
      return res.status(400).json({ error: 'Invalid airport IDs' });
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const upstream = await fetch(`https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(ids)}&format=json`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!upstream.ok) return res.status(502).json({ error: 'Upstream service unavailable' });
    const data = normalizeMetarPayload(await upstream.json());
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(data);
  } catch (e: any) {
    console.error('METAR API error:', e);
    if (e.name === 'AbortError') return res.status(504).json({ error: 'Upstream timeout' });
    return res.status(502).json({ error: 'Upstream service unavailable' });
  }
}

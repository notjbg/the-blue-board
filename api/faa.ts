import { XMLParser } from 'fast-xml-parser';
import type { VercelRequest, VercelResponse } from './types.js';
import { createRateLimiter } from './_rate-limit.js';

const isRateLimited = createRateLimiter('faa', 60);

const parser = new XMLParser({
  ignoreAttributes: false,
  allowBooleanAttributes: true,
  parseTagValue: true,
  trimValues: true,
});

interface FAADelay {
  airportCode: string;
  type: string;
  reason: string;
  avgDelay?: string | null;
  endTime?: string | null;
  minDelay?: string | null;
  maxDelay?: string | null;
  delays: { reason: string; type: string }[];
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const upstream = await fetch('https://nasstatus.faa.gov/api/airport-status-information', {
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!upstream.ok) return res.status(502).json({ error: 'Upstream service unavailable' });
    const xml = await upstream.text();

    if (!xml || !xml.trim()) {
      res.setHeader('Cache-Control', 's-maxage=60');
      return res.status(200).json([]);
    }

    let parsed: any;
    try {
      parsed = parser.parse(xml);
    } catch (parseErr: any) {
      console.error('FAA XML parse error:', parseErr.message);
      return res.status(200).json([]);
    }

    const delays: FAADelay[] = [];

    // Ground Delays — preserve type so client can set groundDelay boolean
    const groundDelays = toArray(
      parsed?.AIRPORT_STATUS_INFORMATION?.Delay_type?.Ground_Delay?.Delay ||
      parsed?.Delay_type?.Ground_Delay?.Delay
    );
    for (const entry of groundDelays) {
      const arpt = String(entry?.ARPT || '').trim();
      const reason = String(entry?.Reason || '').trim();
      if (!arpt) continue;
      delays.push({
        airportCode: arpt,
        type: 'ground_delay',
        reason,
        avgDelay: String(entry?.Avg || '').trim() || null,
        delays: [{ reason, type: 'ground_delay' }],
      });
    }

    // Ground Stops — preserve type so client can set groundStop boolean
    const groundStops = toArray(
      parsed?.AIRPORT_STATUS_INFORMATION?.Delay_type?.Ground_Stop?.Delay ||
      parsed?.Delay_type?.Ground_Stop?.Delay
    );
    for (const entry of groundStops) {
      const arpt = String(entry?.ARPT || '').trim();
      const reason = String(entry?.Reason || '').trim();
      if (!arpt) continue;
      delays.push({
        airportCode: arpt,
        type: 'ground_stop',
        reason,
        endTime: String(entry?.End_Time || entry?.EndTime || '').trim() || null,
        delays: [{ reason, type: 'ground_stop' }],
      });
    }

    // Arrival/Departure Delays — distinguish by reason text
    const arrDepDelays = toArray(
      parsed?.AIRPORT_STATUS_INFORMATION?.Delay_type?.Arrival_Departure_Delay?.Delay ||
      parsed?.Delay_type?.Arrival_Departure_Delay?.Delay
    );
    for (const entry of arrDepDelays) {
      const arpt = String(entry?.ARPT || '').trim();
      const reason = String(entry?.Reason || '').trim();
      if (!arpt) continue;
      const isDep = reason.toLowerCase().includes('depart');
      delays.push({
        airportCode: arpt,
        type: isDep ? 'departure_delay' : 'arrival_delay',
        reason,
        minDelay: String(entry?.Min || '').trim() || null,
        maxDelay: String(entry?.Max || '').trim() || null,
        delays: [{ reason, type: isDep ? 'departure_delay' : 'arrival_delay' }],
      });
    }

    // Airport Closures
    const closureEntries = toArray(
      parsed?.AIRPORT_STATUS_INFORMATION?.Delay_type?.Airport_Closure?.Airport ||
      parsed?.Delay_type?.Airport_Closure?.Airport
    );
    for (const entry of closureEntries) {
      const arpt = String(entry?.ARPT || '').trim();
      const reason = String(entry?.Reason || '').trim();
      if (!arpt) continue;
      delays.push({
        airportCode: arpt,
        type: 'closure',
        reason,
        delays: [{ reason: 'CLOSED: ' + reason.split(' ').slice(0, 8).join(' '), type: 'closure' }],
      });
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(delays);
  } catch (e: any) {
    console.error('FAA API error:', e);
    if (e.name === 'AbortError') return res.status(504).json({ error: 'Upstream timeout' });
    return res.status(502).json({ error: 'Upstream service unavailable' });
  }
}

// Normalize a value to an array (handles undefined, single object, or array)
export function toArray<T>(val: T | T[] | undefined | null): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

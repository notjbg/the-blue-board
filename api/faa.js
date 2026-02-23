import { XMLParser } from 'fast-xml-parser';
import { createRateLimiter } from './_rate-limit.js';

const isRateLimited = createRateLimiter('faa', 60);

const parser = new XMLParser({
  ignoreAttributes: false,
  allowBooleanAttributes: true,
  parseTagValue: true,
  trimValues: true,
});

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

    let parsed;
    try {
      parsed = parser.parse(xml);
    } catch (parseErr) {
      console.error('FAA XML parse error:', parseErr.message);
      return res.status(200).json([]);
    }

    const delays = [];

    // Extract delay entries — structure varies, normalize to array
    const delayEntries = toArray(
      parsed?.AIRPORT_STATUS_INFORMATION?.Delay_type?.Ground_Delay?.Delay ||
      parsed?.Delay_type?.Ground_Delay?.Delay
    ).concat(toArray(
      parsed?.AIRPORT_STATUS_INFORMATION?.Delay_type?.Ground_Stop?.Delay ||
      parsed?.Delay_type?.Ground_Stop?.Delay
    )).concat(toArray(
      parsed?.AIRPORT_STATUS_INFORMATION?.Delay_type?.Arrival_Departure_Delay?.Delay ||
      parsed?.Delay_type?.Arrival_Departure_Delay?.Delay
    ));

    for (const entry of delayEntries) {
      const arpt = String(entry?.ARPT || '').trim();
      const reason = String(entry?.Reason || '').trim();
      if (!arpt) continue;
      delays.push({
        airportCode: arpt,
        type: 'delay',
        reason,
        delays: [{ reason }],
      });
    }

    // Extract closure entries
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
        delays: [{ reason: 'CLOSED: ' + reason.split(' ').slice(0, 8).join(' ') }],
      });
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(delays);
  } catch (e) {
    console.error('FAA API error:', e);
    if (e.name === 'AbortError') return res.status(504).json({ error: 'Upstream timeout' });
    return res.status(502).json({ error: 'Upstream service unavailable' });
  }
}

// Normalize a value to an array (handles undefined, single object, or array)
function toArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

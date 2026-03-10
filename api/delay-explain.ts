import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from './types.js';
import { createRateLimiter } from './_rate-limit.js';
import { CacheStore } from './_cache.js';

const isRateLimited = createRateLimiter('delay-explain', 20);

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

const cache = new CacheStore<string>('delay-explain', { maxSize: 200, defaultTTL: 5 * 60 * 1000 });

interface DelayContext {
  flight: string;
  route?: string;
  status?: string;
  riskLabel?: string;
  riskScore?: number;
  factors?: string[];
  otp?: string;
  weather?: string;
  destWeather?: string;
  inbound?: string;
  hub?: string;
  irrops?: string;
  hubTime?: string;
  connection?: string;
}

function getCacheKey(ctx: DelayContext): string {
  const inboundKey = ctx.inbound ? ctx.inbound.slice(0, 100) : '';
  const weatherKey = (ctx.weather || '').slice(0, 40) + '|' + (ctx.destWeather || '').slice(0, 40);
  return `${ctx.flight}:${ctx.riskScore}:${(ctx.factors || []).join(',')}:${inboundKey}:${weatherKey}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const origin = req.headers?.origin || '';
  if (origin && origin !== 'https://theblueboard.co' && !/^http:\/\/localhost(:\d+)?$/.test(origin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (isRateLimited(req)) {
    return res.status(429).json({ error: 'Rate limited — try again shortly' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI analysis unavailable — no API key configured' });
  }

  try {
    const ctx: DelayContext = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!ctx || !ctx.flight) {
      return res.status(400).json({ error: 'Missing flight context' });
    }

    // Check cache
    const key = getCacheKey(ctx);
    const cached = cache.get(key);
    if (cached) {
      return res.status(200).json({ explanation: cached, cached: true });
    }

    // Build context prompt with aircraft journey chain
    const lines = [
      `Flight: ${ctx.flight} (${ctx.route || 'unknown route'})`,
      `Status: ${ctx.status || 'scheduled'}`,
      `Risk Level: ${ctx.riskLabel || 'LOW'} (score ${ctx.riskScore || 0}/100)`,
    ];
    if (ctx.factors && ctx.factors.length > 0) {
      lines.push(`Contributing factors: ${ctx.factors.join('; ')}`);
    }
    if (ctx.otp) lines.push(`Hub on-time performance: ${ctx.otp}%`);
    if (ctx.weather) lines.push(`Origin weather: ${ctx.weather}`);
    if (ctx.destWeather) lines.push(`Destination weather: ${ctx.destWeather}`);
    if (ctx.irrops) lines.push(`Hub disruption status: ${ctx.irrops}`);
    if (ctx.hubTime) lines.push(`Current local time at hub: ${ctx.hubTime}`);
    if (ctx.connection) lines.push(`Passenger connection: ${ctx.connection}`);
    if (ctx.inbound) lines.push(`Aircraft journey: ${ctx.inbound}`);

    const message = await getClient().messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      system: `You are a senior flight operations analyst briefing for The Blue Board, a third-party United Airlines flight tracker. You are NOT United Airlines — never say "we" or "our" when referring to the airline. Analyze delay risk the way a network operations center dispatcher would.

Analysis framework — evaluate in this order:
1. AIRCRAFT ROUTING: This is the #1 predictor. If the inbound aircraft has been running late across multiple segments, explain the compounding effect — each late turn erodes schedule padding. If turnaround time is tight or impossible, state the specific math (ETA, minimum turn time, buffer). If de-icing is required, note the queue time impact (typically 15-45 min depending on conditions and holdover limits).
2. FAA PROGRAMS: Ground stops freeze departures. GDPs absorb delays in controlled-rate releases — explain what the average delay means for this flight's departure window. A GDP at the destination means the flight may be held on the ground at origin even if the origin airport is clear.
3. RUNWAY & CAPACITY: SFO in IFR/LIFR loses roughly half its capacity (28L/28R go single-stream). EWR's crossing runways (4/22 and 11/29) lose intersecting operations. ORD in thunderstorms can drop to 50% acceptance rate. These capacity reductions cascade into departure queues and ground holds.
4. WEATHER: Distinguish between departure weather (affects taxi, de-icing, takeoff) and arrival weather (affects holds, diversions, missed approaches). Freezing precipitation below 0C means active de-icing with reduced holdover times. Thunderstorms can halt ground operations entirely.
5. NETWORK HEALTH: High cancellation rates mean displaced crews, gate shortages, and rebooking chaos. When a hub's OTP is below 50%, the system is in IRROPS mode — expect cascading effects on staffing and equipment.
6. TIME-OF-DAY: Morning flights have the best on-time performance (fresh aircraft, rested crews, minimal accumulated delays). By evening, network delays have compounded. Flights after 7pm local inherit the day's cumulative disruptions.
7. CONNECTIONS: If the passenger has a connecting flight, assess delay impact on the connection. A 15-min delay on a 45-min connection is a potential misconnect. Flag it directly.

For LOW-risk flights with clean conditions, say so — don't manufacture concern. State "the outlook is favorable" and briefly note why.

Deliver 3-5 sentences of direct, specific analysis. Use the language of airline operations: turnaround, block time, acceptance rate, ground hold, gate availability, crew legality. No hedging — state probabilities clearly: "likely," "probable," "unlikely." Write in plain text only — no markdown, no headers, no bold, no bullet points.`,
      messages: [{ role: 'user', content: lines.join('\n') }],
    });

    const text = message.content[0]?.type === 'text' ? message.content[0].text : 'Unable to generate analysis.';

    // Cache the result
    cache.set(key, text);

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ explanation: text, cached: false });
  } catch (e: any) {
    console.error('Delay explain API error:', e);
    if (e.status === 401) return res.status(503).json({ error: 'Invalid API key' });
    if (e.status === 429) return res.status(429).json({ error: 'AI rate limited — try again shortly' });
    return res.status(502).json({ error: 'AI analysis temporarily unavailable' });
  }
}

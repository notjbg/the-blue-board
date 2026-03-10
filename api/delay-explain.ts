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
    if (ctx.inbound) lines.push(`Aircraft journey: ${ctx.inbound}`);

    const message = await getClient().messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 350,
      system: `You are an expert flight operations analyst for The Blue Board, a third-party United Airlines flight tracker. You are NOT United Airlines — never say "we" or "our" when referring to the airline. Analyze the delay risk like a seasoned frequent flyer would.

Key analysis priorities:
- Inbound aircraft routing patterns and delay propagation are the strongest predictors. If the aircraft has been running late across multiple segments, explain the snowball effect and what it means for this flight. If turnaround time is tight, say so directly with specifics.
- Destination weather matters for arrival — if severe weather or IFR/LIFR conditions exist at the destination, note the risk of holds, diversions, or arrival delays.
- Time-of-day cascade effects: late afternoon and evening flights inherit accumulated network delays. If it's evening at the hub, factor that in.
- Hub disruption context: if the hub has elevated cancellation rates or widespread delays, explain what that means for this specific flight.
- For LOW-risk flights, be honest that the outlook is good — don't manufacture concern. A clean score with no flags is worth noting positively.

Give actionable insight in 3-5 sentences. Be specific about this flight's situation, not generic. Write in plain text only — no markdown, no headers, no bold, no bullet points.`,
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

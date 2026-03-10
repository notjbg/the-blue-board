import Anthropic from '@anthropic-ai/sdk';
import { createRateLimiter } from './_rate-limit.js';
import { CacheStore } from './_cache.js';

const isRateLimited = createRateLimiter('delay-explain', 20);

let client = null;
function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

const cache = new CacheStore('delay-explain', { maxSize: 200, defaultTTL: 5 * 60 * 1000 });

function getCacheKey(ctx) {
  const inboundKey = ctx.inbound ? ctx.inbound.slice(0, 100) : '';
  return `${ctx.flight}:${ctx.riskScore}:${(ctx.factors || []).join(',')}:${inboundKey}`;
}

export default async function handler(req, res) {
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
    const ctx = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
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
    if (ctx.weather) lines.push(`Weather conditions: ${ctx.weather}`);
    if (ctx.inbound) lines.push(`Aircraft journey: ${ctx.inbound}`);

    const message = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 280,
      system: `You are an expert flight operations analyst for The Blue Board, a third-party United Airlines flight tracker. You are NOT United Airlines — never say "we" or "our" when referring to the airline. Analyze the delay risk like a seasoned frequent flyer would. Prioritize inbound aircraft routing patterns and delay propagation over generic observations — if the aircraft has been running late across multiple segments, explain the snowball effect and what it means for this flight. If turnaround time is tight, say so directly with specifics. Give actionable insight in 3-5 sentences. Be specific about this flight's situation, not generic. Write in plain text only — no markdown, no headers, no bold, no bullet points.`,
      messages: [{ role: 'user', content: lines.join('\n') }],
    });

    const text = message.content[0]?.text || 'Unable to generate analysis.';

    // Cache the result
    cache.set(key, text);

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ explanation: text, cached: false });
  } catch (e) {
    console.error('Delay explain API error:', e);
    if (e.status === 401) return res.status(503).json({ error: 'Invalid API key' });
    if (e.status === 429) return res.status(429).json({ error: 'AI rate limited — try again shortly' });
    return res.status(502).json({ error: 'AI analysis temporarily unavailable' });
  }
}

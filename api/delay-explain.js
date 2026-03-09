import Anthropic from '@anthropic-ai/sdk';
import { createRateLimiter } from './_rate-limit.js';

const isRateLimited = createRateLimiter('delay-explain', 20);

let client = null;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

// Simple in-memory cache — avoids redundant AI calls for same flight state
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(ctx) {
  return `${ctx.flight}:${ctx.riskScore}:${(ctx.factors || []).join(',')}`;
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
    if (cached && Date.now() - cached.time < CACHE_TTL) {
      return res.status(200).json({ explanation: cached.text, cached: true });
    }

    // Build token-efficient prompt (~200-300 input tokens)
    const lines = [
      `You are a United Airlines operations analyst briefing a passenger. Give a concise explanation (3-5 sentences) of the delay risk for their flight. Be specific about causes and what to expect. Use a helpful, calm tone.`,
      ``,
      `Flight: ${ctx.flight} (${ctx.route || 'unknown route'})`,
      `Status: ${ctx.status || 'scheduled'}`,
      `Risk Level: ${ctx.riskLabel || 'LOW'} (score ${ctx.riskScore || 0}/100)`,
    ];
    if (ctx.factors && ctx.factors.length > 0) {
      lines.push(`Contributing factors: ${ctx.factors.join('; ')}`);
    }
    if (ctx.otp) lines.push(`Hub on-time performance: ${ctx.otp}%`);
    if (ctx.weather) lines.push(`Weather conditions: ${ctx.weather}`);
    if (ctx.inbound) lines.push(`Inbound aircraft: ${ctx.inbound}`);

    const message = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: lines.join('\n') }],
    });

    const text = message.content[0]?.text || 'Unable to generate analysis.';

    // Cache the result
    cache.set(key, { text, time: Date.now() });
    // Evict old entries periodically
    if (cache.size > 200) {
      const now = Date.now();
      for (const [k, v] of cache) {
        if (now - v.time > CACHE_TTL) cache.delete(k);
      }
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ explanation: text, cached: false });
  } catch (e) {
    console.error('Delay explain API error:', e);
    if (e.status === 401) return res.status(503).json({ error: 'Invalid API key' });
    if (e.status === 429) return res.status(429).json({ error: 'AI rate limited — try again shortly' });
    return res.status(502).json({ error: 'AI analysis temporarily unavailable' });
  }
}

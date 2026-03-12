import type { VercelRequest, VercelResponse } from './types.js';
import { createRateLimiter } from './_rate-limit.js';
import { supabase } from './_supabase.js';

// 5 submissions per IP per hour → ~5 per 60 minutes
// Rate limiter works in 60s windows, so allow 5 per 60s window
// For hourly semantics we use a tighter per-minute limit
const isRateLimited = createRateLimiter('waitlist', 5);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  const origin = req.headers?.origin || '';
  if (origin && origin !== 'https://theblueboard.co' && !/^http:\/\/localhost(:\d+)?$/.test(origin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.setHeader('Access-Control-Allow-Origin', origin || 'https://theblueboard.co');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (isRateLimited(req)) {
    return res.status(429).json({ error: 'Too many submissions — try again later' });
  }

  const { email, source, featureRequest } = req.body || {};

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: 'Invalid or missing email address' });
  }

  try {
    const { error } = await supabase
      .from('waitlist')
      .upsert(
        {
          email: email.trim().toLowerCase(),
          source: typeof source === 'string' ? source.slice(0, 50) : 'popup',
          feature_request: typeof featureRequest === 'string' ? featureRequest.slice(0, 500) : null,
        },
        { onConflict: 'email' }
      );

    if (error) {
      console.error('Waitlist upsert error:', error.message);
      return res.status(500).json({ error: 'Something went wrong — please try again' });
    }

    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error('Waitlist error:', e);
    return res.status(500).json({ error: 'Something went wrong — please try again' });
  }
}

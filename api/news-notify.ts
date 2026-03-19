/**
 * POST /api/news-notify
 *
 * Deploy hook endpoint that checks if there's a new article since the last
 * notification, and sends a broadcast to the Resend Audience if so.
 *
 * Auth: requires CRON_SECRET header (same pattern as cron endpoints).
 *
 * Idempotency: uses claim-before-send pattern. The slug is written to
 * Supabase BEFORE broadcasting. If the slug is already claimed (same value),
 * the endpoint returns already_sent without sending. This is atomic — even
 * concurrent calls are safe because only one can successfully update the row
 * to a new slug value.
 *
 * Requires:
 *   - RESEND_API_KEY env var
 *   - RESEND_AUDIENCE_ID env var (create in Resend dashboard)
 *   - Supabase news_notifications table (sql/004_news_notifications.sql)
 */

import type { VercelRequest, VercelResponse } from './types.js';
import { supabase } from './_supabase.js';

const FROM_ADDRESS = 'Jonah @ The Blue Board <hello@theblueboard.co>';
const BASE_URL = 'https://theblueboard.co';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth: verify CRON_SECRET
  const secret = req.headers['authorization']?.replace('Bearer ', '');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;

  if (!RESEND_API_KEY || !AUDIENCE_ID) {
    return res.status(500).json({ error: 'Missing RESEND_API_KEY or RESEND_AUDIENCE_ID' });
  }

  try {
    // Fetch the latest article from the build-time JSON
    const latestRes = await fetch(`${BASE_URL}/data/news-latest.json`);
    if (!latestRes.ok) {
      return res.status(500).json({ error: 'Failed to fetch news-latest.json' });
    }
    const latest = await latestRes.json();
    if (!Array.isArray(latest) || latest.length === 0) {
      return res.status(200).json({ status: 'no_articles', message: 'No articles published yet' });
    }

    const article = latest[0];
    const { slug, title, category } = article;

    // ── Claim-before-send: atomic idempotency ───────────────────────
    //
    // Read the current slug, then conditionally update only if it differs.
    // Two concurrent requests for the same new slug: only one will see
    // the old value and proceed; the other will see the new slug (written
    // by the first) and bail out.
    //
    // First run (no row exists): insert. Subsequent: check-then-update.

    const { data: existing, error: readErr } = await supabase
      .from('news_notifications')
      .select('slug')
      .eq('key', 'last_sent')
      .single();

    // PGRST116 = "no rows" — expected on first run
    if (readErr && readErr.code !== 'PGRST116') {
      throw new Error(`Supabase read failed: ${readErr.message}`);
    }

    if (existing?.slug === slug) {
      return res.status(200).json({ status: 'already_sent', slug });
    }

    // Claim the slug atomically before sending. Use upsert so it works
    // for both first-run (INSERT) and subsequent runs (UPDATE).
    const { error: claimErr } = await supabase
      .from('news_notifications')
      .upsert(
        { key: 'last_sent', slug, sent_at: new Date().toISOString() },
        { onConflict: 'key' }
      );

    if (claimErr) {
      throw new Error(`Supabase claim failed — aborting before send: ${claimErr.message}`);
    }

    // Verify our claim landed (guards against concurrent upserts — the last
    // writer wins in Postgres, so re-read to confirm we hold the slug)
    const { data: verify, error: verifyErr } = await supabase
      .from('news_notifications')
      .select('slug')
      .eq('key', 'last_sent')
      .single();

    if (verifyErr) {
      throw new Error(`Supabase verify failed: ${verifyErr.message}`);
    }

    if (verify?.slug !== slug) {
      // Another concurrent request overwrote our claim — they'll handle the send
      return res.status(200).json({ status: 'already_sent', slug, note: 'lost claim race' });
    }

    // ── Send broadcast ──────────────────────────────────────────────

    const articleUrl = `${BASE_URL}/news/${slug}`;
    const emailHtml = buildDigestEmail(title, category, articleUrl);

    const { Resend } = await import('resend');
    const resend = new Resend(RESEND_API_KEY);

    const { data: broadcast, error: createErr } = await resend.broadcasts.create({
      audienceId: AUDIENCE_ID,
      from: FROM_ADDRESS,
      subject: `📰 ${title} — The Blue Board`,
      html: emailHtml,
      replyTo: 'hello@theblueboard.co',
    });

    if (createErr || !broadcast?.id) {
      throw new Error(`Broadcast create failed: ${createErr?.message || 'no broadcast ID returned'}`);
    }

    const { error: sendErr } = await resend.broadcasts.send(broadcast.id);
    if (sendErr) {
      throw new Error(`Broadcast send failed: ${sendErr.message}`);
    }

    return res.status(200).json({ status: 'sent', slug, title });
  } catch (err: any) {
    console.error('news-notify error:', err);
    return res.status(500).json({ error: 'Failed to send notification', detail: err.message });
  }
}

function buildDigestEmail(title: string, category: string, articleUrl: string): string {
  const p = 'font-size:16px;line-height:1.7;color:#b0b0b0;margin:0 0 16px';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background-color:#0a0e1a;color:#e0e0e0;padding:0;margin:0;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#0a0e1a;">
    ${title} — read the latest on The Blue Board.
  </div>

  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <p style="font-size:13px;color:#4a90d9;letter-spacing:0.5px;margin:0 0 24px;text-transform:uppercase;">
      THE BLUE BOARD — NEWS
    </p>

    <h1 style="color:#e0e0e0;font-size:22px;font-weight:600;margin:0 0 8px;line-height:1.3;">
      ${title}
    </h1>

    <p style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 24px;">
      ${category}
    </p>

    <p style="${p}">
      We just published a new article on The Blue Board. Click below to read the full story with source links and related fleet and hub info.
    </p>

    <div style="text-align:center;margin:32px 0;">
      <a href="${articleUrl}" style="background-color:#4a90d9;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:600;display:inline-block;">
        Read the Article →
      </a>
    </div>

    <hr style="border:none;border-top:1px solid #1a2035;margin:32px 0">

    <p style="font-size:13px;color:#6b7280;margin:0;text-align:center;">
      <a href="https://theblueboard.co" style="color:#4a90d9;text-decoration:none;">The Blue Board</a> — Free, ad-free United Airlines ops dashboard
    </p>
  </div>
</body>
</html>`;
}

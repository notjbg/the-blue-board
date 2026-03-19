-- Tracks the last article slug that was emailed to the waitlist.
-- Used by api/news-notify.ts to avoid duplicate sends.
-- Single-row table: only one record with key = 'last_sent'.

CREATE TABLE IF NOT EXISTS news_notifications (
  key TEXT PRIMARY KEY DEFAULT 'last_sent',
  slug TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: only service role can read/write (server-side API only)
ALTER TABLE news_notifications ENABLE ROW LEVEL SECURITY;

-- No RLS policies = no access via anon key. Service role bypasses RLS.

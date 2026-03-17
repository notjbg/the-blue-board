CREATE TABLE waitlist (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'popup',
  feature_request TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_waitlist_email ON waitlist(email);

-- Row Level Security: anon key can only INSERT, not read
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_only" ON waitlist
  FOR INSERT TO anon
  WITH CHECK (true);

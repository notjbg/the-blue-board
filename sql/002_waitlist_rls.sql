-- Enable Row Level Security on waitlist table
-- Without RLS, anyone with the Supabase anon key can SELECT all rows
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for the waitlist signup flow)
CREATE POLICY "anon_insert_only" ON waitlist
  FOR INSERT TO anon
  WITH CHECK (true);

-- No SELECT/UPDATE/DELETE policies for anon = no reads via public API
-- Server-side access uses the service_role key which bypasses RLS

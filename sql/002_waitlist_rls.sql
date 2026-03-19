-- Idempotent RLS setup for waitlist table
-- Safe to run even if 001_waitlist.sql already enabled RLS and created the policy
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- DROP + CREATE to avoid "policy already exists" error on fresh bootstrap
-- (001_waitlist.sql may have already created this policy)
DROP POLICY IF EXISTS "anon_insert_only" ON waitlist;
CREATE POLICY "anon_insert_only" ON waitlist
  FOR INSERT TO anon
  WITH CHECK (true);

-- No SELECT/UPDATE/DELETE policies for anon = no reads via public API
-- Server-side access uses the service_role key which bypasses RLS

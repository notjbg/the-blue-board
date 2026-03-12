// Minimal Supabase client for server-side API routes
// Reads connection details from environment variables

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars missing — waitlist writes will fail');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

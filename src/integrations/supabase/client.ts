import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// IMPORTANT: these must stay pointed at the same project the server validates
// tokens against (see .env SUPABASE_URL). If the browser signs in against a
// different project than the server checks, every authenticated server call
// fails with "Unauthorized: Invalid token".
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://dtrnhnmarwgigwbaxmvb.supabase.co';

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0cm5obm1hcndnaWd3YmF4bXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNDA3MTEsImV4cCI6MjA5NDYxNjcxMX0.jz0n6t3ZqMB_m7Q8aOg_1ZYVFHY6iVfxNZ6hFCAk8-E';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

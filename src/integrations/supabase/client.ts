import { createClient } from '@supabase/supabase-js';

// NOTE FOR EDITORS (bolt.new / local IDE):
// Do NOT hardcode a different project URL here. The backend host must stay the
// same. The key name differs between environments, so we accept either
// VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY.
const env = import.meta.env as Record<string, string | undefined>;

const SUPABASE_URL = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? '';
const SUPABASE_KEY =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  env.VITE_SUPABASE_ANON_KEY ??
  env.SUPABASE_PUBLISHABLE_KEY ??
  env.SUPABASE_ANON_KEY ??
  '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_ANON_KEY',
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

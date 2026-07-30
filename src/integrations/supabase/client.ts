import { createClient } from '@supabase/supabase-js';

// Safe fallback setup that uses Lovable Cloud environment variables if available,
// or falls back safely to prevent white-screen crashes without needing a .env file.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ktnhfjblcoqnyxmrcuxf.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "public-anon-key-placeholder";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

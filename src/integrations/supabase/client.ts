import { createClient } from '@supabase/supabase-js';

// Pull the automatically managed keys directly from Vite's environment
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistentSingleTab: true,
    autoRefreshToken: true,
  }
});

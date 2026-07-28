import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://dtrnhnmarwgjwbaxmvb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "PASTE_YOUR_FULL_ORIGINAL_EYJ_KEY_HERE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
  },
});

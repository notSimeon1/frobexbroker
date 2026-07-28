import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ktnhfjblcoqnymrcuxf.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Fifj6HVB-9qtk2JsIBSNyw_QIhNs...";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
  },
});

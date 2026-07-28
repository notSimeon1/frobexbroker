import { createClient } from '@supabase/supabase-js';

// Temporary placeholder values to bypass initialization crash
const SUPABASE_URL = "https://placeholder.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "placeholder-key";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

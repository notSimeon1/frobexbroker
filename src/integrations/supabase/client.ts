import { createClient } from '@supabase/supabase-js';

// Automatically reads the managed Lovable Cloud environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

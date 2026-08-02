import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dmfdovwiczhpnqlykjix.supabase.co';

const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZmRvdndpY3pocG5xbHlraml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MzA1OTMsImV4cCI6MjEwMTEwNjU5M30.Hho5fwB9yPk_cCTAAfN9wD_yxGZIMkPagArg_RuQFXE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

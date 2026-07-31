import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

let _supabase: ReturnType<typeof createClient<Database>> | undefined;
// Keep track of whether our cached client is using fake credentials
let _usingPlaceholders = false; 

function getSupabaseClient() {
  const url = (import.meta as any).env?.VITE_SUPABASE_URL;
  const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;

  const hasRealVars = Boolean(url && key);

  // 1. If we already have a real client, just return it.
  if (_supabase && !_usingPlaceholders) {
    return _supabase;
  }

  // 2. If we have a placeholder client, and STILL don't have real vars, return the placeholder.
  if (_supabase && _usingPlaceholders && !hasRealVars) {
    return _supabase;
  }

  // 3. Otherwise, create (or recreate) the client!
  const finalUrl = url || 'https://placeholder.supabase.co';
  const finalKey = key || 'placeholder-key';
  
  _usingPlaceholders = !hasRealVars;

  if (_usingPlaceholders) {
    console.warn('[Supabase] Missing env vars. Initializing with placeholders.');
  } else {
    console.log('[Supabase] Env vars detected. Initializing real client.');
  }

  _supabase = createClient<Database>(finalUrl, finalKey, {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return _supabase;
}

// The proxy now dynamically grabs the correct client every time it's used
export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_, prop, receiver) {
    const client = getSupabaseClient();
    return Reflect.get(client, prop, receiver);
  },
});

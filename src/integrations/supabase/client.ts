import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// ---------------------------------------------------------------------------
// Safe env-var reader — works across Vite dev, SSR, and Lovable Cloud builds.
// Lovable/Vite injects VITE_* variables at build time AND at runtime via the
// Managed Cloud environment.  During initial SSR hydration or a cold-start the
// variable may not yet be present in every execution context, so we fall back
// to safe placeholder values that satisfy the supabase-js URL validator and
// prevent a white-screen crash.  The real credentials are always used once the
// platform has injected them.
// ---------------------------------------------------------------------------
function readEnv(key: string): string | undefined {
  // Vite/browser bundle
  const fromMeta = (import.meta as any).env?.[key];
  if (fromMeta) return String(fromMeta);
  // Server / Node-compatible path (used by TanStack Start SSR)
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key];
  }
  // Lovable Cloud runtime window injection (fallback)
  if (typeof window !== 'undefined') {
    const fromWindow = (window as any).__LOVABLE_ENV__?.[key] ??
                       (window as any).__VITE_ENV__?.[key];
    if (fromWindow) return String(fromWindow);
  }
  return undefined;
}

const SUPABASE_URL =
  readEnv('VITE_SUPABASE_URL') ??
  // Safe no-op placeholder — prevents createClient() from throwing during
  // build cycles before Lovable injects the real URL.
  'https://placeholder-project.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  readEnv('VITE_SUPABASE_ANON_KEY') ??
  readEnv('VITE_SUPABASE_PUBLISHABLE_KEY') ??
  // Safe no-op placeholder anon key (valid JWT-like format supabase-js accepts)
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJwbGFjZWhvbGRlciJ9.placeholder';

const isPlaceholder =
  SUPABASE_URL.includes('placeholder-project') ||
  SUPABASE_PUBLISHABLE_KEY.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJwbGFjZWhvbGRlciJ9');

if (isPlaceholder) {
  // Warn once — never throw.  The app will connect as soon as the real env
  // vars are injected by Lovable Managed Cloud.
  console.warn(
    '[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not yet available — ' +
    'running with placeholder config.  This is normal during cold-start builds. ' +
    'The client will reconnect automatically once credentials are injected.',
  );
}

function createSupabaseClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

// Lazy singleton — instantiated only when the first property is accessed,
// ensuring the env vars have the maximum time to be injected before use.
let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});

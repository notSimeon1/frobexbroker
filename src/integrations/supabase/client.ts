import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Dummy client that prevents app startup crashes
const realClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistentSingleTab: true,
    autoRefreshToken: true,
  }
});

export const mockAuth = {
  getUser: () => {
    const user = localStorage.getItem('mock_user');
    return user ? JSON.parse(user) : null;
  },
  login: (email: string) => {
    const user = { id: 'mock-user-123', email };
    localStorage.setItem('mock_user', JSON.stringify(user));
    return Promise.resolve({ data: { user, session: { user } }, error: null });
  },
  logout: () => {
    localStorage.removeItem('mock_user');
    return Promise.resolve({ error: null });
  }
};

export const supabase = new Proxy(realClient, {
  get(target, prop) {
    if (prop === 'auth') {
      return {
        getSession: async () => {
          const user = mockAuth.getUser();
          return { data: { session: user ? { user } : null }, error: null };
        },
        getUser: async () => {
          const user = mockAuth.getUser();
          return { data: { user }, error: null };
        },
        onAuthStateChange: (callback: Function) => {
          const user = mockAuth.getUser();
          if (user) callback('SIGNED_IN', { user });
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
        signInWithPassword: async ({ email }: { email: string }) => mockAuth.login(email),
        signOut: async () => mockAuth.logout(),
      };
    }
    
    // Safety fallback for database queries
    if (prop === 'from') {
      return () => ({
        select: () => Promise.resolve({ data: [], error: null }),
        insert: () => Promise.resolve({ data: [], error: null }),
        update: () => Promise.resolve({ data: [], error: null }),
        delete: () => Promise.resolve({ data: [], error: null }),
        single: () => Promise.resolve({ data: null, error: null }),
      });
    }

    return (target as any)[prop];
  }
});

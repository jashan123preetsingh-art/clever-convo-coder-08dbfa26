import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  profile: any | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    isAdmin: false,
    profile: null,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const user = session?.user ?? null;
        let isAdmin = false;
        let profile = null;

        if (user) {
          // Fetch profile & roles with setTimeout to avoid deadlock
          setTimeout(async () => {
            const [profileRes, roleRes] = await Promise.all([
              supabase.from('profiles').select('*').eq('id', user.id).single(),
              supabase.from('user_roles').select('role').eq('user_id', user.id),
            ]);
            profile = profileRes.data;
            isAdmin = roleRes.data?.some((r: any) => r.role === 'admin') ?? false;
            setState({ user, session, loading: false, isAdmin, profile });
          }, 0);
        }

        setState(prev => ({ ...prev, user, session, loading: false }));
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setState(prev => ({ ...prev, loading: false }));
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setState({ user: null, session: null, loading: false, isAdmin: false, profile: null });
  };

  return { ...state, signOut };
}

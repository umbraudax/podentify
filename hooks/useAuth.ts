import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { AuthUser } from '@/lib/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      
      if (error) {
        console.error('Error getting session:', error);
        setError(error.message);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
        setError(null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      setError(null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    setError(null);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    
    if (error) {
      setError(error.message);
    }
    
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    setError(null);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      setError(error.message);
    }
    
    return { data, error };
  };

  const signOut = async () => {
    setError(null);
    
    // Reset theme to light mode before signing out
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    
    // Clear all theme-related localStorage to ensure fresh start
    try {
      localStorage.removeItem('darkMode');
      localStorage.removeItem('theme');
      // Remove any per-user cached theme mapping
      const userId = user?.id;
      if (userId) {
        localStorage.removeItem(`user-theme:${userId}` as const);
      }
      localStorage.removeItem('theme');
      // Also clear any other potential theme keys
      localStorage.removeItem('color-scheme');
      localStorage.removeItem('theme-preference');
      // Clear theme cookie
      document.cookie = 'theme=; path=/; max-age=0; samesite=lax';
    } catch (err) {
      console.error('Error clearing theme from localStorage:', err);
    }
    
    // Perform a robust sign-out that also revokes refresh tokens server-side
    // and defensively clears any lingering client-side tokens to avoid
    // instant rehydration on next load (notably in production).
    let signOutError: Error | null = null;
    try {
      // Prefer global sign-out to invalidate all refresh tokens
      const { error } = await supabase.auth.signOut({ scope: 'global' as any });
      if (error) {
        signOutError = error;
      }
    } catch (err) {
      // Capture unexpected errors but continue with local cleanup
      signOutError = err instanceof Error ? err : new Error('Unknown sign-out error');
    }

    try {
      // Hard clear any Supabase auth tokens from localStorage (defensive)
      // Keys typically look like: sb-<project-ref>-auth-token, sb-<project-ref>-provider-token
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key.startsWith('sb-') || key.includes('supabase') || key.endsWith('-auth-token') || key.endsWith('-provider-token')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => {
        try { localStorage.removeItem(k); } catch {}
      });

      // Best-effort clear any auth cookies that might exist (when using helpers)
      // Common names: sb-access-token, sb-refresh-token
      const cookiePairs = document.cookie.split(';');
      for (const pair of cookiePairs) {
        const name = pair.split('=')[0]?.trim();
        if (!name) continue;
        if (name.startsWith('sb-') || name.includes('supabase')) {
          // Clear for current path
          document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
          // Attempt domain-level clear (best effort; may be ignored if domain mismatch)
          try {
            const hostParts = window.location.hostname.split('.');
            if (hostParts.length > 2) {
              const baseDomain = hostParts.slice(-2).join('.');
              document.cookie = `${name}=; path=/; domain=.${baseDomain}; max-age=0; samesite=lax`;
            }
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Defensive token cleanup encountered an error:', err);
    }

    // Locally reset auth state immediately to avoid UI flicker
    setSession(null);
    setUser(null);

    if (signOutError) {
      setError(signOutError.message);
    }
    
    return { error: signOutError };
  };

  const resetPassword = async (email: string) => {
    setError(null);
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    
    if (error) {
      setError(error.message);
    }
    
    return { data, error };
  };

  return {
    user,
    session,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };
}
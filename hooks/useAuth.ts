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
    
    // Clear all theme-related localStorage to ensure fresh start
    try {
      localStorage.removeItem('darkMode');
      localStorage.removeItem('theme');
      // Also clear any other potential theme keys
      localStorage.removeItem('color-scheme');
      localStorage.removeItem('theme-preference');
    } catch (err) {
      console.error('Error clearing theme from localStorage:', err);
    }
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      setError(error.message);
    }
    
    return { error };
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
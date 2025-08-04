import { useState, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';

interface UserCredits {
  user_id: string;
  current_credits: number;
  monthly_credits: number;
  last_credit_refresh: string | null;
  total_earned_credits: number;
  total_used_credits: number;
  created_at: string | null;
  updated_at: string | null;
}

export function useCredits() {
  const { user, loading: authLoading } = useAuth();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedForUserRef = useRef<string | null>(null);

  const fetchCredits = async (userId: string) => {
    // Prevent duplicate fetches for the same user
    if (fetchedForUserRef.current === userId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log(`useCredits: Fetching credits for user ${userId}`);

      // Mark that we're fetching for this user
      fetchedForUserRef.current = userId;

      // First try to get credits normally
      const { data, error: creditsError } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', userId)
        .single();

      console.log('useCredits: Credits query result:', { data, error: creditsError });

      if (creditsError && creditsError.code !== 'PGRST116') {
        console.error('useCredits: Credits query error:', creditsError);
        throw creditsError;
      }

      if (data) {
        console.log('useCredits: Credits found:', data);
        setCredits(data);
      } else {
        // If no credits found, try to initialize them via API
        console.log('useCredits: No credits found, attempting to initialize...');
        
        const { data: { session } } = await supabase.auth.getSession();
        console.log('useCredits: Session check:', { hasSession: !!session, hasToken: !!session?.access_token });
        
        if (!session?.access_token) {
          throw new Error('No valid session for credit initialization');
        }

        console.log('useCredits: Calling initialize-credits API...');
        const response = await fetch('/api/initialize-credits', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        const result = await response.json();
        console.log('useCredits: Initialize API response:', { status: response.status, result });

        if (!response.ok) {
          throw new Error(result.error || 'Failed to initialize credits');
        }

        if (result.success && result.credits) {
          console.log('useCredits: Credits initialized successfully:', result.credits);
          setCredits(result.credits);
        } else {
          console.error('useCredits: Credits initialization failed:', result);
          setError('Failed to initialize credits');
        }
      }
    } catch (err) {
      console.error('useCredits: Error fetching/initializing credits:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Reset the fetch tracker so we can try again
      fetchedForUserRef.current = null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      console.log('useCredits: Auth still loading, waiting...');
      return;
    }

    if (user?.id) {
      // User is authenticated - fetch credits if we haven't already for this user
      console.log('useCredits: User authenticated:', user.id);
      fetchCredits(user.id);
    } else {
      // No user - clear everything
      console.log('useCredits: No user, clearing credits');
      setCredits(null);
      setError(null);
      setLoading(false);
      fetchedForUserRef.current = null;
    }
  }, [user?.id, authLoading]);

  const refresh = () => {
    if (user?.id) {
      // Reset the fetch tracker to allow refetch
      fetchedForUserRef.current = null;
      fetchCredits(user.id);
    }
  };

  const getCreditStatus = () => {
    if (!credits) return 'unknown';
    if (credits.current_credits <= 0) return 'insufficient';
    if (credits.current_credits < 10) return 'low';
    return 'sufficient';
  };

  return {
    credits,
    loading,
    error,
    refresh,
    getCreditStatus
  };
} 
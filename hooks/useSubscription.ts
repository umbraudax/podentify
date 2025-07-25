import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { getProductByPriceId } from '@/src/stripe-config';
import { Subscription } from '@/lib/types';

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;
    
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    fetchSubscription().then(() => {
      if (mounted) {
        // Subscription fetched successfully
      }
    });
    
    return () => {
      mounted = false;
    };
  }, [user]);

  const fetchSubscription = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Check if the view exists first
      const { data, error } = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        // If the view doesn't exist, set subscription to null without error
        if (error.code === '42P01') {
          console.warn('Stripe views not available - user may need to connect to Supabase');
          setSubscription(null);
          return;
        } else {
          console.error('Error fetching subscription:', error.message);
          throw error;
        }
      }

      setSubscription(data || null);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription');
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionPlan = () => {
    if (!subscription || !subscription.price_id) {
      return null;
    }

    const product = getProductByPriceId(subscription.price_id);
    return product ? product.name : 'Unknown Plan';
  };

  const isActive = () => {
    return subscription?.subscription_status === 'active';
  };

  const isPastDue = () => {
    return subscription?.subscription_status === 'past_due';
  };

  const isCanceled = () => {
    return subscription?.subscription_status === 'canceled';
  };

  const willCancelAtPeriodEnd = () => {
    return subscription?.cancel_at_period_end === true;
  };

  const refreshSubscription = async () => {
    await fetchSubscription();
  };

  return {
    subscription,
    loading,
    error,
    refetch: fetchSubscription,
    refresh: refreshSubscription,
    getSubscriptionPlan,
    isActive,
    isPastDue,
    isCanceled,
    willCancelAtPeriodEnd,
  };
}
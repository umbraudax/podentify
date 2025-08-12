import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { getPlanNameByPriceId } from '@/src/stripe-config';
import { Subscription } from '@/lib/types';

// Utility function for exponential backoff delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const { user } = useAuth();

  const fetchSubscription = useCallback(async (retryCount = 0) => {
    if (!user) return;
    
    // Prevent excessive retries
    if (retryCount > 3) {
      console.error('Max retries exceeded for subscription fetch');
      setError('Unable to load subscription data. Please refresh the page.');
      setLoading(false);
      return;
    }

    try {
      if (retryCount === 0) {
        setLoading(true);
        setError(null);
        // Optimistically hydrate from cache to prevent UI flicker
        try {
          const cached = localStorage.getItem(`sub:${user.id}`);
          if (cached) {
            const parsed = JSON.parse(cached) as Subscription;
            setSubscription(parsed);
          }
        } catch {}
      } else {
        setIsRetrying(true);
      }
      
      // Add exponential backoff for retries
      if (retryCount > 0) {
        const delayMs = Math.min(1000 * Math.pow(2, retryCount - 1), 5000); // Max 5s delay
        console.log(`Retrying subscription fetch (attempt ${retryCount + 1}) after ${delayMs}ms delay`);
        await delay(delayMs);
      }
      
      // Get user's Stripe customer information
      const { data: customer, error: customerError } = await supabase
        .from('stripe_customers')
        .select('customer_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (customerError) {
        // Check for specific error types that should trigger retry
        if (customerError.message?.includes('Failed to fetch') || 
            customerError.message?.includes('ERR_INSUFFICIENT_RESOURCES') ||
            customerError.message?.includes('network')) {
          console.warn(`Network error on attempt ${retryCount + 1}:`, customerError);
          return fetchSubscription(retryCount + 1);
        }
        
        console.error('Error fetching customer:', customerError);
        throw new Error('Failed to fetch customer information');
      }

      if (!customer?.customer_id) {
        // User doesn't have a Stripe customer record, so no subscription
        setSubscription(null);
        return;
      }

      // Get the most recent subscription data from Stripe tables
      // Include active, trialing, and past_due as valid subscription states
      const { data: stripeSubscription, error: subscriptionError } = await supabase
        .from('stripe_subscriptions')
        .select('*')
        .eq('customer_id', customer.customer_id)
        .in('status', ['active', 'trialing', 'past_due'])
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (subscriptionError) {
        // Check for specific error types that should trigger retry
        if (subscriptionError.message?.includes('Failed to fetch') || 
            subscriptionError.message?.includes('ERR_INSUFFICIENT_RESOURCES') ||
            subscriptionError.message?.includes('network')) {
          console.warn(`Network error on subscription fetch attempt ${retryCount + 1}:`, subscriptionError);
          return fetchSubscription(retryCount + 1);
        }
        
        console.error('Error fetching subscription:', subscriptionError);
        throw new Error('Failed to fetch subscription information');
      }

      if (stripeSubscription) {
        // Valid subscription found
        const processedSubscription: Subscription = {
          customer_id: stripeSubscription.customer_id,
          subscription_id: stripeSubscription.subscription_id,
          subscription_status: stripeSubscription.status,
          price_id: stripeSubscription.price_id,
          current_period_start: stripeSubscription.current_period_start,
          current_period_end: stripeSubscription.current_period_end,
          cancel_at_period_end: stripeSubscription.cancel_at_period_end ?? false,
          payment_method_brand: stripeSubscription.payment_method_brand,
          payment_method_last4: stripeSubscription.payment_method_last4,
        };
        setSubscription(processedSubscription);
        // Cache latest subscription for fast reloads
        try { localStorage.setItem(`sub:${user.id}`, JSON.stringify(processedSubscription)); } catch {}
      } else {
        // No valid subscription found
        setSubscription(null);
        try { localStorage.removeItem(`sub:${user.id}`); } catch {}
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription');
      setSubscription(null);
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;
    
    if (!user) {
      setSubscription(null);
      setLoading(false);
      try { localStorage.removeItem('sub:null'); } catch {}
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
  }, [user, fetchSubscription]);

  const getSubscriptionPlan = useCallback(() => {
    if (!subscription?.price_id) {
      return 'Basic';
    }
    return getPlanNameByPriceId(subscription.price_id);
  }, [subscription?.price_id]);

  const isActive = useCallback(() => {
    return subscription?.subscription_status === 'active';
  }, [subscription?.subscription_status]);

  const isPastDue = useCallback(() => {
    return subscription?.subscription_status === 'past_due';
  }, [subscription?.subscription_status]);

  const isCanceled = useCallback(() => {
    return subscription?.subscription_status === 'canceled';
  }, [subscription?.subscription_status]);

  const isTrialing = useCallback(() => {
    return subscription?.subscription_status === 'trialing';
  }, [subscription?.subscription_status]);

  const hasValidSubscription = useCallback(() => {
    return subscription && ['active', 'trialing', 'past_due'].includes(subscription.subscription_status);
  }, [subscription]);

  const willCancelAtPeriodEnd = useCallback(() => {
    return subscription?.cancel_at_period_end === true;
  }, [subscription?.cancel_at_period_end]);

  const refresh = useCallback(async () => {
    await fetchSubscription();
  }, [fetchSubscription]);

  return {
    subscription,
    loading,
    error,
    isRetrying,
    refresh,
    getSubscriptionPlan,
    isActive,
    isPastDue,
    isCanceled,
    isTrialing,
    hasValidSubscription,
    willCancelAtPeriodEnd,
  };
}
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Sparkles, Zap, Loader2, Crown, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { stripeProducts, freePlan, getPlanNameByPriceId } from '@/src/stripe-config';
import { supabase } from '@/lib/supabase';
import { ApiResponse } from '@/lib/types';

export default function PricingSection() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { subscription, hasValidSubscription, getSubscriptionPlan } = useSubscription();
  const router = useRouter();

  const currentPlan = getSubscriptionPlan();
  const hasActiveSubscription = hasValidSubscription();

  const handleSubscribe = async (priceId: string) => {
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    setLoading(priceId);
    setError(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Please sign in to continue');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          price_id: priceId,
          mode: 'subscription',
          success_url: `${window.location.origin}/success`,
          cancel_url: `${window.location.origin}/#pricing`,
        }),
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data: ApiResponse = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.data?.url) {
        window.location.href = data.data.url;
      } else if ((data as any).url) {
        window.location.href = (data as any).url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Please try again.';
      setError(`Failed to start checkout: ${errorMessage}`);
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = () => {
    router.push('/account/settings');
  };

  return (
    <section id="pricing" className="py-16 sm:py-20 bg-surface-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16" data-reveal>
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3 sm:mb-4">
            Simple, Credit-Based Pricing
          </h2>
          <p className="text-base sm:text-xl text-text-secondary max-w-3xl mx-auto">
            Pay only for what you use. 1 credit = 1 minute of transcription. 60 credits = $1.
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-error/10 border border-error/20 rounded-lg text-error text-center max-w-md mx-auto">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {/* Free Plan */}
          <Card className="border-2 border-border hover:border-muted transition-colors relative" data-reveal data-reveal-delay="0">
            <CardHeader className="text-center pb-6 sm:pb-8">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-text-primary">Basic</CardTitle>
              <div className="text-3xl sm:text-4xl font-bold text-text-primary mt-3 sm:mt-4">
                Free
              </div>
              <p className="text-text-secondary">Perfect for getting started</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3">
                {freePlan.features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-success flex-shrink-0" />
                    <span className="text-text-secondary">{feature}</span>
                  </li>
                ))}
              </ul>
              {currentPlan === 'Basic' ? (
                <Button className="w-full bg-success hover:bg-success/90" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => router.push('/auth/signin')}
                >
                  Get Started Free
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="border-2 border-brand-primary relative shadow-xl bg-surface-primary" data-reveal data-reveal-delay="100">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-brand-primary text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold">
                Most Popular
              </span>
            </div>
            <CardHeader className="text-center pb-6 sm:pb-8">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-primary rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-text-primary">Pro</CardTitle>
              <div className="text-3xl sm:text-4xl font-bold text-text-primary mt-3 sm:mt-4">
                $14.99
                <span className="text-base sm:text-lg font-normal text-text-secondary">/month</span>
              </div>
              <p className="text-text-secondary">For regular podcasters</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3">
                {stripeProducts[0].features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-success flex-shrink-0" />
                    <span className="text-text-secondary">{feature}</span>
                  </li>
                ))}
              </ul>
              {currentPlan === 'Pro' ? (
                <Button 
                  className="w-full bg-success hover:bg-success/90"
                  onClick={handleManageSubscription}
                >
                  Manage Subscription
                </Button>
              ) : (
                <Button 
                  className="w-full bg-brand-primary hover:bg-brand-primary/90"
                  onClick={() => handleSubscribe(stripeProducts[0].priceId)}
                  disabled={loading === stripeProducts[0].priceId}
                >
                  {loading === stripeProducts[0].priceId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Upgrade to Pro
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Ultra Plan (Coming Soon) */}
          <Card className="border-2 border-purple-500/60 transition-colors relative bg-surface-primary" data-reveal data-reveal-delay="200">
            <CardHeader className="text-center pb-6 sm:pb-8">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-text-primary">Ultra</CardTitle>
              <div className="text-3xl sm:text-4xl font-bold text-text-primary mt-3 sm:mt-4 opacity-60">
                $29.99
                <span className="text-base sm:text-lg font-normal text-text-secondary">/month</span>
              </div>
              <p className="text-text-secondary">Premium plan launching soon</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3 opacity-80">
                {stripeProducts[1].features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-success flex-shrink-0" />
                    <span className="text-text-secondary">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full bg-gray-300 text-gray-700 dark:bg-gray-700 dark:text-gray-300 opacity-70 cursor-not-allowed"
                disabled
                aria-disabled="true"
              >
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Credit Explanation */}
        <div className="mt-16 text-center" data-reveal data-reveal-delay="100">
          <div className="bg-surface-primary rounded-lg p-8 max-w-4xl mx-auto border border-border">
            <h3 className="text-2xl font-bold text-text-primary mb-4">How Credits Work</h3>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="text-center" data-reveal data-reveal-delay="0">
                <div className="text-3xl font-bold text-brand-primary mb-2">1:1</div>
                <p className="text-text-secondary">1 credit = 1 minute of audio transcription</p>
              </div>
              <div className="text-center" data-reveal data-reveal-delay="100">
                <div className="text-3xl font-bold text-brand-primary mb-2">$1</div>
                <p className="text-text-secondary">60 credits cost $1 (when purchasing additional credits)</p>
              </div>
              <div className="text-center" data-reveal data-reveal-delay="200">
                <div className="text-3xl font-bold text-brand-primary mb-2">Monthly</div>
                <p className="text-text-secondary">Credits roll over and stack with your monthly allocation</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
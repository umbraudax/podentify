'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Sparkles, Zap, Loader2, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { stripeProducts } from '@/src/stripe-config';
import { supabase } from '@/lib/supabase';

export default function PricingSection() {
  const [loading, setLoading] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  const handleSubscribe = async (priceId: string) => {
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    setLoading(priceId);

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
          user_id: user.id,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert(`Failed to start checkout process: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setLoading(null);
    }
  };

  const features = [
    'Unlimited episode processing',
    'AI-generated show notes',
    'Social media clip extraction',
    'SEO-optimized content',
    'Priority processing',
    'Advanced analytics',
    'Export to multiple formats',
    'Email support'
  ];

  return (
    <section id="pricing" className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the plan that fits your podcast workflow. Start free, upgrade when you&apos;re ready.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <Card className="border-2 border-gray-200 hover:border-gray-300 transition-colors">
            <CardHeader className="text-center pb-8">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-gray-600" />
              </div>
              <CardTitle className="text-2xl font-bold">Free</CardTitle>
              <div className="text-4xl font-bold text-gray-900 mt-4">
                $0
                <span className="text-lg font-normal text-gray-600">/month</span>
              </div>
              <p className="text-gray-600">Perfect for getting started</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3">
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">3 episodes per month</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Basic show notes</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">2 social clips per episode</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Community support</span>
                </li>
              </ul>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => router.push('/auth/signup')}
              >
                Get Started Free
              </Button>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="border-2 border-blue-500 relative shadow-xl">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                Most Popular
              </span>
            </div>
            <CardHeader className="text-center pb-8">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold">Pro</CardTitle>
              <div className="text-4xl font-bold text-gray-900 mt-4">
                $9.99
                <span className="text-lg font-normal text-gray-600">/month</span>
              </div>
              <p className="text-gray-600">For serious podcasters</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => handleSubscribe(stripeProducts[0].priceId)}
                disabled={loading === stripeProducts[0].priceId}
              >
                {loading === stripeProducts[0].priceId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Subscribe to Pro
              </Button>
            </CardContent>
          </Card>

          {/* Enterprise Plan */}
          <Card className="border-2 border-gray-200 hover:border-gray-300 transition-colors">
            <CardHeader className="text-center pb-8">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold">Enterprise</CardTitle>
              <div className="text-4xl font-bold text-gray-900 mt-4">
                Custom
              </div>
              <p className="text-gray-600">For large teams and networks</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3">
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Everything in Pro</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Unlimited episodes</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Team collaboration</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Custom integrations</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Dedicated support</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full">
                Contact Sales
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Frequently Asked Questions
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Can I cancel anytime?
              </h4>
              <p className="text-gray-600 text-sm">
                Yes, cancel anytime. You&apos;ll keep access until your billing period ends.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                What formats are supported?
              </h4>
              <p className="text-gray-600 text-sm">
                MP3, WAV, M4A, and more. Files up to 500MB supported.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                How accurate is the AI?
              </h4>
              <p className="text-gray-600 text-sm">
                95%+ accuracy with intelligent content structuring and editing capabilities.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Do you offer refunds?
              </h4>
              <p className="text-gray-600 text-sm">
                Yes, we offer a 30-day money-back guarantee for all subscriptions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
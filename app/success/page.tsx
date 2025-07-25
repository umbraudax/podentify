'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

export default function SuccessPage() {
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { refresh: refreshSubscription } = useSubscription();
  const router = useRouter();

  useEffect(() => {
    // Simulate a brief loading period to allow webhook processing
    const timer = setTimeout(async () => {
      // Refresh subscription status after checkout
      if (refreshSubscription) {
        await refreshSubscription();
      }
      setLoading(false);
    }, 3000); // Give webhooks more time to process

    return () => clearTimeout(timer);
  }, [refreshSubscription]);

  useEffect(() => {
    if (!user && !loading) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Processing your subscription...</h2>
          <p className="text-gray-600">This will just take a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        <Card className="shadow-2xl border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-600 to-blue-600 text-white py-12">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold mb-4">
              Welcome to Podtentify Pro!
            </CardTitle>
            <p className="text-green-100 text-lg">
              Your subscription is now active and ready to use.
            </p>
          </CardHeader>
          
          <CardContent className="py-12 space-y-8">
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">
                🎉 You&apos;re all set! Here&apos;s what you get:
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4 text-left">
                <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                  <span className="font-medium text-gray-900">Unlimited episodes</span>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                  <span className="font-medium text-gray-900">AI show notes</span>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                  <Sparkles className="w-6 h-6 text-green-600" />
                  <span className="font-medium text-gray-900">Social media clips</span>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-orange-50 rounded-lg">
                  <Sparkles className="w-6 h-6 text-orange-600" />
                  <span className="font-medium text-gray-900">Priority processing</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h4 className="font-bold text-gray-900 mb-3">Next Steps:</h4>
              <ol className="text-left space-y-2 text-gray-700">
                <li className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  <span>Upload your first episode to the dashboard</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  <span>Let our AI generate your show notes and clips</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  <span>Download and share your content</span>
                </li>
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 px-8"
                onClick={() => router.push('/dashboard')}
              >
                Go to Dashboard
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="px-8"
                onClick={() => router.push('/')}
              >
                Back to Home
              </Button>
            </div>

            <div className="text-sm text-gray-500">
              Need help getting started? Check out our{' '}
              <a href="#help" className="text-blue-600 hover:text-blue-700 font-medium">
                quick start guide
              </a>{' '}
              or{' '}
              <a href="#contact" className="text-blue-600 hover:text-blue-700 font-medium">
                contact support
              </a>
              .
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
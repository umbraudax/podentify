'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useCredits } from '@/hooks/useCredits';
import { CheckCircle, Loader2, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SuccessPage() {
  const { user, loading: authLoading } = useAuth();
  const { refresh: refreshSubscription } = useSubscription();
  const { refresh: refreshCredits } = useCredits();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(true);
  const [refreshComplete, setRefreshComplete] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (user && !refreshComplete) {
      // Refresh subscription and credits data after successful payment
      const refreshData = async () => {
        try {
          setRefreshing(true);
          
          // Wait a moment to ensure webhooks have processed
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Refresh both subscription and credits data
          await Promise.all([
            refreshSubscription(),
            refreshCredits()
          ]);
          
          setRefreshComplete(true);
          
          // Auto-redirect to dashboard after a moment
          setTimeout(() => {
            router.push('/dashboard');
          }, 3000);
          
        } catch (error) {
          console.error('Error refreshing data:', error);
          setRefreshComplete(true);
        } finally {
          setRefreshing(false);
        }
      };

      refreshData();
    }
  }, [user, authLoading, router, refreshSubscription, refreshCredits, refreshComplete]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <Card className="bg-surface-primary border-border text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-full flex items-center justify-center mb-4">
              <Mic className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-text-primary">
              Payment Successful!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <p className="text-text-secondary">
                Your subscription has been activated
              </p>
            </div>

            {refreshing && (
              <div className="flex items-center justify-center space-x-2 py-4">
                <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
                <p className="text-sm text-text-secondary">
                  Setting up your account...
                </p>
              </div>
            )}

            {refreshComplete && (
              <div className="space-y-4">
                <p className="text-sm text-text-secondary">
                  Your subscription and credits have been updated!
                </p>
                <p className="text-xs text-text-tertiary">
                  Redirecting to dashboard in a moment...
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Button 
                className="w-full bg-brand-primary hover:bg-brand-primary/90"
                onClick={() => router.push('/dashboard')}
                disabled={refreshing}
              >
                Go to Dashboard
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full border-border text-text-primary"
                onClick={() => router.push('/account/settings')}
                disabled={refreshing}
              >
                View Subscription Details
              </Button>
            </div>

            <div className="text-xs text-text-tertiary">
              <p>Questions? Contact our support team.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
'use client';

import { Crown, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { useRouter } from 'next/navigation';

export default function SubscriptionStatus() {
  const { subscription, loading, isActive, isPastDue, isCanceled, willCancelAtPeriodEnd, getSubscriptionPlan } = useSubscription();
  const router = useRouter();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const planName = getSubscriptionPlan();

  if (!subscription || !planName) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-orange-800">
            <AlertTriangle className="w-5 h-5" />
            <span>Free Plan</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-orange-700">
            You're currently on the free plan with limited features.
          </p>
          <Button 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => router.push('/pricing')}
          >
            Upgrade to Pro
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = () => {
    if (isActive()) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (isPastDue()) return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    if (isCanceled()) return <AlertTriangle className="w-5 h-5 text-red-600" />;
    return <Clock className="w-5 h-5 text-gray-600" />;
  };

  const getStatusText = () => {
    if (isActive() && willCancelAtPeriodEnd()) return 'Active (Canceling)';
    if (isActive()) return 'Active';
    if (isPastDue()) return 'Past Due';
    if (isCanceled()) return 'Canceled';
    return subscription.subscription_status;
  };

  const getStatusColor = () => {
    if (isActive() && !willCancelAtPeriodEnd()) return 'border-green-200 bg-green-50';
    if (isActive() && willCancelAtPeriodEnd()) return 'border-yellow-200 bg-yellow-50';
    if (isPastDue()) return 'border-yellow-200 bg-yellow-50';
    if (isCanceled()) return 'border-red-200 bg-red-50';
    return 'border-gray-200 bg-gray-50';
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  return (
    <Card className={getStatusColor()}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <Crown className="w-5 h-5 text-blue-600" />
          <span>{planName}</span>
          {getStatusIcon()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Status:</span>
          <span className="font-medium capitalize">{getStatusText()}</span>
        </div>
        
        {subscription.current_period_end && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Next billing:</span>
            <span className="font-medium">{formatDate(subscription.current_period_end)}</span>
          </div>
        )}

        {subscription.payment_method_brand && subscription.payment_method_last4 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Payment method:</span>
            <span className="font-medium capitalize">
              {subscription.payment_method_brand} •••• {subscription.payment_method_last4}
            </span>
          </div>
        )}

        {willCancelAtPeriodEnd() && (
          <div className="p-2 bg-yellow-100 border border-yellow-200 rounded text-xs text-yellow-800">
            Your subscription will cancel at the end of the current period.
          </div>
        )}

        {isPastDue() && (
          <Button 
            size="sm" 
            className="w-full bg-yellow-600 hover:bg-yellow-700"
            onClick={() => router.push('/pricing')}
          >
            Update Payment Method
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
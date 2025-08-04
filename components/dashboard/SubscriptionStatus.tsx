'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle, AlertTriangle, Clock, Crown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSubscription } from '@/hooks/useSubscription';

export default function SubscriptionStatus() {
  const { subscription, hasValidSubscription, isActive, isPastDue, isCanceled, willCancelAtPeriodEnd, getSubscriptionPlan, refresh } = useSubscription();
  const router = useRouter();

  const planName = getSubscriptionPlan();

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  // Helper functions for plan-specific colors
  const getPlanColors = (plan: string | null) => {
    switch (plan) {
      case 'Ultra':
        return {
          iconColor: 'text-purple-600',
          cardBorder: 'border-purple-200',
          cardBg: 'bg-purple-50',
          titleColor: 'text-purple-800',
          textColor: 'text-purple-700',
          buttonBg: 'bg-purple-600',
          buttonHover: 'hover:bg-purple-700'
        };
      case 'Pro':
        return {
          iconColor: 'text-blue-600',
          cardBorder: 'border-blue-200',
          cardBg: 'bg-blue-50',
          titleColor: 'text-blue-800',
          textColor: 'text-blue-700',
          buttonBg: 'bg-blue-600',
          buttonHover: 'hover:bg-blue-700'
        };
      default: // Basic/Free
        return {
          iconColor: 'text-gray-600',
          cardBorder: 'border-gray-200',
          cardBg: 'bg-gray-50',
          titleColor: 'text-gray-800',
          textColor: 'text-gray-700',
          buttonBg: 'bg-gray-600',
          buttonHover: 'hover:bg-gray-700'
        };
    }
  };

  if (!hasValidSubscription()) {
    const colors = getPlanColors(null);
    return (
      <Card className={`${colors.cardBorder} ${colors.cardBg}`}>
        <CardHeader className="pb-3">
          <CardTitle className={`flex items-center space-x-2 ${colors.titleColor}`}>
            <Crown className={`w-5 h-5 ${colors.iconColor}`} />
            <span>Free Plan</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className={`text-sm ${colors.textColor}`}>
            You&apos;re currently on the free plan with limited features.
          </p>
          <div className="pt-2">
            <p className={`text-xs ${colors.textColor} font-medium`}>
              • 20 monthly transcript credits
            </p>
            <p className={`text-xs ${colors.textColor} font-medium`}>
              • Chapter generation only
            </p>
            <p className={`text-xs ${colors.textColor} font-medium`}>
              • Basic support
            </p>
          </div>
          <Button 
            size="sm" 
            className={`${colors.buttonBg} ${colors.buttonHover} w-full`}
            onClick={() => router.push('/#pricing')}
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
    return subscription?.subscription_status || 'Unknown';
  };

  const getStatusColor = () => {
    if (isActive() && !willCancelAtPeriodEnd()) return 'text-green-600';
    if (isPastDue()) return 'text-yellow-600';
    if (isCanceled() || willCancelAtPeriodEnd()) return 'text-red-600';
    return 'text-gray-600';
  };

  const colors = getPlanColors(planName);

  return (
    <Card className={`${colors.cardBorder} ${colors.cardBg}`}>
      <CardHeader className="pb-3">
        <CardTitle className={`flex items-center justify-between ${colors.titleColor}`}>
          <div className="flex items-center space-x-2">
            <Crown className={`w-5 h-5 ${colors.iconColor}`} />
            <span>{planName} Plan</span>
          </div>
          <div className="flex items-center space-x-1">
            {getStatusIcon()}
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className={colors.textColor}>Status:</span>
          <span className={`font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {subscription?.current_period_end && (
          <div className="flex items-center justify-between text-sm">
            <span className={colors.textColor}>Next billing:</span>
            <span className={`font-medium ${colors.textColor}`}>
              {formatDate(subscription.current_period_end)}
            </span>
          </div>
        )}

        {willCancelAtPeriodEnd() && subscription?.current_period_end && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            Will cancel on {formatDate(subscription.current_period_end)}
          </div>
        )}

        <div className="flex space-x-2 pt-2">
          <Button 
            size="sm" 
            variant="outline"
            className="flex-1"
            onClick={() => router.push('/account/settings')}
          >
            Manage
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={refresh}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
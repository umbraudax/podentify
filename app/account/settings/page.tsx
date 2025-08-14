'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { usePreferences } from '@/hooks/usePreferences';
import { User, CreditCard, Bell, Shield, ExternalLink, Moon, Sun, ArrowLeft, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { formatDate, getUserDisplayName, getPlanBadgeClasses } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export default function AccountSettings() {
  const { user, loading } = useAuth();
  const { subscription, loading: subscriptionLoading, isRetrying, hasValidSubscription, getSubscriptionPlan, refresh: refreshSubscription } = useSubscription();
  const { preferences, loading: preferencesLoading, toggleDarkMode, toggleEmailNotifications, isDarkMode, emailNotifications } = usePreferences();
  const router = useRouter();
  const [userInfo, setUserInfo] = useState({
    fullName: '',
    email: ''
  });
  const [saving, setSaving] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      setUserInfo({
        fullName: getUserDisplayName(user),
        email: user.email || ''
      });
    }
  }, [user]);

  // Separate effect for refreshing subscription data to avoid dependency loops
  useEffect(() => {
    if (user) {
      // Refresh subscription data when component mounts
      // This ensures we capture any recent subscription changes
      refreshSubscription();
    }
  }, [user]); // Only depend on user, not refreshSubscription

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // TODO: Implement profile update logic
      console.log('Saving profile:', userInfo);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user || !subscription) return;
    
    setCancelLoading(true);
    setCancelError(null);
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Please sign in to continue');
      }

      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel subscription');
      }

      const result = await response.json();
      console.log('Subscription cancelled:', result);
      
      // Refresh subscription data
      await refreshSubscription();
      
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      setCancelError(error instanceof Error ? error.message : 'Failed to cancel subscription');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    if (!user || !subscription) return;
    
    setCancelLoading(true);
    setCancelError(null);
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Please sign in to continue');
      }

      const response = await fetch('/api/subscription/cancel', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reactivate subscription');
      }

      const result = await response.json();
      console.log('Subscription reactivated:', result);
      
      // Refresh subscription data
      await refreshSubscription();
      
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      setCancelError(error instanceof Error ? error.message : 'Failed to reactivate subscription');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleDarkModeToggle = async () => {
    await toggleDarkMode();
  };

  const handleEmailNotificationsToggle = async () => {
    await toggleEmailNotifications();
  };

  // Show loading state during initial load or when all data is loading
  if (loading || preferencesLoading || (subscriptionLoading && !isRetrying)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show retry state if subscription is retrying but page can still be used
  const showRetryIndicator = isRetrying;

  if (!user) {
    return null;
  }

  const planName = getSubscriptionPlan();

  // Plan badge classes centralized
  const getPlanBadgeColors = getPlanBadgeClasses;

  const getSubscriptionStatusText = () => {
    if (!subscription) return 'No active subscription';
    
    switch (subscription.subscription_status) {
      case 'active':
        return `${planName} Plan`;
      case 'trialing':
        return `${planName} Plan (Trial)`;
      case 'past_due':
        return `${planName} Plan (Payment Due)`;
      default:
        return 'No active subscription';
    }
  };

  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* Header */}
      <div className="bg-surface-primary border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Clickable Logo */}
              <button
                onClick={() => router.push('/')}
                className="flex items-center space-x-1 hover:opacity-80 transition-opacity"
              >
                <Image src="/podentify-logo.png" alt="Podentify logo" width={40} height={40} className="w-10 h-10" />
                <span className="text-xl font-bold text-text-primary">Podentify</span>
              </button>
              <div className="border-l border-border h-8"></div>
              <div>
                <h1 className="text-3xl font-bold text-text-primary">Account Settings</h1>
                <p className="text-text-secondary mt-1">Manage your account and subscription</p>
              </div>
            </div>
            
            {/* Back to Dashboard Button */}
            <div className="flex flex-col items-center">
              <Button
                onClick={() => router.push('/dashboard')}
                variant="ghost"
                size="sm"
                className="p-2 hover:bg-surface-secondary rounded-full"
              >
                <ArrowLeft className="w-5 h-5 text-text-secondary" />
              </Button>
              <span className="text-xs text-text-tertiary mt-1">Back to Dashboard</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Profile Information */}
          <Card className="bg-surface-primary border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-text-primary">
                <User className="w-5 h-5" />
                <span>Profile Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName" className="text-text-secondary">Full Name</Label>
                  <Input
                    id="fullName"
                    value={userInfo.fullName}
                    onChange={(e) => setUserInfo({ ...userInfo, fullName: e.target.value })}
                    placeholder="Enter your full name"
                    className="bg-surface-primary border-border text-text-primary"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-text-secondary">Email Address</Label>
                  <Input
                    id="email"
                    value={userInfo.email}
                    disabled
                    className="bg-surface-secondary border-border text-text-tertiary"
                  />
                  <p className="text-xs text-text-tertiary mt-1">Email cannot be changed</p>
                </div>
              </div>
              <Button 
                className="bg-brand-primary hover:bg-brand-primary/90"
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card className="bg-surface-primary border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-text-primary">
                <Bell className="w-5 h-5" />
                <span>Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {isDarkMode ? <Moon className="w-5 h-5 text-text-secondary" /> : <Sun className="w-5 h-5 text-text-secondary" />}
                  <div>
                    <h4 className="font-medium text-text-primary">Dark Mode</h4>
                    <p className="text-sm text-text-secondary">Switch between light and dark themes</p>
                  </div>
                </div>
                <Switch 
                  checked={isDarkMode}
                  onCheckedChange={handleDarkModeToggle}
                />
              </div>
              <Separator className="border-border" />
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bell className="w-5 h-5 text-text-secondary" />
                  <div>
                    <h4 className="font-medium text-text-primary">Email Notifications</h4>
                    <p className="text-sm text-text-secondary">Receive updates about your episodes and account</p>
                  </div>
                </div>
                <Switch 
                  checked={emailNotifications}
                  onCheckedChange={handleEmailNotificationsToggle}
                />
              </div>
            </CardContent>
          </Card>

          {/* Subscription Information */}
          <Card className="bg-surface-primary border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-text-primary">
                <CreditCard className="w-5 h-5" />
                <span>Subscription</span>
                {showRetryIndicator && (
                  <div className="flex items-center space-x-2 ml-auto">
                    <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                    <span className="text-xs text-orange-600 dark:text-orange-400">Reconnecting...</span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {showRetryIndicator && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    We're having trouble connecting to our servers. Retrying automatically...
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-text-primary">Current Plan</h4>
                  <p className="text-sm text-text-secondary">
                    {getSubscriptionStatusText()}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    hasValidSubscription() 
                      ? getPlanBadgeColors(planName || 'Basic')
                      : 'bg-surface-secondary text-text-tertiary'
                  }`}>
                    {hasValidSubscription() ? `${planName} Plan` : 'Basic Plan'}
                  </span>
                </div>
              </div>
          
              {/* Show cancellation notice if subscription will be cancelled */}
              {subscription?.cancel_at_period_end && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    Your subscription will be cancelled at the end of the current billing period on{' '}
                    {subscription.current_period_end 
                      ? formatDate(subscription.current_period_end * 1000)
                      : 'N/A'
                    }. Your credits will remain unaffected.
                  </p>
                </div>
              )}

              {/* Show payment due notice for past_due subscriptions */}
              {subscription?.subscription_status === 'past_due' && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    Your payment is past due. Please update your payment method to continue using your subscription.
                  </p>
                </div>
              )}

              {/* Show error message if there's a cancellation error */}
              {cancelError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-800 dark:text-red-200">{cancelError}</p>
                </div>
              )}

              {/* Show billing info for valid subscriptions with complete data */}
              {hasValidSubscription() && subscription && (
                <>
                  <Separator className="border-border" />
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-text-secondary">Billing Period</p>
                      <p className="font-medium text-text-primary">
                        {subscription.current_period_start && subscription.current_period_end
                          ? `${formatDate(subscription.current_period_start * 1000)} - ${formatDate(subscription.current_period_end * 1000)}`
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-text-secondary">Payment Method</p>
                      <p className="font-medium text-text-primary">
                        {subscription.payment_method_brand && subscription.payment_method_last4
                          ? `${subscription.payment_method_brand.toUpperCase()} ****${subscription.payment_method_last4}`
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Show upgrade prompt for users without valid subscriptions */}
              {!hasValidSubscription() && (
                <div className="text-center py-4">
                  <p className="text-text-secondary mb-4">Subscribe to unlock all features</p>
                  <Button 
                    className="bg-brand-primary hover:bg-brand-primary/90"
                    onClick={() => router.push('/#pricing')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Plans
                  </Button>
                </div>
              )}
              
              {/* Action buttons for valid subscriptions with complete data */}
              {hasValidSubscription() && (
                <>
                  <Separator className="border-border" />
                  <div className="flex justify-end space-x-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                      onClick={() => router.push('/#pricing')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Manage Billing
                    </Button>
                    {subscription?.cancel_at_period_end ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-green-600 dark:text-green-400 border-green-300 dark:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                        onClick={handleReactivateSubscription}
                        disabled={cancelLoading}
                      >
                        {cancelLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Reactivate
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={handleCancelSubscription}
                        disabled={cancelLoading}
                      >
                        {cancelLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Cancel Subscription
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="bg-surface-primary border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-text-primary">
                <Shield className="w-5 h-5" />
                <span>Security</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-text-primary">Change Password</h4>
                  <p className="text-sm text-text-secondary">Update your account password</p>
                </div>
                <Button variant="outline" size="sm" className="border-border text-text-primary">
                  Change
                </Button>
              </div>
              <Separator className="border-border" />
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-error">Delete Account</h4>
                  <p className="text-sm text-text-secondary">Permanently delete your account and all data</p>
                </div>
                <Button variant="outline" size="sm" className="border-error/30 text-error hover:bg-error/10">
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
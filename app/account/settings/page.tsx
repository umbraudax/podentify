'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { usePreferences } from '@/hooks/usePreferences';
import { User, CreditCard, Bell, Shield, ExternalLink, Moon, Sun, Mic, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { formatDate, getUserDisplayName } from '@/lib/utils';

export default function AccountSettings() {
  const { user, loading } = useAuth();
  const { subscription, loading: subscriptionLoading, isActive, getSubscriptionPlan } = useSubscription();
  const { preferences, loading: preferencesLoading, toggleDarkMode, toggleEmailNotifications, isDarkMode, emailNotifications } = usePreferences();
  const router = useRouter();
  const [userInfo, setUserInfo] = useState({
    fullName: '',
    email: ''
  });
  const [saving, setSaving] = useState(false);

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

  const handleDarkModeToggle = async () => {
    await toggleDarkMode();
  };

  const handleEmailNotificationsToggle = async () => {
    await toggleEmailNotifications();
  };

  if (loading || subscriptionLoading || preferencesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const planName = getSubscriptionPlan();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Clickable Logo */}
              <button
                onClick={() => router.push('/')}
                className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Mic className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100">Podtentify</span>
              </button>
              <div className="border-l border-gray-300 dark:border-gray-600 h-8"></div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Account Settings</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account and subscription</p>
              </div>
            </div>
            
            {/* Back to Dashboard Button */}
            <div className="flex flex-col items-center">
              <Button
                onClick={() => router.push('/dashboard')}
                variant="ghost"
                size="sm"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </Button>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Back to Dashboard</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Profile Information */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-gray-100">
                <User className="w-5 h-5" />
                <span>Profile Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName" className="text-gray-700 dark:text-gray-300">Full Name</Label>
                  <Input
                    id="fullName"
                    value={userInfo.fullName}
                    onChange={(e) => setUserInfo({ ...userInfo, fullName: e.target.value })}
                    placeholder="Enter your full name"
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">Email Address</Label>
                  <Input
                    id="email"
                    value={userInfo.email}
                    disabled
                    className="bg-gray-50 dark:bg-gray-600 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email cannot be changed</p>
                </div>
              </div>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-gray-100">
                <Bell className="w-5 h-5" />
                <span>Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {isDarkMode ? <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" /> : <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Dark Mode</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Switch between light and dark themes</p>
                  </div>
                </div>
                <Switch 
                  checked={isDarkMode}
                  onCheckedChange={handleDarkModeToggle}
                />
              </div>
              <Separator className="border-gray-200 dark:border-gray-700" />
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Email Notifications</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Receive updates about your episodes and account</p>
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
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-gray-100">
                <CreditCard className="w-5 h-5" />
                <span>Subscription</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Current Plan</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isActive() ? `${planName} Plan` : 'No active subscription'}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isActive() 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                  }`}>
                    {isActive() ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              
              {isActive() && subscription ? (
                <>
                  <Separator className="border-gray-200 dark:border-gray-700" />
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Billing Period</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {subscription.current_period_start && subscription.current_period_end
                          ? `${formatDate(subscription.current_period_start * 1000)} - ${formatDate(subscription.current_period_end * 1000)}`
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Payment Method</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {subscription.payment_method_brand && subscription.payment_method_last4
                          ? `${subscription.payment_method_brand.toUpperCase()} ****${subscription.payment_method_last4}`
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">Subscribe to unlock all features</p>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                    onClick={() => router.push('/#pricing')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Plans
                  </Button>
                </div>
              )}
              
              {isActive() && (
                <>
                  <Separator className="border-gray-200 dark:border-gray-700" />
                  <div className="flex justify-end space-x-3">
                    <Button variant="outline" size="sm" className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Manage Billing
                    </Button>
                    {subscription?.cancel_at_period_end ? (
                      <Button variant="outline" size="sm" className="text-green-600 dark:text-green-400 border-green-300 dark:border-green-600">
                        Reactivate
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-600">
                        Cancel Subscription
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-gray-100">
                <Shield className="w-5 h-5" />
                <span>Security</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Change Password</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Update your account password</p>
                </div>
                <Button variant="outline" size="sm" className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                  Change
                </Button>
              </div>
              <Separator className="border-gray-200 dark:border-gray-700" />
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-red-600 dark:text-red-400">Delete Account</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Permanently delete your account and all data</p>
                </div>
                <Button variant="outline" size="sm" className="border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
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
import { createClient } from '@supabase/supabase-js';
import { getCreditsByPriceId } from '@/src/stripe-config';

// Create a Supabase client with service role for server operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface UserCredits {
  user_id: string;
  current_credits: number;
  monthly_credits: number;
  last_credit_refresh: string;
  total_earned_credits: number;
  total_used_credits: number;
  created_at: string;
  updated_at: string;
}

/**
 * Get user's current credit information
 */
export async function getUserCredits(userId: string): Promise<UserCredits | null> {
  const { data, error } = await supabaseAdmin
    .from('user_credits')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching user credits:', error);
    return null;
  }

  return data;
}

/**
 * Check if user has enough credits for an operation
 */
export async function hasEnoughCredits(userId: string, requiredCredits: number): Promise<boolean> {
  const credits = await getUserCredits(userId);
  return credits ? credits.current_credits >= requiredCredits : false;
}

/**
 * Deduct credits from user account (returns true if successful)
 */
export async function deductCredits(userId: string, amount: number): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('deduct_credits', {
    p_user_id: userId,
    p_amount: amount
  });

  if (error) {
    console.error('Error deducting credits:', error);
    return false;
  }

  return data; // Returns boolean from the database function
}

/**
 * Add credits to user account
 */
export async function addCredits(userId: string, amount: number, isMonthlyRefresh = false): Promise<boolean> {
  const { error } = await supabaseAdmin.rpc('add_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_is_monthly_refresh: isMonthlyRefresh
  });

  if (error) {
    console.error('Error adding credits:', error);
    return false;
  }

  return true;
}

/**
 * Refresh monthly credits based on subscription plan
 */
export async function refreshMonthlyCredits(userId: string, priceId?: string): Promise<boolean> {
  const monthlyAllocation = getCreditsByPriceId(priceId || '');
  
  const { error } = await supabaseAdmin.rpc('refresh_monthly_credits', {
    p_user_id: userId,
    p_monthly_allocation: monthlyAllocation
  });

  if (error) {
    console.error('Error refreshing monthly credits:', error);
    return false;
  }

  return true;
}

/**
 * Calculate credits needed for transcription based on duration in minutes
 */
export function calculateTranscriptionCredits(durationMinutes: number): number {
  return Math.ceil(durationMinutes); // 1 credit per minute, rounded up
}

/**
 * Check if user should get monthly credit refresh
 * Returns true if it's been more than 30 days since last refresh
 */
export async function shouldRefreshCredits(userId: string): Promise<boolean> {
  const credits = await getUserCredits(userId);
  if (!credits) return false;

  const lastRefresh = new Date(credits.last_credit_refresh);
  const now = new Date();
  const daysSinceRefresh = (now.getTime() - lastRefresh.getTime()) / (1000 * 60 * 60 * 24);
  
  return daysSinceRefresh >= 30;
}

/**
 * Initialize credits for new users
 */
export async function initializeUserCredits(userId: string): Promise<boolean> {
  const { error } = await supabaseAdmin.rpc('add_credits', {
    p_user_id: userId,
    p_amount: 20, // Free tier credits
    p_is_monthly_refresh: true
  });

  if (error) {
    console.error('Error initializing user credits:', error);
    return false;
  }

  return true;
}

/**
 * Admin function to test credit allocation for different plans
 * This helps verify that Ultra, Pro, and Basic plans get the correct credits
 */
export async function testCreditAllocation(userId: string): Promise<void> {
  console.log('Testing credit allocation for user:', userId);
  
  // Test Pro plan (1460 credits)
  const proResult = await refreshMonthlyCredits(userId, 'price_1RoxAsBKXSirmNWMGIXEqL8v');
  console.log('Pro plan credit allocation result:', proResult);
  
  let credits = await getUserCredits(userId);
  console.log('Credits after Pro allocation:', credits?.current_credits);
  
  // Test Ultra plan (3860 credits) - should ADD to existing credits
  const ultraResult = await refreshMonthlyCredits(userId, 'price_1RoxB8BKXSirmNWMja3Hs0eq');
  console.log('Ultra plan credit allocation result:', ultraResult);
  
  credits = await getUserCredits(userId);
  console.log('Credits after Ultra allocation:', credits?.current_credits);
  console.log('Expected total: 1460 + 3860 = 5320');
}

/**
 * Admin function to verify subscription webhook credit allocation
 */
export async function verifyWebhookCreditAllocation(userId: string, priceId: string): Promise<boolean> {
  console.log(`Verifying webhook credit allocation for user ${userId} with price ID ${priceId}`);
  
  const creditsBefore = await getUserCredits(userId);
  console.log('Credits before allocation:', creditsBefore?.current_credits || 0);
  
  const result = await refreshMonthlyCredits(userId, priceId);
  
  const creditsAfter = await getUserCredits(userId);
  console.log('Credits after allocation:', creditsAfter?.current_credits || 0);
  
  const expectedCredits = getCreditsByPriceId(priceId);
  const actualIncrease = (creditsAfter?.current_credits || 0) - (creditsBefore?.current_credits || 0);
  
  console.log(`Expected credit increase: ${expectedCredits}, Actual increase: ${actualIncrease}`);
  
  return actualIncrease === expectedCredits;
} 
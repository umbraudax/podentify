import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Test endpoint not available in production' }, { status: 403 });
    }

    // Get the user's session from the Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify the user's JWT and get user info
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }

    const testResults = [];

    // Test 1: Initial Pro subscription (plan change)
    console.log('Testing Pro plan allocation...');
    const { data: proResult, error: proError } = await supabaseAdmin.rpc('allocate_subscription_credits', {
      p_user_id: user.id,
      p_monthly_allocation: 1460, // Pro plan credits
      p_plan_name: 'Pro',
      p_is_plan_change: true
    });

    testResults.push({
      test: 'Pro Plan Allocation',
      result: proResult,
      error: proError,
      expected: 'Credits should be set to 1460'
    });

    // Get credits after Pro allocation
    const { data: creditsAfterPro } = await supabaseAdmin
      .from('user_credits')
      .select('current_credits, monthly_credits')
      .eq('user_id', user.id)
      .single();

    testResults.push({
      test: 'Credits After Pro',
      result: creditsAfterPro,
      expected: 'current_credits: 1460, monthly_credits: 1460'
    });

    // Test 2: Upgrade to Ultra (plan change)
    console.log('Testing Ultra plan upgrade...');
    const { data: ultraResult, error: ultraError } = await supabaseAdmin.rpc('allocate_subscription_credits', {
      p_user_id: user.id,
      p_monthly_allocation: 3860, // Ultra plan credits
      p_plan_name: 'Ultra',
      p_is_plan_change: true
    });

    testResults.push({
      test: 'Ultra Plan Upgrade',
      result: ultraResult,
      error: ultraError,
      expected: 'Credits should be set to 3860 (not added to existing)'
    });

    // Get credits after Ultra upgrade
    const { data: creditsAfterUltra } = await supabaseAdmin
      .from('user_credits')
      .select('current_credits, monthly_credits')
      .eq('user_id', user.id)
      .single();

    testResults.push({
      test: 'Credits After Ultra Upgrade',
      result: creditsAfterUltra,
      expected: 'current_credits: 3860, monthly_credits: 3860'
    });

    // Test 3: Monthly renewal (should add credits)
    console.log('Testing monthly renewal...');
    const { data: renewalResult, error: renewalError } = await supabaseAdmin.rpc('allocate_subscription_credits', {
      p_user_id: user.id,
      p_monthly_allocation: 3860, // Ultra plan credits
      p_plan_name: 'Ultra',
      p_is_plan_change: false // This is a renewal, not a plan change
    });

    testResults.push({
      test: 'Monthly Renewal',
      result: renewalResult,
      error: renewalError,
      expected: 'Credits should be added (3860 + 3860 = 7720)'
    });

    // Get final credits
    const { data: finalCredits } = await supabaseAdmin
      .from('user_credits')
      .select('current_credits, monthly_credits, total_earned_credits')
      .eq('user_id', user.id)
      .single();

    testResults.push({
      test: 'Final Credits After Renewal',
      result: finalCredits,
      expected: 'current_credits: 7720, monthly_credits: 3860'
    });

    return NextResponse.json({
      success: true,
      user_id: user.id,
      message: 'Credit allocation tests completed',
      results: testResults,
      summary: {
        expected_behavior: {
          plan_change: 'Sets credits to new plan amount',
          renewal: 'Adds monthly allocation to existing credits'
        }
      }
    });

  } catch (error) {
    console.error('Error in credit allocation test:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
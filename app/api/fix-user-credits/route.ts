import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
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

    // Use the fix function to correct this user's credits
    const { data: fixResult, error: fixError } = await supabaseAdmin.rpc('fix_user_credits_for_plan', {
      p_user_id: user.id
    });

    if (fixError) {
      console.error('Error fixing user credits:', fixError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fix credits',
        details: fixError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      result: fixResult,
      message: fixResult?.corrected 
        ? `Credits corrected from ${fixResult.credits_before} to ${fixResult.credits_after}` 
        : 'Credits were already correct'
    });

  } catch (error) {
    console.error('Unexpected error in fix-user-credits:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Admin endpoint to fix all users (only for development/testing)
export async function GET(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }

    // Get all users with plans
    const { data: userPlans, error: plansError } = await supabaseAdmin
      .from('user_plans')
      .select('user_id, plan_id');

    if (plansError) {
      return NextResponse.json({ error: 'Failed to fetch user plans' }, { status: 500 });
    }

    const results = [];
    
    for (const userPlan of userPlans || []) {
      const { data: fixResult, error: fixError } = await supabaseAdmin.rpc('fix_user_credits_for_plan', {
        p_user_id: userPlan.user_id
      });

      results.push({
        user_id: userPlan.user_id,
        plan_id: userPlan.plan_id,
        result: fixResult,
        error: fixError
      });
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} users with plans`,
      results
    });

  } catch (error) {
    console.error('Error in admin fix-all-credits:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 
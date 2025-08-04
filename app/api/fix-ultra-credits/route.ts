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

    // Check if user has an Ultra subscription
    const { data: userPlans } = await supabaseAdmin
      .from('user_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('plan_id', 'price_1RoxB8BKXSirmNWMja3Hs0eq'); // Ultra price ID

    if (!userPlans || userPlans.length === 0) {
      return NextResponse.json({ 
        error: 'User does not have an Ultra subscription',
        message: 'This fix is only for users with active Ultra subscriptions'
      }, { status: 400 });
    }

    // Check current credits
    const { data: currentCredits } = await supabaseAdmin
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const creditsBefore = currentCredits?.current_credits || 0;

    // Allocate Ultra credits (3860) using the more reliable add_credits function
    const { error: creditError } = await supabaseAdmin.rpc('add_credits', {
      p_user_id: user.id,
      p_amount: 3860, // Ultra credits
      p_is_monthly_refresh: true
    });

    if (creditError) {
      return NextResponse.json({ 
        error: 'Failed to allocate Ultra credits', 
        details: creditError.message 
      }, { status: 500 });
    }

    // Also update the monthly_credits allocation to reflect Ultra tier
    const { error: updateError } = await supabaseAdmin
      .from('user_credits')
      .update({
        monthly_credits: 3860,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to update monthly_credits allocation:', updateError);
      // Don't fail the whole operation for this
    }

    // Get updated credits
    const { data: updatedCredits } = await supabaseAdmin
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const creditsAfter = updatedCredits?.current_credits || 0;

    return NextResponse.json({ 
      success: true,
      message: 'Ultra credits allocated successfully',
      details: {
        creditsBefore,
        creditsAfter,
        creditsAdded: creditsAfter - creditsBefore,
        ultraCreditsAllocated: 3860
      }
    });

  } catch (error) {
    console.error('Fix Ultra credits API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 
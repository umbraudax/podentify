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

    // Check if user already has credits
    const { data: existingCredits, error: checkError } = await supabaseAdmin
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return NextResponse.json({ 
        error: 'Failed to check existing credits', 
        details: checkError.message 
      }, { status: 500 });
    }

    // If user already has credits, return them
    if (existingCredits) {
      return NextResponse.json({ 
        success: true, 
        credits: existingCredits,
        message: 'Credits already exist'
      });
    }

    // Initialize credits for the user
    const { error: initError } = await supabaseAdmin.rpc('add_credits', {
      p_user_id: user.id,
      p_amount: 20, // Free tier credits
      p_is_monthly_refresh: true
    });

    if (initError) {
      return NextResponse.json({ 
        error: 'Failed to initialize credits', 
        details: initError.message 
      }, { status: 500 });
    }

    // Get the newly created credits
    const { data: newCredits, error: fetchError } = await supabaseAdmin
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      return NextResponse.json({ 
        error: 'Failed to fetch new credits', 
        details: fetchError.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      credits: newCredits,
      message: 'Credits initialized successfully'
    });

  } catch (error) {
    console.error('Initialize credits API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 
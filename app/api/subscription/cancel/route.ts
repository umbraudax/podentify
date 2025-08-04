import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Stripe customer information
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .single();

    if (customerError || !customer?.customer_id) {
      return NextResponse.json({ 
        error: 'No Stripe customer found. Please contact support if you believe this is an error.' 
      }, { status: 404 });
    }

    // Get active subscription from Stripe subscriptions table
    const { data: subscriptionData, error: subscriptionError } = await supabaseAdmin
      .from('stripe_subscriptions')
      .select('*')
      .eq('customer_id', customer.customer_id)
      .eq('status', 'active')
      .single();

    if (subscriptionError || !subscriptionData?.subscription_id) {
      return NextResponse.json({ 
        error: 'No active subscription found. You may not have a subscription or it may not be active.' 
      }, { status: 404 });
    }

    // Cancel the subscription at period end via Stripe
    const subscription = await stripe.subscriptions.update(
      subscriptionData.subscription_id,
      {
        cancel_at_period_end: true,
      }
    );

    // Update the database to reflect the cancellation
    await supabaseAdmin
      .from('stripe_subscriptions')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq('customer_id', customer.customer_id);

    return NextResponse.json({
      success: true,
      message: 'Subscription will be cancelled at the end of the current billing period',
      cancel_at_period_end: true,
      current_period_end: subscriptionData.current_period_end
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json({
      error: 'Failed to cancel subscription. Please try again.'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Stripe customer information
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .single();

    if (customerError || !customer?.customer_id) {
      return NextResponse.json({ 
        error: 'No Stripe customer found. Please contact support if you believe this is an error.' 
      }, { status: 404 });
    }

    // Get subscription from Stripe subscriptions table
    const { data: subscriptionData, error: subscriptionError } = await supabaseAdmin
      .from('stripe_subscriptions')
      .select('*')
      .eq('customer_id', customer.customer_id)
      .single();

    if (subscriptionError || !subscriptionData?.subscription_id) {
      return NextResponse.json({ 
        error: 'No subscription found to reactivate.' 
      }, { status: 404 });
    }

    // Reactivate the subscription (remove cancel_at_period_end)
    const subscription = await stripe.subscriptions.update(
      subscriptionData.subscription_id,
      {
        cancel_at_period_end: false,
      }
    );

    // Update the database to reflect the reactivation
    await supabaseAdmin
      .from('stripe_subscriptions')
      .update({
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      })
      .eq('customer_id', customer.customer_id);

    return NextResponse.json({
      success: true,
      message: 'Subscription reactivated successfully',
      cancel_at_period_end: false
    });

  } catch (error) {
    console.error('Error reactivating subscription:', error);
    return NextResponse.json({
      error: 'Failed to reactivate subscription. Please try again.'
    }, { status: 500 });
  }
} 
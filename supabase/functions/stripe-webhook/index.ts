import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

import { getCreditsByPriceId } from '../../../src/stripe-config.ts';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET')!;

console.log('Environment check:', {
  hasStripeSecret: !!stripeSecret,
  hasWebhookSecret: !!stripeWebhookSecret,
  hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
  hasServiceRoleKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
});

const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Podentify Webhook',
    version: '1.0.0',
  },
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!, 
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  console.log('Webhook request received:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  // Add CORS headers to all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') ?? '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, stripe-signature, authorization',
  };

  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      console.log('Handling OPTIONS request');
      return new Response(null, { 
        status: 204,
        headers: corsHeaders
      });
    }

    if (req.method !== 'POST') {
      console.log('Invalid method:', req.method);
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders
      });
    }
    

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');
    console.log('Stripe signature present:', !!signature);

    if (!signature) {
      console.log('No Stripe signature found in headers');
      return new Response('No signature found', { 
        status: 400,
        headers: corsHeaders
      });
    }

    // get the raw body
    const body = await req.text();
    console.log('Request body length:', body.length);

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      console.log('Attempting to verify webhook signature...');
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
      console.log('Webhook signature verified successfully. Event type:', event.type);
    } catch (error: any) {
      console.error(`Webhook signature verification failed:`, {
        error: error.message,
        signature: signature.substring(0, 50) + '...',
        bodyLength: body.length,
        webhookSecretPresent: !!stripeWebhookSecret
      });
      return new Response(`Webhook signature verification failed: ${error.message}`, { 
        status: 400,
        headers: corsHeaders
      });
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { 
      status: 500,
      headers: corsHeaders
    });
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    return;
  }

  if (!('customer' in stripeData)) {
    return;
  }

  // for one time payments, we only listen for the checkout.session.completed event
  if (event.type === 'payment_intent.succeeded' && event.data.object.invoice === null) {
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`No customer received on event: ${JSON.stringify(event)}`);
  } else {
    let isSubscription = true;

    if (event.type === 'checkout.session.completed') {
      const { mode, metadata, subscription: subscriptionId } = stripeData as Stripe.Checkout.Session;

      isSubscription = mode === 'subscription';

      console.info(`Processing ${isSubscription ? 'subscription' : 'one-time payment'} checkout session`);
      console.info('Session metadata:', metadata);
      console.info('Session subscription ID:', subscriptionId);

      // Handle user plan updates for subscription checkouts
      if (isSubscription && metadata?.userId && metadata?.price_id) {
        try {
          const { error: planError } = await supabase
            .from('user_plans')
            .upsert({
              user_id: metadata.userId,
              plan_id: metadata.price_id,
              updated_at: new Date().toISOString()
            });

          if (planError) {
            console.error('Error updating user plan:', planError);
          } else {
            console.info(`Successfully updated user plan for user ${metadata.userId} to plan ${metadata.price_id}`);
          }

          // Allocate credits for the new subscription
          const monthlyCredits = getCreditsByPriceId(metadata.price_id);
          const planName = metadata.price_id === 'price_1RoxB8BKXSirmNWMja3Hs0eq' ? 'Ultra' : 
                          metadata.price_id === 'price_1RoxAsBKXSirmNWMGIXEqL8v' ? 'Pro' : 'Unknown';
          
          console.info(`Allocating ${monthlyCredits} credits for ${planName} plan (${metadata.price_id}) to user ${metadata.userId} (new subscription)`);
          
          // Use the improved credit allocation function - this is a new subscription/plan change
          const { data: allocationResult, error: creditError } = await supabase.rpc('allocate_subscription_credits', {
            p_user_id: metadata.userId,
            p_monthly_allocation: monthlyCredits,
            p_plan_name: planName,
            p_is_plan_change: true
          });

          if (creditError) {
            console.error('Error allocating credits:', creditError);
          } else {
            console.info(`Successfully allocated credits for user ${metadata.userId}:`, allocationResult);
          }

          // NOTE: subscription_id is not available in checkout.session.completed
          // It will be captured when customer.subscription.created webhook fires
          console.info(`Checkout completed for subscription purchase - subscription_id will be captured when subscription.created event fires`);

        } catch (error) {
          console.error('Error processing subscription checkout:', error);
        }
      }
    }

    // Handle subscription status changes
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
      const subscription = stripeData as Stripe.Subscription;
      
      console.info(`Processing subscription ${event.type} for subscription ${subscription.id} with status ${subscription.status}`);
      
      // Only process subscriptions that are in a "ready" state
      // Don't update database for incomplete, incomplete_expired, or other transitional states
      const readyStatuses = ['active', 'trialing', 'past_due'];
      
      if (!readyStatuses.includes(subscription.status)) {
        console.info(`Subscription ${subscription.id} has status '${subscription.status}' - waiting for ready state before updating database`);
        return;
      }
      
      console.info(`Subscription ${subscription.id} is in ready state '${subscription.status}' - proceeding with database update`);
      
      // Get the user associated with this customer
      const { data: customer } = await supabase
        .from('stripe_customers')
        .select('user_id')
        .eq('customer_id', customerId)
        .single();

      if (customer?.user_id && subscription.items.data[0]?.price?.id) {
        const priceId = subscription.items.data[0].price.id;
        
        // Update user plan
        const { error: planError } = await supabase
          .from('user_plans')
          .upsert({
            user_id: customer.user_id,
            plan_id: priceId,
            updated_at: new Date().toISOString()
          });

        if (planError) {
          console.error('Error updating user plan:', planError);
        }

        // First, try to update existing record by customer_id
        const { data: existingRecord, error: fetchError } = await supabase
          .from('stripe_subscriptions')
          .select('id, subscription_id')
          .eq('customer_id', customerId)
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching existing subscription record:', fetchError);
        }

        let subscriptionError = null;
        let paymentMethodBrand = null;
        let paymentMethodLast4 = null;

        // Retrieve payment method information
        try {
          let paymentMethodId = null;

          // First, try to get payment method from subscription's default payment method
          if (subscription.default_payment_method) {
            paymentMethodId = typeof subscription.default_payment_method === 'string' 
              ? subscription.default_payment_method 
              : subscription.default_payment_method.id;
          }

          // If no payment method on subscription, get from customer's invoice settings
          if (!paymentMethodId) {
            const customer = await stripe.customers.retrieve(customerId);
            if (customer && !customer.deleted && customer.invoice_settings?.default_payment_method) {
              paymentMethodId = typeof customer.invoice_settings.default_payment_method === 'string'
                ? customer.invoice_settings.default_payment_method
                : customer.invoice_settings.default_payment_method.id;
            }
          }

          // If still no payment method, try the latest invoice's payment method
          if (!paymentMethodId && subscription.latest_invoice) {
            const invoiceId = typeof subscription.latest_invoice === 'string' 
              ? subscription.latest_invoice 
              : subscription.latest_invoice.id;
            
            const invoice = await stripe.invoices.retrieve(invoiceId, {
              expand: ['payment_intent']
            });

            if (invoice.payment_intent && typeof invoice.payment_intent === 'object') {
              paymentMethodId = invoice.payment_intent.payment_method;
            }
          }

          // Retrieve payment method details if we found one
          if (paymentMethodId && typeof paymentMethodId === 'string') {
            console.info(`Retrieving payment method details for: ${paymentMethodId}`);
            
            const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
            
            if (paymentMethod.card) {
              paymentMethodBrand = paymentMethod.card.brand;
              paymentMethodLast4 = paymentMethod.card.last4;
              console.info(`Payment method details: ${paymentMethodBrand} ending in ${paymentMethodLast4}`);
            } else if (paymentMethod.type) {
              paymentMethodBrand = paymentMethod.type;
              console.info(`Payment method type: ${paymentMethodBrand}`);
            }
          }
        } catch (pmError) {
          console.warn('Could not retrieve payment method details:', pmError.message);
          // Continue with subscription update even if payment method retrieval fails
        }

        if (existingRecord) {
          // Update existing record
          console.info(`Updating existing subscription record for customer ${customerId} with subscription ${subscription.id}`);
          
          const { error } = await supabase
            .from('stripe_subscriptions')
            .update({
              subscription_id: subscription.id,
              price_id: priceId,
              current_period_start: subscription.current_period_start,
              current_period_end: subscription.current_period_end,
              cancel_at_period_end: subscription.cancel_at_period_end,
              payment_method_brand: paymentMethodBrand,
              payment_method_last4: paymentMethodLast4,
              status: subscription.status,
              updated_at: new Date().toISOString(),
            })
            .eq('customer_id', customerId);
          
          subscriptionError = error;
        } else {
          // Create new record
          console.info(`Creating new subscription record for customer ${customerId} with subscription ${subscription.id}`);
          
          const { error } = await supabase
            .from('stripe_subscriptions')
            .insert({
              customer_id: customerId,
              subscription_id: subscription.id,
              price_id: priceId,
              current_period_start: subscription.current_period_start,
              current_period_end: subscription.current_period_end,
              cancel_at_period_end: subscription.cancel_at_period_end,
              payment_method_brand: paymentMethodBrand,
              payment_method_last4: paymentMethodLast4,
              status: subscription.status,
              updated_at: new Date().toISOString(),
            });
          
          subscriptionError = error;
        }

        if (subscriptionError) {
          console.error('Error updating subscription in database:', subscriptionError);
        } else {
          console.info(`Successfully updated subscription ${subscription.id} in database with status ${subscription.status}`);
        }

        // Handle credit allocation for subscription changes
        if (event.type === 'customer.subscription.created' || 
            (event.type === 'customer.subscription.updated' && subscription.status === 'active')) {
          
          const monthlyCredits = getCreditsByPriceId(priceId);
          const planName = priceId === 'price_1RoxB8BKXSirmNWMja3Hs0eq' ? 'Ultra' : 
                          priceId === 'price_1RoxAsBKXSirmNWMGIXEqL8v' ? 'Pro' : 'Unknown';
          
          console.info(`Handling credit allocation for subscription ${subscription.id} - ${planName} plan`);
          
          // For subscription.created, this is a new subscription
          // For subscription.updated with active status, this could be reactivation
          const isNewSubscription = event.type === 'customer.subscription.created';
          
          const { data: allocationResult, error: creditError } = await supabase.rpc('allocate_subscription_credits', {
            p_user_id: customer.user_id,
            p_monthly_allocation: monthlyCredits,
            p_plan_name: planName,
            p_is_plan_change: isNewSubscription
          });

          if (creditError) {
            console.error('Error allocating subscription credits:', creditError);
          } else {
            console.info(`Successfully allocated credits for subscription ${subscription.id}:`, allocationResult);
          }
        }
      }
    }

    // Handle subscription cancellations
    if (event.type === 'customer.subscription.deleted') {
      const subscription = stripeData as Stripe.Subscription;
      
      console.info(`Processing subscription deletion for subscription ${subscription.id}`);
      
      // Update subscription status to canceled
      const { error: subscriptionError } = await supabase
        .from('stripe_subscriptions')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('subscription_id', subscription.id);

      if (subscriptionError) {
        console.error('Error marking subscription as canceled:', subscriptionError);
      } else {
        console.info(`Successfully marked subscription ${subscription.id} as canceled`);
      }
    }

    // Handle incomplete or failed subscriptions
    if (event.type === 'customer.subscription.updated') {
      const subscription = stripeData as Stripe.Subscription;
      const incompletedStatuses = ['incomplete_expired', 'canceled', 'unpaid'];
      
      if (incompletedStatuses.includes(subscription.status)) {
        console.info(`Processing subscription ${subscription.id} status change to ${subscription.status}`);
        
        // Update or remove subscription record for failed/incomplete subscriptions
        const { error: updateError } = await supabase
          .from('stripe_subscriptions')
          .update({
            status: subscription.status,
            updated_at: new Date().toISOString(),
          })
          .eq('subscription_id', subscription.id);

        if (updateError) {
          console.error(`Error updating subscription ${subscription.id} to status ${subscription.status}:`, updateError);
        } else {
          console.info(`Successfully updated subscription ${subscription.id} to status ${subscription.status}`);
        }
      }
    }

    const { mode, payment_status } = stripeData as Stripe.Checkout.Session;

    if (isSubscription) {
      console.info(`Subscription checkout completed for customer: ${customerId} - subscription data will be/has been synced`);
    } else if (mode === 'payment' && payment_status === 'paid') {
      try {
        // Extract the necessary information from the session
        const {
          id: checkout_session_id,
          payment_intent,
          amount_subtotal,
          amount_total,
          currency,
        } = stripeData as Stripe.Checkout.Session;

        // Insert the order into the stripe_orders table
        const { error: orderError } = await supabase.from('stripe_orders').insert({
          checkout_session_id,
          payment_intent_id: payment_intent,
          customer_id: customerId,
          amount_subtotal,
          amount_total,
          currency,
          payment_status,
          status: 'completed', // assuming we want to mark it as completed since payment is successful
        });

        if (orderError) {
          console.error('Error inserting order:', orderError);
          return;
        }
        console.info(`Successfully processed one-time payment for session: ${checkout_session_id}`);
      } catch (error) {
        console.error('Error processing one-time payment:', error);
      }
    }
  }
}

// based on the excellent https://github.com/t3dotgg/stripe-recommendations
async function syncCustomerFromStripe(customerId: string) {
  try {
    // fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    // If no subscriptions found, clean up the database
    if (subscriptions.data.length === 0) {
      console.info(`No subscriptions found for customer: ${customerId}`);
      const { error: deleteError } = await supabase
        .from('stripe_subscriptions')
        .delete()
        .eq('customer_id', customerId);

      if (deleteError) {
        console.error('Error cleaning up subscription data:', deleteError);
      }
      return;
    }

    // assumes that a customer can only have a single subscription
    const subscription = subscriptions.data[0];

    // store subscription state
    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? {
              payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
              payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : {}),
        status: subscription.status,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'customer_id',
      },
    );

    if (subError) {
      console.error('Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }
    console.info(`Successfully synced subscription for customer: ${customerId} with status: ${subscription.status}`);
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}
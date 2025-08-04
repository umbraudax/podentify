# Subscription Capture System

This document explains how the application captures and stores Stripe subscription information.

## Overview

The subscription capture system automatically stores comprehensive subscription data when users make purchases, **but only when subscriptions reach a "ready" state**. This ensures that the frontend only displays active, valid subscriptions and prevents issues with incomplete or failed payments.

## How It Works

### 1. **Checkout Process**
When a user initiates a subscription purchase:
- Checkout session creates initial record with `status: 'not_started'`
- Record includes `customer_id` but no `subscription_id` yet

### 2. **Webhook Events**
The system processes these Stripe webhook events:

#### `checkout.session.completed`
- Updates user plan in `user_plans` table
- Allocates credits for the subscription
- Logs checkout completion

#### `customer.subscription.created` ⭐ **Main Capture Event**
- **Waits for subscription to be in ready state** (`active`, `trialing`, or `past_due`)
- **Captures `subscription_id`** from Stripe subscription object
- **Retrieves payment method details** via additional API calls
- **Updates all subscription fields** in database

#### `customer.subscription.updated`
- **Status validation**: Only processes subscriptions in ready states
- Updates subscription changes (plan changes, status changes)
- Refreshes payment method information
- Handles reactivations and failures

#### `customer.subscription.deleted`
- Marks subscription as `canceled`
- Updates status in database

## Status-Based Processing ⭐

The system only updates the database when subscriptions are in **"ready" states**:

| Ready States | Description |
|--------------|-------------|
| `active` | Subscription is active and payments are being collected |
| `trialing` | Subscription is in trial period |
| `past_due` | Payment failed but subscription is still active |

**Ignored States** (will not update database):
- `incomplete` - Payment still being processed
- `incomplete_expired` - Payment failed and expired
- `canceled` - Subscription was canceled
- `unpaid` - Payment failed permanently

This ensures that:
- ✅ **Frontend only shows valid subscriptions**
- ✅ **No incomplete payment states confuse users**
- ✅ **Database stays clean and accurate**

## Database Fields Populated

The `stripe_subscriptions` table contains these fields, all automatically populated **only for ready subscriptions**:

| Field | Source | Description |
|-------|--------|-------------|
| `customer_id` | Stripe Customer | Links to stripe_customers table |
| `subscription_id` ⭐ | Stripe Subscription | Unique Stripe subscription identifier |
| `status` | Stripe Subscription | Current subscription status (ready states only) |
| `price_id` | Stripe Subscription | Price/plan identifier |
| `current_period_start` ⭐ | Stripe Subscription | Billing period start (Unix timestamp) |
| `current_period_end` ⭐ | Stripe Subscription | Billing period end (Unix timestamp) |
| `cancel_at_period_end` | Stripe Subscription | Whether subscription will cancel |
| `payment_method_brand` ⭐ | Stripe Payment Method | Card brand (visa, mastercard, etc.) |
| `payment_method_last4` ⭐ | Stripe Payment Method | Last 4 digits of payment method |

⭐ = Enhanced fields added in the latest update

## Payment Method Retrieval Logic

The webhook attempts to find payment method information in this order:

1. **Subscription's default payment method**
2. **Customer's default payment method** (from invoice settings)
3. **Latest invoice's payment method**

This ensures payment method details are captured even if they're stored in different locations within Stripe.

## Data Flow

```
User Purchase → Stripe Checkout → checkout.session.completed webhook
                      ↓
                Stripe creates subscription → customer.subscription.created webhook
                      ↓
                Status Check: Is subscription ready? (active/trialing/past_due)
                      ↓                           ↓
                  ✅ YES                      ❌ NO
                      ↓                           ↓
            Enhanced webhook captures:        Log & wait for status change
              • subscription_id                    ↓
              • billing periods           subscription.updated webhook
              • payment method details             ↓
                      ↓                    Status check again...
          Complete subscription record 
          stored in database
                      ↓
          App displays subscription via useSubscription hook
```

## Frontend Integration

The `useSubscription` hook filters for the same ready states:

```typescript
.in('status', ['active', 'trialing', 'past_due'])
```

This ensures perfect alignment between what's stored and what's displayed.

## Verification

To verify the system is working properly, check that subscription records in the `stripe_subscriptions` table have:

- ✅ `subscription_id` populated (not null)
- ✅ `status` is one of: `active`, `trialing`, or `past_due`
- ✅ `current_period_start` and `current_period_end` populated
- ✅ `payment_method_brand` and `payment_method_last4` populated (for card payments)

**No incomplete or failed subscriptions should appear in the database.**

## Troubleshooting

### Website Not Updating After Purchase
- **Most likely cause**: Subscription is still in `incomplete` status
- **Solution**: Wait for payment to complete and subscription to become `active`
- **Check**: Stripe Dashboard for subscription status
- **Timeline**: Usually completes within 1-2 minutes for card payments

### Missing `subscription_id`
- Verify `customer.subscription.created` webhook is enabled in Stripe Dashboard
- Check webhook endpoint is receiving events in Supabase Function logs
- Ensure subscription reaches `active` status (check Stripe Dashboard)

### Missing Payment Method Details
- Ensure customer has valid payment method attached in Stripe
- Check that payment method is set as default for customer or subscription

### Subscription Shows as Incomplete
- **This is normal** - incomplete subscriptions are intentionally not stored
- Wait for payment processing to complete
- If payment fails, customer will need to retry with valid payment method

## Webhook Configuration

Required webhook events in Stripe Dashboard:
- `checkout.session.completed`
- `customer.subscription.created` (CRITICAL)
- `customer.subscription.updated` (CRITICAL for status changes)
- `customer.subscription.deleted`

Webhook endpoint: `https://[your-project].supabase.co/functions/v1/stripe-webhook`

## Testing

When testing:
1. **Complete a subscription purchase**
2. **Wait 1-2 minutes** for payment processing
3. **Check Stripe Dashboard** - subscription should be `active`
4. **Check your database** - record should appear with all fields populated
5. **Check your website** - subscription details should display

If the website doesn't update immediately, this usually means the subscription is still processing payment. 
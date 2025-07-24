/*
  # Create Stripe Integration Views

  1. Views
    - `stripe_user_subscriptions`: Secure view for user subscription data
      - Joins customers and subscriptions tables
      - Filtered by authenticated user
      - Returns subscription status and payment details

    - `stripe_user_orders`: Secure view for user order history
      - Joins customers and orders tables
      - Filtered by authenticated user
      - Returns order history and payment details

  2. Security
    - Views use security invoker to respect RLS policies
    - Grant SELECT permissions to authenticated users
*/

-- Drop existing views if they exist
DROP VIEW IF EXISTS stripe_user_subscriptions;
DROP VIEW IF EXISTS stripe_user_orders;

-- Create stripe_user_subscriptions view
CREATE VIEW stripe_user_subscriptions WITH (security_invoker = true) AS
SELECT
    c.customer_id,
    s.subscription_id,
    s.status as subscription_status,
    s.price_id,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    s.payment_method_brand,
    s.payment_method_last4
FROM stripe_customers c
LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
WHERE c.user_id = auth.uid()
AND c.deleted_at IS NULL
AND (s.deleted_at IS NULL OR s.id IS NULL);

-- Grant permissions
GRANT SELECT ON stripe_user_subscriptions TO authenticated;

-- Create stripe_user_orders view
CREATE VIEW stripe_user_orders WITH (security_invoker = true) AS
SELECT
    c.customer_id,
    o.id as order_id,
    o.checkout_session_id,
    o.payment_intent_id,
    o.amount_subtotal,
    o.amount_total,
    o.currency,
    o.payment_status,
    o.status as order_status,
    o.created_at as order_date
FROM stripe_customers c
LEFT JOIN stripe_orders o ON c.customer_id = o.customer_id
WHERE c.user_id = auth.uid()
AND c.deleted_at IS NULL
AND (o.deleted_at IS NULL OR o.id IS NULL);

-- Grant permissions
GRANT SELECT ON stripe_user_orders TO authenticated;
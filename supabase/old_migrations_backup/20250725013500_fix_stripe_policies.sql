/*
  # Fix Stripe Table RLS Policies
  
  The stripe_subscriptions and stripe_customers tables are missing UPDATE and INSERT policies,
  which prevents webhooks and user updates from working properly.
  
  This migration adds the missing policies to allow:
  1. Service role (webhooks) to update subscription data
  2. Authenticated users to update their own subscription data
  3. Proper INSERT permissions for new records
*/

-- Add UPDATE policy for stripe_customers table
CREATE POLICY "Users can update their own customer data"
    ON stripe_customers
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() AND deleted_at IS NULL)
    WITH CHECK (user_id = auth.uid());

-- Add INSERT policy for stripe_customers table  
CREATE POLICY "Users can insert their own customer data"
    ON stripe_customers
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Add UPDATE policy for stripe_subscriptions table
CREATE POLICY "Users can update their own subscription data"
    ON stripe_subscriptions
    FOR UPDATE
    TO authenticated
    USING (
        customer_id IN (
            SELECT customer_id
            FROM stripe_customers
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
        AND deleted_at IS NULL
    )
    WITH CHECK (
        customer_id IN (
            SELECT customer_id
            FROM stripe_customers
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
    );

-- Add INSERT policy for stripe_subscriptions table
CREATE POLICY "Users can insert their own subscription data"
    ON stripe_subscriptions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        customer_id IN (
            SELECT customer_id
            FROM stripe_customers
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
    );

-- Add service role policies to allow webhooks to work
-- Service role should be able to update any subscription (for webhooks)
CREATE POLICY "Service role can update all subscriptions"
    ON stripe_subscriptions
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can insert all subscriptions"
    ON stripe_subscriptions
    FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can update all customers"
    ON stripe_customers
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can insert all customers"
    ON stripe_customers
    FOR INSERT
    TO service_role
    WITH CHECK (true);
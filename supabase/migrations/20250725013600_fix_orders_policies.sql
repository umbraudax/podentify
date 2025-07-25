/*
  # Fix Stripe Orders Table RLS Policies
  
  Add missing UPDATE and INSERT policies for stripe_orders table
*/

-- Add UPDATE policy for stripe_orders table
CREATE POLICY "Users can update their own order data"
    ON stripe_orders
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

-- Add INSERT policy for stripe_orders table
CREATE POLICY "Users can insert their own order data"
    ON stripe_orders
    FOR INSERT
    TO authenticated
    WITH CHECK (
        customer_id IN (
            SELECT customer_id
            FROM stripe_customers
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
    );

-- Add service role policies for orders
CREATE POLICY "Service role can update all orders"
    ON stripe_orders
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can insert all orders"
    ON stripe_orders
    FOR INSERT
    TO service_role
    WITH CHECK (true);
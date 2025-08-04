-- Add missing allocate_subscription_credits function for Stripe webhook
-- This function handles credit allocation when users upgrade/downgrade subscriptions

CREATE OR REPLACE FUNCTION allocate_subscription_credits(
  p_user_id UUID,
  p_monthly_allocation INTEGER,
  p_plan_name TEXT,
  p_is_plan_change BOOLEAN DEFAULT true
) RETURNS JSON AS $$
DECLARE
  result_json JSON;
  user_exists BOOLEAN;
  old_credits INTEGER;
  old_monthly INTEGER;
BEGIN
  -- Check if user exists in auth.users
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE id = p_user_id
  ) INTO user_exists;
  
  IF NOT user_exists THEN
    result_json := json_build_object(
      'success', false,
      'error', 'user_not_found',
      'message', 'User not found in auth.users'
    );
    RETURN result_json;
  END IF;
  
  -- Get current credit state
  SELECT 
    COALESCE(current_credits, 20),
    COALESCE(monthly_credits, 20)
  FROM user_credits 
  WHERE user_id = p_user_id
  INTO old_credits, old_monthly;
  
  -- If user doesn't have credits record, create it first
  IF old_credits IS NULL THEN
    INSERT INTO user_credits (
      user_id, 
      current_credits, 
      monthly_credits, 
      total_earned_credits,
      total_used_credits
    ) VALUES (
      p_user_id, 
      20, 
      20, 
      20,
      0
    );
    old_credits := 20;
    old_monthly := 20;
  END IF;
  
  -- Update credits based on plan change type
  IF p_is_plan_change THEN
    -- This is a plan upgrade/downgrade - allocate full monthly amount immediately
    UPDATE user_credits 
    SET 
      current_credits = p_monthly_allocation,
      monthly_credits = p_monthly_allocation,
      last_credit_refresh = now(),
      total_earned_credits = total_earned_credits + (p_monthly_allocation - old_monthly),
      updated_at = now()
    WHERE user_id = p_user_id;
    
    result_json := json_build_object(
      'success', true,
      'action', 'plan_change',
      'user_id', p_user_id,
      'plan_name', p_plan_name,
      'old_credits', old_credits,
      'old_monthly', old_monthly,
      'new_credits', p_monthly_allocation,
      'new_monthly', p_monthly_allocation,
      'message', format('Plan changed to %s with %s monthly credits', p_plan_name, p_monthly_allocation)
    );
  ELSE
    -- This is a subscription renewal - refresh to monthly allocation
    UPDATE user_credits 
    SET 
      current_credits = p_monthly_allocation,
      monthly_credits = p_monthly_allocation,
      last_credit_refresh = now(),
      updated_at = now()
    WHERE user_id = p_user_id;
    
    result_json := json_build_object(
      'success', true,
      'action', 'subscription_renewal',
      'user_id', p_user_id,
      'plan_name', p_plan_name,
      'credits_refreshed_to', p_monthly_allocation,
      'message', format('Subscription renewed for %s plan with %s monthly credits', p_plan_name, p_monthly_allocation)
    );
  END IF;
  
  RETURN result_json;
  
EXCEPTION
  WHEN OTHERS THEN
    result_json := json_build_object(
      'success', false,
      'error', 'database_error',
      'message', SQLERRM,
      'sqlstate', SQLSTATE
    );
    RETURN result_json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION allocate_subscription_credits(UUID, INTEGER, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION allocate_subscription_credits(UUID, INTEGER, TEXT, BOOLEAN) TO service_role; 
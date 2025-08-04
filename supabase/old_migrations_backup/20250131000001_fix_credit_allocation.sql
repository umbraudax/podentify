-- Fix credit allocation system to properly handle plan changes vs renewals
-- This addresses the issue where users get incorrect credits when changing plans

-- Drop existing problematic functions
DROP FUNCTION IF EXISTS allocate_subscription_credits(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS refresh_monthly_credits(UUID, INTEGER);

-- Create improved credit allocation function that properly handles different scenarios
CREATE OR REPLACE FUNCTION allocate_subscription_credits(
  p_user_id UUID,
  p_monthly_allocation INTEGER,
  p_plan_name TEXT DEFAULT 'Unknown',
  p_is_plan_change BOOLEAN DEFAULT false
) RETURNS JSON AS $$
DECLARE
  result JSON;
  user_exists BOOLEAN;
  current_user_credits INTEGER;
  current_monthly_allocation INTEGER;
  credits_before INTEGER;
  credits_after INTEGER;
BEGIN
  -- Check if user exists in auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) INTO user_exists;
  
  IF NOT user_exists THEN
    result := json_build_object(
      'success', false,
      'error', 'user_not_found',
      'message', 'User does not exist in auth.users table',
      'user_id', p_user_id
    );
    RETURN result;
  END IF;

  -- Get current credits and monthly allocation
  SELECT 
    COALESCE(current_credits, 20) as current_credits,
    COALESCE(monthly_credits, 20) as monthly_credits
  FROM user_credits 
  WHERE user_id = p_user_id 
  INTO current_user_credits, current_monthly_allocation;

  credits_before := COALESCE(current_user_credits, 20);

  -- Handle different scenarios
  IF p_is_plan_change THEN
    -- For plan changes, set credits to the new plan's allocation
    -- This handles upgrades (Basic->Pro->Ultra) and downgrades properly
    INSERT INTO user_credits (user_id, current_credits, monthly_credits, total_earned_credits, last_credit_refresh)
    VALUES (p_user_id, p_monthly_allocation, p_monthly_allocation, p_monthly_allocation, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      current_credits = p_monthly_allocation,
      monthly_credits = p_monthly_allocation,
      total_earned_credits = GREATEST(user_credits.total_earned_credits, p_monthly_allocation),
      last_credit_refresh = NOW();
      
    credits_after := p_monthly_allocation;
    
    result := json_build_object(
      'success', true,
      'action', 'plan_change',
      'user_id', p_user_id,
      'plan_name', p_plan_name,
      'credits_before', credits_before,
      'credits_after', credits_after,
      'monthly_allocation', p_monthly_allocation,
      'message', format('Plan changed to %s - credits set to %s', p_plan_name, p_monthly_allocation),
      'timestamp', NOW()
    );
  ELSE
    -- For monthly renewals, add the monthly allocation to existing credits
    INSERT INTO user_credits (user_id, current_credits, monthly_credits, total_earned_credits, last_credit_refresh)
    VALUES (p_user_id, p_monthly_allocation, p_monthly_allocation, p_monthly_allocation, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      current_credits = user_credits.current_credits + p_monthly_allocation,
      monthly_credits = p_monthly_allocation,
      total_earned_credits = user_credits.total_earned_credits + p_monthly_allocation,
      last_credit_refresh = NOW();

    credits_after := credits_before + p_monthly_allocation;
    
    result := json_build_object(
      'success', true,
      'action', 'monthly_renewal',
      'user_id', p_user_id,
      'plan_name', p_plan_name,
      'credits_before', credits_before,
      'credits_after', credits_after,
      'credits_added', p_monthly_allocation,
      'monthly_allocation', p_monthly_allocation,
      'message', format('Monthly renewal for %s - added %s credits', p_plan_name, p_monthly_allocation),
      'timestamp', NOW()
    );
  END IF;

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false,
      'error', SQLSTATE,
      'message', SQLERRM,
      'user_id', p_user_id,
      'plan_name', p_plan_name
    );
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to fix existing users with incorrect credit amounts
CREATE OR REPLACE FUNCTION fix_user_credits_for_plan(
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  result JSON;
  user_plan_id TEXT;
  correct_credits INTEGER;
  user_current_credits INTEGER;
BEGIN
  -- Get user's current plan
  SELECT plan_id FROM user_plans WHERE user_id = p_user_id INTO user_plan_id;
  
  -- Determine correct credit amount based on plan
  correct_credits := CASE 
    WHEN user_plan_id = 'price_1RoxB8BKXSirmNWMja3Hs0eq' THEN 3860 -- Ultra
    WHEN user_plan_id = 'price_1RoxAsBKXSirmNWMGIXEqL8v' THEN 1460 -- Pro
    ELSE 20 -- Basic/Free
  END;
  
  -- Get current credits - fixed ambiguous column reference
  SELECT COALESCE(uc.current_credits, 20) FROM user_credits uc WHERE uc.user_id = p_user_id INTO user_current_credits;
  
  -- Only update if credits are different from expected
  IF user_current_credits != correct_credits THEN
    UPDATE user_credits 
    SET 
      current_credits = correct_credits,
      monthly_credits = correct_credits,
      updated_at = NOW()
    WHERE user_id = p_user_id;
    
    result := json_build_object(
      'success', true,
      'user_id', p_user_id,
      'plan_id', COALESCE(user_plan_id, 'none'),
      'credits_before', user_current_credits,
      'credits_after', correct_credits,
      'corrected', true
    );
  ELSE
    result := json_build_object(
      'success', true,
      'user_id', p_user_id,
      'plan_id', COALESCE(user_plan_id, 'none'),
      'credits', user_current_credits,
      'corrected', false,
      'message', 'Credits already correct'
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-add the add_credits function that some APIs still depend on
CREATE OR REPLACE FUNCTION add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_is_monthly_refresh BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
BEGIN
  INSERT INTO user_credits (user_id, current_credits, monthly_credits, total_earned_credits)
  VALUES (p_user_id, p_amount, CASE WHEN p_is_monthly_refresh THEN p_amount ELSE 20 END, p_amount)
  ON CONFLICT (user_id) DO UPDATE SET
    current_credits = user_credits.current_credits + p_amount,
    monthly_credits = CASE 
      WHEN p_is_monthly_refresh THEN p_amount 
      ELSE user_credits.monthly_credits 
    END,
    total_earned_credits = user_credits.total_earned_credits + p_amount,
    last_credit_refresh = CASE 
      WHEN p_is_monthly_refresh THEN NOW() 
      ELSE user_credits.last_credit_refresh 
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION allocate_subscription_credits(UUID, INTEGER, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION fix_user_credits_for_plan(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION add_credits(UUID, INTEGER, BOOLEAN) TO service_role; 
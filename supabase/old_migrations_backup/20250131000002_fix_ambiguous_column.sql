-- Fix ambiguous column reference error in fix_user_credits_for_plan function
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
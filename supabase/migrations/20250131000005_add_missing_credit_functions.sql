-- Add missing credit-related functions
-- These functions are used by various API endpoints

-- Function to fix user credits based on their plan
CREATE OR REPLACE FUNCTION fix_user_credits_for_plan(
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  result_json JSON;
  user_plan_id TEXT;
  correct_credits INTEGER;
  user_current_credits INTEGER;
BEGIN
  -- Get user's current plan (if they have one)
  SELECT plan_id FROM user_plans WHERE user_id = p_user_id INTO user_plan_id;
  
  -- Determine correct credit amount based on plan
  correct_credits := CASE 
    WHEN user_plan_id = 'price_1RoxB8BKXSirmNWMja3Hs0eq' THEN 3860 -- Ultra
    WHEN user_plan_id = 'price_1RoxAsBKXSirmNWMGIXEqL8v' THEN 1460 -- Pro
    ELSE 20 -- Basic/Free
  END;
  
  -- Get current credits - using table alias to avoid ambiguity
  SELECT COALESCE(uc.current_credits, 20) 
  FROM user_credits uc 
  WHERE uc.user_id = p_user_id 
  INTO user_current_credits;
  
  -- Only update if credits are different from expected
  IF user_current_credits != correct_credits THEN
    UPDATE user_credits 
    SET 
      current_credits = correct_credits,
      monthly_credits = correct_credits,
      updated_at = now()
    WHERE user_id = p_user_id;
    
    result_json := json_build_object(
      'success', true,
      'user_id', p_user_id,
      'plan_id', COALESCE(user_plan_id, 'none'),
      'credits_before', user_current_credits,
      'credits_after', correct_credits,
      'corrected', true
    );
  ELSE
    result_json := json_build_object(
      'success', true,
      'user_id', p_user_id,
      'plan_id', COALESCE(user_plan_id, 'none'),
      'credits', user_current_credits,
      'corrected', false,
      'message', 'Credits already correct'
    );
  END IF;
  
  RETURN result_json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create user_plans table if it doesn't exist (for the function above)
CREATE TABLE IF NOT EXISTS user_plans (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on user_plans table
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for user_plans
CREATE POLICY "Users can view their own plan" ON user_plans
  FOR SELECT USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION fix_user_credits_for_plan(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fix_user_credits_for_plan(UUID) TO service_role; 
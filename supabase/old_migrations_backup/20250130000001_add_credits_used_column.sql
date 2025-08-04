-- Add credits_used column to transcripts table
ALTER TABLE transcripts ADD COLUMN credits_used INTEGER;

-- Create an index for efficient queries on credits_used
CREATE INDEX idx_transcripts_credits_used ON transcripts(credits_used); 

-- Add credits_used_today column to track daily usage
ALTER TABLE user_credits ADD COLUMN IF NOT EXISTS credits_used_today INTEGER DEFAULT 0;
ALTER TABLE user_credits ADD COLUMN IF NOT EXISTS last_daily_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update the refresh_monthly_credits function to handle upgrades better
CREATE OR REPLACE FUNCTION refresh_monthly_credits(
  p_user_id UUID,
  p_monthly_allocation INTEGER
) RETURNS VOID AS $$
BEGIN
  -- First check if the user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE NOTICE 'User % does not exist in auth.users, skipping credit allocation', p_user_id;
    RETURN;
  END IF;

  INSERT INTO user_credits (user_id, current_credits, monthly_credits, total_earned_credits, last_credit_refresh)
  VALUES (p_user_id, p_monthly_allocation, p_monthly_allocation, p_monthly_allocation, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    -- Always add the full monthly allocation to existing credits (permanent credits)
    current_credits = user_credits.current_credits + p_monthly_allocation,
    monthly_credits = p_monthly_allocation,
    total_earned_credits = user_credits.total_earned_credits + p_monthly_allocation,
    last_credit_refresh = NOW();
    
  -- Log the credit allocation
  RAISE NOTICE 'Allocated % credits to user %. New total: %', 
    p_monthly_allocation, 
    p_user_id, 
    (SELECT current_credits FROM user_credits WHERE user_id = p_user_id);
EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE NOTICE 'Foreign key violation for user %. User may not exist in auth.users table.', p_user_id;
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Robust credit allocation function with better error handling
CREATE OR REPLACE FUNCTION allocate_subscription_credits(
  p_user_id UUID,
  p_monthly_allocation INTEGER,
  p_plan_name TEXT DEFAULT 'Unknown'
) RETURNS JSON AS $$
DECLARE
  result JSON;
  user_exists BOOLEAN;
  credits_before INTEGER;
  credits_after INTEGER;
BEGIN
  -- Check if user exists
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

  -- Get current credits
  SELECT COALESCE(current_credits, 0) FROM user_credits WHERE user_id = p_user_id INTO credits_before;

  -- Allocate credits
  INSERT INTO user_credits (user_id, current_credits, monthly_credits, total_earned_credits, last_credit_refresh)
  VALUES (p_user_id, p_monthly_allocation, p_monthly_allocation, p_monthly_allocation, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    current_credits = user_credits.current_credits + p_monthly_allocation,
    monthly_credits = p_monthly_allocation,
    total_earned_credits = user_credits.total_earned_credits + p_monthly_allocation,
    last_credit_refresh = NOW();

  -- Get updated credits
  SELECT current_credits FROM user_credits WHERE user_id = p_user_id INTO credits_after;

  result := json_build_object(
    'success', true,
    'user_id', p_user_id,
    'plan_name', p_plan_name,
    'credits_allocated', p_monthly_allocation,
    'credits_before', COALESCE(credits_before, 0),
    'credits_after', credits_after,
    'credit_increase', credits_after - COALESCE(credits_before, 0),
    'timestamp', NOW()
  );

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

-- Function to handle subscription plan changes (upgrades/downgrades)
CREATE OR REPLACE FUNCTION handle_subscription_change(
  p_user_id UUID,
  p_old_plan_credits INTEGER,
  p_new_plan_credits INTEGER
) RETURNS VOID AS $$
BEGIN
  -- Always give the full new plan credits when upgrading/changing plans
  -- This ensures Pro->Ultra users get the full 3860 credits, not just the difference
  INSERT INTO user_credits (user_id, current_credits, monthly_credits, total_earned_credits, last_credit_refresh)
  VALUES (p_user_id, p_new_plan_credits, p_new_plan_credits, p_new_plan_credits, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    current_credits = user_credits.current_credits + p_new_plan_credits,
    monthly_credits = p_new_plan_credits,
    total_earned_credits = user_credits.total_earned_credits + p_new_plan_credits,
    last_credit_refresh = NOW();
    
  RAISE NOTICE 'Plan change: Added % credits to user %. Previous allocation was % credits', 
    p_new_plan_credits, p_user_id, p_old_plan_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION refresh_monthly_credits(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION allocate_subscription_credits(UUID, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION handle_subscription_change(UUID, INTEGER, INTEGER) TO service_role; 

-- Create enhanced trigger function with error handling and credit initialization
CREATE OR REPLACE FUNCTION handle_new_user_complete()
RETURNS trigger AS $$
DECLARE
  user_full_name text;
BEGIN
  -- Extract full name with comprehensive fallback logic
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'display_name',
    split_part(NEW.email, '@', 1)
  );

  -- Create profile record with error handling
  BEGIN
    INSERT INTO profiles (id, email, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      user_full_name
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      updated_at = NOW();
      
    RAISE LOG 'Successfully created/updated profile for user: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail the user creation
      RAISE WARNING 'Failed to create/update profile for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
      -- Continue execution - don't block user creation
  END;
  
  -- Create user preferences record with error handling
  BEGIN
    INSERT INTO user_preferences (user_id, dark_mode, email_notifications)
    VALUES (NEW.id, false, true)
    ON CONFLICT (user_id) DO UPDATE SET
      updated_at = NOW();
      
    RAISE LOG 'Successfully created/updated preferences for user: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail the user creation
      RAISE WARNING 'Failed to create/update preferences for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
      -- Continue execution - don't block user creation
  END;
  
  -- Initialize credits for new user (20 credits for free tier)
  BEGIN
    INSERT INTO user_credits (user_id, current_credits, monthly_credits, total_earned_credits)
    VALUES (NEW.id, 20, 20, 20)
    ON CONFLICT (user_id) DO UPDATE SET
      updated_at = NOW();
      
    RAISE LOG 'Successfully initialized credits for user: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail the user creation
      RAISE WARNING 'Failed to initialize credits for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
      -- Continue execution - don't block user creation
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger to use the enhanced function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_complete(); 
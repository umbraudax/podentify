-- Fix User Creation Trigger
-- This migration ensures the user creation trigger is properly set up

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user_complete();

-- Create the user creation trigger function
CREATE OR REPLACE FUNCTION handle_new_user_complete()
RETURNS trigger AS $$
DECLARE
  user_full_name text;
BEGIN
  -- Extract full name with fallback logic
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'display_name',
    split_part(NEW.email, '@', 1)
  );

  -- Create profile record
  BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, user_full_name)
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      updated_at = now();
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail user creation
      RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;
  
  -- Create user preferences record
  BEGIN
    INSERT INTO public.user_preferences (user_id, dark_mode, email_notifications)
    VALUES (NEW.id, false, true)
    ON CONFLICT (user_id) DO UPDATE SET
      updated_at = now();
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail user creation
      RAISE WARNING 'Failed to create preferences for user %: %', NEW.id, SQLERRM;
  END;
  
  -- Initialize credits for new user (20 credits for free tier)
  BEGIN
    INSERT INTO public.user_credits (user_id, current_credits, monthly_credits, total_earned_credits)
    VALUES (NEW.id, 20, 20, 20)
    ON CONFLICT (user_id) DO UPDATE SET
      updated_at = now();
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail user creation
      RAISE WARNING 'Failed to create credits for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_complete();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_new_user_complete() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user_complete() TO anon; 
-- Fix User Creation Trigger
-- This migration addresses the "Database error saving new user" issue
-- by creating a more robust trigger function with proper error handling

-- Create enhanced trigger function with error handling
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger to use the enhanced function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_complete();

-- Ensure the trigger function has proper permissions
ALTER FUNCTION handle_new_user_complete() OWNER TO postgres;

-- Verify the trigger was created successfully
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'on_auth_user_created' 
    AND event_object_table = 'users'
    AND event_object_schema = 'auth'
  ) THEN
    RAISE NOTICE 'Trigger "on_auth_user_created" successfully created/updated';
  ELSE
    RAISE EXCEPTION 'Failed to create trigger "on_auth_user_created"';
  END IF;
END $$;

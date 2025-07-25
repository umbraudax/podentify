/*
  # Fix Profile Creation Issue
  
  This migration fixes the issue where new users don't get profile records created,
  causing foreign key constraint violations when creating episodes.
  
  The problem was that two migrations created conflicting triggers for the same event.
  This migration creates a single trigger that handles both profile and preferences creation.
*/

-- Create or replace function to handle new user registration
-- This function will create both profile and user preferences records
CREATE OR REPLACE FUNCTION handle_new_user_complete()
RETURNS trigger AS $$
BEGIN
  -- Create profile record
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Create user preferences record
  INSERT INTO user_preferences (user_id, dark_mode, email_notifications)
  VALUES (NEW.id, false, true)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the existing trigger and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_complete();

-- For existing users who might be missing profile records, let's create them
-- This will help any users who signed up when the trigger was broken
INSERT INTO profiles (id, email, full_name)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1))
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING; 
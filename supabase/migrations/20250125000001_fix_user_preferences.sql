-- Add user preferences table for storing user settings like dark mode
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dark_mode BOOLEAN DEFAULT false,
  email_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies (using IF NOT EXISTS equivalent)
DO $$ 
BEGIN
    -- Create policies only if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_preferences' 
        AND policyname = 'Users can view their own preferences'
    ) THEN
        CREATE POLICY "Users can view their own preferences"
          ON user_preferences
          FOR SELECT
          TO authenticated
          USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_preferences' 
        AND policyname = 'Users can insert their own preferences'
    ) THEN
        CREATE POLICY "Users can insert their own preferences"
          ON user_preferences
          FOR INSERT
          TO authenticated
          WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_preferences' 
        AND policyname = 'Users can update their own preferences'
    ) THEN
        CREATE POLICY "Users can update their own preferences"
          ON user_preferences
          FOR UPDATE
          TO authenticated
          USING (auth.uid() = user_id);
    END IF;
END $$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON user_preferences TO authenticated;

-- Create or replace function to automatically create default preferences
CREATE OR REPLACE FUNCTION create_default_user_preferences()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_preferences (user_id, dark_mode, email_notifications)
  VALUES (NEW.id, false, true)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_user_preferences(); 
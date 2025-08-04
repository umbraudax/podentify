-- Create user_plans table for tracking user subscription plans
CREATE TABLE IF NOT EXISTS user_plans (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own plan"
  ON user_plans
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Allow service role updates for webhooks"
  ON user_plans
  FOR ALL
  USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON user_plans TO authenticated;
GRANT ALL ON user_plans TO service_role;
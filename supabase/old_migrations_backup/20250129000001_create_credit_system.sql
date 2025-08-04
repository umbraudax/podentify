-- Create credit system migration
-- This replaces the simple credits string field with a proper credit tracking system

-- Create user_credits table for comprehensive credit tracking
CREATE TABLE IF NOT EXISTS user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_credits INTEGER NOT NULL DEFAULT 20, -- Start with free tier credits
  monthly_credits INTEGER NOT NULL DEFAULT 20, -- Monthly allocation based on plan
  last_credit_refresh TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_earned_credits INTEGER NOT NULL DEFAULT 20, -- Track lifetime credits earned
  total_used_credits INTEGER NOT NULL DEFAULT 0, -- Track lifetime credits used
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own credits"
  ON user_credits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Allow service role full access for credit management"
  ON user_credits
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_user_credits_updated_at 
  BEFORE UPDATE ON user_credits 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function to safely deduct credits
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID,
  p_amount INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_credits 
  SET 
    current_credits = current_credits - p_amount,
    total_used_credits = total_used_credits + p_amount
  WHERE 
    user_id = p_user_id 
    AND current_credits >= p_amount;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add credits (for purchases or monthly refreshes)
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

-- Function to refresh monthly credits (called by cron or on subscription renewal)
CREATE OR REPLACE FUNCTION refresh_monthly_credits(
  p_user_id UUID,
  p_monthly_allocation INTEGER
) RETURNS VOID AS $$
BEGIN
  INSERT INTO user_credits (user_id, current_credits, monthly_credits, total_earned_credits, last_credit_refresh)
  VALUES (p_user_id, p_monthly_allocation, p_monthly_allocation, p_monthly_allocation, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    current_credits = user_credits.current_credits + p_monthly_allocation,
    monthly_credits = p_monthly_allocation,
    total_earned_credits = user_credits.total_earned_credits + p_monthly_allocation,
    last_credit_refresh = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON user_credits TO authenticated;
GRANT ALL ON user_credits TO service_role;
GRANT EXECUTE ON FUNCTION deduct_credits(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION add_credits(UUID, INTEGER, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION refresh_monthly_credits(UUID, INTEGER) TO service_role;

-- Migrate existing users to credit system
-- Users who have subscription get pro credits, others get free credits
INSERT INTO user_credits (user_id, current_credits, monthly_credits, total_earned_credits)
SELECT 
  u.id,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_plans up 
      WHERE up.user_id = u.id 
      AND up.plan_id IS NOT NULL
    ) THEN 1460 -- Pro plan credits
    ELSE 20 -- Free plan credits
  END as current_credits,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_plans up 
      WHERE up.user_id = u.id 
      AND up.plan_id IS NOT NULL
    ) THEN 1460 -- Pro plan credits
    ELSE 20 -- Free plan credits
  END as monthly_credits,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_plans up 
      WHERE up.user_id = u.id 
      AND up.plan_id IS NOT NULL
    ) THEN 1460 -- Pro plan credits
    ELSE 20 -- Free plan credits
  END as total_earned_credits
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING; 
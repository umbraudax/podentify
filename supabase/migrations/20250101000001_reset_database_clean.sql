-- COMPLETE DATABASE RESET AND CLEAN SCHEMA
-- This migration completely resets the database to a clean, working state

-- First, drop all existing tables and functions to start fresh
DROP TABLE IF EXISTS webhook_events CASCADE;
DROP TABLE IF EXISTS transcript_words CASCADE;
DROP TABLE IF EXISTS transcripts CASCADE;
DROP TABLE IF EXISTS social_clips CASCADE;
DROP TABLE IF EXISTS chapters CASCADE;
DROP TABLE IF EXISTS episodes CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS user_credits CASCADE;
DROP TABLE IF EXISTS user_plans CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS stripe_orders CASCADE;
DROP TABLE IF EXISTS stripe_subscriptions CASCADE;
DROP TABLE IF EXISTS stripe_customers CASCADE;

-- Drop existing views
DROP VIEW IF EXISTS stripe_user_subscriptions CASCADE;
DROP VIEW IF EXISTS stripe_user_orders CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS handle_new_user_complete() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS deduct_credits(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS add_credits(uuid, integer, boolean) CASCADE;
DROP FUNCTION IF EXISTS refresh_monthly_credits(uuid, integer) CASCADE;

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS episode_status CASCADE;
DROP TYPE IF EXISTS transcript_status CASCADE;
DROP TYPE IF EXISTS stripe_subscription_status CASCADE;
DROP TYPE IF EXISTS stripe_order_status CASCADE;

-- Create clean enum types
CREATE TYPE episode_status AS ENUM ('uploading', 'processing', 'completed', 'failed');
CREATE TYPE transcript_status AS ENUM ('processing', 'completed', 'failed');
CREATE TYPE stripe_subscription_status AS ENUM (
    'not_started',
    'incomplete', 
    'incomplete_expired',
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'paused'
);
CREATE TYPE stripe_order_status AS ENUM ('pending', 'completed', 'canceled');

-- Core user profile table (links to auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User preferences
CREATE TABLE user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dark_mode boolean DEFAULT false,
  email_notifications boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User credits system
CREATE TABLE user_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_credits integer NOT NULL DEFAULT 20,
  monthly_credits integer NOT NULL DEFAULT 20,
  last_credit_refresh timestamptz DEFAULT now(),
  total_earned_credits integer NOT NULL DEFAULT 20,
  total_used_credits integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Episodes table
CREATE TABLE episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  audio_url text NOT NULL,
  duration integer,
  status episode_status DEFAULT 'uploading',
  show_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Transcripts table
CREATE TABLE transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid REFERENCES episodes(id) ON DELETE CASCADE NOT NULL,
  full_text text,
  confidence numeric,
  status transcript_status DEFAULT 'processing',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Transcript words table for timestamped words
CREATE TABLE transcript_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id uuid REFERENCES transcripts(id) ON DELETE CASCADE NOT NULL,
  word text NOT NULL,
  start_time numeric NOT NULL,
  end_time numeric NOT NULL,
  confidence numeric,
  speaker text,
  word_index integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Chapters table
CREATE TABLE chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid REFERENCES episodes(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  start_time real NOT NULL,
  end_time real NOT NULL,
  duration real NOT NULL,
  summary text,
  chapter_index integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Social clips table
CREATE TABLE social_clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid REFERENCES episodes(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  start_time integer NOT NULL,
  end_time integer NOT NULL,
  duration integer NOT NULL,
  engagement_score numeric,
  clip_url text,
  created_at timestamptz DEFAULT now()
);

-- Stripe customers table
CREATE TABLE stripe_customers (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid REFERENCES auth.users(id) NOT NULL UNIQUE,
  customer_id text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT null
);

-- Stripe subscriptions table
CREATE TABLE stripe_subscriptions (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  customer_id text NOT NULL,
  subscription_id text UNIQUE,
  status stripe_subscription_status NOT NULL,
  price_id text,
  current_period_start integer,
  current_period_end integer,
  cancel_at_period_end boolean DEFAULT false,
  payment_method_brand text,
  payment_method_last4 text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT null
);

-- Stripe orders table
CREATE TABLE stripe_orders (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  customer_id text NOT NULL,
  checkout_session_id text NOT NULL,
  payment_intent_id text NOT NULL,
  amount_subtotal integer NOT NULL,
  amount_total integer NOT NULL,
  currency text NOT NULL,
  payment_status text NOT NULL,
  status stripe_order_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT null
);

-- Create indexes for performance
CREATE INDEX episodes_user_id_idx ON episodes(user_id);
CREATE INDEX transcripts_episode_id_idx ON transcripts(episode_id);
CREATE INDEX transcript_words_transcript_id_idx ON transcript_words(transcript_id);
CREATE INDEX chapters_episode_id_idx ON chapters(episode_id);
CREATE INDEX chapters_episode_chapter_index_idx ON chapters(episode_id, chapter_index);
CREATE INDEX social_clips_episode_id_idx ON social_clips(episode_id);
CREATE INDEX stripe_customers_user_id_idx ON stripe_customers(user_id);
CREATE INDEX stripe_subscriptions_customer_id_idx ON stripe_subscriptions(customer_id);
CREATE INDEX stripe_orders_customer_id_idx ON stripe_orders(customer_id);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for user_preferences
CREATE POLICY "Users can manage their own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for user_credits
CREATE POLICY "Users can view their own credits" ON user_credits
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all credits" ON user_credits
  FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for episodes
CREATE POLICY "Users can manage their own episodes" ON episodes
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for transcripts
CREATE POLICY "Users can view transcripts for their own episodes" ON transcripts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM episodes 
      WHERE episodes.id = transcripts.episode_id 
      AND episodes.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can manage transcripts for their own episodes" ON transcripts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM episodes 
      WHERE episodes.id = transcripts.episode_id 
      AND episodes.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update transcripts for their own episodes" ON transcripts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM episodes 
      WHERE episodes.id = transcripts.episode_id 
      AND episodes.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete transcripts for their own episodes" ON transcripts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM episodes 
      WHERE episodes.id = transcripts.episode_id 
      AND episodes.user_id = auth.uid()
    )
  );

-- Create RLS policies for transcript_words
CREATE POLICY "Users can view transcript words for their own episodes" ON transcript_words
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM transcripts t
      JOIN episodes e ON e.id = t.episode_id
      WHERE t.id = transcript_words.transcript_id 
      AND e.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can manage transcript words for their own episodes" ON transcript_words
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM transcripts t
      JOIN episodes e ON e.id = t.episode_id
      WHERE t.id = transcript_words.transcript_id 
      AND e.user_id = auth.uid()
    )
  );

-- Create RLS policies for chapters
CREATE POLICY "Users can manage chapters for their own episodes" ON chapters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM episodes 
      WHERE episodes.id = chapters.episode_id 
      AND episodes.user_id = auth.uid()
    )
  );

-- Create RLS policies for social_clips
CREATE POLICY "Users can manage social clips for their own episodes" ON social_clips
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM episodes 
      WHERE episodes.id = social_clips.episode_id 
      AND episodes.user_id = auth.uid()
    )
  );

-- Create RLS policies for Stripe tables
CREATE POLICY "Users can view their own customer data" ON stripe_customers
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can view their own subscription data" ON stripe_subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stripe_customers 
      WHERE stripe_customers.customer_id = stripe_subscriptions.customer_id 
      AND stripe_customers.user_id = auth.uid()
      AND stripe_customers.deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Users can view their own order data" ON stripe_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stripe_customers 
      WHERE stripe_customers.customer_id = stripe_orders.customer_id 
      AND stripe_customers.user_id = auth.uid()
      AND stripe_customers.deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

-- Create secure views for Stripe data
CREATE VIEW stripe_user_subscriptions AS
SELECT 
  sc.customer_id,
  ss.subscription_id,
  ss.status as subscription_status,
  ss.price_id,
  ss.current_period_start,
  ss.current_period_end,
  ss.cancel_at_period_end,
  ss.payment_method_brand,
  ss.payment_method_last4
FROM stripe_customers sc
JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id
WHERE sc.user_id = auth.uid() 
  AND sc.deleted_at IS NULL 
  AND ss.deleted_at IS NULL;

CREATE VIEW stripe_user_orders AS
SELECT 
  so.id as order_id,
  so.customer_id,
  so.checkout_session_id,
  so.payment_intent_id,
  so.amount_subtotal,
  so.amount_total,
  so.currency,
  so.payment_status,
  so.status as order_status,
  so.created_at as order_date
FROM stripe_customers sc
JOIN stripe_orders so ON sc.customer_id = so.customer_id
WHERE sc.user_id = auth.uid()
  AND sc.deleted_at IS NULL 
  AND so.deleted_at IS NULL;

-- Create utility functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at 
  BEFORE UPDATE ON user_preferences 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_credits_updated_at 
  BEFORE UPDATE ON user_credits 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_episodes_updated_at 
  BEFORE UPDATE ON episodes 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transcripts_updated_at 
  BEFORE UPDATE ON transcripts 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Credit management functions
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id uuid,
  p_amount integer
) RETURNS boolean AS $$
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

CREATE OR REPLACE FUNCTION add_credits(
  p_user_id uuid,
  p_amount integer,
  p_is_monthly_refresh boolean DEFAULT false
) RETURNS void AS $$
BEGIN
  IF p_is_monthly_refresh THEN
    UPDATE user_credits 
    SET 
      current_credits = monthly_credits,
      last_credit_refresh = now()
    WHERE user_id = p_user_id;
  ELSE
    UPDATE user_credits 
    SET 
      current_credits = current_credits + p_amount,
      total_earned_credits = total_earned_credits + p_amount
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION refresh_monthly_credits(
  p_user_id uuid,
  p_monthly_allocation integer
) RETURNS void AS $$
BEGIN
  UPDATE user_credits 
  SET 
    current_credits = p_monthly_allocation,
    monthly_credits = p_monthly_allocation,
    last_credit_refresh = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- User creation trigger function
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
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, user_full_name)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = now();
  
  -- Create user preferences record
  INSERT INTO user_preferences (user_id, dark_mode, email_notifications)
  VALUES (NEW.id, false, true)
  ON CONFLICT (user_id) DO UPDATE SET
    updated_at = now();
  
  -- Initialize credits for new user (20 credits for free tier)
  INSERT INTO user_credits (user_id, current_credits, monthly_credits, total_earned_credits)
  VALUES (NEW.id, 20, 20, 20)
  ON CONFLICT (user_id) DO UPDATE SET
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the user creation trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_complete();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated; 
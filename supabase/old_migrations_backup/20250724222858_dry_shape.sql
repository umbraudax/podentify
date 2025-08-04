/*
  # Initial Schema for Podtentify

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `full_name` (text, nullable)
      - `avatar_url` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `episodes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `title` (text)
      - `description` (text, nullable)
      - `audio_url` (text)
      - `duration` (integer, nullable)
      - `status` (enum: uploading, processing, completed, failed)
      - `show_notes` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `social_clips`
      - `id` (uuid, primary key)
      - `episode_id` (uuid, foreign key to episodes)
      - `title` (text)
      - `start_time` (integer, seconds)
      - `end_time` (integer, seconds)
      - `duration` (integer, seconds)
      - `engagement_score` (numeric, nullable)
      - `clip_url` (text, nullable)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create custom types
CREATE TYPE episode_status AS ENUM ('uploading', 'processing', 'completed', 'failed');

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create episodes table
CREATE TABLE IF NOT EXISTS episodes (
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

-- Create social_clips table
CREATE TABLE IF NOT EXISTS social_clips (
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

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_clips ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create policies for episodes
CREATE POLICY "Users can read own episodes"
  ON episodes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own episodes"
  ON episodes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own episodes"
  ON episodes
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own episodes"
  ON episodes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create policies for social_clips
CREATE POLICY "Users can read clips from own episodes"
  ON social_clips
  FOR SELECT
  TO authenticated
  USING (
    episode_id IN (
      SELECT id FROM episodes WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert clips for own episodes"
  ON social_clips
  FOR INSERT
  TO authenticated
  WITH CHECK (
    episode_id IN (
      SELECT id FROM episodes WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update clips from own episodes"
  ON social_clips
  FOR UPDATE
  TO authenticated
  USING (
    episode_id IN (
      SELECT id FROM episodes WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete clips from own episodes"
  ON social_clips
  FOR DELETE
  TO authenticated
  USING (
    episode_id IN (
      SELECT id FROM episodes WHERE user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS episodes_user_id_idx ON episodes(user_id);
CREATE INDEX IF NOT EXISTS episodes_status_idx ON episodes(status);
CREATE INDEX IF NOT EXISTS social_clips_episode_id_idx ON social_clips(episode_id);
CREATE INDEX IF NOT EXISTS social_clips_engagement_score_idx ON social_clips(engagement_score DESC);

-- Create function to handle profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_episodes_updated_at
  BEFORE UPDATE ON episodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
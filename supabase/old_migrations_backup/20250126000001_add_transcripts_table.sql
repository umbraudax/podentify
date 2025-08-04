/*
  # Transcript Storage Schema

  1. New Tables
    - `transcripts`: Store transcript metadata
      - `id` (uuid, primary key)
      - `episode_id` (uuid, foreign key to episodes)
      - `full_text` (text)
      - `confidence` (numeric)
      - `status` (enum: processing, completed, failed)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `transcript_words`: Store individual word timestamps and speaker data
      - `id` (uuid, primary key)
      - `transcript_id` (uuid, foreign key to transcripts)
      - `word` (text)
      - `start_time` (numeric, seconds)
      - `end_time` (numeric, seconds)
      - `confidence` (numeric)
      - `speaker` (text, nullable)
      - `word_index` (integer)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create custom types
CREATE TYPE transcript_status AS ENUM ('processing', 'completed', 'failed');

-- Create transcripts table
CREATE TABLE IF NOT EXISTS transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid REFERENCES episodes(id) ON DELETE CASCADE NOT NULL,
  full_text text,
  confidence numeric,
  status transcript_status DEFAULT 'processing',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create transcript_words table for timestamped words
CREATE TABLE IF NOT EXISTS transcript_words (
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

-- Enable Row Level Security
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_words ENABLE ROW LEVEL SECURITY;

-- Create policies for transcripts
CREATE POLICY "Users can read transcripts from own episodes"
  ON transcripts
  FOR SELECT
  TO authenticated
  USING (
    episode_id IN (
      SELECT id FROM episodes WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert transcripts for own episodes"
  ON transcripts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    episode_id IN (
      SELECT id FROM episodes WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update transcripts for own episodes"
  ON transcripts
  FOR UPDATE
  TO authenticated
  USING (
    episode_id IN (
      SELECT id FROM episodes WHERE user_id = auth.uid()
    )
  );

-- Create policies for transcript_words
CREATE POLICY "Users can read words from own transcripts"
  ON transcript_words
  FOR SELECT
  TO authenticated
  USING (
    transcript_id IN (
      SELECT t.id FROM transcripts t
      JOIN episodes e ON t.episode_id = e.id
      WHERE e.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert words for own transcripts"
  ON transcript_words
  FOR INSERT
  TO authenticated
  WITH CHECK (
    transcript_id IN (
      SELECT t.id FROM transcripts t
      JOIN episodes e ON t.episode_id = e.id
      WHERE e.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_transcripts_episode_id ON transcripts(episode_id);
CREATE INDEX idx_transcript_words_transcript_id ON transcript_words(transcript_id);
CREATE INDEX idx_transcript_words_word_index ON transcript_words(word_index); 
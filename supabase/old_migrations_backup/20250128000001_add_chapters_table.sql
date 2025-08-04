-- Create chapters table for AI-generated episode chapters
CREATE TABLE chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    start_time REAL NOT NULL,
    end_time REAL NOT NULL,
    duration REAL NOT NULL,
    summary TEXT,
    chapter_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX chapters_episode_id_idx ON chapters(episode_id);
CREATE INDEX chapters_episode_chapter_index_idx ON chapters(episode_id, chapter_index);

-- Enable RLS
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

-- Create policy for chapters - users can only access chapters for their own episodes
CREATE POLICY "Users can view chapters for their own episodes" ON chapters
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM episodes 
            WHERE episodes.id = chapters.episode_id 
            AND episodes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert chapters for their own episodes" ON chapters
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM episodes 
            WHERE episodes.id = chapters.episode_id 
            AND episodes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update chapters for their own episodes" ON chapters
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM episodes 
            WHERE episodes.id = chapters.episode_id 
            AND episodes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete chapters for their own episodes" ON chapters
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM episodes 
            WHERE episodes.id = chapters.episode_id 
            AND episodes.user_id = auth.uid()
        )
    ); 
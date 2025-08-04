-- Add media_type column to episodes table to support both audio and video files
ALTER TABLE episodes 
ADD COLUMN media_type VARCHAR(10) DEFAULT 'audio' CHECK (media_type IN ('audio', 'video'));

-- Update existing episodes to have 'audio' as media_type (for backward compatibility)
UPDATE episodes SET media_type = 'audio' WHERE media_type IS NULL;

-- Make media_type NOT NULL after setting defaults
ALTER TABLE episodes ALTER COLUMN media_type SET NOT NULL;

-- Add index for better query performance
CREATE INDEX idx_episodes_media_type ON episodes(media_type);

-- Add comment for documentation
COMMENT ON COLUMN episodes.media_type IS 'Type of media file: audio or video'; 
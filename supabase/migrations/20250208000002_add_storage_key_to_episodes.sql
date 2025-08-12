-- Add storage_key to episodes for object storage paths
ALTER TABLE public.episodes
ADD COLUMN IF NOT EXISTS storage_key text;

-- Optional: backfill future policy-friendly defaults (no-op here)



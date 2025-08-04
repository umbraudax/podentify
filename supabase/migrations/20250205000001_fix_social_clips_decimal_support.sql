-- Fix social_clips table schema to support decimal values for time fields
-- This fixes the "invalid input syntax for type integer" error when inserting decimal values

-- Change start_time from integer to REAL to support decimal values like 88.5
ALTER TABLE social_clips ALTER COLUMN start_time TYPE REAL;

-- Change end_time from integer to REAL to support decimal values like 133.2
ALTER TABLE social_clips ALTER COLUMN end_time TYPE REAL;

-- Change duration from integer to REAL to support decimal values like 13.5
ALTER TABLE social_clips ALTER COLUMN duration TYPE REAL;

-- Add a comment explaining the fix
COMMENT ON TABLE social_clips IS 'Fixed time fields to support decimal values for precise timestamps'; 
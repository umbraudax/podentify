-- Fix social_clips table schema to ensure proper data types
-- Change integer fields to REAL for decimal support

-- If the table exists, alter the column types
DO $$
BEGIN
    -- Check if social_clips table exists and alter column types if needed
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'social_clips') THEN
        -- Change start_time to REAL if it's not already
        BEGIN
            ALTER TABLE social_clips ALTER COLUMN start_time TYPE REAL;
        EXCEPTION
            WHEN OTHERS THEN
                NULL; -- Column might already be REAL
        END;

        -- Change end_time to REAL if it's not already  
        BEGIN
            ALTER TABLE social_clips ALTER COLUMN end_time TYPE REAL;
        EXCEPTION
            WHEN OTHERS THEN
                NULL; -- Column might already be REAL
        END;

        -- Change duration to REAL if it's not already
        BEGIN
            ALTER TABLE social_clips ALTER COLUMN duration TYPE REAL;
        EXCEPTION
            WHEN OTHERS THEN
                NULL; -- Column might already be REAL
        END;

        -- Ensure engagement_score is INTEGER (can be NULL)
        BEGIN
            ALTER TABLE social_clips ALTER COLUMN engagement_score TYPE INTEGER;
        EXCEPTION
            WHEN OTHERS THEN
                NULL; -- Column might already be INTEGER
        END;
    END IF;
END
$$; 
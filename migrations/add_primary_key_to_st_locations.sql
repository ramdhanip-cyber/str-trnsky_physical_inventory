-- Migration: Add Primary Key to st_locations table
-- This script adds a primary key constraint to the location_id column

-- Step 1: Check if the table exists and current structure
DO $$
BEGIN
    -- Check if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'st_locations') THEN
        RAISE NOTICE 'Table st_locations exists';
        
        -- Check if location_id column exists
        IF EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'st_locations' AND column_name = 'location_id') THEN
            RAISE NOTICE 'Column location_id exists';
        ELSE
            RAISE EXCEPTION 'Column location_id does not exist in st_locations table';
        END IF;
    ELSE
        RAISE EXCEPTION 'Table st_locations does not exist';
    END IF;
END $$;

-- Step 2: Check for existing primary key
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'st_locations' 
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        RAISE NOTICE 'Primary key already exists on st_locations table';
    ELSE
        RAISE NOTICE 'No primary key found, will add one';
    END IF;
END $$;

-- Step 3: Check for duplicate values in location_id (must be unique for primary key)
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT location_id, COUNT(*) as cnt
        FROM st_locations
        GROUP BY location_id
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE EXCEPTION 'Found % duplicate location_id values. Cannot add primary key constraint.', duplicate_count;
    ELSE
        RAISE NOTICE 'No duplicate location_id values found';
    END IF;
END $$;

-- Step 4: Check for NULL values in location_id (primary key cannot be NULL)
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count
    FROM st_locations
    WHERE location_id IS NULL;
    
    IF null_count > 0 THEN
        RAISE EXCEPTION 'Found % NULL values in location_id. Cannot add primary key constraint.', null_count;
    ELSE
        RAISE NOTICE 'No NULL values found in location_id';
    END IF;
END $$;

-- Step 5: Add primary key constraint
-- First, drop existing primary key if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'st_locations' 
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        EXECUTE 'ALTER TABLE st_locations DROP CONSTRAINT st_locations_pkey';
        RAISE NOTICE 'Dropped existing primary key constraint';
    END IF;
END $$;

-- Add the primary key constraint
ALTER TABLE st_locations 
ADD CONSTRAINT st_locations_pkey PRIMARY KEY (location_id);

-- Step 6: Verify the primary key was added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'st_locations' 
        AND constraint_type = 'PRIMARY KEY'
        AND constraint_name = 'st_locations_pkey'
    ) THEN
        RAISE NOTICE 'Successfully added primary key constraint to st_locations table';
    ELSE
        RAISE EXCEPTION 'Failed to add primary key constraint';
    END IF;
END $$;

-- Step 7: Show table structure for verification
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'st_locations' 
ORDER BY ordinal_position; 
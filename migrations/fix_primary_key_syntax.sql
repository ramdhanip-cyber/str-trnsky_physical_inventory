-- Corrected migration to add primary key to st_locations table
-- The ADD CONSTRAINT must be part of an ALTER TABLE statement

-- Step 1: Check current table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'st_locations' 
ORDER BY ordinal_position;

-- Step 2: Check for existing primary key
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'st_locations' 
    AND tc.constraint_type = 'PRIMARY KEY';

-- Step 3: Check for duplicates (must be unique for primary key)
SELECT location_id, COUNT(*) as duplicate_count
FROM st_locations 
GROUP BY location_id 
HAVING COUNT(*) > 1;

-- Step 4: Check for NULL values (primary key cannot be NULL)
SELECT COUNT(*) as null_count
FROM st_locations 
WHERE location_id IS NULL;

-- Step 5: Add primary key constraint (CORRECT SYNTAX)
ALTER TABLE st_locations 
ADD CONSTRAINT st_locations_pkey PRIMARY KEY (location_id);

-- Step 6: Verify the primary key was added
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'st_locations' 
    AND tc.constraint_type = 'PRIMARY KEY'; 
-- Simple migration to add primary key to st_locations table
-- WARNING: This will fail if there are duplicates or NULL values

-- Add primary key constraint
ALTER TABLE st_locations 
ADD CONSTRAINT st_locations_pkey PRIMARY KEY (location_id);

-- Verify the change
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'st_locations' 
    AND tc.constraint_type = 'PRIMARY KEY'; 
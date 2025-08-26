-- Migration: Rename team_member_id to id in team_members table

-- Step 1: Check if the table and column exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'team_members') THEN
        RAISE NOTICE 'Table team_members exists';
        
        IF EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'team_members' AND column_name = 'team_member_id') THEN
            RAISE NOTICE 'Column team_member_id exists';
        ELSE
            RAISE EXCEPTION 'Column team_member_id does not exist in team_members table';
        END IF;
    ELSE
        RAISE EXCEPTION 'Table team_members does not exist';
    END IF;
END $$;

-- Step 2: Check if 'id' column already exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_name = 'team_members' AND column_name = 'id') THEN
        RAISE EXCEPTION 'Column id already exists in team_members table';
    ELSE
        RAISE NOTICE 'Column id does not exist, safe to rename';
    END IF;
END $$;

-- Step 3: Check for foreign key constraints that reference team_member_id
DO $$
DECLARE
    constraint_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.key_column_usage kcu
    JOIN information_schema.table_constraints tc ON kcu.constraint_name = tc.constraint_name
    WHERE tc.table_name = 'team_members' 
      AND kcu.column_name = 'team_member_id'
      AND tc.constraint_type = 'PRIMARY KEY';
    
    IF constraint_count > 0 THEN
        RAISE NOTICE 'Found primary key constraint on team_member_id';
    END IF;
    
    -- Check for foreign key references to this column
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.constraint_column_usage ccu
    JOIN information_schema.table_constraints tc ON ccu.constraint_name = tc.constraint_name
    WHERE ccu.table_name = 'team_members' 
      AND ccu.column_name = 'team_member_id'
      AND tc.constraint_type = 'FOREIGN KEY';
    
    IF constraint_count > 0 THEN
        RAISE NOTICE 'Found % foreign key constraints referencing team_member_id', constraint_count;
    END IF;
END $$;

-- Step 4: Rename the column
ALTER TABLE team_members 
RENAME COLUMN team_member_id TO id;

-- Step 5: Verify the change
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_name = 'team_members' AND column_name = 'id') THEN
        RAISE NOTICE 'Successfully renamed team_member_id to id';
    ELSE
        RAISE EXCEPTION 'Failed to rename column';
    END IF;
END $$;

-- Step 6: Show updated table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN tc.constraint_type = 'PRIMARY KEY' THEN 'PRIMARY KEY'
        WHEN tc.constraint_type = 'FOREIGN KEY' THEN 'FOREIGN KEY'
        ELSE 'NONE'
    END as constraint_type
FROM information_schema.columns c
LEFT JOIN information_schema.key_column_usage kcu 
    ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
LEFT JOIN information_schema.table_constraints tc 
    ON kcu.constraint_name = tc.constraint_name
WHERE c.table_name = 'team_members' 
ORDER BY c.ordinal_position; 
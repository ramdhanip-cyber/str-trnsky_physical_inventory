-- Migration: Create assigned_items table
-- This table stores items assigned to specific locations for counting

-- Check if table already exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'assigned_items') THEN
        RAISE NOTICE 'Table assigned_items already exists';
    ELSE
        RAISE NOTICE 'Creating assigned_items table';
    END IF;
END $$;

-- Create the assigned_items table
CREATE TABLE IF NOT EXISTS assigned_items (
    id SERIAL PRIMARY KEY,
    location_id INT NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_assigned_items_location 
        FOREIGN KEY (location_id) 
        REFERENCES st_locations(location_id) 
        ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assigned_items_location_id ON assigned_items(location_id);
CREATE INDEX IF NOT EXISTS idx_assigned_items_item_name ON assigned_items(item_name);

-- Add comments for documentation
COMMENT ON TABLE assigned_items IS 'Stores items assigned to specific locations for counting';
COMMENT ON COLUMN assigned_items.id IS 'Primary key - unique identifier for each assignment';
COMMENT ON COLUMN assigned_items.location_id IS 'Foreign key to st_locations table';
COMMENT ON COLUMN assigned_items.item_name IS 'Name/description of the assigned item';
COMMENT ON COLUMN assigned_items.assigned_at IS 'Timestamp when the item was assigned';

-- Verify the table was created
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'assigned_items' 
ORDER BY ordinal_position;

-- Show foreign key constraints
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'assigned_items' 
    AND tc.constraint_type = 'FOREIGN KEY'; 
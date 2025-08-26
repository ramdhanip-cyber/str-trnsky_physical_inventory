-- Migration: Update bundles table structure
-- This script updates the bundles table to match the new requirements

-- Check if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bundles') THEN
        RAISE NOTICE 'Table bundles exists, will update structure';
    ELSE
        RAISE NOTICE 'Table bundles does not exist, will create it';
    END IF;
END $$;

-- Drop existing table if it exists (WARNING: This will delete all data)
DROP TABLE IF EXISTS bundles CASCADE;

-- Create the updated bundles table
CREATE TABLE bundles (
    id SERIAL PRIMARY KEY,
    transaction_id INT NOT NULL,
    tag_id INT NOT NULL,
    num_of_bundle INT NOT NULL,
    bundle_count INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_bundles_transaction 
        FOREIGN KEY (transaction_id) 
        REFERENCES transactions(transaction_id) 
        ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_bundles_transaction_id ON bundles(transaction_id);
CREATE INDEX idx_bundles_tag_id ON bundles(tag_id);
CREATE INDEX idx_bundles_created_at ON bundles(created_at);

-- Add comments for documentation
COMMENT ON TABLE bundles IS 'Stores bundle counts within a transaction';
COMMENT ON COLUMN bundles.id IS 'Primary key - unique identifier for each bundle';
COMMENT ON COLUMN bundles.transaction_id IS 'Foreign key to transactions table';
COMMENT ON COLUMN bundles.tag_id IS 'Tag identifier for the bundle';
COMMENT ON COLUMN bundles.num_of_bundle IS 'Number of bundles';
COMMENT ON COLUMN bundles.bundle_count IS 'Count within each bundle';
COMMENT ON COLUMN bundles.created_at IS 'Timestamp when bundle was created';

-- Verify the table was created
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'bundles' 
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
WHERE tc.table_name = 'bundles' 
    AND tc.constraint_type = 'FOREIGN KEY'; 
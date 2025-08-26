-- Migration: Create reconciliation_records table
-- This table stores reconciliation records for each location with summary and detailed item data

-- Check if table already exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reconciliation_records') THEN
        RAISE NOTICE 'Table reconciliation_records already exists';
    ELSE
        RAISE NOTICE 'Creating reconciliation_records table';
    END IF;
END $$;

-- Create the reconciliation_records table
CREATE TABLE IF NOT EXISTS reconciliation_records (
    id SERIAL PRIMARY KEY,
    location_id INT NOT NULL,
    record_name VARCHAR(255) NULL,
    record_date TIMESTAMPTZ DEFAULT NOW(),
    created_by INT NULL,
    status VARCHAR(50) DEFAULT 'active',
    summary_data JSONB NOT NULL,
    items_data JSONB NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ NULL,
    
    -- Foreign key constraints
    CONSTRAINT fk_reconciliation_records_location 
        FOREIGN KEY (location_id) 
        REFERENCES st_locations(location_id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_reconciliation_records_created_by 
        FOREIGN KEY (created_by) 
        REFERENCES st_users(user_id) 
        ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reconciliation_records_location_id ON reconciliation_records(location_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_records_status ON reconciliation_records(status);
CREATE INDEX IF NOT EXISTS idx_reconciliation_records_created_by ON reconciliation_records(created_by);
CREATE INDEX IF NOT EXISTS idx_reconciliation_records_record_date ON reconciliation_records(record_date);

-- Add comments for documentation
COMMENT ON TABLE reconciliation_records IS 'Stores reconciliation records for each location with summary and detailed item data';
COMMENT ON COLUMN reconciliation_records.id IS 'Primary key - unique identifier for each reconciliation record';
COMMENT ON COLUMN reconciliation_records.location_id IS 'Foreign key to st_locations table';
COMMENT ON COLUMN reconciliation_records.record_name IS 'Name/description of the reconciliation record';
COMMENT ON COLUMN reconciliation_records.record_date IS 'Date when the reconciliation was performed';
COMMENT ON COLUMN reconciliation_records.created_by IS 'Foreign key to st_users table - who created this record';
COMMENT ON COLUMN reconciliation_records.status IS 'Status of the reconciliation record (active, deleted, etc.)';
COMMENT ON COLUMN reconciliation_records.summary_data IS 'JSONB containing summary statistics of the reconciliation';
COMMENT ON COLUMN reconciliation_records.items_data IS 'JSONB containing detailed item data from the reconciliation';
COMMENT ON COLUMN reconciliation_records.notes IS 'Additional notes about the reconciliation';
COMMENT ON COLUMN reconciliation_records.created_at IS 'Timestamp when record was created';
COMMENT ON COLUMN reconciliation_records.updated_at IS 'Timestamp when record was last updated';

-- Verify the table was created
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'reconciliation_records' 
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
WHERE tc.table_name = 'reconciliation_records' 
    AND tc.constraint_type = 'FOREIGN KEY'; 
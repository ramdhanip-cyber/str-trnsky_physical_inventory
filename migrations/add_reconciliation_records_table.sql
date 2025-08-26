-- Migration: Add reconciliation_records table
-- Date: 2024-01-XX
-- Description: Creates table for storing reconciliation records

-- Create reconciliation_records table
CREATE TABLE IF NOT EXISTS reconciliation_records (
    id SERIAL PRIMARY KEY,
    location_id INT NOT NULL REFERENCES st_locations(location_id),
    record_name VARCHAR(255) NOT NULL,
    record_date TIMESTAMPTZ DEFAULT NOW(),
    created_by INT REFERENCES st_users(user_id),
    status VARCHAR(50) DEFAULT 'active',
    summary_data JSONB NOT NULL, -- Stores the summary statistics
    items_data JSONB NOT NULL,   -- Stores all reconciliation items
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reconciliation_records_location_id ON reconciliation_records(location_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_records_status ON reconciliation_records(status);
CREATE INDEX IF NOT EXISTS idx_reconciliation_records_created_by ON reconciliation_records(created_by);
CREATE INDEX IF NOT EXISTS idx_reconciliation_records_record_date ON reconciliation_records(record_date);

-- Add comment to table
COMMENT ON TABLE reconciliation_records IS 'Stores reconciliation records for each location with summary and detailed item data';

COMMIT; 
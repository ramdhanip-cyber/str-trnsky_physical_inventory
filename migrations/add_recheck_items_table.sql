-- Migration: Add recheck_items table
-- Date: 2024-01-XX
-- Description: Creates table for tracking items marked for rechecking

-- Create recheck_items table
CREATE TABLE IF NOT EXISTS recheck_items (
    id SERIAL PRIMARY KEY,
    location_id INT NOT NULL REFERENCES st_locations(location_id),
    form VARCHAR(255),
    grade VARCHAR(255),
    size VARCHAR(255),
    finish VARCHAR(255),
    ext_finish VARCHAR(255),
    width VARCHAR(255),
    length VARCHAR(255),
    mill VARCHAR(255),
    heat VARCHAR(255),
    system_qty INT,
    counted_qty INT,
    variance INT,
    status VARCHAR(100) DEFAULT 'Rechecking in Progress',
    recheck_reason TEXT,
    marked_by INT REFERENCES st_users(user_id),
    marked_at TIMESTAMPTZ DEFAULT NOW(),
    rechecked_by INT REFERENCES st_users(user_id),
    rechecked_at TIMESTAMPTZ,
    recheck_count INT DEFAULT 0,
    original_transaction_ids TEXT -- JSON array of original transaction IDs
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recheck_items_location_id ON recheck_items(location_id);
CREATE INDEX IF NOT EXISTS idx_recheck_items_status ON recheck_items(status);
CREATE INDEX IF NOT EXISTS idx_recheck_items_marked_by ON recheck_items(marked_by);

-- Add comment to table
COMMENT ON TABLE recheck_items IS 'Stores items marked for rechecking during inventory reconciliation';

COMMIT; 
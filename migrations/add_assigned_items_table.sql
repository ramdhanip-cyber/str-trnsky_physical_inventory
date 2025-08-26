-- Migration: Add assigned_items table
-- Date: 2024-01-XX
-- Description: Creates table for storing item groups assigned to locations

-- Create assigned_items table
CREATE TABLE IF NOT EXISTS assigned_items (
    id SERIAL PRIMARY KEY,
    location_id INT NOT NULL REFERENCES st_locations(location_id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assigned_items_location_id ON assigned_items(location_id);
CREATE INDEX IF NOT EXISTS idx_assigned_items_item_name ON assigned_items(item_name);

-- Add unique constraint to prevent duplicate assignments
ALTER TABLE assigned_items ADD CONSTRAINT unique_location_item UNIQUE (location_id, item_name);

-- Add comment to table
COMMENT ON TABLE assigned_items IS 'Stores item groups (forms) assigned to specific locations for inventory counting';

COMMIT; 
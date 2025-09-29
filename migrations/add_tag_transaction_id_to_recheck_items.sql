-- Add tag_id to recheck_items table
-- This allows linking recheck items back to their original transactions using tag_id and location_id

ALTER TABLE recheck_items 
ADD COLUMN tag_id VARCHAR(255);

-- Add index for better performance
CREATE INDEX idx_recheck_items_tag_location ON recheck_items(tag_id, location_id);

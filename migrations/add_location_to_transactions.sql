-- Migration: Add location column to transactions table
-- Date: 2024-12-XX
-- Description: Adds location column to store the location description from counter page

-- Add location column to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS location VARCHAR(255) NULL;

-- Add comment to the new column
COMMENT ON COLUMN transactions.location IS 'Location description entered by counter user';

COMMIT;

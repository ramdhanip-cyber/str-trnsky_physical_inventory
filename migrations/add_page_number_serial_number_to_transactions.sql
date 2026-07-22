-- Migration: Add page_number and serial_number columns to transactions table
-- Created: 2024

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS page_number VARCHAR(255),
ADD COLUMN IF NOT EXISTS serial_number VARCHAR(255);

-- Add comments to the columns
COMMENT ON COLUMN transactions.page_number IS 'Page number for the transaction';
COMMENT ON COLUMN transactions.serial_number IS 'Serial number for the transaction';


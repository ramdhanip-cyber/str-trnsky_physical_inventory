-- Add type column to transactions table
ALTER TABLE transactions ADD COLUMN type VARCHAR(255);

-- Add index for better performance
CREATE INDEX idx_transactions_type ON transactions(type);

-- Add comment to document the column
COMMENT ON COLUMN transactions.type IS 'Type field for inventory transactions'; 
-- Add sys_tag_no column to transactions table
ALTER TABLE transactions 
ADD COLUMN sys_tag_no VARCHAR(255) DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN transactions.sys_tag_no IS 'System tag number, defaults to NULL';


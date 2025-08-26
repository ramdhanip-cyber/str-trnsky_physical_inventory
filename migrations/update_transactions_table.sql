-- Migration: Update transactions table structure
-- This script updates the transactions table to match the new requirements

-- Check if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transactions') THEN
        RAISE NOTICE 'Table transactions exists, will update structure';
    ELSE
        RAISE NOTICE 'Table transactions does not exist, will create it';
    END IF;
END $$;

-- Drop existing table if it exists (WARNING: This will delete all data)
DROP TABLE IF EXISTS transactions CASCADE;

-- Create the updated transactions table
CREATE TABLE transactions (
    transaction_id SERIAL PRIMARY KEY,
    tag_id VARCHAR(50) NULL,
    form VARCHAR(50) NULL,
    grade VARCHAR(50) NULL,
    size VARCHAR(50) NULL,
    width VARCHAR(50) NULL,
    finish VARCHAR(50) NULL,
    ext_finish VARCHAR(50) NULL,
    remarks VARCHAR(50) NULL,
    count_type VARCHAR(50) NULL,
    qty INT NOT NULL,
    location_id INT NULL,
    section_id INT NULL,
    counted_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    team_id INT NULL,
    length VARCHAR(255) NULL,
    updated_at TIMESTAMPTZ NULL,
    checker_count INT NULL,
    mill VARCHAR(225) NULL,
    heat VARCHAR(225) NULL,
    ad_cmts VARCHAR(225) NULL,
    role VARCHAR(225) NULL,
    verified BOOLEAN NULL,
    type VARCHAR(255) NULL,
    
    -- Foreign key constraints
    CONSTRAINT fk_transactions_location 
        FOREIGN KEY (location_id) 
        REFERENCES st_locations(location_id) 
        ON DELETE SET NULL,
    
    CONSTRAINT fk_transactions_section 
        FOREIGN KEY (section_id) 
        REFERENCES st_sections(section_id) 
        ON DELETE SET NULL,
    
    CONSTRAINT fk_transactions_counted_by 
        FOREIGN KEY (counted_by) 
        REFERENCES st_users(user_id) 
        ON DELETE SET NULL,
    
    CONSTRAINT fk_transactions_team 
        FOREIGN KEY (team_id) 
        REFERENCES teams(team_id) 
        ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX idx_transactions_location_id ON transactions(location_id);
CREATE INDEX idx_transactions_section_id ON transactions(section_id);
CREATE INDEX idx_transactions_team_id ON transactions(team_id);
CREATE INDEX idx_transactions_counted_by ON transactions(counted_by);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_tag_id ON transactions(tag_id);
CREATE INDEX idx_transactions_form ON transactions(form);
CREATE INDEX idx_transactions_verified ON transactions(verified);

-- Add comments for documentation
COMMENT ON TABLE transactions IS 'Stores each counted transaction with item details';
COMMENT ON COLUMN transactions.transaction_id IS 'Primary key - unique identifier for each transaction';
COMMENT ON COLUMN transactions.tag_id IS 'Tag identifier for the counted item';
COMMENT ON COLUMN transactions.form IS 'Form of the item';
COMMENT ON COLUMN transactions.grade IS 'Grade of the item';
COMMENT ON COLUMN transactions.size IS 'Size of the item';
COMMENT ON COLUMN transactions.width IS 'Width of the item';
COMMENT ON COLUMN transactions.finish IS 'Finish of the item';
COMMENT ON COLUMN transactions.ext_finish IS 'Extended finish of the item';
COMMENT ON COLUMN transactions.remarks IS 'Additional remarks about the transaction';
COMMENT ON COLUMN transactions.count_type IS 'Type of count performed';
COMMENT ON COLUMN transactions.qty IS 'Quantity counted (NOT NULL)';
COMMENT ON COLUMN transactions.location_id IS 'Foreign key to st_locations table';
COMMENT ON COLUMN transactions.section_id IS 'Foreign key to st_sections table';
COMMENT ON COLUMN transactions.counted_by IS 'Foreign key to st_users table - who counted this';
COMMENT ON COLUMN transactions.created_at IS 'Timestamp when transaction was created';
COMMENT ON COLUMN transactions.team_id IS 'Foreign key to teams table';
COMMENT ON COLUMN transactions.length IS 'Length of the item';
COMMENT ON COLUMN transactions.updated_at IS 'Timestamp when transaction was last updated';
COMMENT ON COLUMN transactions.checker_count IS 'Count verified by checker';
COMMENT ON COLUMN transactions.mill IS 'Mill information';
COMMENT ON COLUMN transactions.heat IS 'Heat information';
COMMENT ON COLUMN transactions.ad_cmts IS 'Additional comments';
COMMENT ON COLUMN transactions.role IS 'Role of the person who counted';
COMMENT ON COLUMN transactions.verified IS 'Whether the transaction has been verified';
COMMENT ON COLUMN transactions.type IS 'Type of the item';

-- Verify the table was created
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'transactions' 
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
WHERE tc.table_name = 'transactions' 
    AND tc.constraint_type = 'FOREIGN KEY'; 
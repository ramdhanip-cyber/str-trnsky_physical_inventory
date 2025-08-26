-- Migration: Add checker_transactions table
-- Date: 2024-01-XX
-- Description: Creates table for storing checker transactions and verification data

-- Create checker_transactions table
CREATE TABLE IF NOT EXISTS checker_transactions (
    id SERIAL PRIMARY KEY,
    transaction_id INT NOT NULL UNIQUE REFERENCES transactions(transaction_id),
    tag_id VARCHAR(255),
    form VARCHAR(255),
    grade VARCHAR(255),
    size VARCHAR(255),
    width VARCHAR(255),
    finish VARCHAR(255),
    ext_finish VARCHAR(255),
    length VARCHAR(255),
    count_type VARCHAR(50),
    qty INT,
    checker_count INT,
    location_id INT NOT NULL REFERENCES st_locations(location_id),
    section_id INT NOT NULL REFERENCES st_sections(section_id),
    verified BOOLEAN DEFAULT FALSE,
    verified_by INT REFERENCES st_users(user_id),
    verified_at TIMESTAMPTZ,
    updated_by INT REFERENCES st_users(user_id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_checker_transactions_transaction_id ON checker_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_checker_transactions_location_id ON checker_transactions(location_id);
CREATE INDEX IF NOT EXISTS idx_checker_transactions_section_id ON checker_transactions(section_id);
CREATE INDEX IF NOT EXISTS idx_checker_transactions_verified ON checker_transactions(verified);

-- Add comment to table
COMMENT ON TABLE checker_transactions IS 'Stores checker transactions for verification tracking and audit purposes';

COMMIT; 
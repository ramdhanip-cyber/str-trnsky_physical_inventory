-- Migration: Add branch and warehouse columns to reconciliation_records table
-- This allows checking for existing reconciliation data by branch and warehouse

DO $$
BEGIN
    -- Check if columns already exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reconciliation_records' 
        AND column_name = 'branch'
    ) THEN
        ALTER TABLE reconciliation_records ADD COLUMN branch VARCHAR(255);
        RAISE NOTICE 'Added branch column to reconciliation_records table';
    ELSE
        RAISE NOTICE 'branch column already exists in reconciliation_records table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reconciliation_records' 
        AND column_name = 'warehouse'
    ) THEN
        ALTER TABLE reconciliation_records ADD COLUMN warehouse VARCHAR(255);
        RAISE NOTICE 'Added warehouse column to reconciliation_records table';
    ELSE
        RAISE NOTICE 'warehouse column already exists in reconciliation_records table';
    END IF;

    -- Add index for efficient querying by branch and warehouse
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'reconciliation_records' 
        AND indexname = 'idx_reconciliation_records_branch_warehouse'
    ) THEN
        CREATE INDEX idx_reconciliation_records_branch_warehouse ON reconciliation_records(branch, warehouse);
        RAISE NOTICE 'Added index for branch and warehouse columns';
    ELSE
        RAISE NOTICE 'Index for branch and warehouse already exists';
    END IF;
END $$; 
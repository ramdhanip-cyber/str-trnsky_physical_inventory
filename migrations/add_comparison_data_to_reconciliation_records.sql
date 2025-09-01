-- Migration: Add comparison_data column to reconciliation_records table
-- This stores the comparison results (checker quantities, variance, status) for each system item

DO $$
BEGIN
    -- Check if column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reconciliation_records'
        AND column_name = 'comparison_data'
    ) THEN
        ALTER TABLE reconciliation_records ADD COLUMN comparison_data JSONB;
        RAISE NOTICE 'Added comparison_data column to reconciliation_records table';
    ELSE
        RAISE NOTICE 'comparison_data column already exists in reconciliation_records table';
    END IF;

    -- Add index for efficient querying by comparison_data
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'reconciliation_records'
        AND indexname = 'idx_reconciliation_records_comparison_data'
    ) THEN
        CREATE INDEX idx_reconciliation_records_comparison_data ON reconciliation_records USING GIN (comparison_data);
        RAISE NOTICE 'Added GIN index for comparison_data column';
    ELSE
        RAISE NOTICE 'Index for comparison_data already exists';
    END IF;
END $$; 
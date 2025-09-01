-- Migration: Update recheck_items table data types to handle decimal values
-- This changes system_qty, counted_qty, and variance from INT to NUMERIC

DO $$
BEGIN
    -- Check if columns exist and update their data types
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'recheck_items' 
        AND column_name = 'system_qty'
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE recheck_items ALTER COLUMN system_qty TYPE NUMERIC(10,2);
        RAISE NOTICE 'Updated system_qty column from INT to NUMERIC(10,2)';
    ELSE
        RAISE NOTICE 'system_qty column already has correct data type or does not exist';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'recheck_items' 
        AND column_name = 'counted_qty'
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE recheck_items ALTER COLUMN counted_qty TYPE NUMERIC(10,2);
        RAISE NOTICE 'Updated counted_qty column from INT to NUMERIC(10,2)';
    ELSE
        RAISE NOTICE 'counted_qty column already has correct data type or does not exist';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'recheck_items' 
        AND column_name = 'variance'
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE recheck_items ALTER COLUMN variance TYPE NUMERIC(10,2);
        RAISE NOTICE 'Updated variance column from INT to NUMERIC(10,2)';
    ELSE
        RAISE NOTICE 'variance column already has correct data type or does not exist';
    END IF;

END $$; 
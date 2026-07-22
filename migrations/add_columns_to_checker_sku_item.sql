-- Add additional columns to checker_sku_item table
ALTER TABLE checker_sku_item
ADD COLUMN IF NOT EXISTS transaction_id INTEGER,
ADD COLUMN IF NOT EXISTS section_id INTEGER,
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS type VARCHAR(255),
ADD COLUMN IF NOT EXISTS quality VARCHAR(255);

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_checker_sku_item_transaction'
  ) THEN
    ALTER TABLE checker_sku_item
    ADD CONSTRAINT fk_checker_sku_item_transaction 
      FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_checker_sku_item_section'
  ) THEN
    ALTER TABLE checker_sku_item
    ADD CONSTRAINT fk_checker_sku_item_section 
      FOREIGN KEY (section_id) REFERENCES st_sections(section_id) ON DELETE SET NULL;
  END IF;
END $$;


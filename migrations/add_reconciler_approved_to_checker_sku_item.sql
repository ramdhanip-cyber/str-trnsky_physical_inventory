-- Track reconciler approval of checker-verified marked items on Counter Review
-- Use star.checker_sku_item if your tables live in the star schema (common in production).

ALTER TABLE star.checker_sku_item
  ADD COLUMN IF NOT EXISTS reconciler_approved BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reconciler_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reconciler_approved_by INT;

-- If tables are in public instead, run:
-- ALTER TABLE checker_sku_item
--   ADD COLUMN IF NOT EXISTS reconciler_approved BOOLEAN DEFAULT false,
--   ADD COLUMN IF NOT EXISTS reconciler_approved_at TIMESTAMPTZ,
--   ADD COLUMN IF NOT EXISTS reconciler_approved_by INT;

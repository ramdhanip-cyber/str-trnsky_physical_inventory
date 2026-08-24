-- Add missing columns to star.st_adj_items for full reconciliation adjustment detail
-- Run once on the sandbox/live DB as a user with ALTER privilege on schema star

ALTER TABLE star.st_adj_items
  ADD COLUMN IF NOT EXISTS sys_tag_no    VARCHAR(500),
  ADD COLUMN IF NOT EXISTS weight        NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS branch        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS warehouse     VARCHAR(255),
  ADD COLUMN IF NOT EXISTS recon_status  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS section_desc  VARCHAR(255);

COMMENT ON COLUMN star.st_adj_items.sys_tag_no IS 'System tag number(s); comma-separated when multiple tags apply';
COMMENT ON COLUMN star.st_adj_items.recon_status IS 'Reconciliation comparison status at mark time (Match/Overcount/Undercount/Orphaned)';

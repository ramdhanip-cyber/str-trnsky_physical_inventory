-- Allow branch to be null when creating inventory locations (warehouse-only flow)
-- Use star.st_locations if your tables live in the star schema (common in production).
ALTER TABLE star.st_locations
  ALTER COLUMN branch DROP NOT NULL;

-- If tables are in public instead, run:
-- ALTER TABLE st_locations ALTER COLUMN branch DROP NOT NULL;

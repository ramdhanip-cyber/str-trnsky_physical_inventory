-- Migration: Create assigned_locations table
-- This table links locations, sections, and teams for assignments

-- Check if table already exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'assigned_locations') THEN
        RAISE NOTICE 'Table assigned_locations already exists';
    ELSE
        RAISE NOTICE 'Creating assigned_locations table';
    END IF;
END $$;

-- Create the assigned_locations table
CREATE TABLE IF NOT EXISTS assigned_locations (
    id SERIAL PRIMARY KEY,
    location_id INT NOT NULL,
    sub_location_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    team_id INT NULL,
    status VARCHAR(225) DEFAULT 'Not Started',
    
    -- Foreign key constraints
    CONSTRAINT fk_assigned_locations_location 
        FOREIGN KEY (location_id) 
        REFERENCES st_locations(location_id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_assigned_locations_section 
        FOREIGN KEY (sub_location_id) 
        REFERENCES st_sections(section_id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_assigned_locations_team 
        FOREIGN KEY (team_id) 
        REFERENCES teams(team_id) 
        ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assigned_locations_location_id ON assigned_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_assigned_locations_sub_location_id ON assigned_locations(sub_location_id);
CREATE INDEX IF NOT EXISTS idx_assigned_locations_team_id ON assigned_locations(team_id);
CREATE INDEX IF NOT EXISTS idx_assigned_locations_status ON assigned_locations(status);
CREATE INDEX IF NOT EXISTS idx_assigned_locations_assigned_at ON assigned_locations(assigned_at);

-- Add comments for documentation
COMMENT ON TABLE assigned_locations IS 'Stores assignments of teams to specific locations and sections';
COMMENT ON COLUMN assigned_locations.id IS 'Primary key - unique identifier for each assignment';
COMMENT ON COLUMN assigned_locations.location_id IS 'Foreign key to st_locations table';
COMMENT ON COLUMN assigned_locations.sub_location_id IS 'Foreign key to st_sections table (section_id)';
COMMENT ON COLUMN assigned_locations.assigned_at IS 'Timestamp when the assignment was created';
COMMENT ON COLUMN assigned_locations.completed_at IS 'Timestamp when the assignment was completed (NULL if not completed)';
COMMENT ON COLUMN assigned_locations.team_id IS 'Foreign key to teams table (can be NULL if no team assigned)';
COMMENT ON COLUMN assigned_locations.status IS 'Current status of the assignment (e.g., Not Started, In Progress, Completed)';

-- Verify the table was created
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'assigned_locations' 
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
WHERE tc.table_name = 'assigned_locations' 
    AND tc.constraint_type = 'FOREIGN KEY'; 
-- Migration: Add checker activity logs table
-- Date: 2024-01-XX
-- Description: Creates table to log all checker activities for controller review

-- Logs all checker activities for controller review
CREATE TABLE checker_activity_logs (
    log_id SERIAL PRIMARY KEY,
    location_id INT NOT NULL REFERENCES st_locations(location_id),
    section_id INT NOT NULL REFERENCES st_sections(section_id),
    team_id INT NOT NULL REFERENCES teams(team_id),
    checker_user_id INT NOT NULL REFERENCES st_users(user_id),
    activity_type VARCHAR(50) NOT NULL, -- 'new_line_added', 'transaction_modified', 'transaction_verified'
    transaction_id INT REFERENCES transactions(transaction_id),
    tag_id VARCHAR(255),
    old_values JSONB, -- Store previous values for modifications
    new_values JSONB, -- Store new values
    activity_description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying by controller
CREATE INDEX idx_checker_logs_location_section ON checker_activity_logs(location_id, section_id);
CREATE INDEX idx_checker_logs_created_at ON checker_activity_logs(created_at DESC);
CREATE INDEX idx_checker_logs_activity_type ON checker_activity_logs(activity_type);

COMMIT; 
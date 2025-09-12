-- =================================================================
-- Users and Roles
-- =================================================================

-- Roles for users (e.g., Controller, Counter, Checker)
CREATE TABLE st_roles (
    role_id SERIAL PRIMARY KEY,
    role_desc VARCHAR(255) UNIQUE NOT NULL
);

-- User accounts
CREATE TABLE st_users (
    user_id SERIAL PRIMARY KEY,
    user_name VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User sessions
CREATE TABLE st_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES st_users(user_id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- =================================================================
-- Inventory and Location
-- =================================================================

-- Main inventory locations
CREATE TABLE st_locations (
    location_id SERIAL PRIMARY KEY,
    location_desc VARCHAR(255) NOT NULL,
    warehouse VARCHAR(255) NOT NULL,
    branch VARCHAR(255) NOT NULL,
    created_by INT REFERENCES st_users(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sections within a location
CREATE TABLE st_sections (
    section_id SERIAL PRIMARY KEY,
    section_desc VARCHAR(255) NOT NULL,
    location_id INT NOT NULL REFERENCES st_locations(location_id) ON DELETE CASCADE,
    created_by INT REFERENCES st_users(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =================================================================
-- Teams and Assignments
-- =================================================================

-- Teams of users
CREATE TABLE teams (
    team_id SERIAL PRIMARY KEY,
    team_name VARCHAR(255) NOT NULL,
    time_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES st_users(user_id),
    tag_from VARCHAR(255),
    tag_to VARCHAR(255),
    current_tag INT
);

-- Members of a team
CREATE TABLE team_members (
    id SERIAL PRIMARY KEY,
    team_id INT NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES st_users(user_id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES st_roles(role_id) ON DELETE CASCADE
);

-- Assigns teams to specific locations and sections
CREATE TABLE assigned_locations (
    id SERIAL PRIMARY KEY,
    location_id INT NOT NULL REFERENCES st_locations(location_id) ON DELETE CASCADE,
    sub_location_id INT NOT NULL REFERENCES st_sections(section_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    team_id INT NULL REFERENCES teams(team_id) ON DELETE SET NULL,
    status VARCHAR(225) DEFAULT 'In Progress'
);

-- =================================================================
-- Assigned Items
-- =================================================================

-- Stores items assigned to specific locations for counting
CREATE TABLE assigned_items (
    id SERIAL PRIMARY KEY,
    location_id INT NOT NULL REFERENCES st_locations(location_id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_assigned_items_location_id ON assigned_items(location_id);
CREATE INDEX idx_assigned_items_item_name ON assigned_items(item_name);

-- =================================================================
-- Inventory Counting
-- =================================================================

-- Stores each counted transaction
CREATE TABLE transactions (
    transaction_id SERIAL PRIMARY KEY,
    tag_id VARCHAR(50) NULL,
    form VARCHAR(50) NULL,
    grade VARCHAR(50) NULL,
    size VARCHAR(50) NULL,
    width VARCHAR(50) NULL,
    finish VARCHAR(50) NULL,
    ext_finish VARCHAR(50) NULL,
    remarks VARCHAR(50) NULL,
    count_type VARCHAR(50) NULL,
    qty INT NOT NULL,
    location_id INT NULL REFERENCES st_locations(location_id),
    section_id INT NULL REFERENCES st_sections(section_id),
    counted_by INT NULL REFERENCES st_users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    team_id INT NULL REFERENCES teams(team_id),
    length VARCHAR(255) NULL,
    updated_at TIMESTAMPTZ NULL,
    checker_count INT NULL,
    mill VARCHAR(225) NULL,
    heat VARCHAR(225) NULL,
    ad_cmts VARCHAR(225) NULL,
    role VARCHAR(225) NULL,
    verified BOOLEAN NULL,
    type VARCHAR(255) NULL
);

-- For bundle counts within a transaction
CREATE TABLE bundles (
    id SERIAL PRIMARY KEY,
    transaction_id INT NOT NULL REFERENCES transactions(transaction_id) ON DELETE CASCADE,
    tag_id INT NOT NULL,
    num_of_bundle INT NOT NULL,
    bundle_count INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stores items assigned to a checker for SKU-based checking
CREATE TABLE checker_sku_items (
    id SERIAL PRIMARY KEY,
    location_id INT NOT NULL REFERENCES st_locations(location_id),
    form VARCHAR(255),
    grade VARCHAR(255),
    size VARCHAR(255),
    finish VARCHAR(255),
    ext_finish VARCHAR(255),
    width VARCHAR(255),
    length VARCHAR(255),
    mill VARCHAR(255),
    heat VARCHAR(255),
    system_qty INT,
    counted_qty INT,
    variance INT,
    status VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);



-- Stores items marked for rechecking
CREATE TABLE recheck_items (
    id SERIAL PRIMARY KEY,
    location_id INT NOT NULL REFERENCES st_locations(location_id),
    form VARCHAR(255),
    grade VARCHAR(255),
    size VARCHAR(255),
    finish VARCHAR(255),
    ext_finish VARCHAR(255),
    width VARCHAR(255),
    length VARCHAR(255),
    mill VARCHAR(255),
    heat VARCHAR(255),
    system_qty NUMERIC(10,2),
    counted_qty NUMERIC(10,2),
    variance NUMERIC(10,2),
    status VARCHAR(100) DEFAULT 'Rechecking in Progress',
    recheck_reason TEXT,
    marked_by INT REFERENCES st_users(user_id),
    marked_at TIMESTAMPTZ DEFAULT NOW(),
    rechecked_by INT REFERENCES st_users(user_id),
    rechecked_at TIMESTAMPTZ,
    recheck_count INT DEFAULT 0,
    original_transaction_ids TEXT -- JSON array of original transaction IDs
);

-- =================================================================
-- Checker Activity Logging
-- =================================================================

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

-- =================================================================
-- Reconciliation Records
-- =================================================================

-- Stores reconciliation records for each location with summary and detailed item data
CREATE TABLE reconciliation_records (
    id SERIAL PRIMARY KEY,
    location_id INT NOT NULL REFERENCES st_locations(location_id) ON DELETE CASCADE,
    branch VARCHAR(255) NOT NULL,
    warehouse VARCHAR(255) NOT NULL,
    record_name VARCHAR(255) NULL,
    record_date TIMESTAMPTZ DEFAULT NOW(),
    created_by INT NULL REFERENCES st_users(user_id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active',
    summary_data JSONB NOT NULL,
    items_data JSONB NOT NULL,

    notes TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ NULL
);

-- Create indexes for better performance
CREATE INDEX idx_reconciliation_records_location_id ON reconciliation_records(location_id);
CREATE INDEX idx_reconciliation_records_branch_warehouse ON reconciliation_records(branch, warehouse);
CREATE INDEX idx_reconciliation_records_status ON reconciliation_records(status);
CREATE INDEX idx_reconciliation_records_created_by ON reconciliation_records(created_by);
CREATE INDEX idx_reconciliation_records_record_date ON reconciliation_records(record_date);

-- =================================================================
-- Initial Data
-- =================================================================

INSERT INTO st_roles (role_desc) VALUES ('Controller'), ('Counter'), ('Checker');

COMMIT; 
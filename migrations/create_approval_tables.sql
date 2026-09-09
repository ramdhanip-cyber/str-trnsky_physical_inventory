-- Approval tables for adjustment workflow (matches SSS application)

CREATE TABLE IF NOT EXISTS str_adj_aprvl (
    aprvl_id SERIAL PRIMARY KEY,
    location_id INTEGER NOT NULL,
    adj_name VARCHAR(255) NOT NULL,
    request_type VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
    status VARCHAR(50) NOT NULL DEFAULT 'In Progress',
    approval_status VARCHAR(50) NOT NULL DEFAULT 'Under Approval',
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS str_adj_aprvl_dtl (
    dtl_id SERIAL PRIMARY KEY,
    aprvl_id INTEGER NOT NULL REFERENCES str_adj_aprvl(aprvl_id) ON DELETE CASCADE,
    item_control_no VARCHAR(255),
    system_tag_no VARCHAR(255),
    form VARCHAR(255) NOT NULL,
    grade VARCHAR(255) NOT NULL,
    size VARCHAR(255) NOT NULL,
    finish VARCHAR(255),
    ext_finish VARCHAR(255),
    width NUMERIC(18, 2),
    length NUMERIC(18, 2),
    location VARCHAR(255),
    mill VARCHAR(255),
    heat VARCHAR(255),
    quality_standards VARCHAR(255),
    type VARCHAR(255),
    system_qty NUMERIC(18, 2) NOT NULL DEFAULT 0,
    counted_qty NUMERIC(18, 2) NOT NULL DEFAULT 0,
    variance_qty NUMERIC(18, 2) NOT NULL DEFAULT 0,
    adj_qty NUMERIC(18, 2) NOT NULL DEFAULT 0,
    cost NUMERIC(18, 2) NOT NULL DEFAULT 0,
    amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    cost_uom VARCHAR(20),
    adj_res_data JSONB,
    adj_typ VARCHAR(50) NOT NULL DEFAULT 'QTY',
    is_reserved INTEGER NOT NULL DEFAULT 0,
    is_adjusted INTEGER NOT NULL DEFAULT 0,
    adjust_status VARCHAR(10) NOT NULL DEFAULT 'N',
    intchg_no INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_str_adj_aprvl_location ON str_adj_aprvl(location_id);
CREATE INDEX IF NOT EXISTS idx_str_adj_aprvl_request_type ON str_adj_aprvl(request_type);
CREATE INDEX IF NOT EXISTS idx_str_adj_aprvl_status ON str_adj_aprvl(status);
CREATE INDEX IF NOT EXISTS idx_str_adj_aprvl_approval_status ON str_adj_aprvl(approval_status);
CREATE INDEX IF NOT EXISTS idx_str_adj_aprvl_dtl_aprvl_id ON str_adj_aprvl_dtl(aprvl_id);
CREATE INDEX IF NOT EXISTS idx_str_adj_aprvl_dtl_item_control_no ON str_adj_aprvl_dtl(item_control_no);

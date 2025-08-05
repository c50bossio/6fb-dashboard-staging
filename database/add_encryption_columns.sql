-- Add encryption columns to existing tables
-- This handles existing database structures safely

-- First, attempt to add encryption columns (will fail silently if they exist)

-- Users table
ALTER TABLE users ADD COLUMN email_search_hash TEXT;
ALTER TABLE users ADD COLUMN encryption_version TEXT DEFAULT '1.0';
ALTER TABLE users ADD COLUMN phone_number TEXT;
ALTER TABLE users ADD COLUMN address TEXT;
ALTER TABLE users ADD COLUMN payment_info TEXT;
ALTER TABLE users ADD COLUMN api_keys TEXT;

-- Sessions table
ALTER TABLE sessions ADD COLUMN encryption_version TEXT DEFAULT '1.0';
ALTER TABLE sessions ADD COLUMN device_fingerprint TEXT;

-- Create additional tables if they don't exist
CREATE TABLE IF NOT EXISTS ai_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    conversation_data TEXT,
    user_context TEXT,
    business_data TEXT,
    encryption_version TEXT DEFAULT '1.0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS integrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    api_credentials TEXT,
    oauth_tokens TEXT,
    webhook_secrets TEXT,
    encryption_version TEXT DEFAULT '1.0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update audit_logs table if it exists, create if it doesn't
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    action TEXT,
    resource_type TEXT,
    resource_id TEXT,
    details TEXT,
    request_data TEXT,
    response_data TEXT,
    encryption_version TEXT DEFAULT '1.0',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT
);

-- Try to add encryption columns to audit_logs
ALTER TABLE audit_logs ADD COLUMN request_data TEXT;
ALTER TABLE audit_logs ADD COLUMN response_data TEXT;
ALTER TABLE audit_logs ADD COLUMN encryption_version TEXT DEFAULT '1.0';

-- Create encryption configuration tables
CREATE TABLE IF NOT EXISTS encryption_key_rotation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_version TEXT NOT NULL,
    rotation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rotated_by TEXT,
    tables_affected TEXT,
    status TEXT DEFAULT 'active',
    notes TEXT
);

CREATE TABLE IF NOT EXISTS encryption_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    field_name TEXT NOT NULL,
    encryption_type TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(table_name, field_name)
);

-- Insert initial data (will be ignored if already exists)
INSERT OR IGNORE INTO encryption_key_rotation (key_version, rotated_by, tables_affected, notes)
VALUES ('1.0', 'system', '["users", "sessions", "ai_conversations", "integrations", "audit_logs"]', 'Initial encryption deployment');

-- Insert encryption configuration
INSERT OR IGNORE INTO encryption_config (table_name, field_name, encryption_type) VALUES
('users', 'email', 'searchable'),
('users', 'phone_number', 'standard'),
('users', 'address', 'standard'),
('users', 'payment_info', 'standard'),
('users', 'api_keys', 'standard'),
('sessions', 'user_agent', 'standard'),
('sessions', 'ip_address', 'standard'),
('sessions', 'device_fingerprint', 'standard'),
('ai_conversations', 'conversation_data', 'standard'),
('ai_conversations', 'user_context', 'standard'),
('ai_conversations', 'business_data', 'standard'),
('integrations', 'api_credentials', 'standard'),
('integrations', 'oauth_tokens', 'standard'),
('integrations', 'webhook_secrets', 'standard'),
('audit_logs', 'request_data', 'standard'),
('audit_logs', 'response_data', 'standard');

-- Create views for monitoring
DROP VIEW IF EXISTS encryption_status_view;
CREATE VIEW encryption_status_view AS
SELECT 
    ec.table_name,
    ec.field_name,
    ec.encryption_type,
    ec.is_active,
    ekr.key_version,
    ekr.rotation_date,
    ekr.status as key_status
FROM encryption_config ec
LEFT JOIN encryption_key_rotation ekr ON ekr.status = 'active'
WHERE ec.is_active = 1;

-- Create simple integrity check view
DROP VIEW IF EXISTS encryption_integrity_check;
CREATE VIEW encryption_integrity_check AS
SELECT 
    'users' as table_name, 
    'email' as field_name, 
    COUNT(*) as total_records,
    0 as encrypted_records,  -- Will be updated when encryption starts
    0.0 as encryption_percentage
FROM users WHERE email IS NOT NULL AND email != '';

-- Create indexes if they don't exist (will fail silently if columns don't exist)
CREATE INDEX IF NOT EXISTS idx_users_email_search ON users(email_search_hash);
CREATE INDEX IF NOT EXISTS idx_users_encryption_version ON users(encryption_version);
CREATE INDEX IF NOT EXISTS idx_sessions_encryption_version ON sessions(encryption_version);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_encryption_version ON ai_conversations(encryption_version);
CREATE INDEX IF NOT EXISTS idx_integrations_encryption_version ON integrations(encryption_version);
CREATE INDEX IF NOT EXISTS idx_audit_logs_encryption_version ON audit_logs(encryption_version);
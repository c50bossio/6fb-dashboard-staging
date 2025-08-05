-- Database Schema Updates for Encryption at Rest
-- 6FB AI Agent System - Production Security Enhancement

-- First, let's check what tables exist and create base tables if needed
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    phone_number TEXT,
    address TEXT,
    payment_info TEXT,
    api_keys TEXT,
    email_search_hash TEXT,
    encryption_version TEXT DEFAULT '1.0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    user_agent TEXT,
    ip_address TEXT,
    device_fingerprint TEXT,
    encryption_version TEXT DEFAULT '1.0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- Create encryption key rotation tracking table
CREATE TABLE IF NOT EXISTS encryption_key_rotation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_version TEXT NOT NULL,
    rotation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rotated_by TEXT,
    tables_affected TEXT, -- JSON array of affected tables
    status TEXT DEFAULT 'active', -- active, deprecated, revoked
    notes TEXT
);

-- Insert initial key version
INSERT OR IGNORE INTO encryption_key_rotation (key_version, rotated_by, tables_affected, notes)
VALUES ('1.0', 'system', '["users", "sessions", "ai_conversations", "integrations", "audit_logs"]', 'Initial encryption deployment');

-- Create database encryption configuration table
CREATE TABLE IF NOT EXISTS encryption_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    field_name TEXT NOT NULL,
    encryption_type TEXT NOT NULL, -- 'standard' or 'searchable'
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(table_name, field_name)
);

-- Insert encryption configuration for all encrypted fields
INSERT OR IGNORE INTO encryption_config (table_name, field_name, encryption_type) VALUES
-- Users table encrypted fields
('users', 'email', 'searchable'),
('users', 'phone_number', 'standard'),
('users', 'address', 'standard'),
('users', 'payment_info', 'standard'),
('users', 'api_keys', 'standard'),

-- Sessions table encrypted fields  
('sessions', 'user_agent', 'standard'),
('sessions', 'ip_address', 'standard'),
('sessions', 'device_fingerprint', 'standard'),

-- AI conversations encrypted fields
('ai_conversations', 'conversation_data', 'standard'),
('ai_conversations', 'user_context', 'standard'),
('ai_conversations', 'business_data', 'standard'),

-- Integrations encrypted fields
('integrations', 'api_credentials', 'standard'),
('integrations', 'oauth_tokens', 'standard'),
('integrations', 'webhook_secrets', 'standard'),

-- Audit logs encrypted fields
('audit_logs', 'request_data', 'standard'),
('audit_logs', 'response_data', 'standard');

-- Create view for encryption status monitoring
CREATE VIEW IF NOT EXISTS encryption_status_view AS
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

-- Create view for encryption integrity check
CREATE VIEW IF NOT EXISTS encryption_integrity_check AS
SELECT 
    'users' as table_name, 
    'email' as field_name, 
    COUNT(*) as total_records,
    COUNT(CASE WHEN encryption_version IS NOT NULL THEN 1 END) as encrypted_records,
    ROUND(
        (COUNT(CASE WHEN encryption_version IS NOT NULL THEN 1 END) * 100.0 / COUNT(*)), 2
    ) as encryption_percentage
FROM users WHERE email IS NOT NULL
UNION ALL
SELECT 
    'users' as table_name, 
    'phone_number' as field_name, 
    COUNT(*) as total_records,
    COUNT(CASE WHEN encryption_version IS NOT NULL THEN 1 END) as encrypted_records,
    ROUND(
        (COUNT(CASE WHEN encryption_version IS NOT NULL THEN 1 END) * 100.0 / COUNT(*)), 2
    ) as encryption_percentage
FROM users WHERE phone_number IS NOT NULL
UNION ALL
SELECT 
    'sessions' as table_name, 
    'user_agent' as field_name, 
    COUNT(*) as total_records,
    COUNT(CASE WHEN encryption_version IS NOT NULL THEN 1 END) as encrypted_records,
    ROUND(
        (COUNT(CASE WHEN encryption_version IS NOT NULL THEN 1 END) * 100.0 / COUNT(*)), 2
    ) as encryption_percentage
FROM sessions WHERE user_agent IS NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email_search ON users(email_search_hash);
CREATE INDEX IF NOT EXISTS idx_users_encryption_version ON users(encryption_version);
CREATE INDEX IF NOT EXISTS idx_sessions_encryption_version ON sessions(encryption_version);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_encryption_version ON ai_conversations(encryption_version);
CREATE INDEX IF NOT EXISTS idx_integrations_encryption_version ON integrations(encryption_version);
CREATE INDEX IF NOT EXISTS idx_audit_logs_encryption_version ON audit_logs(encryption_version);

-- Create triggers to update encryption metadata on record changes
CREATE TRIGGER IF NOT EXISTS users_encryption_update
    AFTER UPDATE ON users
    WHEN NEW.email != OLD.email OR NEW.phone_number != OLD.phone_number
BEGIN
    UPDATE users SET 
        encryption_version = (SELECT key_version FROM encryption_key_rotation WHERE status = 'active' LIMIT 1),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS sessions_encryption_update
    AFTER UPDATE ON sessions
    WHEN NEW.user_agent != OLD.user_agent OR NEW.ip_address != OLD.ip_address
BEGIN
    UPDATE sessions SET 
        encryption_version = (SELECT key_version FROM encryption_key_rotation WHERE status = 'active' LIMIT 1),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- Insert audit log entry for encryption schema deployment  
INSERT INTO audit_logs (
    user_id, 
    action, 
    resource_type, 
    resource_id, 
    details, 
    timestamp,
    ip_address,
    user_agent
) VALUES (
    'system',
    'ENCRYPTION_SCHEMA_DEPLOYED', 
    'database_schema',
    'encryption_at_rest',
    'Database encryption at rest schema deployed with AES-256-GCM encryption for sensitive fields',
    CURRENT_TIMESTAMP,
    '127.0.0.1',
    'Database Migration Script'
);
-- PostgreSQL Initialization Script for 6FB AI Agent System
-- Security-hardened database setup with proper user roles and permissions

-- =============================================================================
-- DATABASE CREATION
-- =============================================================================

-- Create the main application database if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'agent_system') THEN
        CREATE DATABASE agent_system 
        WITH 
            ENCODING = 'UTF8'
            LC_COLLATE = 'en_US.UTF-8'
            LC_CTYPE = 'en_US.UTF-8'
            TEMPLATE = template0;
    END IF;
END $$;

-- Connect to the agent_system database
\c agent_system;

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";        -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- Query statistics
CREATE EXTENSION IF NOT EXISTS "pgcrypto";         -- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";          -- Trigram matching for search
CREATE EXTENSION IF NOT EXISTS "btree_gin";        -- GIN indexes for better performance

-- =============================================================================
-- USER ROLES AND SECURITY
-- =============================================================================

-- Create application user role
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'agent_user') THEN
        CREATE ROLE agent_user WITH 
            LOGIN 
            PASSWORD 'CHANGE_ME_IN_PRODUCTION'  -- This will be overridden by environment variable
            NOSUPERUSER 
            NOCREATEDB 
            NOCREATEROLE 
            NOINHERIT 
            NOREPLICATION
            CONNECTION LIMIT 50;
    END IF;
END $$;

-- Create monitoring user role (read-only)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'monitoring_user') THEN
        CREATE ROLE monitoring_user WITH 
            LOGIN 
            PASSWORD 'CHANGE_ME_MONITORING'  -- This will be overridden by environment variable
            NOSUPERUSER 
            NOCREATEDB 
            NOCREATEROLE 
            NOINHERIT 
            NOREPLICATION
            CONNECTION LIMIT 10;
    END IF;
END $$;

-- Create backup user role
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'backup_user') THEN
        CREATE ROLE backup_user WITH 
            LOGIN 
            PASSWORD 'CHANGE_ME_BACKUP'  -- This will be overridden by environment variable
            NOSUPERUSER 
            NOCREATEDB 
            NOCREATEROLE 
            NOINHERIT 
            NOREPLICATION
            CONNECTION LIMIT 5;
    END IF;
END $$;

-- Create replication user role (for high availability)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'replicator') THEN
        CREATE ROLE replicator WITH 
            LOGIN 
            PASSWORD 'CHANGE_ME_REPLICATION'  -- This will be overridden by environment variable
            NOSUPERUSER 
            NOCREATEDB 
            NOCREATEROLE 
            NOINHERIT 
            REPLICATION
            CONNECTION LIMIT 3;
    END IF;
END $$;

-- =============================================================================
-- DATABASE SCHEMAS
-- =============================================================================

-- Create application schemas
CREATE SCHEMA IF NOT EXISTS auth;          -- Authentication and user management
CREATE SCHEMA IF NOT EXISTS ai_agents;     -- AI agent data and conversations
CREATE SCHEMA IF NOT EXISTS business;      -- Business logic and data
CREATE SCHEMA IF NOT EXISTS monitoring;    -- Monitoring and audit logs
CREATE SCHEMA IF NOT EXISTS compliance;    -- GDPR and compliance data

-- Set schema ownership
ALTER SCHEMA auth OWNER TO agent_user;
ALTER SCHEMA ai_agents OWNER TO agent_user;
ALTER SCHEMA business OWNER TO agent_user;
ALTER SCHEMA monitoring OWNER TO agent_user;
ALTER SCHEMA compliance OWNER TO agent_user;

-- =============================================================================
-- SECURITY POLICIES
-- =============================================================================

-- Enable Row Level Security on all schemas
ALTER DATABASE agent_system SET row_security = on;

-- Set secure search path
ALTER DATABASE agent_system SET search_path TO auth, ai_agents, business, public;

-- =============================================================================
-- AUTHENTICATION AND USER TABLES
-- =============================================================================

-- Users table with enhanced security
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    hashed_password TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    organization VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret TEXT,
    mfa_backup_codes TEXT[],
    login_ip_whitelist INET[],
    session_timeout_minutes INTEGER DEFAULT 30,
    deleted_at TIMESTAMP WITH TIME ZONE  -- Soft delete for GDPR compliance
);

-- User sessions table for secure session management
CREATE TABLE IF NOT EXISTS auth.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    refresh_token TEXT UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Token blacklist for secure logout
CREATE TABLE IF NOT EXISTS auth.token_blacklist (
    jti TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blacklisted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT,
    ip_address INET
);

-- Security events table for comprehensive audit logging
CREATE TABLE IF NOT EXISTS auth.security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(50) DEFAULT 'security',
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    details JSONB,
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
    resolved BOOLEAN DEFAULT FALSE,
    investigation_notes TEXT
);

-- =============================================================================
-- AI AGENTS SCHEMA TABLES
-- =============================================================================

-- AI conversations and chat history
CREATE TABLE IF NOT EXISTS ai_agents.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_type VARCHAR(100) NOT NULL,
    title VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    context_summary TEXT,
    total_messages INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0
);

-- Individual messages in conversations
CREATE TABLE IF NOT EXISTS ai_agents.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES ai_agents.conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    model_used VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    response_time_ms INTEGER,
    metadata JSONB DEFAULT '{}'
);

-- AI agent knowledge base
CREATE TABLE IF NOT EXISTS ai_agents.knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text',
    category VARCHAR(100),
    tags TEXT[],
    embedding VECTOR(1536),  -- OpenAI embedding dimensions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    source_url TEXT,
    metadata JSONB DEFAULT '{}'
);

-- =============================================================================
-- BUSINESS SCHEMA TABLES
-- =============================================================================

-- Business entities/organizations
CREATE TABLE IF NOT EXISTS business.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) DEFAULT 'barbershop',
    address JSONB,
    contact_info JSONB,
    business_hours JSONB,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    owner_id UUID NOT NULL REFERENCES auth.users(id)
);

-- Business analytics and metrics
CREATE TABLE IF NOT EXISTS business.analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES business.organizations(id),
    user_id UUID REFERENCES auth.users(id),
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    session_id UUID,
    ip_address INET
);

-- =============================================================================
-- MONITORING SCHEMA TABLES
-- =============================================================================

-- System health monitoring
CREATE TABLE IF NOT EXISTS monitoring.health_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
    response_time_ms INTEGER,
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance metrics
CREATE TABLE IF NOT EXISTS monitoring.performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_type VARCHAR(50) DEFAULT 'gauge',
    labels JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Application logs
CREATE TABLE IF NOT EXISTS monitoring.application_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    logger_name VARCHAR(100),
    module VARCHAR(100),
    function_name VARCHAR(100),
    line_number INTEGER,
    user_id UUID REFERENCES auth.users(id),
    session_id UUID,
    request_id UUID,
    extra_data JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- COMPLIANCE SCHEMA TABLES (GDPR)
-- =============================================================================

-- Data processing consent tracking
CREATE TABLE IF NOT EXISTS compliance.consent_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    consent_type VARCHAR(100) NOT NULL,
    consent_given BOOLEAN NOT NULL,
    consent_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    withdrawal_date TIMESTAMP WITH TIME ZONE,
    legal_basis VARCHAR(100),
    purpose TEXT,
    data_categories TEXT[],
    retention_period_days INTEGER,
    ip_address INET,
    user_agent TEXT,
    consent_method VARCHAR(50) DEFAULT 'explicit'
);

-- Data subject requests (GDPR Article 15-22)
CREATE TABLE IF NOT EXISTS compliance.data_subject_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('access', 'rectification', 'erasure', 'portability', 'restriction', 'objection')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    request_details JSONB,
    response_data JSONB,
    requester_email VARCHAR(255) NOT NULL,
    verification_method VARCHAR(100),
    processor_notes TEXT
);

-- Data retention and deletion tracking
CREATE TABLE IF NOT EXISTS compliance.data_retention (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    retention_category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    retention_period_days INTEGER NOT NULL,
    scheduled_deletion_date TIMESTAMP WITH TIME ZONE NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deletion_method VARCHAR(50),
    legal_basis TEXT
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Authentication indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON auth.users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON auth.users(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_role ON auth.users(role);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON auth.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON auth.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON auth.user_sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON auth.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON auth.security_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON auth.security_events(event_type);

-- AI agents indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON ai_agents.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_active ON ai_agents.conversations(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON ai_agents.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON ai_agents.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON ai_agents.knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_tags ON ai_agents.knowledge_base USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_active ON ai_agents.knowledge_base(is_active) WHERE is_active = TRUE;

-- Business indexes
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON business.organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON business.organizations(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_analytics_events_org_id ON business.analytics_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON business.analytics_events(timestamp);

-- Monitoring indexes
CREATE INDEX IF NOT EXISTS idx_health_checks_service ON monitoring.health_checks(service_name);
CREATE INDEX IF NOT EXISTS idx_health_checks_timestamp ON monitoring.health_checks(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON monitoring.performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON monitoring.performance_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_application_logs_level ON monitoring.application_logs(level);
CREATE INDEX IF NOT EXISTS idx_application_logs_timestamp ON monitoring.application_logs(timestamp);

-- Compliance indexes
CREATE INDEX IF NOT EXISTS idx_consent_records_user_id ON compliance.consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_type ON compliance.consent_records(consent_type);
CREATE INDEX IF NOT EXISTS idx_data_subject_requests_user_id ON compliance.data_subject_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_subject_requests_status ON compliance.data_subject_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_retention_table_record ON compliance.data_retention(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_data_retention_deletion_date ON compliance.data_retention(scheduled_deletion_date);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.token_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE business.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE business.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance.data_subject_requests ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY user_self_access ON auth.users FOR ALL TO agent_user USING (id = current_setting('app.current_user_id')::UUID);
CREATE POLICY session_self_access ON auth.user_sessions FOR ALL TO agent_user USING (user_id = current_setting('app.current_user_id')::UUID);
CREATE POLICY conversation_self_access ON ai_agents.conversations FOR ALL TO agent_user USING (user_id = current_setting('app.current_user_id')::UUID);

-- Organizations: users can only access organizations they own or are members of
CREATE POLICY organization_owner_access ON business.organizations FOR ALL TO agent_user USING (owner_id = current_setting('app.current_user_id')::UUID);

-- Compliance: users can only access their own compliance data
CREATE POLICY consent_self_access ON compliance.consent_records FOR ALL TO agent_user USING (user_id = current_setting('app.current_user_id')::UUID);
CREATE POLICY dsr_self_access ON compliance.data_subject_requests FOR ALL TO agent_user USING (user_id = current_setting('app.current_user_id')::UUID);

-- =============================================================================
-- PERMISSIONS SETUP
-- =============================================================================

-- Grant database connection permissions
GRANT CONNECT ON DATABASE agent_system TO agent_user;
GRANT CONNECT ON DATABASE agent_system TO monitoring_user;
GRANT CONNECT ON DATABASE agent_system TO backup_user;

-- Grant schema usage permissions
GRANT USAGE ON SCHEMA auth, ai_agents, business, monitoring, compliance TO agent_user;
GRANT USAGE ON SCHEMA auth, ai_agents, business, monitoring, compliance TO monitoring_user;
GRANT USAGE ON SCHEMA auth, ai_agents, business, monitoring, compliance TO backup_user;

-- Application user permissions (full CRUD on application tables)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO agent_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ai_agents TO agent_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA business TO agent_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA monitoring TO agent_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA compliance TO agent_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA auth TO agent_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ai_agents TO agent_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA business TO agent_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA monitoring TO agent_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA compliance TO agent_user;

-- Monitoring user permissions (read-only)
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO monitoring_user;
GRANT SELECT ON ALL TABLES IN SCHEMA ai_agents TO monitoring_user;
GRANT SELECT ON ALL TABLES IN SCHEMA business TO monitoring_user;
GRANT SELECT ON ALL TABLES IN SCHEMA monitoring TO monitoring_user;
GRANT SELECT ON ALL TABLES IN SCHEMA compliance TO monitoring_user;

-- Backup user permissions (read-only for backup)
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA ai_agents TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA business TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA monitoring TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA compliance TO backup_user;

-- Grant permissions on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO agent_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA ai_agents GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO agent_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA business GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO agent_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA monitoring GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO agent_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA compliance GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO agent_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT SELECT ON TABLES TO monitoring_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA ai_agents GRANT SELECT ON TABLES TO monitoring_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA business GRANT SELECT ON TABLES TO monitoring_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA monitoring GRANT SELECT ON TABLES TO monitoring_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA compliance GRANT SELECT ON TABLES TO monitoring_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT SELECT ON TABLES TO backup_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA ai_agents GRANT SELECT ON TABLES TO backup_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA business GRANT SELECT ON TABLES TO backup_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA monitoring GRANT SELECT ON TABLES TO backup_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA compliance GRANT SELECT ON TABLES TO backup_user;

-- =============================================================================
-- TRIGGER FUNCTIONS FOR AUTOMATION
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON ai_agents.conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON business.organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON ai_agents.knowledge_base FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- INITIAL DATA SETUP
-- =============================================================================

-- Insert default system user (for system operations)
INSERT INTO auth.users (id, email, hashed_password, full_name, role, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'system@6fb.ai',
    '$2b$12$placeholder_hash_for_system_user',  -- This should be updated
    'System User',
    'super_admin',
    FALSE  -- System user is not active for login
) ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- COMPLETION
-- =============================================================================

-- Log initialization completion
INSERT INTO monitoring.application_logs (level, message, logger_name, timestamp)
VALUES ('info', 'PostgreSQL database initialization completed successfully', 'database.init', CURRENT_TIMESTAMP);

-- Display completion message
DO $$
BEGIN
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'PostgreSQL Database Initialization Complete';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Database: agent_system';
    RAISE NOTICE 'Schemas created: auth, ai_agents, business, monitoring, compliance';
    RAISE NOTICE 'Users created: agent_user, monitoring_user, backup_user, replicator';
    RAISE NOTICE 'Security: Row Level Security enabled, secure authentication configured';
    RAISE NOTICE 'Extensions: uuid-ossp, pg_stat_statements, pgcrypto, pg_trgm, btree_gin';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'IMPORTANT: Update default passwords in production environment!';
    RAISE NOTICE '=============================================================================';
END $$;
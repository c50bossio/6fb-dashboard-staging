-- Multi-Tenant Database Schema for 6FB AI Agent System
-- Phase 6: Enterprise Architecture Implementation

-- ================================================================
-- CORE TENANT MANAGEMENT TABLES
-- ================================================================

-- Main tenants table - represents each barbershop organization
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    domain VARCHAR(100), -- Optional custom domain
    
    -- Business Information
    business_type VARCHAR(50) DEFAULT 'barbershop',
    address JSONB, -- Store full address information
    phone VARCHAR(20),
    email VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    
    -- Subscription & Billing
    plan_tier VARCHAR(20) DEFAULT 'starter', -- starter, professional, enterprise
    billing_status VARCHAR(20) DEFAULT 'trial', -- trial, active, suspended, cancelled
    stripe_customer_id VARCHAR(100),
    trial_ends_at TIMESTAMP,
    subscription_started_at TIMESTAMP,
    
    -- Configuration
    settings JSONB DEFAULT '{}', -- Tenant-specific settings
    features JSONB DEFAULT '{}', -- Enabled features per plan
    branding JSONB DEFAULT '{}', -- Custom branding (logo, colors, theme)
    
    -- Status & Lifecycle
    status VARCHAR(20) DEFAULT 'active', -- active, suspended, pending_deletion
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarded_at TIMESTAMP,
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID, -- Reference to user who created tenant
    
    -- Indexes
    CONSTRAINT check_slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
    CONSTRAINT check_plan_tier CHECK (plan_tier IN ('starter', 'professional', 'enterprise')),
    CONSTRAINT check_status CHECK (status IN ('active', 'suspended', 'pending_deletion'))
);

-- Tenant users - multi-tenant user management
CREATE TABLE IF NOT EXISTS tenant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Reference to Supabase auth.users
    
    -- Role & Permissions
    role VARCHAR(50) DEFAULT 'member', -- owner, admin, manager, member, viewer
    permissions JSONB DEFAULT '[]', -- Custom permissions array
    
    -- User Profile
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active', -- active, suspended, invited
    invited_by UUID REFERENCES tenant_users(id),
    invited_at TIMESTAMP,
    joined_at TIMESTAMP,
    last_login_at TIMESTAMP,
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(tenant_id, user_id),
    UNIQUE(tenant_id, email),
    CONSTRAINT check_role CHECK (role IN ('owner', 'admin', 'manager', 'member', 'viewer')),
    CONSTRAINT check_user_status CHECK (status IN ('active', 'suspended', 'invited'))
);

-- Tenant invitations for user onboarding
CREATE TABLE IF NOT EXISTS tenant_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'member',
    
    -- Invitation Details
    invited_by UUID NOT NULL REFERENCES tenant_users(id),
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    message TEXT,
    
    -- Status & Expiry
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, expired, cancelled  
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP,
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(tenant_id, email),
    CONSTRAINT check_invitation_status CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled'))
);

-- ================================================================
-- MULTI-TENANT BUSINESS DATA TABLES  
-- ================================================================

-- Tenant-aware analytics data
CREATE TABLE IF NOT EXISTS tenant_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Analytics Data
    date DATE NOT NULL,
    revenue DECIMAL(10,2) DEFAULT 0.00,
    bookings INTEGER DEFAULT 0,
    customers INTEGER DEFAULT 0,
    utilization_rate DECIMAL(3,2) DEFAULT 0.00,
    satisfaction_score DECIMAL(3,2) DEFAULT 0.00,
    
    -- Detailed Metrics
    metrics JSONB DEFAULT '{}',
    raw_data JSONB DEFAULT '{}',
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(tenant_id, date)
);

-- Tenant-aware forecasting data
CREATE TABLE IF NOT EXISTS tenant_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Forecast Information
    forecast_type VARCHAR(50) NOT NULL, -- revenue, bookings, customers, utilization
    time_horizon VARCHAR(20) NOT NULL, -- 1_day, 1_week, 1_month, 3_months, 6_months
    forecast_date DATE NOT NULL,
    
    -- Prediction Data
    predicted_value DECIMAL(10,2) NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL,
    lower_bound DECIMAL(10,2),
    upper_bound DECIMAL(10,2),
    
    -- Model Information
    model_version VARCHAR(50) DEFAULT 'v1.0',
    features_used JSONB DEFAULT '[]',
    training_data_size INTEGER,
    
    -- Metadata
    generated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours'),
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(tenant_id, forecast_type, time_horizon, forecast_date)
);

-- Tenant-aware alerts and notifications
CREATE TABLE IF NOT EXISTS tenant_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Alert Information
    alert_type VARCHAR(50) NOT NULL, -- revenue_drop, high_demand, system_issue, opportunity
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    
    -- Prioritization
    priority_score DECIMAL(3,2) DEFAULT 0.50,
    severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    category VARCHAR(50) DEFAULT 'business', -- business, system, customer, revenue
    
    -- Status & Actions
    status VARCHAR(20) DEFAULT 'active', -- active, acknowledged, resolved, dismissed
    acknowledged_by UUID REFERENCES tenant_users(id),
    acknowledged_at TIMESTAMP,
    resolved_by UUID REFERENCES tenant_users(id),
    resolved_at TIMESTAMP,
    
    -- Alert Data
    data JSONB DEFAULT '{}',
    recommended_actions JSONB DEFAULT '[]',
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_severity CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT check_alert_status CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed'))
);

-- Tenant-aware business recommendations
CREATE TABLE IF NOT EXISTS tenant_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Recommendation Information
    category VARCHAR(50) NOT NULL, -- revenue_optimization, customer_experience, operational_efficiency
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    
    -- Impact & Confidence
    impact_score DECIMAL(3,2) NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL,
    estimated_monthly_value DECIMAL(10,2),
    implementation_difficulty VARCHAR(20) DEFAULT 'medium', -- low, medium, high
    
    -- Implementation
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, dismissed
    assigned_to UUID REFERENCES tenant_users(id),
    due_date DATE,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Details
    specific_actions JSONB DEFAULT '[]',
    success_metrics JSONB DEFAULT '[]',
    
    -- AI Generation
    ai_generated BOOLEAN DEFAULT FALSE,
    ai_provider VARCHAR(50),
    generation_context JSONB DEFAULT '{}',
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_implementation_difficulty CHECK (implementation_difficulty IN ('low', 'medium', 'high')),
    CONSTRAINT check_recommendation_status CHECK (status IN ('pending', 'in_progress', 'completed', 'dismissed'))
);

-- Tenant-aware chat conversations
CREATE TABLE IF NOT EXISTS tenant_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES tenant_users(id),
    
    -- Conversation Information
    session_id VARCHAR(255) NOT NULL,
    agent_type VARCHAR(50) DEFAULT 'business_coach', -- business_coach, analytics_expert, operational_advisor
    
    -- Message Details
    role VARCHAR(20) NOT NULL, -- user, assistant
    content TEXT NOT NULL,
    
    -- AI Response Metadata
    confidence DECIMAL(3,2),
    provider VARCHAR(50), -- openai, anthropic, gemini
    model_version VARCHAR(50),
    knowledge_enhanced BOOLEAN DEFAULT FALSE,
    
    -- Context
    business_context JSONB DEFAULT '{}',
    response_time_ms INTEGER,
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_conversation_role CHECK (role IN ('user', 'assistant'))
);

-- ================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================

-- Enable RLS on all tenant tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_conversations ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY tenant_isolation_tenants ON tenants
    USING (id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_users ON tenant_users
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_invitations ON tenant_invitations
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_analytics ON tenant_analytics
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_forecasts ON tenant_forecasts
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_alerts ON tenant_alerts
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_recommendations ON tenant_recommendations
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_conversations ON tenant_conversations
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- ================================================================
-- PERFORMANCE INDEXES
-- ================================================================

-- Tenant-based indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_email ON tenant_users(tenant_id, email);

CREATE INDEX IF NOT EXISTS idx_tenant_analytics_tenant_date ON tenant_analytics(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_tenant_forecasts_tenant_type ON tenant_forecasts(tenant_id, forecast_type);
CREATE INDEX IF NOT EXISTS idx_tenant_alerts_tenant_status ON tenant_alerts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tenant_recommendations_tenant_status ON tenant_recommendations(tenant_id, status);

-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_plan_tier ON tenants(plan_tier);

CREATE INDEX IF NOT EXISTS idx_tenant_alerts_priority ON tenant_alerts(tenant_id, priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_recommendations_impact ON tenant_recommendations(tenant_id, impact_score DESC);

-- ================================================================
-- TENANT CONTEXT FUNCTIONS
-- ================================================================

-- Function to set tenant context for queries
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_uuid UUID)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_tenant', tenant_uuid::text, true);
END;
$$ LANGUAGE plpgsql;

-- Function to get current tenant context
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS UUID AS $$
BEGIN
    RETURN current_setting('app.current_tenant', true)::UUID;
EXCEPTION
    WHEN others THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to clear tenant context
CREATE OR REPLACE FUNCTION clear_tenant_context()
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_tenant', '', true);
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- AUDIT TRIGGERS
-- ================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to relevant tables
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_users_updated_at
    BEFORE UPDATE ON tenant_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_invitations_updated_at
    BEFORE UPDATE ON tenant_invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_analytics_updated_at
    BEFORE UPDATE ON tenant_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_alerts_updated_at
    BEFORE UPDATE ON tenant_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_recommendations_updated_at
    BEFORE UPDATE ON tenant_recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- INITIAL DATA SEEDING
-- ================================================================

-- Create default tenant for development/migration
INSERT INTO tenants (
    id,
    name,
    slug,
    email,
    plan_tier,
    status,
    onboarding_completed,
    settings,
    features
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Demo Barbershop',
    'demo-barbershop',
    'demo@6fb.ai',
    'professional',
    'active',
    true,
    '{"timezone": "America/New_York", "currency": "USD"}',
    '{"analytics": true, "forecasting": true, "alerts": true, "recommendations": true}'
) ON CONFLICT (slug) DO NOTHING;

-- Create system admin tenant for platform management
INSERT INTO tenants (
    id,
    name,
    slug,
    email,
    plan_tier,
    status,
    onboarding_completed,
    settings,
    features
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '6FB Platform Admin',
    'platform-admin',
    'admin@6fb.ai',
    'enterprise',
    'active',
    true,
    '{"timezone": "America/New_York", "is_platform_admin": true}',
    '{"analytics": true, "forecasting": true, "alerts": true, "recommendations": true, "platform_admin": true}'
) ON CONFLICT (slug) DO NOTHING;

-- ================================================================
-- COMMENTS FOR DOCUMENTATION
-- ================================================================

COMMENT ON TABLE tenants IS 'Core tenant table representing each barbershop organization';
COMMENT ON TABLE tenant_users IS 'Multi-tenant user management with role-based access control';
COMMENT ON TABLE tenant_invitations IS 'User invitation system for tenant onboarding';
COMMENT ON TABLE tenant_analytics IS 'Tenant-specific analytics and business metrics';
COMMENT ON TABLE tenant_forecasts IS 'AI-powered forecasting data with tenant isolation';
COMMENT ON TABLE tenant_alerts IS 'Intelligent alert system with tenant-aware prioritization';
COMMENT ON TABLE tenant_recommendations IS 'AI-generated business recommendations per tenant';
COMMENT ON TABLE tenant_conversations IS 'Multi-tenant chat conversations with AI agents';

COMMENT ON COLUMN tenants.slug IS 'URL-friendly identifier for tenant (e.g., johns-barbershop)';
COMMENT ON COLUMN tenants.plan_tier IS 'Subscription tier: starter, professional, enterprise';
COMMENT ON COLUMN tenants.features IS 'JSON object defining enabled features for this tenant';
COMMENT ON COLUMN tenants.branding IS 'Custom branding configuration (logo, colors, theme)';

-- ================================================================
-- SCHEMA MIGRATION TRACKING
-- ================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT NOW(),
    description TEXT
);

INSERT INTO schema_migrations (version, description) VALUES 
('6.0.0', 'Multi-tenant architecture foundation with Row Level Security')
ON CONFLICT (version) DO NOTHING;
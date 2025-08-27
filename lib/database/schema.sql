-- Comprehensive Database Schema for 6FB AI Agent System
-- Advanced Customization Features with Six Figure Barber Methodology Integration
-- Production-Grade Schema with Security, Analytics, and Collaboration Features

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Organizations table (multi-tenancy support)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    subscription_tier VARCHAR(50) DEFAULT 'basic',
    six_figure_program_member BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    settings JSONB DEFAULT '{}',
    billing_info JSONB DEFAULT '{}'
);

-- Users table with role-based access control
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    preferences JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}'
);

-- User roles and permissions
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer', -- owner, editor, reviewer, viewer
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Template categories aligned with Six Figure Barber methodology
CREATE TABLE template_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    six_figure_category VARCHAR(100), -- heritage, modern, premium, executive, etc.
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Templates with Six Figure Barber methodology alignment
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    category_id UUID REFERENCES template_categories(id),
    preview_image_url TEXT,
    template_data JSONB NOT NULL DEFAULT '{}',
    
    -- Six Figure Barber methodology fields
    six_figure_alignment VARCHAR(100) NOT NULL, -- heritage_master, modern_premium, etc.
    positioning_strategy TEXT NOT NULL,
    value_proposition TEXT NOT NULL,
    pricing_strategy TEXT NOT NULL,
    target_revenue_impact DECIMAL(4,3) DEFAULT 1.0, -- multiplier (1.15 = 15% increase)
    client_relationship_focus TEXT,
    
    -- Template metadata
    difficulty_level VARCHAR(20) DEFAULT 'intermediate', -- beginner, intermediate, advanced
    estimated_setup_time INTEGER DEFAULT 30, -- minutes
    pricing_tier VARCHAR(20) DEFAULT 'free', -- free, premium, enterprise
    
    -- Status and versioning
    status VARCHAR(20) DEFAULT 'draft', -- draft, pending_approval, approved, archived
    version VARCHAR(10) DEFAULT '1.0.0',
    parent_template_id UUID REFERENCES templates(id),
    
    -- Audit fields
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Performance tracking
    usage_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.0,
    total_ratings INTEGER DEFAULT 0
);

-- Template versions for rollback capability
CREATE TABLE template_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    version_number VARCHAR(10) NOT NULL,
    version_data JSONB NOT NULL,
    change_summary TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_published BOOLEAN DEFAULT false
);

-- Template metrics and performance tracking
CREATE TABLE template_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    
    -- Usage metrics
    views INTEGER DEFAULT 0,
    installations INTEGER DEFAULT 0,
    customizations INTEGER DEFAULT 0,
    
    -- Performance metrics
    conversion_rate DECIMAL(5,4) DEFAULT 0.0,
    engagement_score DECIMAL(5,2) DEFAULT 0.0,
    completion_rate DECIMAL(5,4) DEFAULT 0.0,
    
    -- Six Figure methodology metrics
    revenue_impact DECIMAL(10,2) DEFAULT 0.0,
    client_satisfaction_score DECIMAL(3,2) DEFAULT 0.0,
    premium_feature_usage INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE(template_id, metric_date)
);

-- A/B Testing experiments
CREATE TABLE ab_experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    hypothesis TEXT NOT NULL,
    
    -- Experiment configuration
    status VARCHAR(20) DEFAULT 'draft', -- draft, running, paused, completed, cancelled
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    target_sample_size INTEGER DEFAULT 1000,
    confidence_level DECIMAL(3,2) DEFAULT 0.95,
    minimum_detectable_effect DECIMAL(4,3) DEFAULT 0.05,
    
    -- Metrics
    primary_metric VARCHAR(100) NOT NULL, -- conversion_rate, engagement_time, etc.
    success_criteria TEXT,
    participants INTEGER DEFAULT 0,
    
    -- Six Figure methodology alignment
    six_figure_objective VARCHAR(100), -- revenue_optimization, client_retention, etc.
    expected_revenue_impact DECIMAL(10,2),
    
    -- Audit fields
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- A/B Test variants
CREATE TABLE experiment_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID REFERENCES ab_experiments(id) ON DELETE CASCADE,
    variant_name VARCHAR(100) NOT NULL, -- control, variant_a, variant_b, etc.
    variant_data JSONB NOT NULL DEFAULT '{}',
    traffic_allocation INTEGER DEFAULT 50, -- percentage
    is_control BOOLEAN DEFAULT false,
    
    -- Performance metrics
    participants INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,4) DEFAULT 0.0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- A/B Test events and tracking
CREATE TABLE experiment_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID REFERENCES ab_experiments(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES experiment_variants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(255),
    
    event_type VARCHAR(50) NOT NULL, -- view, click, conversion, etc.
    event_value DECIMAL(10,2),
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Indexes for performance
    INDEX idx_experiment_events_experiment_id (experiment_id),
    INDEX idx_experiment_events_variant_id (variant_id),
    INDEX idx_experiment_events_type_date (event_type, created_at)
);

-- Analytics events for comprehensive tracking
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(255),
    organization_id UUID REFERENCES organizations(id),
    
    -- Context information
    template_id UUID REFERENCES templates(id),
    element_type VARCHAR(100),
    element_id VARCHAR(255),
    action VARCHAR(100),
    value DECIMAL(10,2),
    
    -- Technical details
    user_agent TEXT,
    ip_address INET,
    referrer TEXT,
    page_url TEXT,
    
    -- Metadata and custom properties
    metadata JSONB DEFAULT '{}',
    
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Indexes for analytics performance
    INDEX idx_analytics_events_type_date (event_type, timestamp),
    INDEX idx_analytics_events_user_date (user_id, timestamp),
    INDEX idx_analytics_events_org_date (organization_id, timestamp),
    INDEX idx_analytics_events_template (template_id, timestamp)
);

-- Locations for enterprise multi-location support
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    website_url TEXT,
    
    -- Location-specific settings
    timezone VARCHAR(100) DEFAULT 'UTC',
    locale VARCHAR(10) DEFAULT 'en-US',
    
    -- Business information
    business_type VARCHAR(100), -- barbershop, salon, spa
    six_figure_tier VARCHAR(50), -- starter, pro, master
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE(organization_id, slug)
);

-- Location-specific template assignments
CREATE TABLE location_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    applied_by UUID REFERENCES users(id),
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, archived
    customizations JSONB DEFAULT '{}',
    
    UNIQUE(location_id, template_id)
);

-- Location-specific settings
CREATE TABLE location_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    
    -- Branding settings
    primary_color VARCHAR(7) DEFAULT '#000000',
    secondary_color VARCHAR(7) DEFAULT '#FFD700',
    logo_url TEXT,
    banner_image_url TEXT,
    
    -- Business settings
    booking_lead_time INTEGER DEFAULT 24, -- hours
    cancellation_policy TEXT,
    service_areas TEXT[],
    
    -- Six Figure methodology settings
    premium_positioning_enabled BOOLEAN DEFAULT true,
    value_based_pricing BOOLEAN DEFAULT true,
    client_relationship_tools BOOLEAN DEFAULT true,
    
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Bulk operations tracking
CREATE TABLE bulk_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(100) NOT NULL, -- template_application, settings_update, etc.
    initiated_by UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    
    -- Operation details
    target_locations UUID[], -- array of location IDs
    parameters JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, failed, partial_success
    
    -- Progress tracking
    total_items INTEGER DEFAULT 0,
    completed_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    
    -- Results
    results JSONB DEFAULT '{}',
    error_details JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- External service integrations
CREATE TABLE user_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Integration details
    service VARCHAR(50) NOT NULL, -- canva, google_my_business, etc.
    service_user_id VARCHAR(255),
    service_account_name VARCHAR(255),
    
    -- OAuth credentials (encrypted)
    access_token TEXT,
    refresh_token TEXT,
    token_type VARCHAR(20) DEFAULT 'Bearer',
    expires_at TIMESTAMP WITH TIME ZONE,
    scopes TEXT[],
    
    -- Integration status
    status VARCHAR(20) DEFAULT 'active', -- active, expired, error, revoked
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_frequency VARCHAR(20) DEFAULT 'daily', -- manual, hourly, daily, weekly
    
    -- Connection details
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE(user_id, service)
);

-- OAuth state tracking for security
CREATE TABLE oauth_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state VARCHAR(255) UNIQUE NOT NULL,
    service VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    redirect_uri TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Approval workflows
CREATE TABLE approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(100) NOT NULL, -- template_change, settings_update, etc.
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Request details
    requested_by UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    target_resource_type VARCHAR(100), -- template, location, etc.
    target_resource_id UUID,
    
    -- Proposed changes
    current_data JSONB DEFAULT '{}',
    proposed_changes JSONB NOT NULL DEFAULT '{}',
    change_summary TEXT,
    
    -- Review process
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, cancelled
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    feedback TEXT,
    
    -- Priority and urgency
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    business_justification TEXT,
    
    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Team management
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    invited_by UUID REFERENCES users(id),
    
    -- Member details
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    permissions JSONB DEFAULT '{}',
    departments TEXT[],
    
    -- Status
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, pending
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_activity_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(organization_id, user_id)
);

-- Team invitations
CREATE TABLE team_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    
    -- Invitation details
    invited_by UUID REFERENCES users(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    message TEXT,
    permissions JSONB DEFAULT '{}',
    
    -- Status and expiry
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, expired, cancelled
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by UUID REFERENCES users(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Activity feed for collaboration tracking
CREATE TABLE activity_feed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    
    -- Activity details
    activity_type VARCHAR(100) NOT NULL, -- template_created, approval_requested, etc.
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Context
    resource_type VARCHAR(100),
    resource_id UUID,
    metadata JSONB DEFAULT '{}',
    
    -- Visibility
    visibility VARCHAR(20) DEFAULT 'organization', -- private, team, organization
    is_system_generated BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Indexes for activity feed performance
    INDEX idx_activity_feed_org_date (organization_id, created_at DESC),
    INDEX idx_activity_feed_user_date (user_id, created_at DESC),
    INDEX idx_activity_feed_type_date (activity_type, created_at DESC)
);

-- Audit logs for security and compliance
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES users(id),
    
    -- Action details
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    
    -- Change details
    old_values JSONB,
    new_values JSONB,
    details JSONB DEFAULT '{}',
    
    -- Risk and compliance
    risk_level VARCHAR(20) DEFAULT 'low', -- low, medium, high, critical
    compliance_relevant BOOLEAN DEFAULT false,
    
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Indexes for audit performance
    INDEX idx_audit_logs_org_date (organization_id, timestamp DESC),
    INDEX idx_audit_logs_user_date (user_id, timestamp DESC),
    INDEX idx_audit_logs_action_date (action, timestamp DESC),
    INDEX idx_audit_logs_risk (risk_level, timestamp DESC)
);

-- Database functions and triggers

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ab_experiments_updated_at BEFORE UPDATE ON ab_experiments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically log activities
CREATE OR REPLACE FUNCTION log_template_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO activity_feed (organization_id, user_id, activity_type, title, resource_type, resource_id)
        VALUES (
            (SELECT organization_id FROM users WHERE id = NEW.created_by),
            NEW.created_by,
            'template_created',
            'Created template: ' || NEW.name,
            'template',
            NEW.id
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only log if status changed or significant updates
        IF OLD.status != NEW.status OR OLD.name != NEW.name THEN
            INSERT INTO activity_feed (organization_id, user_id, activity_type, title, resource_type, resource_id)
            VALUES (
                (SELECT organization_id FROM users WHERE id = NEW.updated_by),
                NEW.updated_by,
                'template_updated',
                'Updated template: ' || NEW.name,
                'template',
                NEW.id
            );
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger for template activity logging
CREATE TRIGGER log_template_activity_trigger
    AFTER INSERT OR UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION log_template_activity();

-- Performance indexes
CREATE INDEX idx_templates_category ON templates(category_id);
CREATE INDEX idx_templates_six_figure ON templates(six_figure_alignment);
CREATE INDEX idx_templates_status ON templates(status);
CREATE INDEX idx_templates_created ON templates(created_at DESC);
CREATE INDEX idx_templates_popularity ON templates(usage_count DESC);

CREATE INDEX idx_analytics_events_composite ON analytics_events(organization_id, event_type, timestamp);
CREATE INDEX idx_analytics_events_template_date ON analytics_events(template_id, timestamp);
CREATE INDEX idx_analytics_events_session ON analytics_events(session_id, timestamp);

CREATE INDEX idx_ab_experiments_status ON ab_experiments(status);
CREATE INDEX idx_ab_experiments_dates ON ab_experiments(start_date, end_date);

CREATE INDEX idx_user_integrations_service ON user_integrations(service, status);
CREATE INDEX idx_user_integrations_sync ON user_integrations(last_sync_at, sync_frequency);

-- Full-text search indexes
CREATE INDEX idx_templates_search ON templates USING GIN (to_tsvector('english', name || ' ' || description));
CREATE INDEX idx_activity_feed_search ON activity_feed USING GIN (to_tsvector('english', title || ' ' || description));

-- Row Level Security (RLS) policies for multi-tenancy
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

-- Sample RLS policy for templates (organization isolation)
CREATE POLICY templates_organization_policy ON templates
    USING (
        organization_id = (
            SELECT organization_id 
            FROM users 
            WHERE id = auth.uid()
        )
    );

-- Sample data for template categories
INSERT INTO template_categories (name, slug, description, six_figure_category, sort_order) VALUES
('Heritage Classics', 'heritage-classics', 'Traditional barbershop designs with timeless appeal', 'heritage', 1),
('Modern Professional', 'modern-professional', 'Contemporary designs for the modern barber', 'modern', 2),
('Premium Luxury', 'premium-luxury', 'High-end spa-like experiences', 'premium', 3),
('Urban Contemporary', 'urban-contemporary', 'Trendy designs for urban markets', 'urban', 4),
('Executive Suites', 'executive-suites', 'Professional environments for executive clientele', 'executive', 5),
('Artistic Studios', 'artistic-studios', 'Creative spaces for artistic expression', 'artistic', 6);

-- Sample Six Figure methodology templates
INSERT INTO templates (
    name, slug, description, category_id, six_figure_alignment,
    positioning_strategy, value_proposition, pricing_strategy,
    target_revenue_impact, status, pricing_tier
) VALUES (
    'Heritage Master', 'heritage-master',
    'Classic barbershop design emphasizing generations of expertise and traditional craftsmanship',
    (SELECT id FROM template_categories WHERE slug = 'heritage-classics'),
    'heritage_master',
    'Position as master craftsman with generational expertise',
    'Experience the art of traditional barbering passed down through generations',
    'Premium heritage pricing with master barber premium of 40-60%',
    1.45, 'approved', 'premium'
),
(
    'Modern Precision', 'modern-precision',
    'Contemporary design focusing on precision, technology, and modern grooming techniques',
    (SELECT id FROM template_categories WHERE slug = 'modern-professional'),
    'modern_precision',
    'Tech-savvy professional with precision focus',
    'Cutting-edge techniques meet timeless style for the modern gentleman',
    'Value-based pricing for precision services and modern convenience',
    1.30, 'approved', 'premium'
);

-- Comments and documentation
COMMENT ON TABLE templates IS 'Core template system with Six Figure Barber methodology integration';
COMMENT ON COLUMN templates.six_figure_alignment IS 'Alignment with Six Figure Barber positioning strategies';
COMMENT ON COLUMN templates.target_revenue_impact IS 'Expected revenue multiplier when using this template';
COMMENT ON COLUMN templates.pricing_strategy IS 'Recommended pricing approach aligned with 6FB methodology';

COMMENT ON TABLE analytics_events IS 'Comprehensive event tracking for analytics and Six Figure methodology metrics';
COMMENT ON TABLE ab_experiments IS 'A/B testing framework for optimization with statistical significance';
COMMENT ON TABLE user_integrations IS 'External service integrations (Canva, Google My Business, etc.)';
COMMENT ON TABLE approval_requests IS 'Workflow management for team collaboration and change approval';

-- Version information
COMMENT ON DATABASE current_database() IS 'Six Figure Barber AI Agent System Database v2.0 - Production Schema';
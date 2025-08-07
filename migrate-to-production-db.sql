-- Production Database Migration Script
-- 6FB AI Agent System - Token-Based Billing System
-- PostgreSQL Migration from SQLite Development Setup

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create database schema for multi-tenant billing system
BEGIN;

-- =====================================================
-- CORE TENANT MANAGEMENT TABLES
-- =====================================================

-- Tenants table - Core multi-tenant architecture
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    owner_id UUID NOT NULL,
    subscription_tier VARCHAR(20) DEFAULT 'starter',
    onboarding_completed BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    features JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenants_owner_id ON tenants(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- =====================================================
-- TOKEN BILLING SYSTEM TABLES
-- =====================================================

-- Token usage tracking - Core billing system
CREATE TABLE IF NOT EXISTS token_usage (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    request_id VARCHAR(50) UNIQUE NOT NULL,
    model_provider VARCHAR(20) NOT NULL,
    model_name VARCHAR(50) NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    actual_cost_usd DECIMAL(10,6) DEFAULT 0,
    marked_up_price DECIMAL(10,6) DEFAULT 0,
    feature_used VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for token usage queries
CREATE INDEX IF NOT EXISTS idx_token_usage_tenant ON token_usage(tenant_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_token_usage_request ON token_usage(request_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_provider ON token_usage(model_provider, model_name);

-- Tenant subscriptions - Stripe integration
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tier VARCHAR(20) DEFAULT 'starter',
    status VARCHAR(20) DEFAULT 'trial',
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    billing_cycle_start TIMESTAMP WITH TIME ZONE,
    billing_cycle_end TIMESTAMP WITH TIME ZONE,
    tokens_included INTEGER DEFAULT 10000,
    tokens_used INTEGER DEFAULT 0,
    monthly_base DECIMAL(10,2) DEFAULT 19.99,
    overage_charges DECIMAL(10,2) DEFAULT 0,
    total_bill DECIMAL(10,2) DEFAULT 0,
    payment_method_id VARCHAR(100),
    stripe_subscription_id VARCHAR(100),
    stripe_customer_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for subscription queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON tenant_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON tenant_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON tenant_subscriptions(status);

-- Usage analytics for margin optimization
CREATE TABLE IF NOT EXISTS usage_analytics (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    total_tenants INTEGER DEFAULT 0,
    total_tokens_consumed BIGINT DEFAULT 0,
    total_actual_costs DECIMAL(10,2) DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    gross_margin DECIMAL(5,4) DEFAULT 0,
    avg_tokens_per_tenant INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for analytics queries
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_analytics_date ON usage_analytics(date);

-- Free trial tracking
CREATE TABLE IF NOT EXISTS trial_tracking (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    trial_start TIMESTAMP WITH TIME ZONE NOT NULL,
    trial_end TIMESTAMP WITH TIME ZONE NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    conversion_date TIMESTAMP WITH TIME ZONE,
    converted_to_tier VARCHAR(20),
    trial_status VARCHAR(20) DEFAULT 'active',
    reminder_emails_sent INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for trial tracking
CREATE INDEX IF NOT EXISTS idx_trial_tracking_tenant ON trial_tracking(tenant_id, trial_status);

-- =====================================================
-- USAGE ALERTS SYSTEM TABLES
-- =====================================================

-- Usage alerts tracking
CREATE TABLE IF NOT EXISTS usage_alerts (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    threshold_value DECIMAL(10,4) NOT NULL,
    current_value DECIMAL(10,4) NOT NULL,
    message TEXT NOT NULL,
    action_required BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for alerts
CREATE INDEX IF NOT EXISTS idx_alerts_tenant ON usage_alerts(tenant_id, alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_sent ON usage_alerts(sent_at);

-- Alert preferences per tenant
CREATE TABLE IF NOT EXISTS alert_preferences (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email_alerts BOOLEAN DEFAULT TRUE,
    sms_alerts BOOLEAN DEFAULT FALSE,
    in_app_alerts BOOLEAN DEFAULT TRUE,
    usage_warning_enabled BOOLEAN DEFAULT TRUE,
    usage_critical_enabled BOOLEAN DEFAULT TRUE,
    trial_alerts_enabled BOOLEAN DEFAULT TRUE,
    billing_alerts_enabled BOOLEAN DEFAULT TRUE,
    custom_thresholds JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for alert preferences
CREATE INDEX IF NOT EXISTS idx_alert_prefs_tenant ON alert_preferences(tenant_id);

-- =====================================================
-- PAYMENT AND BILLING HISTORY TABLES
-- =====================================================

-- Payment records for audit and reconciliation
CREATE TABLE IF NOT EXISTS payment_records (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    stripe_invoice_id VARCHAR(100) UNIQUE,
    stripe_subscription_id VARCHAR(100),
    amount_paid DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'paid',
    invoice_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for payment records
CREATE INDEX IF NOT EXISTS idx_payment_records_tenant ON payment_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_stripe ON payment_records(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_date ON payment_records(paid_at);

-- Failed payment tracking
CREATE TABLE IF NOT EXISTS failed_payments (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    stripe_invoice_id VARCHAR(100),
    amount_due DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    attempt_count INTEGER DEFAULT 1,
    next_payment_attempt TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'failed',
    failure_reason TEXT,
    failed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for failed payments
CREATE INDEX IF NOT EXISTS idx_failed_payments_tenant ON failed_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_failed_payments_next_attempt ON failed_payments(next_payment_attempt);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) SETUP
-- =====================================================

-- Enable RLS on all tenant-specific tables
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenant isolation
-- Policy for token_usage
CREATE POLICY tenant_isolation_token_usage ON token_usage
    USING (tenant_id = CAST(current_setting('app.current_tenant', true) AS UUID));

-- Policy for tenant_subscriptions
CREATE POLICY tenant_isolation_subscriptions ON tenant_subscriptions
    USING (tenant_id = CAST(current_setting('app.current_tenant', true) AS UUID));

-- Policy for trial_tracking
CREATE POLICY tenant_isolation_trials ON trial_tracking
    USING (tenant_id = CAST(current_setting('app.current_tenant', true) AS UUID));

-- Policy for usage_alerts
CREATE POLICY tenant_isolation_alerts ON usage_alerts
    USING (tenant_id = CAST(current_setting('app.current_tenant', true) AS UUID));

-- Policy for alert_preferences
CREATE POLICY tenant_isolation_alert_prefs ON alert_preferences
    USING (tenant_id = CAST(current_setting('app.current_tenant', true) AS UUID));

-- Policy for payment_records
CREATE POLICY tenant_isolation_payments ON payment_records
    USING (tenant_id = CAST(current_setting('app.current_tenant', true) AS UUID));

-- Policy for failed_payments
CREATE POLICY tenant_isolation_failed_payments ON failed_payments
    USING (tenant_id = CAST(current_setting('app.current_tenant', true) AS UUID));

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON tenant_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_prefs_updated_at BEFORE UPDATE ON alert_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to set tenant context for RLS
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_uuid UUID)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_tenant', tenant_uuid::text, true);
END;
$$ LANGUAGE plpgsql;

-- Function to clear tenant context
CREATE OR REPLACE FUNCTION clear_tenant_context()
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_tenant', '', true);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DEMO DATA INSERTION (OPTIONAL)
-- =====================================================

-- Insert sample tenant for testing (only if not exists)
INSERT INTO tenants (id, name, slug, owner_id, subscription_tier, onboarding_completed, settings)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Demo Barbershop',
    'demo-barbershop',
    '550e8400-e29b-41d4-a716-446655440001',
    'professional',
    true,
    '{"business_name":"Demo Barbershop","business_type":"independent_barbershop","address":"123 Main St","phone":"(555) 123-4567"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Insert corresponding subscription
INSERT INTO tenant_subscriptions (tenant_id, tier, status, tokens_included, monthly_base)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'professional',
    'active',
    75000,
    49.99
) ON CONFLICT (tenant_id) DO NOTHING;

-- Insert alert preferences for demo tenant
INSERT INTO alert_preferences (tenant_id)
VALUES ('550e8400-e29b-41d4-a716-446655440000')
ON CONFLICT (tenant_id) DO NOTHING;

-- =====================================================
-- PERFORMANCE OPTIMIZATION
-- =====================================================

-- Analyze tables for query optimization
ANALYZE tenants;
ANALYZE token_usage;
ANALYZE tenant_subscriptions;
ANALYZE usage_analytics;
ANALYZE trial_tracking;
ANALYZE usage_alerts;
ANALYZE alert_preferences;
ANALYZE payment_records;
ANALYZE failed_payments;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify table creation
SELECT schemaname, tablename, tableowner 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'tenants', 'token_usage', 'tenant_subscriptions', 
    'usage_analytics', 'trial_tracking', 'usage_alerts',
    'alert_preferences', 'payment_records', 'failed_payments'
  )
ORDER BY tablename;

-- Verify indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN (
    'tenants', 'token_usage', 'tenant_subscriptions', 
    'usage_analytics', 'trial_tracking', 'usage_alerts',
    'alert_preferences', 'payment_records', 'failed_payments'
  )
ORDER BY tablename, indexname;

-- Verify RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Show tenant context functions
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname IN ('set_tenant_context', 'clear_tenant_context');

-- Migration complete message
SELECT 
    'Migration completed successfully!' as status,
    COUNT(*) as tables_created
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'tenants', 'token_usage', 'tenant_subscriptions', 
    'usage_analytics', 'trial_tracking', 'usage_alerts',
    'alert_preferences', 'payment_records', 'failed_payments'
  );
-- Production Metrics Database Schema for BookedBarber
-- GDPR-compliant metrics tracking and analytics storage
-- Run this in Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main metrics events table
CREATE TABLE IF NOT EXISTS metrics_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    properties JSONB DEFAULT '{}',
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id VARCHAR(255) NOT NULL,
    consent_level JSONB DEFAULT '{"analytics": false, "performance": false, "marketing": false}',
    is_production BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_metrics_events_name (event_name),
    INDEX idx_metrics_events_session (session_id),
    INDEX idx_metrics_events_user (user_id),
    INDEX idx_metrics_events_created (created_at),
    INDEX idx_metrics_events_production (is_production)
);

-- Conversion funnel tracking
CREATE TABLE IF NOT EXISTS conversion_funnel (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    step VARCHAR(100) NOT NULL, -- pricing_viewed, plan_selected, oauth_started, payment_started, completed
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    properties JSONB DEFAULT '{}',
    
    -- Unique constraint to prevent duplicate steps per session
    UNIQUE(session_id, step),
    
    INDEX idx_conversion_funnel_session (session_id),
    INDEX idx_conversion_funnel_step (step),
    INDEX idx_conversion_funnel_timestamp (timestamp)
);

-- Plan interaction tracking
CREATE TABLE IF NOT EXISTS plan_interactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    plan_name VARCHAR(100) NOT NULL,
    interaction_type VARCHAR(50) NOT NULL, -- hover, click, click_no_completion
    hover_duration INTEGER, -- milliseconds
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    device_type VARCHAR(20),
    abandonment_reason VARCHAR(255),
    time_to_abandonment INTEGER, -- milliseconds
    
    INDEX idx_plan_interactions_session (session_id),
    INDEX idx_plan_interactions_plan (plan_name),
    INDEX idx_plan_interactions_type (interaction_type),
    INDEX idx_plan_interactions_timestamp (timestamp)
);

-- OAuth completion funnel
CREATE TABLE IF NOT EXISTS oauth_funnel (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    oauth_provider VARCHAR(50) NOT NULL, -- google, github, etc.
    step VARCHAR(50) NOT NULL, -- started, completed, failed, abandoned
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    success BOOLEAN,
    completion_time INTEGER, -- milliseconds
    error_message TEXT,
    referrer_url TEXT,
    
    INDEX idx_oauth_funnel_session (session_id),
    INDEX idx_oauth_funnel_provider (oauth_provider),
    INDEX idx_oauth_funnel_step (step),
    INDEX idx_oauth_funnel_timestamp (timestamp)
);

-- Payment processing funnel
CREATE TABLE IF NOT EXISTS payment_funnel (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    step VARCHAR(50) NOT NULL, -- checkout_started, checkout_completed, checkout_failed, checkout_abandoned
    plan_name VARCHAR(100),
    amount DECIMAL(10,2),
    currency CHAR(3) DEFAULT 'USD',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    abandonment_stage VARCHAR(100),
    time_in_checkout INTEGER, -- milliseconds
    stripe_session_id VARCHAR(255),
    
    INDEX idx_payment_funnel_session (session_id),
    INDEX idx_payment_funnel_step (step),
    INDEX idx_payment_funnel_plan (plan_name),
    INDEX idx_payment_funnel_timestamp (timestamp)
);

-- Page performance metrics
CREATE TABLE IF NOT EXISTS page_performance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    page_url TEXT NOT NULL,
    load_time INTEGER, -- milliseconds
    first_contentful_paint INTEGER,
    largest_contentful_paint INTEGER,
    cumulative_layout_shift DECIMAL(5,3),
    first_input_delay INTEGER,
    dom_ready INTEGER,
    first_byte INTEGER,
    dns_lookup INTEGER,
    connection_time INTEGER,
    redirect_time INTEGER,
    connection_type VARCHAR(20),
    device_type VARCHAR(20),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_page_performance_session (session_id),
    INDEX idx_page_performance_url (page_url),
    INDEX idx_page_performance_device (device_type),
    INDEX idx_page_performance_timestamp (timestamp)
);

-- GDPR consent tracking
CREATE TABLE IF NOT EXISTS gdpr_consent_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    consent_types JSONB NOT NULL, -- {"analytics": true, "performance": true, "marketing": false}
    consent_given_at TIMESTAMPTZ DEFAULT NOW(),
    consent_withdrawn_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    consent_method VARCHAR(50), -- banner, settings_page, api
    is_active BOOLEAN DEFAULT true,
    
    INDEX idx_gdpr_consent_user (user_id),
    INDEX idx_gdpr_consent_session (session_id),
    INDEX idx_gdpr_consent_given_at (consent_given_at),
    INDEX idx_gdpr_consent_active (is_active)
);

-- A/B test experiment tracking
CREATE TABLE IF NOT EXISTS ab_test_experiments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    experiment_name VARCHAR(255) NOT NULL,
    variant VARCHAR(100) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL, -- viewed, converted
    conversion_value DECIMAL(10,2),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_ab_test_experiment (experiment_name),
    INDEX idx_ab_test_variant (variant),
    INDEX idx_ab_test_session (session_id),
    INDEX idx_ab_test_timestamp (timestamp)
);

-- User session summary (for quick lookups)
CREATE TABLE IF NOT EXISTS session_summary (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    page_views INTEGER DEFAULT 0,
    events_count INTEGER DEFAULT 0,
    converted BOOLEAN DEFAULT false,
    conversion_value DECIMAL(10,2),
    device_type VARCHAR(20),
    browser VARCHAR(50),
    country VARCHAR(2),
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    referrer TEXT,
    
    INDEX idx_session_summary_user (user_id),
    INDEX idx_session_summary_first_seen (first_seen),
    INDEX idx_session_summary_converted (converted),
    INDEX idx_session_summary_utm_source (utm_source)
);

-- Business metrics rollups (daily aggregations)
CREATE TABLE IF NOT EXISTS daily_metrics_rollup (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE NOT NULL,
    total_sessions INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    revenue DECIMAL(12,2) DEFAULT 0,
    pricing_page_views INTEGER DEFAULT 0,
    oauth_attempts INTEGER DEFAULT 0,
    oauth_successes INTEGER DEFAULT 0,
    payment_attempts INTEGER DEFAULT 0,
    payment_successes INTEGER DEFAULT 0,
    avg_load_time INTEGER, -- milliseconds
    avg_session_duration INTEGER, -- milliseconds
    top_referrers JSONB DEFAULT '[]',
    top_utm_sources JSONB DEFAULT '[]',
    device_breakdown JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(date),
    INDEX idx_daily_metrics_date (date)
);

-- Row Level Security (RLS) Policies
ALTER TABLE metrics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_funnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_funnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_funnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_consent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics_rollup ENABLE ROW LEVEL SECURITY;

-- RLS Policies for metrics (admin and service role access)
CREATE POLICY "Metrics read access for admin" ON metrics_events
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Metrics insert access for authenticated users" ON metrics_events
    FOR INSERT WITH CHECK (true); -- Allow all inserts for tracking

CREATE POLICY "Conversion funnel admin access" ON conversion_funnel
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Plan interactions admin access" ON plan_interactions
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "OAuth funnel admin access" ON oauth_funnel
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Payment funnel admin access" ON payment_funnel
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Performance data admin access" ON page_performance
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'service_role');

-- GDPR consent policies (users can read/modify their own consent)
CREATE POLICY "Users can read their own consent" ON gdpr_consent_log
    FOR SELECT USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can insert their own consent" ON gdpr_consent_log
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "A/B test admin access" ON ab_test_experiments
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Session summary admin access" ON session_summary
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Daily rollup admin access" ON daily_metrics_rollup
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'service_role');

-- Functions for automated data processing

-- Function to update session summary
CREATE OR REPLACE FUNCTION update_session_summary()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO session_summary (
        session_id,
        user_id,
        last_seen,
        page_views,
        events_count,
        device_type
    ) VALUES (
        NEW.session_id,
        NEW.user_id,
        NEW.created_at,
        CASE WHEN NEW.event_name LIKE '%page%' THEN 1 ELSE 0 END,
        1,
        NEW.properties ->> 'device_type'
    )
    ON CONFLICT (session_id) DO UPDATE SET
        last_seen = NEW.created_at,
        page_views = session_summary.page_views + CASE WHEN NEW.event_name LIKE '%page%' THEN 1 ELSE 0 END,
        events_count = session_summary.events_count + 1,
        user_id = COALESCE(session_summary.user_id, NEW.user_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update session summary
CREATE TRIGGER update_session_summary_trigger
    AFTER INSERT ON metrics_events
    FOR EACH ROW
    EXECUTE FUNCTION update_session_summary();

-- Function to clean up old metrics data (GDPR compliance)
CREATE OR REPLACE FUNCTION cleanup_old_metrics()
RETURNS void AS $$
BEGIN
    -- Delete metrics data older than 2 years (configurable)
    DELETE FROM metrics_events 
    WHERE created_at < NOW() - INTERVAL '2 years';
    
    DELETE FROM conversion_funnel 
    WHERE timestamp < NOW() - INTERVAL '2 years';
    
    DELETE FROM plan_interactions 
    WHERE timestamp < NOW() - INTERVAL '2 years';
    
    DELETE FROM oauth_funnel 
    WHERE timestamp < NOW() - INTERVAL '2 years';
    
    DELETE FROM payment_funnel 
    WHERE timestamp < NOW() - INTERVAL '2 years';
    
    DELETE FROM page_performance 
    WHERE timestamp < NOW() - INTERVAL '2 years';
    
    DELETE FROM ab_test_experiments 
    WHERE timestamp < NOW() - INTERVAL '2 years';
    
    DELETE FROM session_summary 
    WHERE first_seen < NOW() - INTERVAL '2 years';
    
    -- Keep daily rollups for longer (5 years)
    DELETE FROM daily_metrics_rollup 
    WHERE date < NOW() - INTERVAL '5 years';
END;
$$ LANGUAGE plpgsql;

-- Function to generate daily metrics rollup
CREATE OR REPLACE FUNCTION generate_daily_rollup(target_date DATE DEFAULT CURRENT_DATE - 1)
RETURNS void AS $$
DECLARE
    rollup_data RECORD;
BEGIN
    -- Calculate daily aggregations
    SELECT 
        COUNT(DISTINCT session_id) as total_sessions,
        COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users,
        COUNT(*) FILTER (WHERE event_name = 'subscription_completed') as conversions,
        COALESCE(SUM((properties ->> 'amount')::DECIMAL), 0) FILTER (WHERE event_name = 'subscription_completed') as revenue,
        COUNT(*) FILTER (WHERE event_name = 'pricing_page_viewed') as pricing_page_views,
        COUNT(*) FILTER (WHERE event_name = 'oauth_started') as oauth_attempts,
        COUNT(*) FILTER (WHERE event_name = 'oauth_completed') as oauth_successes,
        COUNT(*) FILTER (WHERE event_name = 'stripe_checkout_started') as payment_attempts,
        COUNT(*) FILTER (WHERE event_name = 'stripe_checkout_completed') as payment_successes
    INTO rollup_data
    FROM metrics_events 
    WHERE DATE(created_at) = target_date;

    -- Insert or update rollup
    INSERT INTO daily_metrics_rollup (
        date,
        total_sessions,
        unique_users,
        conversions,
        revenue,
        pricing_page_views,
        oauth_attempts,
        oauth_successes,
        payment_attempts,
        payment_successes
    ) VALUES (
        target_date,
        rollup_data.total_sessions,
        rollup_data.unique_users,
        rollup_data.conversions,
        rollup_data.revenue,
        rollup_data.pricing_page_views,
        rollup_data.oauth_attempts,
        rollup_data.oauth_successes,
        rollup_data.payment_attempts,
        rollup_data.payment_successes
    )
    ON CONFLICT (date) DO UPDATE SET
        total_sessions = EXCLUDED.total_sessions,
        unique_users = EXCLUDED.unique_users,
        conversions = EXCLUDED.conversions,
        revenue = EXCLUDED.revenue,
        pricing_page_views = EXCLUDED.pricing_page_views,
        oauth_attempts = EXCLUDED.oauth_attempts,
        oauth_successes = EXCLUDED.oauth_successes,
        payment_attempts = EXCLUDED.payment_attempts,
        payment_successes = EXCLUDED.payment_successes;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better query performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_events_consent 
    ON metrics_events USING GIN (consent_level);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_events_properties 
    ON metrics_events USING GIN (properties);

-- Comments for documentation
COMMENT ON TABLE metrics_events IS 'Main table for all user interaction and conversion tracking events';
COMMENT ON TABLE conversion_funnel IS 'Tracks user progression through conversion funnel steps';
COMMENT ON TABLE plan_interactions IS 'Detailed tracking of pricing plan interactions and hover behavior';
COMMENT ON TABLE oauth_funnel IS 'OAuth authentication completion rate tracking';
COMMENT ON TABLE payment_funnel IS 'Stripe payment processing success/failure tracking';
COMMENT ON TABLE page_performance IS 'Page load performance and Core Web Vitals tracking';
COMMENT ON TABLE gdpr_consent_log IS 'GDPR compliance - user consent tracking and audit log';
COMMENT ON TABLE daily_metrics_rollup IS 'Daily aggregated metrics for fast dashboard queries';

-- Grant necessary permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Initial data setup message
DO $$
BEGIN
    RAISE NOTICE 'Production metrics schema created successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Configure your application to use these tables';
    RAISE NOTICE '2. Set up scheduled jobs for daily rollups: SELECT generate_daily_rollup();';
    RAISE NOTICE '3. Set up cleanup job for GDPR compliance: SELECT cleanup_old_metrics();';
    RAISE NOTICE '4. Consider setting up Supabase Edge Functions for real-time processing';
END
$$;
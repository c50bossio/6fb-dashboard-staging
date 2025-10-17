-- Migration: Create Dashboard and AI System Tables
-- Description: Creates all missing database tables for the barbershop platform dashboard and AI systems
-- Author: Claude Code
-- Date: 2025-08-19

-- Create function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. business_metrics - Daily business performance metrics
CREATE TABLE IF NOT EXISTS business_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_revenue DECIMAL(10,2) DEFAULT 0.00,
    total_customers INTEGER DEFAULT 0,
    total_appointments INTEGER DEFAULT 0,
    avg_satisfaction_score DECIMAL(3,2) DEFAULT 0.00 CHECK (avg_satisfaction_score >= 0 AND avg_satisfaction_score <= 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(barbershop_id, date)
);

-- Enable RLS
ALTER TABLE business_metrics ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_business_metrics_barbershop_id ON business_metrics(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_business_metrics_date ON business_metrics(date);
CREATE INDEX IF NOT EXISTS idx_business_metrics_barbershop_date ON business_metrics(barbershop_id, date);

-- Create update trigger
DROP TRIGGER IF EXISTS set_business_metrics_updated_at ON business_metrics;
CREATE TRIGGER set_business_metrics_updated_at
    BEFORE UPDATE ON business_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. ai_insights - AI-generated business insights
CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL CHECK (insight_type IN ('revenue', 'customer', 'operations', 'marketing', 'efficiency', 'staff')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
    confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.00 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_insights_barbershop_id ON ai_insights(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_active ON ai_insights(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_insights_priority ON ai_insights(priority);
CREATE INDEX IF NOT EXISTS idx_ai_insights_created_at ON ai_insights(created_at);

-- 3. ai_agents - AI agent configurations and status
CREATE TABLE IF NOT EXISTS ai_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    agent_type TEXT NOT NULL CHECK (agent_type IN ('financial', 'operations', 'brand', 'growth', 'master')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error', 'training')),
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    last_activity_at TIMESTAMPTZ,
    last_insight TEXT,
    avg_confidence_score DECIMAL(3,2) DEFAULT 0.00 CHECK (avg_confidence_score >= 0 AND avg_confidence_score <= 1),
    total_insights_generated INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(barbershop_id, agent_type)
);

-- Enable RLS
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_agents_barbershop_id ON ai_agents(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_type ON ai_agents(agent_type);
CREATE INDEX IF NOT EXISTS idx_ai_agents_status ON ai_agents(status);
CREATE INDEX IF NOT EXISTS idx_ai_agents_enabled ON ai_agents(is_enabled);
CREATE INDEX IF NOT EXISTS idx_ai_agents_last_activity ON ai_agents(last_activity_at);

-- Create update trigger
DROP TRIGGER IF EXISTS set_ai_agents_updated_at ON ai_agents;
CREATE TRIGGER set_ai_agents_updated_at
    BEFORE UPDATE ON ai_agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. business_recommendations - AI business recommendations
CREATE TABLE IF NOT EXISTS business_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    impact_level TEXT NOT NULL DEFAULT 'medium' CHECK (impact_level IN ('high', 'medium', 'low')),
    revenue_potential_monthly DECIMAL(10,2) DEFAULT 0.00,
    confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.00 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    implementation_effort TEXT NOT NULL DEFAULT 'moderate' CHECK (implementation_effort IN ('easy', 'moderate', 'complex')),
    time_to_implement_days INTEGER DEFAULT 30 CHECK (time_to_implement_days > 0),
    is_implemented BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE business_recommendations ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_business_recommendations_barbershop_id ON business_recommendations(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_business_recommendations_agent_id ON business_recommendations(agent_id);
CREATE INDEX IF NOT EXISTS idx_business_recommendations_impact ON business_recommendations(impact_level);
CREATE INDEX IF NOT EXISTS idx_business_recommendations_implemented ON business_recommendations(is_implemented);
CREATE INDEX IF NOT EXISTS idx_business_recommendations_created_at ON business_recommendations(created_at);

-- 5. realtime_metrics - Real-time operational metrics
CREATE TABLE IF NOT EXISTS realtime_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    active_appointments INTEGER DEFAULT 0 CHECK (active_appointments >= 0),
    waiting_customers INTEGER DEFAULT 0 CHECK (waiting_customers >= 0),
    available_barbers INTEGER DEFAULT 0 CHECK (available_barbers >= 0),
    next_available_slot TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE realtime_metrics ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_realtime_metrics_barbershop_id ON realtime_metrics(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_realtime_metrics_timestamp ON realtime_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_realtime_metrics_barbershop_timestamp ON realtime_metrics(barbershop_id, timestamp);

-- 6. location_performance - Multi-location performance tracking
CREATE TABLE IF NOT EXISTS location_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    revenue DECIMAL(10,2) DEFAULT 0.00,
    efficiency_score DECIMAL(3,2) DEFAULT 0.00 CHECK (efficiency_score >= 0 AND efficiency_score <= 1),
    customer_rating DECIMAL(3,2) DEFAULT 0.00 CHECK (customer_rating >= 0 AND customer_rating <= 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(barbershop_id, date)
);

-- Enable RLS
ALTER TABLE location_performance ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_location_performance_barbershop_id ON location_performance(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_location_performance_date ON location_performance(date);
CREATE INDEX IF NOT EXISTS idx_location_performance_barbershop_date ON location_performance(barbershop_id, date);

-- 7. trending_services - Service popularity tracking
CREATE TABLE IF NOT EXISTS trending_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    service_name TEXT NOT NULL,
    total_bookings INTEGER DEFAULT 0 CHECK (total_bookings >= 0),
    growth_rate DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(barbershop_id, date, service_name)
);

-- Enable RLS
ALTER TABLE trending_services ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trending_services_barbershop_id ON trending_services(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_trending_services_date ON trending_services(date);
CREATE INDEX IF NOT EXISTS idx_trending_services_service_name ON trending_services(service_name);
CREATE INDEX IF NOT EXISTS idx_trending_services_barbershop_date ON trending_services(barbershop_id, date);
CREATE INDEX IF NOT EXISTS idx_trending_services_bookings ON trending_services(total_bookings);

-- Create RLS Policies for all tables
-- Business metrics policies
DROP POLICY IF EXISTS "Users can view own barbershop business metrics" ON business_metrics;
CREATE POLICY "Users can view own barbershop business metrics" ON business_metrics
    FOR SELECT TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert own barbershop business metrics" ON business_metrics;
CREATE POLICY "Users can insert own barbershop business metrics" ON business_metrics
    FOR INSERT TO authenticated
    WITH CHECK (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can update own barbershop business metrics" ON business_metrics;
CREATE POLICY "Users can update own barbershop business metrics" ON business_metrics
    FOR UPDATE TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

-- AI insights policies
DROP POLICY IF EXISTS "Users can view own barbershop ai insights" ON ai_insights;
CREATE POLICY "Users can view own barbershop ai insights" ON ai_insights
    FOR SELECT TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert own barbershop ai insights" ON ai_insights;
CREATE POLICY "Users can insert own barbershop ai insights" ON ai_insights
    FOR INSERT TO authenticated
    WITH CHECK (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can update own barbershop ai insights" ON ai_insights;
CREATE POLICY "Users can update own barbershop ai insights" ON ai_insights
    FOR UPDATE TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

-- AI agents policies
DROP POLICY IF EXISTS "Users can view own barbershop ai agents" ON ai_agents;
CREATE POLICY "Users can view own barbershop ai agents" ON ai_agents
    FOR SELECT TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert own barbershop ai agents" ON ai_agents;
CREATE POLICY "Users can insert own barbershop ai agents" ON ai_agents
    FOR INSERT TO authenticated
    WITH CHECK (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can update own barbershop ai agents" ON ai_agents;
CREATE POLICY "Users can update own barbershop ai agents" ON ai_agents
    FOR UPDATE TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

-- Business recommendations policies
DROP POLICY IF EXISTS "Users can view own barbershop business recommendations" ON business_recommendations;
CREATE POLICY "Users can view own barbershop business recommendations" ON business_recommendations
    FOR SELECT TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert own barbershop business recommendations" ON business_recommendations;
CREATE POLICY "Users can insert own barbershop business recommendations" ON business_recommendations
    FOR INSERT TO authenticated
    WITH CHECK (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can update own barbershop business recommendations" ON business_recommendations;
CREATE POLICY "Users can update own barbershop business recommendations" ON business_recommendations
    FOR UPDATE TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

-- Realtime metrics policies
DROP POLICY IF EXISTS "Users can view own barbershop realtime metrics" ON realtime_metrics;
CREATE POLICY "Users can view own barbershop realtime metrics" ON realtime_metrics
    FOR SELECT TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert own barbershop realtime metrics" ON realtime_metrics;
CREATE POLICY "Users can insert own barbershop realtime metrics" ON realtime_metrics
    FOR INSERT TO authenticated
    WITH CHECK (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

-- Location performance policies
DROP POLICY IF EXISTS "Users can view own barbershop location performance" ON location_performance;
CREATE POLICY "Users can view own barbershop location performance" ON location_performance
    FOR SELECT TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert own barbershop location performance" ON location_performance;
CREATE POLICY "Users can insert own barbershop location performance" ON location_performance
    FOR INSERT TO authenticated
    WITH CHECK (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can update own barbershop location performance" ON location_performance;
CREATE POLICY "Users can update own barbershop location performance" ON location_performance
    FOR UPDATE TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

-- Trending services policies
DROP POLICY IF EXISTS "Users can view own barbershop trending services" ON trending_services;
CREATE POLICY "Users can view own barbershop trending services" ON trending_services
    FOR SELECT TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert own barbershop trending services" ON trending_services;
CREATE POLICY "Users can insert own barbershop trending services" ON trending_services
    FOR INSERT TO authenticated
    WITH CHECK (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can update own barbershop trending services" ON trending_services;
CREATE POLICY "Users can update own barbershop trending services" ON trending_services
    FOR UPDATE TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

-- Enable real-time subscriptions for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE business_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_insights;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_agents;
ALTER PUBLICATION supabase_realtime ADD TABLE business_recommendations;
ALTER PUBLICATION supabase_realtime ADD TABLE realtime_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE location_performance;
ALTER PUBLICATION supabase_realtime ADD TABLE trending_services;

-- Insert sample data for testing (optional)
-- This section can be uncommented to add sample data for development

/*
-- Sample AI agents for a barbershop
INSERT INTO ai_agents (barbershop_id, agent_name, agent_type, status, is_enabled, avg_confidence_score, total_insights_generated)
SELECT 
    id,
    'Financial Advisor',
    'financial',
    'active',
    true,
    0.85,
    0
FROM barbershops 
LIMIT 1;

INSERT INTO ai_agents (barbershop_id, agent_name, agent_type, status, is_enabled, avg_confidence_score, total_insights_generated)
SELECT 
    id,
    'Operations Manager',
    'operations',
    'active',
    true,
    0.78,
    0
FROM barbershops 
LIMIT 1;

INSERT INTO ai_agents (barbershop_id, agent_name, agent_type, status, is_enabled, avg_confidence_score, total_insights_generated)
SELECT 
    id,
    'Brand Strategist',
    'brand',
    'active',
    true,
    0.82,
    0
FROM barbershops 
LIMIT 1;

INSERT INTO ai_agents (barbershop_id, agent_name, agent_type, status, is_enabled, avg_confidence_score, total_insights_generated)
SELECT 
    id,
    'Growth Specialist',
    'growth',
    'active',
    true,
    0.79,
    0
FROM barbershops 
LIMIT 1;

INSERT INTO ai_agents (barbershop_id, agent_name, agent_type, status, is_enabled, avg_confidence_score, total_insights_generated)
SELECT 
    id,
    'Master Coach',
    'master',
    'active',
    true,
    0.88,
    0
FROM barbershops 
LIMIT 1;
*/

-- Migration completed successfully
SELECT 'Dashboard and AI tables migration completed successfully!' as message;
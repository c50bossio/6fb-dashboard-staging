-- Fix monitoring schema and appointments table for 6FB AI Agent System
-- This script creates missing monitoring tables and adds missing columns

-- 1. Create system_health_snapshots table
CREATE TABLE IF NOT EXISTS system_health_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    cpu_usage DECIMAL(5,2), -- Percentage
    memory_usage DECIMAL(5,2), -- Percentage  
    memory_total BIGINT, -- Total memory in bytes
    disk_usage DECIMAL(5,2), -- Percentage
    active_users INTEGER DEFAULT 0,
    response_time_avg DECIMAL(10,2), -- Average response time in ms
    error_rate DECIMAL(5,4), -- Error rate as decimal (0.05 = 5%)
    ai_requests_count INTEGER DEFAULT 0,
    ai_cost_total DECIMAL(10,6), -- Total AI costs in dollars
    db_connections INTEGER DEFAULT 0,
    status TEXT DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'unknown'))
);

-- Index for performance queries
CREATE INDEX IF NOT EXISTS idx_system_health_snapshots_timestamp ON system_health_snapshots(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_health_snapshots_status ON system_health_snapshots(status);

-- 2. Create production_metrics table
CREATE TABLE IF NOT EXISTS production_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    type TEXT NOT NULL, -- 'system_health', 'api_performance', etc.
    data JSONB NOT NULL -- Flexible metrics storage
);

-- Index for metrics queries
CREATE INDEX IF NOT EXISTS idx_production_metrics_timestamp ON production_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_production_metrics_type ON production_metrics(type);
CREATE INDEX IF NOT EXISTS idx_production_metrics_data_gin ON production_metrics USING gin(data);

-- 3. Create production_errors table  
CREATE TABLE IF NOT EXISTS production_errors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    level TEXT DEFAULT 'error' CHECK (level IN ('debug', 'info', 'warning', 'error', 'critical')),
    message TEXT NOT NULL,
    stack_trace TEXT,
    context JSONB,
    fingerprint TEXT, -- For error grouping
    occurrences INTEGER DEFAULT 1,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for error tracking
CREATE INDEX IF NOT EXISTS idx_production_errors_timestamp ON production_errors(timestamp);
CREATE INDEX IF NOT EXISTS idx_production_errors_level ON production_errors(level);
CREATE INDEX IF NOT EXISTS idx_production_errors_resolved ON production_errors(resolved);
CREATE INDEX IF NOT EXISTS idx_production_errors_fingerprint ON production_errors(fingerprint);

-- 4. Create ai_model_usage table
CREATE TABLE IF NOT EXISTS ai_model_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    model_name TEXT NOT NULL,
    provider TEXT NOT NULL, -- 'openai', 'anthropic', 'google'
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    cost DECIMAL(10,6), -- Cost in dollars
    response_time DECIMAL(10,2), -- Response time in ms
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    agent_type TEXT, -- 'business_coach', 'marketing_expert', etc.
    user_id UUID,
    session_id TEXT
);

-- Indexes for AI usage analytics
CREATE INDEX IF NOT EXISTS idx_ai_model_usage_timestamp ON ai_model_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_model_usage_model_name ON ai_model_usage(model_name);
CREATE INDEX IF NOT EXISTS idx_ai_model_usage_provider ON ai_model_usage(provider);
CREATE INDEX IF NOT EXISTS idx_ai_model_usage_user_id ON ai_model_usage(user_id);

-- 5. Create production_alerts table
CREATE TABLE IF NOT EXISTS production_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    alert_type TEXT NOT NULL, -- 'system', 'security', 'business'
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    context JSONB,
    channels_sent TEXT[], -- Array of channels where alert was sent
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ
);

-- Indexes for alerts
CREATE INDEX IF NOT EXISTS idx_production_alerts_timestamp ON production_alerts(timestamp);
CREATE INDEX IF NOT EXISTS idx_production_alerts_severity ON production_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_production_alerts_resolved ON production_alerts(resolved);

-- 6. Fix appointments table - add missing shop_id column if it doesn't exist
-- First check if the appointments table exists
DO $$
BEGIN
    -- Check if appointments table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'appointments') THEN
        -- Check if shop_id column exists, if not add it
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'shop_id') THEN
            ALTER TABLE appointments ADD COLUMN shop_id TEXT;
            -- Add index for performance
            CREATE INDEX IF NOT EXISTS idx_appointments_shop_id ON appointments(shop_id);
        END IF;
        
        -- Ensure other commonly needed columns exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'barbershop_id') THEN
            ALTER TABLE appointments ADD COLUMN barbershop_id UUID;
            CREATE INDEX IF NOT EXISTS idx_appointments_barbershop_id ON appointments(barbershop_id);
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'customer_id') THEN
            ALTER TABLE appointments ADD COLUMN customer_id UUID;
            CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON appointments(customer_id);
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'service_id') THEN
            ALTER TABLE appointments ADD COLUMN service_id UUID;
            CREATE INDEX IF NOT EXISTS idx_appointments_service_id ON appointments(service_id);
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'barber_id') THEN
            ALTER TABLE appointments ADD COLUMN barber_id UUID;
            CREATE INDEX IF NOT EXISTS idx_appointments_barber_id ON appointments(barber_id);
        END IF;
        
    ELSE
        -- Create appointments table if it doesn't exist
        CREATE TABLE appointments (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            shop_id TEXT,
            barbershop_id UUID,
            customer_id UUID,
            service_id UUID,
            barber_id UUID,
            date TIMESTAMPTZ NOT NULL,
            status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no-show')),
            notes TEXT,
            price DECIMAL(10,2),
            duration_minutes INTEGER DEFAULT 60,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            created_by UUID
        );
        
        -- Create indexes
        CREATE INDEX idx_appointments_shop_id ON appointments(shop_id);
        CREATE INDEX idx_appointments_barbershop_id ON appointments(barbershop_id);
        CREATE INDEX idx_appointments_customer_id ON appointments(customer_id);
        CREATE INDEX idx_appointments_service_id ON appointments(service_id);
        CREATE INDEX idx_appointments_barber_id ON appointments(barber_id);
        CREATE INDEX idx_appointments_date ON appointments(date);
        CREATE INDEX idx_appointments_status ON appointments(status);
    END IF;
END
$$;

-- 7. Enable Row Level Security on monitoring tables
ALTER TABLE system_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_alerts ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for monitoring tables (admin access only)
-- System health snapshots - service role only
CREATE POLICY "Service role can manage system health snapshots" ON system_health_snapshots
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Production metrics - service role only  
CREATE POLICY "Service role can manage production metrics" ON production_metrics
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Production errors - service role only
CREATE POLICY "Service role can manage production errors" ON production_errors
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- AI model usage - allow users to see their own usage
CREATE POLICY "Users can view their own AI usage" ON ai_model_usage
    FOR SELECT USING (user_id = auth.uid());
    
CREATE POLICY "Service role can manage AI model usage" ON ai_model_usage
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Production alerts - service role only
CREATE POLICY "Service role can manage production alerts" ON production_alerts
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 9. Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- 10. Add updated_at triggers
CREATE TRIGGER update_production_errors_updated_at 
    BEFORE UPDATE ON production_errors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Insert initial health snapshot for testing
INSERT INTO system_health_snapshots (
    cpu_usage, 
    memory_usage, 
    memory_total,
    active_users,
    response_time_avg,
    error_rate,
    ai_requests_count,
    ai_cost_total,
    status
) VALUES (
    15.5,  -- 15.5% CPU usage
    45.2,  -- 45.2% memory usage  
    8589934592, -- 8GB total memory
    12,    -- 12 active users
    250.5, -- 250ms average response time
    0.01,  -- 1% error rate
    145,   -- 145 AI requests
    2.45,  -- $2.45 total AI cost
    'healthy'
) ON CONFLICT DO NOTHING;

-- Success message
SELECT 'Monitoring schema setup completed successfully!' as status;
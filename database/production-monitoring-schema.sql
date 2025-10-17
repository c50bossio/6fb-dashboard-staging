-- Production Monitoring Schema
-- Tables for storing production metrics, errors, and alerts

-- Production metrics table
CREATE TABLE IF NOT EXISTS production_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for efficient querying
    INDEX idx_production_metrics_timestamp (timestamp),
    INDEX idx_production_metrics_type (type),
    INDEX idx_production_metrics_data_gin (data) USING gin
);

-- Production errors table
CREATE TABLE IF NOT EXISTS production_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level VARCHAR(20) NOT NULL CHECK (level IN ('info', 'warning', 'critical')),
    message TEXT NOT NULL,
    stack_trace TEXT,
    context JSONB,
    fingerprint VARCHAR(50),
    occurrences INTEGER DEFAULT 1,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for efficient querying
    INDEX idx_production_errors_timestamp (timestamp),
    INDEX idx_production_errors_level (level),
    INDEX idx_production_errors_fingerprint (fingerprint),
    INDEX idx_production_errors_resolved (resolved),
    INDEX idx_production_errors_context_gin (context) USING gin
);

-- Production alerts table
CREATE TABLE IF NOT EXISTS production_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    context JSONB,
    channels_sent JSONB, -- Track which channels alert was sent to
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(255),
    acknowledged_at TIMESTAMPTZ,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_production_alerts_type (alert_type),
    INDEX idx_production_alerts_severity (severity),
    INDEX idx_production_alerts_acknowledged (acknowledged),
    INDEX idx_production_alerts_resolved (resolved),
    INDEX idx_production_alerts_created_at (created_at)
);

-- System health snapshots table
CREATE TABLE IF NOT EXISTS system_health_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    memory_total BIGINT,
    disk_usage DECIMAL(5,2),
    active_users INTEGER,
    response_time_avg DECIMAL(8,2),
    error_rate DECIMAL(5,4),
    ai_requests_count INTEGER,
    ai_cost_total DECIMAL(10,4),
    db_connections INTEGER,
    status VARCHAR(20) DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'critical')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_health_snapshots_timestamp (timestamp),
    INDEX idx_health_snapshots_status (status)
);

-- Performance benchmarks table
CREATE TABLE IF NOT EXISTS performance_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    response_time INTEGER NOT NULL, -- in milliseconds
    status_code INTEGER NOT NULL,
    user_agent TEXT,
    ip_address INET,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Additional performance metrics
    ttfb INTEGER, -- Time to first byte
    dom_load_time INTEGER,
    page_load_time INTEGER,
    
    -- Indexes
    INDEX idx_benchmarks_endpoint (endpoint),
    INDEX idx_benchmarks_timestamp (timestamp),
    INDEX idx_benchmarks_response_time (response_time),
    INDEX idx_benchmarks_status_code (status_code)
);

-- AI model usage tracking table
CREATE TABLE IF NOT EXISTS ai_model_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    model_name VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    cost DECIMAL(10,6),
    response_time INTEGER,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    agent_type VARCHAR(50),
    user_id UUID REFERENCES profiles(id),
    session_id VARCHAR(255),
    
    -- Indexes
    INDEX idx_ai_usage_timestamp (timestamp),
    INDEX idx_ai_usage_model (model_name),
    INDEX idx_ai_usage_provider (provider),
    INDEX idx_ai_usage_user (user_id),
    INDEX idx_ai_usage_agent (agent_type)
);

-- Daily aggregated reports table
CREATE TABLE IF NOT EXISTS daily_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date DATE NOT NULL UNIQUE,
    total_requests INTEGER DEFAULT 0,
    total_errors INTEGER DEFAULT 0,
    error_rate DECIMAL(5,4) DEFAULT 0,
    avg_response_time DECIMAL(8,2) DEFAULT 0,
    total_ai_cost DECIMAL(10,4) DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    top_errors JSONB,
    performance_trends JSONB,
    recommendations JSONB,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_daily_reports_date (report_date)
);

-- Row Level Security (RLS) Policies
ALTER TABLE production_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- Admin access policy for monitoring tables
CREATE POLICY "Admin access to monitoring data" ON production_metrics
    FOR ALL USING (
        auth.jwt() ->> 'role' IN ('admin', 'super_admin')
        OR auth.jwt() ->> 'email' IN ('support@bookedbarber.com', 'admin@bookedbarber.com')
    );

CREATE POLICY "Admin access to error data" ON production_errors
    FOR ALL USING (
        auth.jwt() ->> 'role' IN ('admin', 'super_admin')
        OR auth.jwt() ->> 'email' IN ('support@bookedbarber.com', 'admin@bookedbarber.com')
    );

CREATE POLICY "Admin access to alerts" ON production_alerts
    FOR ALL USING (
        auth.jwt() ->> 'role' IN ('admin', 'super_admin')
        OR auth.jwt() ->> 'email' IN ('support@bookedbarber.com', 'admin@bookedbarber.com')
    );

CREATE POLICY "Admin access to health snapshots" ON system_health_snapshots
    FOR ALL USING (
        auth.jwt() ->> 'role' IN ('admin', 'super_admin')
        OR auth.jwt() ->> 'email' IN ('support@bookedbarber.com', 'admin@bookedbarber.com')
    );

CREATE POLICY "Admin access to benchmarks" ON performance_benchmarks
    FOR ALL USING (
        auth.jwt() ->> 'role' IN ('admin', 'super_admin')
        OR auth.jwt() ->> 'email' IN ('support@bookedbarber.com', 'admin@bookedbarber.com')
    );

-- Service role access for automated monitoring
CREATE POLICY "Service role access to monitoring" ON production_metrics
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role access to errors" ON production_errors
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role access to health" ON system_health_snapshots
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role access to ai usage" ON ai_model_usage
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- User access to their own AI usage data
CREATE POLICY "Users access own ai usage" ON ai_model_usage
    FOR SELECT USING (auth.uid() = user_id);

-- Automated cleanup functions
CREATE OR REPLACE FUNCTION cleanup_old_monitoring_data()
RETURNS void AS $$
BEGIN
    -- Delete metrics older than 30 days
    DELETE FROM production_metrics 
    WHERE timestamp < NOW() - INTERVAL '30 days';
    
    -- Delete resolved errors older than 7 days
    DELETE FROM production_errors 
    WHERE resolved = true AND resolved_at < NOW() - INTERVAL '7 days';
    
    -- Delete benchmarks older than 14 days
    DELETE FROM performance_benchmarks 
    WHERE timestamp < NOW() - INTERVAL '14 days';
    
    -- Delete health snapshots older than 7 days
    DELETE FROM system_health_snapshots 
    WHERE timestamp < NOW() - INTERVAL '7 days';
    
    RAISE NOTICE 'Monitoring data cleanup completed';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup to run daily (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-monitoring-data', '0 2 * * *', 'SELECT cleanup_old_monitoring_data()');

-- Create views for common queries
CREATE VIEW recent_system_health AS
SELECT 
    timestamp,
    cpu_usage,
    memory_usage,
    response_time_avg,
    error_rate,
    ai_cost_total,
    active_users,
    status
FROM system_health_snapshots
WHERE timestamp > NOW() - INTERVAL '1 day'
ORDER BY timestamp DESC;

CREATE VIEW critical_errors_summary AS
SELECT 
    fingerprint,
    message,
    COUNT(*) as occurrence_count,
    MAX(timestamp) as last_occurrence,
    MIN(timestamp) as first_occurrence,
    resolved
FROM production_errors
WHERE level = 'critical'
GROUP BY fingerprint, message, resolved
ORDER BY occurrence_count DESC, last_occurrence DESC;

CREATE VIEW ai_cost_by_model AS
SELECT 
    model_name,
    provider,
    COUNT(*) as request_count,
    SUM(total_tokens) as total_tokens,
    SUM(cost) as total_cost,
    AVG(cost) as avg_cost,
    AVG(response_time) as avg_response_time
FROM ai_model_usage
WHERE timestamp > NOW() - INTERVAL '1 day'
GROUP BY model_name, provider
ORDER BY total_cost DESC;

-- Grant permissions
GRANT SELECT ON recent_system_health TO authenticated;
GRANT SELECT ON critical_errors_summary TO authenticated;
GRANT SELECT ON ai_cost_by_model TO authenticated;
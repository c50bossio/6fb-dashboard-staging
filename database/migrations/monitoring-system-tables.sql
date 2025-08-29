-- Monitoring System Tables Migration
-- Creates all necessary tables for production monitoring and metrics tracking
-- Date: 2025-08-29

-- 1. System Health Snapshots Table
CREATE TABLE IF NOT EXISTS system_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'healthy',
  cpu_usage DECIMAL(5,2),
  memory_usage DECIMAL(5,2),
  memory_total BIGINT,
  disk_usage DECIMAL(5,2),
  active_users INTEGER DEFAULT 0,
  response_time_avg DECIMAL(8,2),
  error_rate DECIMAL(5,2),
  ai_requests_count INTEGER DEFAULT 0,
  ai_cost_total DECIMAL(10,4) DEFAULT 0,
  db_connections INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_health_snapshots_timestamp ON system_health_snapshots(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_health_snapshots_status ON system_health_snapshots(status);

-- 2. Production Errors Table
CREATE TABLE IF NOT EXISTS production_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  level VARCHAR(20) DEFAULT 'info', -- critical, error, warning, info
  message TEXT,
  stack_trace TEXT,
  context JSONB,
  fingerprint VARCHAR(255), -- For grouping similar errors
  occurrences INTEGER DEFAULT 1,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for error management
CREATE INDEX IF NOT EXISTS idx_production_errors_timestamp ON production_errors(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_production_errors_level ON production_errors(level);
CREATE INDEX IF NOT EXISTS idx_production_errors_fingerprint ON production_errors(fingerprint);
CREATE INDEX IF NOT EXISTS idx_production_errors_resolved ON production_errors(resolved);

-- 3. Production Metrics Table
CREATE TABLE IF NOT EXISTS production_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  type VARCHAR(100), -- system_health, api_performance, database_query, etc.
  data JSONB, -- Flexible JSON data for various metric types
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for time-series queries
CREATE INDEX IF NOT EXISTS idx_production_metrics_timestamp ON production_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_production_metrics_type ON production_metrics(type);

-- 4. AI Model Usage Table
CREATE TABLE IF NOT EXISTS ai_model_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  model_name VARCHAR(100),
  provider VARCHAR(50), -- openai, anthropic, google
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  cost DECIMAL(10,6),
  response_time DECIMAL(10,2), -- in milliseconds
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  agent_type VARCHAR(100),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for AI usage analytics
CREATE INDEX IF NOT EXISTS idx_ai_usage_timestamp ON ai_model_usage(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_model ON ai_model_usage(model_name);
CREATE INDEX IF NOT EXISTS idx_ai_usage_provider ON ai_model_usage(provider);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_model_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_agent_type ON ai_model_usage(agent_type);

-- 5. Production Alerts Table
CREATE TABLE IF NOT EXISTS production_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  alert_type VARCHAR(100), -- system, security, performance, business
  severity VARCHAR(20), -- critical, high, medium, low, info
  title VARCHAR(255),
  message TEXT,
  context JSONB,
  channels_sent TEXT[], -- ['email', 'slack', 'sms']
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for alert management
CREATE INDEX IF NOT EXISTS idx_production_alerts_timestamp ON production_alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_production_alerts_type ON production_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_production_alerts_severity ON production_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_production_alerts_resolved ON production_alerts(resolved);

-- Enable Row Level Security
ALTER TABLE system_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for monitoring tables (admin/service role only)
-- System Health Snapshots - read-only for authenticated users, write for service role
CREATE POLICY "Authenticated users can view health snapshots" ON system_health_snapshots
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage health snapshots" ON system_health_snapshots
  FOR ALL USING (auth.role() = 'service_role');

-- Production Errors - admin and service role access
CREATE POLICY "Admin users can view errors" ON production_errors
  FOR SELECT USING (
    auth.role() = 'service_role' OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

CREATE POLICY "Service role can manage errors" ON production_errors
  FOR ALL USING (auth.role() = 'service_role');

-- Production Metrics - read for authenticated, write for service
CREATE POLICY "Authenticated users can view metrics" ON production_metrics
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage metrics" ON production_metrics
  FOR ALL USING (auth.role() = 'service_role');

-- AI Model Usage - users can see their own usage, admins see all
CREATE POLICY "Users can view own AI usage" ON ai_model_usage
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

CREATE POLICY "Service role can manage AI usage" ON ai_model_usage
  FOR ALL USING (auth.role() = 'service_role');

-- Production Alerts - admin only
CREATE POLICY "Admin users can view alerts" ON production_alerts
  FOR SELECT USING (
    auth.role() = 'service_role' OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

CREATE POLICY "Admin users can acknowledge alerts" ON production_alerts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

CREATE POLICY "Service role can manage alerts" ON production_alerts
  FOR ALL USING (auth.role() = 'service_role');

-- Create update trigger for errors table
CREATE OR REPLACE FUNCTION update_production_errors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_production_errors_updated_at
  BEFORE UPDATE ON production_errors
  FOR EACH ROW
  EXECUTE FUNCTION update_production_errors_updated_at();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create initial health snapshot
INSERT INTO system_health_snapshots (
  status,
  cpu_usage,
  memory_usage,
  response_time_avg,
  error_rate,
  active_users
) VALUES (
  'operational',
  0,
  0,
  0,
  0,
  0
) ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Monitoring system tables created successfully!';
END $$;
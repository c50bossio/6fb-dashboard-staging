-- Additional schema for feature flag analytics events
-- This extends the main feature flags schema with detailed event tracking

-- Analytics events table for detailed tracking
CREATE TABLE IF NOT EXISTS feature_flag_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event identification
  type VARCHAR(50) NOT NULL, -- flag_evaluated, flag_error, ab_test_bucket, etc.
  event_name VARCHAR(100),
  
  -- Feature flag reference
  flag_name VARCHAR(100) NOT NULL,
  flag_id UUID REFERENCES feature_flags(id) ON DELETE SET NULL,
  
  -- User context
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id VARCHAR(100),
  
  -- Event data
  value NUMERIC, -- For performance and business metrics
  metadata JSONB DEFAULT '{}',
  
  -- Context information
  user_agent TEXT,
  ip_address INET,
  request_path VARCHAR(500),
  referrer VARCHAR(500),
  
  -- Error details (when type = 'flag_error')
  error JSONB DEFAULT NULL,
  context JSONB DEFAULT '{}',
  
  -- A/B test data (when type = 'ab_test_bucket')
  variant VARCHAR(50),
  
  -- Business metrics (when type = 'business_metric')
  metric_name VARCHAR(100),
  
  -- Timestamps
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date_bucket DATE GENERATED ALWAYS AS (DATE(timestamp)) STORED,
  hour_bucket TIMESTAMP WITH TIME ZONE GENERATED ALWAYS AS (
    DATE_TRUNC('hour', timestamp)
  ) STORED
);

-- Indexes for analytics performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON feature_flag_analytics_events(type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_flag_name ON feature_flag_analytics_events(flag_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON feature_flag_analytics_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_date_bucket ON feature_flag_analytics_events(date_bucket);
CREATE INDEX IF NOT EXISTS idx_analytics_events_hour_bucket ON feature_flag_analytics_events(hour_bucket);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_session ON feature_flag_analytics_events(user_id, session_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_flag_type_date ON feature_flag_analytics_events(flag_name, type, date_bucket);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_timestamp ON feature_flag_analytics_events(type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_flag_user_date ON feature_flag_analytics_events(flag_name, user_id, date_bucket);

-- Partial indexes for specific event types
CREATE INDEX IF NOT EXISTS idx_analytics_events_errors ON feature_flag_analytics_events(flag_name, timestamp DESC) 
  WHERE type = 'flag_error';
CREATE INDEX IF NOT EXISTS idx_analytics_events_ab_tests ON feature_flag_analytics_events(flag_name, variant, timestamp)
  WHERE type = 'ab_test_bucket';
CREATE INDEX IF NOT EXISTS idx_analytics_events_performance ON feature_flag_analytics_events(flag_name, metric_name, value)
  WHERE type = 'performance_metric';

-- RLS policies for analytics events
ALTER TABLE feature_flag_analytics_events ENABLE ROW LEVEL SECURITY;

-- Admin users can see all analytics events
CREATE POLICY analytics_events_admin ON feature_flag_analytics_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
    )
  );

-- Users can see their own analytics data
CREATE POLICY analytics_events_own_data ON feature_flag_analytics_events
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    -- Organization members can see aggregated data (no personal info)
    (user_id IS NULL AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.barbershop_id IS NOT NULL
    ))
  );

-- System can insert analytics events
CREATE POLICY analytics_events_system_insert ON feature_flag_analytics_events
  FOR INSERT
  WITH CHECK (TRUE);

-- Aggregated analytics views for performance
CREATE OR REPLACE VIEW feature_flag_daily_stats AS
SELECT 
  flag_name,
  date_bucket,
  COUNT(*) as total_events,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users,
  COUNT(*) FILTER (WHERE type = 'flag_evaluated') as evaluations,
  COUNT(*) FILTER (WHERE type = 'flag_error') as errors,
  COUNT(*) FILTER (WHERE type = 'ab_test_bucket') as ab_test_assignments,
  AVG(value) FILTER (WHERE type = 'performance_metric') as avg_performance,
  jsonb_object_agg(
    variant, 
    COUNT(*) 
  ) FILTER (WHERE variant IS NOT NULL AND type = 'ab_test_bucket') as variant_distribution
FROM feature_flag_analytics_events
GROUP BY flag_name, date_bucket;

CREATE OR REPLACE VIEW feature_flag_hourly_stats AS
SELECT 
  flag_name,
  hour_bucket,
  COUNT(*) as total_events,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users,
  COUNT(*) FILTER (WHERE type = 'flag_evaluated') as evaluations,
  COUNT(*) FILTER (WHERE type = 'flag_error') as errors,
  AVG(value) FILTER (WHERE type = 'performance_metric') as avg_performance
FROM feature_flag_analytics_events
GROUP BY flag_name, hour_bucket;

-- Error summary view
CREATE OR REPLACE VIEW feature_flag_error_summary AS
SELECT 
  flag_name,
  error->>'name' as error_type,
  error->>'message' as error_message,
  COUNT(*) as occurrence_count,
  MIN(timestamp) as first_occurrence,
  MAX(timestamp) as last_occurrence,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as affected_users,
  COUNT(DISTINCT session_id) FILTER (WHERE session_id IS NOT NULL) as affected_sessions
FROM feature_flag_analytics_events
WHERE type = 'flag_error' AND error IS NOT NULL
GROUP BY flag_name, error->>'name', error->>'message';

-- Performance metrics view
CREATE OR REPLACE VIEW feature_flag_performance_metrics AS
SELECT 
  flag_name,
  metric_name,
  COUNT(*) as sample_count,
  AVG(value) as avg_value,
  MIN(value) as min_value,
  MAX(value) as max_value,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value) as p50,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value) as p75,
  PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY value) as p90,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY value) as p99,
  DATE_TRUNC('hour', timestamp) as hour_bucket
FROM feature_flag_analytics_events
WHERE type = 'performance_metric' AND value IS NOT NULL
GROUP BY flag_name, metric_name, DATE_TRUNC('hour', timestamp);

-- A/B test conversion tracking
CREATE OR REPLACE VIEW ab_test_conversion_rates AS
WITH conversions AS (
  SELECT 
    flag_name,
    variant,
    user_id,
    session_id,
    COUNT(*) FILTER (WHERE metadata->>'conversion' = 'true') as conversions,
    COUNT(*) as total_events
  FROM feature_flag_analytics_events
  WHERE type = 'ab_test_bucket' AND variant IS NOT NULL
  GROUP BY flag_name, variant, user_id, session_id
)
SELECT 
  flag_name,
  variant,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(conversions) as total_conversions,
  SUM(total_events) as total_events,
  CASE 
    WHEN COUNT(DISTINCT user_id) > 0 
    THEN (SUM(conversions)::FLOAT / COUNT(DISTINCT user_id)) * 100 
    ELSE 0 
  END as user_conversion_rate,
  CASE 
    WHEN SUM(total_events) > 0 
    THEN (SUM(conversions)::FLOAT / SUM(total_events)) * 100 
    ELSE 0 
  END as event_conversion_rate
FROM conversions
GROUP BY flag_name, variant;

-- Functions for analytics queries
CREATE OR REPLACE FUNCTION get_flag_performance_summary(
  flag_name_param TEXT,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '7 days',
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'flag_name', flag_name_param,
    'date_range', jsonb_build_object(
      'start', start_date,
      'end', end_date
    ),
    'total_events', COUNT(*),
    'unique_users', COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL),
    'evaluations', COUNT(*) FILTER (WHERE type = 'flag_evaluated'),
    'errors', COUNT(*) FILTER (WHERE type = 'flag_error'),
    'error_rate', CASE 
      WHEN COUNT(*) FILTER (WHERE type = 'flag_evaluated') > 0 
      THEN (COUNT(*) FILTER (WHERE type = 'flag_error')::FLOAT / 
            COUNT(*) FILTER (WHERE type = 'flag_evaluated')) * 100
      ELSE 0 
    END,
    'avg_evaluation_time', AVG(value) FILTER (WHERE type = 'performance_metric' AND metric_name = 'evaluation_time'),
    'variants', jsonb_object_agg(
      variant, 
      COUNT(*)
    ) FILTER (WHERE variant IS NOT NULL AND type = 'ab_test_bucket')
  ) INTO result
  FROM feature_flag_analytics_events
  WHERE flag_name = flag_name_param 
    AND timestamp BETWEEN start_date AND end_date;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Data retention function (to prevent table from growing too large)
CREATE OR REPLACE FUNCTION cleanup_old_analytics_events(
  retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM feature_flag_analytics_events
  WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup job (if pg_cron is available)
-- SELECT cron.schedule('cleanup-feature-flag-analytics', '0 2 * * *', 'SELECT cleanup_old_analytics_events(90);');

-- Grant permissions
GRANT SELECT ON feature_flag_analytics_events TO authenticated;
GRANT INSERT ON feature_flag_analytics_events TO authenticated;
GRANT SELECT ON feature_flag_daily_stats TO authenticated;
GRANT SELECT ON feature_flag_hourly_stats TO authenticated;
GRANT SELECT ON feature_flag_error_summary TO authenticated;
GRANT SELECT ON feature_flag_performance_metrics TO authenticated;
GRANT SELECT ON ab_test_conversion_rates TO authenticated;

-- Admin permissions
GRANT ALL ON feature_flag_analytics_events TO service_role;
GRANT ALL ON feature_flag_daily_stats TO service_role;
GRANT ALL ON feature_flag_hourly_stats TO service_role;
GRANT ALL ON feature_flag_error_summary TO service_role;
GRANT ALL ON feature_flag_performance_metrics TO service_role;
GRANT ALL ON ab_test_conversion_rates TO service_role;

-- Enable realtime for real-time analytics dashboards
ALTER PUBLICATION supabase_realtime ADD TABLE feature_flag_analytics_events;

-- Comments
COMMENT ON TABLE feature_flag_analytics_events IS 'Detailed event tracking for feature flag analytics and monitoring';
COMMENT ON VIEW feature_flag_daily_stats IS 'Daily aggregated statistics for feature flag usage';
COMMENT ON VIEW feature_flag_hourly_stats IS 'Hourly aggregated statistics for real-time monitoring';
COMMENT ON VIEW feature_flag_error_summary IS 'Summary of errors by flag and error type';
COMMENT ON VIEW feature_flag_performance_metrics IS 'Performance metrics aggregated by flag and metric type';
COMMENT ON VIEW ab_test_conversion_rates IS 'A/B test conversion rates by variant';
COMMENT ON FUNCTION get_flag_performance_summary IS 'Get comprehensive performance summary for a specific flag';
COMMENT ON FUNCTION cleanup_old_analytics_events IS 'Clean up analytics events older than specified retention period';
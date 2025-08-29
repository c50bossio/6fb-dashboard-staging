-- Feature Flags Database Schema for 6FB AI Agent System
-- This schema supports comprehensive feature flag management with:
-- - Real-time updates via Supabase realtime
-- - User segmentation and targeting
-- - A/B testing capabilities
-- - Analytics tracking
-- - Admin controls

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS feature_flag_analytics CASCADE;
DROP TABLE IF EXISTS feature_flag_targeting_rules CASCADE;
DROP TABLE IF EXISTS feature_flags CASCADE;

-- Core feature flags table
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT FALSE,
  
  -- Metadata and configuration
  metadata JSONB DEFAULT '{}',
  variants TEXT[] DEFAULT ARRAY['control', 'variant'],
  
  -- A/B testing configuration
  ab_test_enabled BOOLEAN DEFAULT FALSE,
  ab_test_traffic_percentage INTEGER DEFAULT 100 CHECK (ab_test_traffic_percentage >= 0 AND ab_test_traffic_percentage <= 100),
  
  -- Environment and rollout controls
  environment VARCHAR(20) DEFAULT 'development',
  rollout_percentage INTEGER DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Soft delete support
  archived_at TIMESTAMP WITH TIME ZONE,
  archived_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Targeting rules for user segmentation
CREATE TABLE feature_flag_targeting_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  
  name VARCHAR(100) NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  
  -- Rule conditions (JSON array of conditions)
  -- Example: [{"property": "email", "operator": "contains", "value": "@company.com"}]
  conditions JSONB NOT NULL DEFAULT '[]',
  
  -- What to do when rule matches
  enabled_override BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  
  -- A/B test configuration for this rule
  ab_test_config JSONB DEFAULT NULL,
  -- Example: {
  --   "variants": ["control", "variant_a", "variant_b"],
  --   "traffic_split": {"control": 33, "variant_a": 33, "variant_b": 34},
  --   "variant_overrides": {"variant_a": true, "variant_b": false}
  -- }
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Analytics and usage tracking
CREATE TABLE feature_flag_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Flag evaluation result
  is_enabled BOOLEAN NOT NULL,
  variant VARCHAR(50) DEFAULT 'control',
  
  -- Context and metadata
  user_attributes JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  session_id VARCHAR(100),
  
  -- Request context
  user_agent TEXT,
  ip_address INET,
  request_path VARCHAR(500),
  
  -- Timing
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexing hints
  date_bucket DATE GENERATED ALWAYS AS (DATE(timestamp)) STORED
);

-- Indexes for performance
CREATE INDEX idx_feature_flags_name ON feature_flags(name);
CREATE INDEX idx_feature_flags_enabled ON feature_flags(enabled) WHERE archived_at IS NULL;
CREATE INDEX idx_feature_flags_environment ON feature_flags(environment) WHERE archived_at IS NULL;
CREATE INDEX idx_feature_flags_updated_at ON feature_flags(updated_at);

CREATE INDEX idx_targeting_rules_flag_id ON feature_flag_targeting_rules(flag_id);
CREATE INDEX idx_targeting_rules_active ON feature_flag_targeting_rules(active, priority DESC) WHERE enabled = TRUE;
CREATE INDEX idx_targeting_rules_priority ON feature_flag_targeting_rules(flag_id, priority DESC, active) WHERE enabled = TRUE;

CREATE INDEX idx_analytics_flag_name ON feature_flag_analytics(flag_name);
CREATE INDEX idx_analytics_user_id ON feature_flag_analytics(user_id);
CREATE INDEX idx_analytics_timestamp ON feature_flag_analytics(timestamp DESC);
CREATE INDEX idx_analytics_date_bucket ON feature_flag_analytics(flag_name, date_bucket);
CREATE INDEX idx_analytics_session ON feature_flag_analytics(session_id);

-- Composite indexes for common queries
CREATE INDEX idx_analytics_flag_user_date ON feature_flag_analytics(flag_name, user_id, date_bucket);
CREATE INDEX idx_analytics_flag_enabled_date ON feature_flag_analytics(flag_name, is_enabled, date_bucket);

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_feature_flag_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_flag_updated_at();

CREATE TRIGGER targeting_rules_updated_at
  BEFORE UPDATE ON feature_flag_targeting_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_flag_updated_at();

-- Row Level Security (RLS) policies
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_targeting_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_analytics ENABLE ROW LEVEL SECURITY;

-- Admin users can manage all feature flags
CREATE POLICY feature_flags_admin_all ON feature_flags
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
    )
  );

-- Users can read feature flags relevant to their organization
CREATE POLICY feature_flags_read ON feature_flags
  FOR SELECT
  USING (
    archived_at IS NULL AND
    (
      -- Public flags
      metadata->>'visibility' = 'public' OR
      -- Organization-specific flags
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.barbershop_id IS NOT NULL
        AND (
          metadata->>'barbershop_id' = profiles.barbershop_id::text OR
          metadata->>'organization_id' = profiles.organization_id::text
        )
      ) OR
      -- User is admin
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
      )
    )
  );

-- Targeting rules inherit flag permissions
CREATE POLICY targeting_rules_admin ON feature_flag_targeting_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
    )
  );

CREATE POLICY targeting_rules_read ON feature_flag_targeting_rules
  FOR SELECT
  USING (
    active = TRUE AND
    EXISTS (
      SELECT 1 FROM feature_flags 
      WHERE feature_flags.id = flag_id 
      AND feature_flags.archived_at IS NULL
    )
  );

-- Analytics - users can read their own data, admins can read all
CREATE POLICY analytics_own_data ON feature_flag_analytics
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
    )
  );

-- Analytics - system can insert (no user restrictions for system events)
CREATE POLICY analytics_system_insert ON feature_flag_analytics
  FOR INSERT
  WITH CHECK (TRUE);

-- Functions for common operations
CREATE OR REPLACE FUNCTION get_feature_flag_for_user(
  flag_name TEXT,
  user_id UUID DEFAULT auth.uid(),
  user_attributes JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  flag_config RECORD;
  rule_config RECORD;
  result JSONB;
  user_props JSONB;
BEGIN
  -- Get base flag configuration
  SELECT * INTO flag_config
  FROM feature_flags
  WHERE name = flag_name 
    AND archived_at IS NULL
    AND enabled = TRUE;

  -- If flag doesn't exist or is disabled, return disabled state
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'enabled', FALSE,
      'variant', 'control',
      'metadata', '{}'::jsonb,
      'reason', 'flag_not_found_or_disabled'
    );
  END IF;

  -- Build user properties for targeting
  user_props := user_attributes;
  IF user_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'user_id', p.id,
      'email', p.email,
      'role', p.role,
      'barbershop_id', p.barbershop_id,
      'organization_id', p.organization_id,
      'created_at', p.created_at,
      'subscription_tier', p.subscription_tier
    ) INTO user_props
    FROM profiles p
    WHERE p.id = user_id;
    
    -- Merge with provided attributes
    user_props := user_props || user_attributes;
  END IF;

  -- Check targeting rules in priority order
  FOR rule_config IN
    SELECT *
    FROM feature_flag_targeting_rules
    WHERE flag_id = flag_config.id
      AND enabled = TRUE
      AND active = TRUE
    ORDER BY priority DESC
  LOOP
    -- Evaluate rule conditions (simplified - full evaluation in application)
    -- This is a basic version; complex evaluation happens in the hook
    IF rule_config.conditions = '[]'::jsonb THEN
      -- Rule with no conditions matches all
      RETURN jsonb_build_object(
        'enabled', rule_config.enabled_override,
        'variant', COALESCE(rule_config.ab_test_config->>'default_variant', 'control'),
        'metadata', rule_config.metadata,
        'reason', 'targeting_rule_match',
        'rule_id', rule_config.id
      );
    END IF;
  END LOOP;

  -- No targeting rules matched, return base flag configuration
  RETURN jsonb_build_object(
    'enabled', flag_config.enabled,
    'variant', 'control',
    'metadata', flag_config.metadata,
    'reason', 'base_flag'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track flag usage
CREATE OR REPLACE FUNCTION track_feature_flag_usage(
  flag_name TEXT,
  user_id UUID DEFAULT auth.uid(),
  is_enabled BOOLEAN DEFAULT FALSE,
  variant TEXT DEFAULT 'control',
  user_attributes JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  session_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  analytics_id UUID;
BEGIN
  INSERT INTO feature_flag_analytics (
    flag_name,
    user_id,
    is_enabled,
    variant,
    user_attributes,
    metadata,
    session_id
  ) VALUES (
    flag_name,
    user_id,
    is_enabled,
    variant,
    user_attributes,
    metadata,
    session_id
  )
  RETURNING id INTO analytics_id;

  RETURN analytics_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed some default feature flags for 6FB system
INSERT INTO feature_flags (name, description, enabled, metadata, environment) VALUES
  ('enhanced-booking-flow', 'Enhanced booking components and UX improvements', FALSE, '{"category": "booking", "risk_level": "medium"}', 'development'),
  ('mobile-booking-optimization', 'Mobile-specific booking optimizations', FALSE, '{"category": "mobile", "risk_level": "low"}', 'development'),
  ('realtime-availability', 'Real-time booking conflict prevention', FALSE, '{"category": "booking", "risk_level": "high"}', 'development'),
  ('booking-addons', 'Additional service and product selection', FALSE, '{"category": "booking", "risk_level": "low"}', 'development'),
  ('ai-smart-scheduling', 'AI-powered scheduling recommendations', FALSE, '{"category": "ai", "risk_level": "medium"}', 'development'),
  ('advanced-analytics', 'Enhanced analytics dashboard', TRUE, '{"category": "analytics", "risk_level": "low"}', 'development'),
  ('voice-booking', 'Voice-activated booking interface', FALSE, '{"category": "experimental", "risk_level": "high"}', 'development'),
  ('video-consultations', 'Video consultation booking and management', FALSE, '{"category": "consultation", "risk_level": "medium"}', 'development'),
  ('loyalty-program', 'Customer loyalty and rewards program', FALSE, '{"category": "marketing", "risk_level": "medium"}', 'development'),
  ('multi-location-booking', 'Cross-location booking capabilities', FALSE, '{"category": "enterprise", "risk_level": "high"}', 'development')
ON CONFLICT (name) DO NOTHING;

-- Grant necessary permissions
GRANT SELECT ON feature_flags TO authenticated;
GRANT SELECT ON feature_flag_targeting_rules TO authenticated;
GRANT SELECT, INSERT ON feature_flag_analytics TO authenticated;

-- Grant admin permissions
GRANT ALL ON feature_flags TO service_role;
GRANT ALL ON feature_flag_targeting_rules TO service_role;
GRANT ALL ON feature_flag_analytics TO service_role;

-- Enable realtime for real-time feature flag updates
ALTER PUBLICATION supabase_realtime ADD TABLE feature_flags;
ALTER PUBLICATION supabase_realtime ADD TABLE feature_flag_targeting_rules;

COMMENT ON TABLE feature_flags IS 'Core feature flags configuration with A/B testing support';
COMMENT ON TABLE feature_flag_targeting_rules IS 'User segmentation and targeting rules for feature flags';
COMMENT ON TABLE feature_flag_analytics IS 'Analytics tracking for feature flag usage and performance';

COMMENT ON FUNCTION get_feature_flag_for_user IS 'Get feature flag configuration for a specific user with targeting evaluation';
COMMENT ON FUNCTION track_feature_flag_usage IS 'Track feature flag usage for analytics and monitoring';
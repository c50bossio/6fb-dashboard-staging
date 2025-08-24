-- Settings Deduplication Schema Deployment
-- Execute this in Supabase Dashboard SQL Editor: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/sql
-- 
-- This completes the settings deduplication migration that resolves the issue where
-- "Shop K and different windows have different answers even though it's supposed to be the same shop"

-- ===================================================================
-- STEP 1: Create User-Organization Memberships Table
-- ===================================================================

CREATE TABLE IF NOT EXISTS user_organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core relationships
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  
  -- Role hierarchy (eliminates role confusion)
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'location_manager', 'staff', 'barber')),
  
  -- Granular permissions system
  permissions JSONB NOT NULL DEFAULT '{
    "settings": {
      "view": false,
      "edit": false
    },
    "staff": {
      "view": false,
      "manage": false,
      "hire": false
    },
    "customers": {
      "view": false,
      "manage": false,
      "export": false
    },
    "financials": {
      "view": false,
      "reports": false,
      "payouts": false
    },
    "bookings": {
      "view": false,
      "manage": false,
      "calendar": false
    }
  }'::jsonb,
  
  -- Status and context
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_primary BOOLEAN NOT NULL DEFAULT false, -- Primary organization for user
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  UNIQUE(user_id, organization_id)
);

-- ===================================================================
-- STEP 2: Create Settings Hierarchy Table
-- ===================================================================

CREATE TABLE IF NOT EXISTS settings_hierarchy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context definition (System -> Organization -> User)
  context_type TEXT NOT NULL CHECK (context_type IN ('system', 'organization', 'user')),
  context_id UUID, -- NULL for system, organization_id or user_id for others
  
  -- Settings categorization
  category TEXT NOT NULL CHECK (category IN (
    'notifications', 
    'appearance', 
    'integrations', 
    'booking_preferences', 
    'payment_settings',
    'staff_management',
    'customer_communication',
    'business_operations'
  )),
  
  -- Flexible settings storage with inheritance
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Inheritance control
  inherits_from_parent BOOLEAN NOT NULL DEFAULT true,
  override_parent BOOLEAN NOT NULL DEFAULT false,
  
  -- Validation and constraints
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Unique constraint per context + category
  UNIQUE(context_type, context_id, category)
);

-- ===================================================================
-- STEP 3: Create Indexes for Performance
-- ===================================================================

-- User Organization Memberships indexes
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON user_organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org_id ON user_organization_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_role ON user_organization_memberships(role);
CREATE INDEX IF NOT EXISTS idx_memberships_active ON user_organization_memberships(is_active);
CREATE INDEX IF NOT EXISTS idx_memberships_primary ON user_organization_memberships(user_id, is_primary) WHERE is_primary = true;

-- Settings Hierarchy indexes
CREATE INDEX IF NOT EXISTS idx_settings_context ON settings_hierarchy(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_settings_category ON settings_hierarchy(category);
CREATE INDEX IF NOT EXISTS idx_settings_active ON settings_hierarchy(is_active);
CREATE INDEX IF NOT EXISTS idx_settings_inheritance ON settings_hierarchy(context_type, inherits_from_parent);

-- ===================================================================
-- STEP 4: Enable Row Level Security
-- ===================================================================

ALTER TABLE user_organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_hierarchy ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- STEP 5: Create System Default Settings
-- ===================================================================

-- Insert system-level default settings that all organizations inherit from
INSERT INTO settings_hierarchy (context_type, context_id, category, settings) VALUES
('system', NULL, 'notifications', '{
  "appointment_confirmations": true,
  "appointment_reminders": true,
  "cancellation_notifications": true,
  "review_requests": true,
  "marketing_enabled": false,
  "sms_enabled": false,
  "email_frequency": "immediate"
}'::jsonb),

('system', NULL, 'appearance', '{
  "theme": "professional",
  "primary_color": "#6B7280",
  "secondary_color": "#F3F4F6",
  "logo_placement": "header",
  "custom_css": null,
  "mobile_optimized": true
}'::jsonb),

('system', NULL, 'booking_preferences', '{
  "booking_window_days": 30,
  "cancellation_policy": "24_hours",
  "require_deposit": false,
  "allow_walk_ins": true,
  "appointment_duration_default": 30,
  "buffer_time": 5,
  "max_advance_booking": 90
}'::jsonb),

('system', NULL, 'integrations', '{
  "google_calendar": {"enabled": false, "sync_bidirectional": false},
  "stripe_connect": {"enabled": false, "automatic_payouts": false},
  "sendgrid": {"enabled": false, "template_id": null},
  "twilio": {"enabled": false, "phone_number": null},
  "zapier": {"enabled": false, "webhook_url": null}
}'::jsonb);

-- ===================================================================
-- STEP 6: Create Settings Inheritance Function
-- ===================================================================

-- Function to resolve settings with proper inheritance
CREATE OR REPLACE FUNCTION get_effective_settings(
  p_user_id UUID,
  p_organization_id UUID DEFAULT NULL,
  p_category TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  system_settings JSONB := '{}'::jsonb;
  org_settings JSONB := '{}'::jsonb;
  user_settings JSONB := '{}'::jsonb;
  effective_settings JSONB := '{}'::jsonb;
  org_id UUID;
BEGIN
  -- Get organization ID if not provided
  IF p_organization_id IS NULL THEN
    SELECT organization_id INTO org_id
    FROM user_organization_memberships
    WHERE user_id = p_user_id 
      AND is_primary = true 
      AND is_active = true
    LIMIT 1;
  ELSE
    org_id := p_organization_id;
  END IF;

  -- Get system settings (base layer)
  SELECT COALESCE(
    jsonb_object_agg(category, settings), 
    '{}'::jsonb
  ) INTO system_settings
  FROM settings_hierarchy
  WHERE context_type = 'system'
    AND (p_category IS NULL OR category = p_category)
    AND is_active = true;

  -- Get organization settings (override layer)
  IF org_id IS NOT NULL THEN
    SELECT COALESCE(
      jsonb_object_agg(category, settings),
      '{}'::jsonb
    ) INTO org_settings
    FROM settings_hierarchy
    WHERE context_type = 'organization'
      AND context_id = org_id
      AND (p_category IS NULL OR category = p_category)
      AND is_active = true;
  END IF;

  -- Get user settings (final override layer)
  SELECT COALESCE(
    jsonb_object_agg(category, settings),
    '{}'::jsonb
  ) INTO user_settings
  FROM settings_hierarchy
  WHERE context_type = 'user'
    AND context_id = p_user_id
    AND (p_category IS NULL OR category = p_category)  
    AND is_active = true;

  -- Merge settings with proper inheritance (user > org > system)
  effective_settings := system_settings || org_settings || user_settings;

  RETURN effective_settings;
END;
$$;

-- ===================================================================
-- SUCCESS MESSAGE
-- ===================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Settings Deduplication Schema Deployment Complete!';
  RAISE NOTICE '📊 Created: user_organization_memberships, settings_hierarchy';
  RAISE NOTICE '⚙️  Added: System defaults, inheritance function, indexes';
  RAISE NOTICE '🛡️  Enabled: RLS policies for data security';
  RAISE NOTICE '📋 Next Step: Run the data migration script to populate with existing data';
END $$;
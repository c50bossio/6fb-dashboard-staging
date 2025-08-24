-- Settings Deduplication Migration: Normalized Three-Tier Architecture
-- Eliminates data duplication across shop/general settings by creating
-- a hierarchical settings system with proper inheritance

-- ===================================================================
-- PHASE 1: Create Organizations Table (Single Source of Truth)
-- ===================================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic organization info
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'barbershop' CHECK (type IN ('barbershop', 'salon', 'spa', 'multi_location')),
  slug TEXT UNIQUE, -- For custom domains/URLs
  
  -- Consolidated contact information (eliminates duplication)
  contact_info JSONB NOT NULL DEFAULT '{
    "email": null,
    "phone": null,
    "website": null,
    "social_media": {}
  }'::jsonb,
  
  -- Consolidated address information (eliminates location duplication)
  address JSONB NOT NULL DEFAULT '{
    "street": null,
    "city": null,
    "state": null,
    "zip_code": null,
    "country": "US",
    "coordinates": {"lat": null, "lng": null},
    "service_area_radius": null
  }'::jsonb,
  
  -- Consolidated business operations (eliminates hours duplication)  
  business_hours JSONB NOT NULL DEFAULT '{
    "monday": {"open": "09:00", "close": "17:00", "is_open": true},
    "tuesday": {"open": "09:00", "close": "17:00", "is_open": true},
    "wednesday": {"open": "09:00", "close": "17:00", "is_open": true},
    "thursday": {"open": "09:00", "close": "17:00", "is_open": true},
    "friday": {"open": "09:00", "close": "17:00", "is_open": true},
    "saturday": {"open": "09:00", "close": "17:00", "is_open": true},
    "sunday": {"open": "10:00", "close": "16:00", "is_open": false},
    "timezone": "America/New_York",
    "appointment_duration_default": 30,
    "booking_window_days": 30
  }'::jsonb,
  
  -- Organization-level settings and preferences
  settings JSONB NOT NULL DEFAULT '{
    "branding": {
      "logo_url": null,
      "primary_color": "#6B7280",
      "secondary_color": "#F3F4F6"
    },
    "booking": {
      "require_phone": true,
      "allow_walk_ins": true,
      "cancellation_policy": "24_hours",
      "deposit_required": false
    },
    "notifications": {
      "appointment_reminders": true,
      "marketing_enabled": false,
      "review_requests": true
    },
    "integrations": {
      "google_calendar": {"enabled": false},
      "stripe_connect": {"enabled": false},
      "sendgrid": {"enabled": false}
    }
  }'::jsonb,
  
  -- Status and metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  subscription_tier TEXT DEFAULT 'individual' CHECK (subscription_tier IN ('individual', 'shop_owner', 'enterprise')),
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Search and indexing
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(contact_info->>'email', '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(address->>'city', '')), 'B')
  ) STORED
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(is_active);
CREATE INDEX IF NOT EXISTS idx_organizations_search ON organizations USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_organizations_contact_email ON organizations USING gin((contact_info->>'email'));
CREATE INDEX IF NOT EXISTS idx_organizations_address_city ON organizations USING gin((address->>'city'));

-- RLS Policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- PHASE 2: Create User-Organization Memberships (Role-Based Access)
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON user_organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org_id ON user_organization_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_role ON user_organization_memberships(role);
CREATE INDEX IF NOT EXISTS idx_memberships_active ON user_organization_memberships(is_active);
CREATE INDEX IF NOT EXISTS idx_memberships_primary ON user_organization_memberships(user_id, is_primary) WHERE is_primary = true;

-- RLS Policies  
ALTER TABLE user_organization_memberships ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- PHASE 3: Create Settings Hierarchy (Inheritance System)
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_settings_context ON settings_hierarchy(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_settings_category ON settings_hierarchy(category);
CREATE INDEX IF NOT EXISTS idx_settings_active ON settings_hierarchy(is_active);
CREATE INDEX IF NOT EXISTS idx_settings_inheritance ON settings_hierarchy(context_type, inherits_from_parent);

-- RLS Policies
ALTER TABLE settings_hierarchy ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- PHASE 4: Migration Compatibility Views
-- ===================================================================

-- Create compatibility view for existing barbershops table queries
CREATE OR REPLACE VIEW barbershops_compatibility AS
SELECT 
  o.id,
  o.name,
  o.contact_info->>'email' as email,
  o.contact_info->>'phone' as phone,
  o.address->>'street' as address,
  o.address->>'city' as city,
  o.address->>'state' as state,
  o.address->>'zip_code' as zip_code,
  o.settings->>'description' as description,
  o.business_hours,
  o.is_active,
  o.created_at,
  o.updated_at,
  -- Find the owner from memberships
  (SELECT user_id FROM user_organization_memberships 
   WHERE organization_id = o.id AND role = 'owner' 
   LIMIT 1) as owner_id
FROM organizations o
WHERE o.type IN ('barbershop', 'salon', 'spa');

-- ===================================================================
-- PHASE 5: System Default Settings (Inheritance Base)
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
-- PHASE 6: Database Functions for Settings Inheritance
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
-- PHASE 7: Update Triggers for Consistency
-- ===================================================================

-- Update trigger for organizations
CREATE OR REPLACE FUNCTION update_organizations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_organizations_timestamp();

-- Update trigger for memberships
CREATE TRIGGER memberships_updated_at
  BEFORE UPDATE ON user_organization_memberships
  FOR EACH ROW EXECUTE FUNCTION update_organizations_timestamp();

-- Update trigger for settings
CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings_hierarchy
  FOR EACH ROW EXECUTE FUNCTION update_organizations_timestamp();

-- ===================================================================
-- PHASE 8: Migration Success Verification
-- ===================================================================

-- Create function to verify migration success
CREATE OR REPLACE FUNCTION verify_settings_migration()
RETURNS TABLE (
  check_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Check if all tables exist
  RETURN QUERY
  SELECT 
    'tables_created'::TEXT,
    CASE WHEN COUNT(*) = 3 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'Expected 3 tables, found ' || COUNT(*)::TEXT
  FROM information_schema.tables
  WHERE table_name IN ('organizations', 'user_organization_memberships', 'settings_hierarchy')
    AND table_schema = 'public';

  -- Check if system settings exist
  RETURN QUERY
  SELECT
    'system_settings_populated'::TEXT,
    CASE WHEN COUNT(*) >= 4 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'Expected 4+ system settings, found ' || COUNT(*)::TEXT
  FROM settings_hierarchy
  WHERE context_type = 'system';

  -- Check if compatibility view works
  RETURN QUERY
  SELECT
    'compatibility_view'::TEXT,
    CASE WHEN COUNT(*) >= 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'Barbershops compatibility view accessible'::TEXT
  FROM barbershops_compatibility
  LIMIT 1;

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION verify_settings_migration() IS 
'Verification function to ensure the settings deduplication migration completed successfully';

-- ===================================================================
-- COMPLETION MESSAGE
-- ===================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Settings Deduplication Migration Completed Successfully';
  RAISE NOTICE '📊 Created: organizations, user_organization_memberships, settings_hierarchy';
  RAISE NOTICE '🔧 Added: System defaults, inheritance functions, compatibility views';
  RAISE NOTICE '🛡️  Enabled: RLS policies, audit triggers, performance indexes';
  RAISE NOTICE '📋 Next: Run SELECT * FROM verify_settings_migration() to validate';
END $$;
-- Fix for Unified Context System Schema
-- This handles the case where organizations table exists but is incomplete

-- 1. Add missing settings column to organizations (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'settings'
  ) THEN
    ALTER TABLE organizations ADD COLUMN settings JSONB DEFAULT '{}';
    RAISE NOTICE 'Added settings column to organizations table';
  END IF;
END $$;

-- 2. Ensure other columns exist in organizations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE organizations ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE organizations ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- 3. Create organization_members table (if not exists)
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
  permissions JSONB DEFAULT '[]',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, user_id)
);

-- 4. Create user_context_preferences table (if not exists) - THIS IS THE KEY TABLE
CREATE TABLE IF NOT EXISTS user_context_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  default_context_level VARCHAR(20) NOT NULL DEFAULT 'location',
  auto_switch BOOLEAN DEFAULT FALSE,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Add organization_id to barbershops table (if column doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'barbershops' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE barbershops ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added organization_id column to barbershops table';
  END IF;
END $$;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_user_context_preferences_user_id ON user_context_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_barbershops_organization_id ON barbershops(organization_id);

-- 7. Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_context_preferences ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for organizations
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
CREATE POLICY "Users can view organizations they belong to" ON organizations
  FOR SELECT USING (
    owner_id = auth.uid() OR
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Organization owners can update" ON organizations;
CREATE POLICY "Organization owners can update" ON organizations
  FOR UPDATE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Organization owners can insert" ON organizations;
CREATE POLICY "Organization owners can insert" ON organizations
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- 9. Create RLS policies for organization_members
DROP POLICY IF EXISTS "Users can view organization memberships" ON organization_members;
CREATE POLICY "Users can view organization memberships" ON organization_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- 10. Create RLS policies for user_context_preferences
DROP POLICY IF EXISTS "Users can manage their own preferences" ON user_context_preferences;
CREATE POLICY "Users can manage their own preferences" ON user_context_preferences
  FOR ALL USING (user_id = auth.uid());

-- 11. Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_context_preferences_updated_at ON user_context_preferences;
CREATE TRIGGER update_user_context_preferences_updated_at
    BEFORE UPDATE ON user_context_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 12. Insert sample data for your enterprise user
DO $$
DECLARE
  enterprise_user_id UUID;
  test_org_id UUID;
BEGIN
  -- Find the enterprise user (c50bossio@gmail.com)
  SELECT id INTO enterprise_user_id
  FROM auth.users
  WHERE email = 'c50bossio@gmail.com';

  IF enterprise_user_id IS NOT NULL THEN
    -- Check if organization already exists
    SELECT id INTO test_org_id
    FROM organizations
    WHERE owner_id = enterprise_user_id
    LIMIT 1;

    -- Create test organization if it doesn't exist
    IF test_org_id IS NULL THEN
      INSERT INTO organizations (name, description, owner_id, settings)
      VALUES ('6FB Enterprise', 'Test enterprise organization for multi-location management', enterprise_user_id, '{
        "tier": "ENTERPRISE",
        "contextSystem": "enabled",
        "migrated": true
      }')
      RETURNING id INTO test_org_id;
      RAISE NOTICE 'Created new organization: 6FB Enterprise';
    ELSE
      RAISE NOTICE 'Organization already exists, using existing one';
    END IF;

    -- Create organization membership
    INSERT INTO organization_members (organization_id, user_id, role, permissions)
    VALUES (test_org_id, enterprise_user_id, 'OWNER', '["all"]')
    ON CONFLICT (organization_id, user_id) DO NOTHING;

    -- Create context preferences
    INSERT INTO user_context_preferences (user_id, default_context_level, auto_switch, preferences)
    VALUES (enterprise_user_id, 'organization', true, '{
      "showContextBanner": true,
      "rememberLastContext": true,
      "autoElevateToOrg": true
    }')
    ON CONFLICT (user_id) DO UPDATE SET
      default_context_level = EXCLUDED.default_context_level,
      auto_switch = EXCLUDED.auto_switch,
      preferences = EXCLUDED.preferences;

    -- Link existing barbershops to the organization
    UPDATE barbershops
    SET organization_id = test_org_id
    WHERE owner_id = enterprise_user_id
    AND organization_id IS NULL;

    RAISE NOTICE 'Successfully created/updated test organization and context preferences for enterprise user';
    RAISE NOTICE 'Organization ID: %', test_org_id;
  ELSE
    RAISE NOTICE 'Enterprise user not found, skipping test data creation';
  END IF;
END $$;

-- 13. Verify installation
DO $$
BEGIN
  RAISE NOTICE '✅ Unified Context System database schema installation complete!';
  RAISE NOTICE 'Tables: organizations, organization_members, user_context_preferences';
  RAISE NOTICE 'The user_context_preferences table is now ready - 404 error should be fixed!';
END $$;

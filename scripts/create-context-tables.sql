-- SQL Script to create required tables for Unified Context System
-- Run this script against your Supabase database

-- 1. Organizations table (if not exists)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Organization members table
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'MEMBER', -- 'OWNER', 'ADMIN', 'MEMBER'
  permissions JSONB DEFAULT '[]',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, user_id)
);

-- 3. User context preferences table
CREATE TABLE IF NOT EXISTS user_context_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  default_context_level VARCHAR(20) NOT NULL DEFAULT 'location', -- 'organization', 'location', 'resource'
  auto_switch BOOLEAN DEFAULT FALSE,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Add organization_id to barbershops table (if column doesn't exist)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'barbershops' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE barbershops ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_user_context_preferences_user_id ON user_context_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_barbershops_organization_id ON barbershops(organization_id);

-- 6. Create RLS policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;  
ALTER TABLE user_context_preferences ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can see organizations they own or are members of
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
CREATE POLICY "Users can view organizations they belong to" ON organizations
  FOR SELECT USING (
    owner_id = auth.uid() OR 
    id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Organizations: Only owners can update
DROP POLICY IF EXISTS "Organization owners can update" ON organizations;
CREATE POLICY "Organization owners can update" ON organizations
  FOR UPDATE USING (owner_id = auth.uid());

-- Organization members: Users can see memberships in their organizations
DROP POLICY IF EXISTS "Users can view organization memberships" ON organization_members;
CREATE POLICY "Users can view organization memberships" ON organization_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- User context preferences: Users can only see their own preferences
DROP POLICY IF EXISTS "Users can manage their own preferences" ON user_context_preferences;
CREATE POLICY "Users can manage their own preferences" ON user_context_preferences
  FOR ALL USING (user_id = auth.uid());

-- 7. Create triggers for updated_at timestamps
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

-- 8. Insert sample data for testing (optional)
-- This will create a test organization for the enterprise user we upgraded earlier

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
    -- Create test organization
    INSERT INTO organizations (name, description, owner_id, settings)
    VALUES ('6FB Enterprise', 'Test enterprise organization for multi-location management', enterprise_user_id, '{
      "tier": "ENTERPRISE",
      "contextSystem": "enabled",
      "migrated": true
    }')
    ON CONFLICT DO NOTHING
    RETURNING id INTO test_org_id;
    
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
    
    RAISE NOTICE 'Successfully created test organization and context preferences for enterprise user';
  ELSE
    RAISE NOTICE 'Enterprise user not found, skipping test data creation';
  END IF;
END $$;

-- 9. Verify installation
DO $$
BEGIN
  RAISE NOTICE 'Unified Context System database schema installation complete!';
  RAISE NOTICE 'Tables created: organizations, organization_members, user_context_preferences';
  RAISE NOTICE 'Indexes and RLS policies applied';
  RAISE NOTICE 'Ready for context system activation';
END $$;
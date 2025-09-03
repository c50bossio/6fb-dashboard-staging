-- ===============================================
-- ENTERPRISE LOCATION MANAGEMENT - ORGANIZATION SUPPORT MIGRATION
-- ===============================================
-- This script safely adds organization_id support to the barbershops table
-- for enterprise location management functionality.
-- 
-- Run this in production during a maintenance window for zero-downtime migration
-- Version: 1.0.0
-- Date: 2025-09-02

-- ===============================================
-- STEP 1: BACKUP EXISTING DATA
-- ===============================================

-- Create backup of barbershops table before migration
DROP TABLE IF EXISTS barbershops_pre_org_migration_backup;
CREATE TABLE barbershops_pre_org_migration_backup AS 
SELECT * FROM barbershops;

DO $$ 
BEGIN
  RAISE NOTICE 'Created backup table: barbershops_pre_org_migration_backup';
  RAISE NOTICE 'Records backed up: %', (SELECT COUNT(*) FROM barbershops_pre_org_migration_backup);
END $$;

-- ===============================================
-- STEP 2: CHECK CURRENT SCHEMA STATE
-- ===============================================

-- Check if organization_id already exists
DO $$ 
DECLARE
  column_exists boolean;
  org_table_exists boolean;
BEGIN
  -- Check if organization_id column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'barbershops' 
    AND column_name = 'organization_id'
  ) INTO column_exists;
  
  -- Check if organizations table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
  ) INTO org_table_exists;
  
  RAISE NOTICE 'Current schema state:';
  RAISE NOTICE '  - barbershops.organization_id exists: %', column_exists;
  RAISE NOTICE '  - organizations table exists: %', org_table_exists;
  
  -- Store state for rollback reference
  INSERT INTO settings_hierarchy (context_type, category, settings)
  VALUES ('global', 'migration_state', jsonb_build_object(
    'migration_name', 'add_organization_support',
    'start_time', NOW(),
    'pre_migration_schema', jsonb_build_object(
      'barbershops_has_organization_id', column_exists,
      'organizations_table_exists', org_table_exists
    )
  ))
  ON CONFLICT (context_type, context_id, category) 
  DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW();
END $$;

-- ===============================================
-- STEP 3: CREATE ORGANIZATIONS TABLE (IF NOT EXISTS)
-- ===============================================

-- Create organizations table for multi-location management
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES public.profiles(id),
  tier subscription_tier DEFAULT 'ENTERPRISE',
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add updated_at trigger for organizations
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at 
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DO $$ 
BEGIN
  RAISE NOTICE 'Organizations table ready for use';
END $$;

-- ===============================================
-- STEP 4: ADD ORGANIZATION_ID COLUMN (SAFE)
-- ===============================================

-- Add organization_id column to barbershops table if it doesn't exist
DO $$ 
DECLARE
  column_exists boolean;
BEGIN
  -- Check if column already exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'barbershops' 
    AND column_name = 'organization_id'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    -- Add the column with NULL default (safe for existing data)
    ALTER TABLE public.barbershops 
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    
    RAISE NOTICE 'Added organization_id column to barbershops table';
  ELSE
    RAISE NOTICE 'organization_id column already exists in barbershops table';
  END IF;
END $$;

-- ===============================================
-- STEP 5: CREATE PERFORMANCE INDEXES
-- ===============================================

-- Create index for organization_id lookups
CREATE INDEX IF NOT EXISTS idx_barbershops_organization_id 
ON public.barbershops(organization_id);

-- Create index for profiles organization_id (if column exists)
DO $$
DECLARE
  column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'organization_id'
  ) INTO column_exists;
  
  IF column_exists THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_organization_id 
    ON public.profiles(organization_id);
    RAISE NOTICE 'Created index on profiles.organization_id';
  ELSE
    RAISE NOTICE 'Skipping profiles.organization_id index (column does not exist)';
  END IF;
END $$;

-- Create composite index for efficient enterprise queries
CREATE INDEX IF NOT EXISTS idx_barbershops_org_owner_composite 
ON public.barbershops(organization_id, owner_id);

-- Create index for organization ownership queries
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id 
ON public.organizations(owner_id);

DO $$ 
BEGIN
  RAISE NOTICE 'Performance indexes created successfully';
END $$;

-- ===============================================
-- STEP 6: ENABLE ROW LEVEL SECURITY (RLS) POLICIES
-- ===============================================

-- Enable RLS on organizations table
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for organization owners
DROP POLICY IF EXISTS "Organization owners can manage their organizations" ON public.organizations;
CREATE POLICY "Organization owners can manage their organizations" ON public.organizations
  FOR ALL USING (auth.uid() = owner_id);

-- Create RLS policy for SUPER_ADMIN
DROP POLICY IF EXISTS "Super admins can manage all organizations" ON public.organizations;
CREATE POLICY "Super admins can manage all organizations" ON public.organizations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'SUPER_ADMIN'
    )
  );

-- Update barbershops policies to handle organization_id access
DROP POLICY IF EXISTS "Enterprise users can manage organization locations" ON public.barbershops;
CREATE POLICY "Enterprise users can manage organization locations" ON public.barbershops
  FOR ALL USING (
    organization_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = barbershops.organization_id
      AND organizations.owner_id = auth.uid()
    )
  );

DO $$ 
BEGIN
  RAISE NOTICE 'Row Level Security policies updated for organization support';
END $$;

-- ===============================================
-- STEP 7: DATA MIGRATION (OPTIONAL)
-- ===============================================

-- This section can be customized based on your existing data structure
-- For now, we'll create a sample enterprise organization for testing

DO $$
DECLARE
  sample_org_id UUID;
  enterprise_user_id UUID;
BEGIN
  -- Check if there are any ENTERPRISE_OWNER users
  SELECT id INTO enterprise_user_id
  FROM public.profiles 
  WHERE role = 'ENTERPRISE_OWNER' 
  LIMIT 1;
  
  IF enterprise_user_id IS NOT NULL THEN
    -- Create a sample organization for the first enterprise owner
    INSERT INTO public.organizations (name, owner_id, tier, settings)
    VALUES (
      'Sample Enterprise Organization',
      enterprise_user_id,
      'ENTERPRISE',
      jsonb_build_object(
        'created_by_migration', true,
        'migration_date', NOW()
      )
    )
    RETURNING id INTO sample_org_id;
    
    -- Optionally assign existing barbershops owned by this user to the organization
    UPDATE public.barbershops 
    SET organization_id = sample_org_id
    WHERE owner_id = enterprise_user_id 
    AND organization_id IS NULL;
    
    RAISE NOTICE 'Created sample organization: % for user: %', sample_org_id, enterprise_user_id;
  ELSE
    RAISE NOTICE 'No ENTERPRISE_OWNER users found - skipping sample organization creation';
  END IF;
END $$;

-- ===============================================
-- STEP 8: VALIDATION AND TESTING
-- ===============================================

-- Validate the migration
DO $$
DECLARE
  barbershop_count integer;
  organization_count integer;
  barbershops_with_org integer;
BEGIN
  -- Get counts for validation
  SELECT COUNT(*) INTO barbershop_count FROM public.barbershops;
  SELECT COUNT(*) INTO organization_count FROM public.organizations;
  SELECT COUNT(*) INTO barbershops_with_org FROM public.barbershops WHERE organization_id IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== MIGRATION VALIDATION ===';
  RAISE NOTICE 'Total barbershops: %', barbershop_count;
  RAISE NOTICE 'Total organizations: %', organization_count;
  RAISE NOTICE 'Barbershops with organization_id: %', barbershops_with_org;
  RAISE NOTICE 'Barbershops without organization_id: %', (barbershop_count - barbershops_with_org);
  RAISE NOTICE '';
  
  -- Test query performance
  EXPLAIN (ANALYZE, BUFFERS) 
  SELECT b.id, b.name, o.name as org_name
  FROM public.barbershops b
  LEFT JOIN public.organizations o ON b.organization_id = o.id
  LIMIT 10;
  
END $$;

-- ===============================================
-- STEP 9: MIGRATION COMPLETION LOG
-- ===============================================

-- Log successful completion
INSERT INTO settings_hierarchy (context_type, category, settings)
VALUES ('global', 'migration_completed', jsonb_build_object(
  'migration_name', 'add_organization_support',
  'completed_at', NOW(),
  'version', '1.0.0',
  'status', 'success',
  'backup_table', 'barbershops_pre_org_migration_backup'
))
ON CONFLICT (context_type, context_id, category) 
DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW();

-- Final summary
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== MIGRATION COMPLETE ===';
  RAISE NOTICE 'Enterprise organization support has been successfully added to the database.';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '1. ✅ Created organizations table';
  RAISE NOTICE '2. ✅ Added organization_id column to barbershops';
  RAISE NOTICE '3. ✅ Created performance indexes';
  RAISE NOTICE '4. ✅ Updated Row Level Security policies';
  RAISE NOTICE '5. ✅ Created backup table: barbershops_pre_org_migration_backup';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test enterprise location management functionality';
  RAISE NOTICE '2. Create organizations for existing enterprise users';
  RAISE NOTICE '3. Assign barbershops to appropriate organizations';
  RAISE NOTICE '4. Remove backup table after validation (optional)';
  RAISE NOTICE '';
  RAISE NOTICE 'Rollback available: Use rollback-organization-support.sql if needed';
  RAISE NOTICE '';
END $$;
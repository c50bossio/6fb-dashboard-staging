-- ===============================================
-- ENTERPRISE LOCATION MANAGEMENT - ORGANIZATION SUPPORT ROLLBACK
-- ===============================================
-- EMERGENCY ROLLBACK SCRIPT for add-organization-support.sql
-- 
-- ⚠️  WARNING: This script will remove organization support and associated data
-- ⚠️  Use only if there are critical issues with the organization migration
-- ⚠️  Always backup your data before running this script
--
-- Version: 1.0.0
-- Date: 2025-09-02

-- ===============================================
-- STEP 1: VALIDATION AND SAFETY CHECKS
-- ===============================================

-- Check if we're in the right state for rollback
DO $$
DECLARE
  backup_exists boolean;
  org_column_exists boolean;
  organizations_exist boolean;
  barbershop_count integer;
  backup_count integer;
BEGIN
  -- Check if backup table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'barbershops_pre_org_migration_backup'
  ) INTO backup_exists;
  
  -- Check current schema state
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'barbershops' 
    AND column_name = 'organization_id'
  ) INTO org_column_exists;
  
  -- Check if there are any organizations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    SELECT COUNT(*) INTO organizations_exist FROM public.organizations;
  ELSE
    organizations_exist := 0;
  END IF;
  
  -- Get record counts
  SELECT COUNT(*) INTO barbershop_count FROM public.barbershops;
  
  IF backup_exists THEN
    SELECT COUNT(*) INTO backup_count FROM barbershops_pre_org_migration_backup;
  ELSE
    backup_count := 0;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== ROLLBACK VALIDATION ===';
  RAISE NOTICE 'Backup table exists: %', backup_exists;
  RAISE NOTICE 'organization_id column exists: %', org_column_exists;
  RAISE NOTICE 'Organizations in system: %', organizations_exist;
  RAISE NOTICE 'Current barbershops: %', barbershop_count;
  RAISE NOTICE 'Backup barbershops: %', backup_count;
  RAISE NOTICE '';
  
  -- Safety check
  IF NOT backup_exists THEN
    RAISE EXCEPTION 'ROLLBACK ABORTED: Backup table barbershops_pre_org_migration_backup not found!';
  END IF;
  
  IF backup_count = 0 THEN
    RAISE EXCEPTION 'ROLLBACK ABORTED: Backup table is empty!';
  END IF;
  
  IF NOT org_column_exists THEN
    RAISE NOTICE 'WARNING: organization_id column does not exist. Migration may not have run.';
  END IF;
  
  RAISE NOTICE 'Validation passed. Proceeding with rollback...';
  RAISE NOTICE '';
END $$;

-- ===============================================
-- STEP 2: CREATE CURRENT STATE BACKUP
-- ===============================================

-- Create backup of current state before rollback
DROP TABLE IF EXISTS barbershops_pre_rollback_backup;
CREATE TABLE barbershops_pre_rollback_backup AS 
SELECT * FROM barbershops;

-- Backup organizations table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    DROP TABLE IF EXISTS organizations_pre_rollback_backup;
    CREATE TABLE organizations_pre_rollback_backup AS 
    SELECT * FROM organizations;
    RAISE NOTICE 'Created backup: organizations_pre_rollback_backup';
  END IF;
END $$;

RAISE NOTICE 'Created backup: barbershops_pre_rollback_backup';

-- Log rollback start
INSERT INTO settings_hierarchy (context_type, category, settings)
VALUES ('global', 'rollback_started', jsonb_build_object(
  'rollback_name', 'rollback_organization_support',
  'started_at', NOW(),
  'reason', 'Emergency rollback requested',
  'backup_tables_created', ARRAY['barbershops_pre_rollback_backup', 'organizations_pre_rollback_backup']
))
ON CONFLICT (context_type, context_id, category) 
DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW();

-- ===============================================
-- STEP 3: REMOVE ROW LEVEL SECURITY POLICIES
-- ===============================================

-- Remove organization-related RLS policies
DROP POLICY IF EXISTS "Organization owners can manage their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Super admins can manage all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Enterprise users can manage organization locations" ON public.barbershops;

RAISE NOTICE 'Removed organization-related RLS policies';

-- ===============================================
-- STEP 4: DROP INDEXES
-- ===============================================

-- Remove indexes created for organization support
DROP INDEX IF EXISTS idx_barbershops_organization_id;
DROP INDEX IF EXISTS idx_profiles_organization_id;
DROP INDEX IF EXISTS idx_barbershops_org_owner_composite;
DROP INDEX IF EXISTS idx_organizations_owner_id;

RAISE NOTICE 'Dropped organization-related indexes';

-- ===============================================
-- STEP 5: RESTORE BARBERSHOPS FROM BACKUP
-- ===============================================

-- Clear current barbershops data
TRUNCATE public.barbershops CASCADE;

-- Restore from backup (this will not include organization_id data)
INSERT INTO public.barbershops 
SELECT * FROM barbershops_pre_org_migration_backup;

RAISE NOTICE 'Restored barbershops data from pre-migration backup';

-- ===============================================
-- STEP 6: REMOVE ORGANIZATION_ID COLUMN
-- ===============================================

-- Remove organization_id column from barbershops
DO $$
DECLARE
  column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'barbershops' 
    AND column_name = 'organization_id'
  ) INTO column_exists;
  
  IF column_exists THEN
    ALTER TABLE public.barbershops DROP COLUMN organization_id;
    RAISE NOTICE 'Removed organization_id column from barbershops table';
  ELSE
    RAISE NOTICE 'organization_id column was not present in barbershops table';
  END IF;
END $$;

-- ===============================================
-- STEP 7: DROP ORGANIZATIONS TABLE
-- ===============================================

-- Drop organizations table and related objects
DO $$
BEGIN
  -- Drop triggers first
  DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
  
  -- Drop the table
  DROP TABLE IF EXISTS public.organizations CASCADE;
  
  RAISE NOTICE 'Dropped organizations table and related objects';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Organizations table was not present';
END $$;

-- ===============================================
-- STEP 8: CLEAN UP PROFILES ORGANIZATION_ID (OPTIONAL)
-- ===============================================

-- Optionally remove organization_id from profiles if it was added by migration
DO $$
DECLARE
  column_exists boolean;
  user_choice text := 'keep'; -- Change to 'remove' if you want to remove it
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'organization_id'
  ) INTO column_exists;
  
  IF column_exists AND user_choice = 'remove' THEN
    ALTER TABLE public.profiles DROP COLUMN organization_id;
    RAISE NOTICE 'Removed organization_id column from profiles table';
  ELSIF column_exists THEN
    -- Just clear the values but keep the column
    UPDATE public.profiles SET organization_id = NULL;
    RAISE NOTICE 'Cleared organization_id values from profiles table (kept column)';
  ELSE
    RAISE NOTICE 'organization_id column was not present in profiles table';
  END IF;
END $$;

-- ===============================================
-- STEP 9: RESTORE ORIGINAL RLS POLICIES
-- ===============================================

-- Restore original barbershop policies (from before organization support)
DROP POLICY IF EXISTS "Barbershop owners can manage their shops" ON public.barbershops;
CREATE POLICY "Barbershop owners can manage their shops" ON public.barbershops
  FOR ALL USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Staff can view their barbershop" ON public.barbershops;
CREATE POLICY "Staff can view their barbershop" ON public.barbershops
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.barbershop_staff
      WHERE barbershop_staff.barbershop_id = barbershops.id
      AND barbershop_staff.user_id = auth.uid()
      AND barbershop_staff.is_active = true
    )
  );

RAISE NOTICE 'Restored original RLS policies for barbershops';

-- ===============================================
-- STEP 10: VALIDATION AND CLEANUP
-- ===============================================

-- Validate rollback
DO $$
DECLARE
  barbershop_count integer;
  backup_count integer;
  org_table_exists boolean;
  org_column_exists boolean;
BEGIN
  -- Get current counts
  SELECT COUNT(*) INTO barbershop_count FROM public.barbershops;
  SELECT COUNT(*) INTO backup_count FROM barbershops_pre_org_migration_backup;
  
  -- Check schema state
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
  ) INTO org_table_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'barbershops' 
    AND column_name = 'organization_id'
  ) INTO org_column_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== ROLLBACK VALIDATION ===';
  RAISE NOTICE 'Barbershops restored: % (expected: %)', barbershop_count, backup_count;
  RAISE NOTICE 'Organizations table exists: % (should be false)', org_table_exists;
  RAISE NOTICE 'organization_id column exists: % (should be false)', org_column_exists;
  RAISE NOTICE '';
  
  -- Validation
  IF barbershop_count != backup_count THEN
    RAISE WARNING 'Record count mismatch! Restored: %, Expected: %', barbershop_count, backup_count;
  END IF;
  
  IF org_table_exists THEN
    RAISE WARNING 'Organizations table still exists after rollback!';
  END IF;
  
  IF org_column_exists THEN
    RAISE WARNING 'organization_id column still exists in barbershops after rollback!';
  END IF;
  
END $$;

-- ===============================================
-- STEP 11: ROLLBACK COMPLETION LOG
-- ===============================================

-- Log successful rollback completion
INSERT INTO settings_hierarchy (context_type, category, settings)
VALUES ('global', 'rollback_completed', jsonb_build_object(
  'rollback_name', 'rollback_organization_support',
  'completed_at', NOW(),
  'version', '1.0.0',
  'status', 'success',
  'backup_tables_available', ARRAY[
    'barbershops_pre_org_migration_backup',
    'barbershops_pre_rollback_backup',
    'organizations_pre_rollback_backup'
  ]
))
ON CONFLICT (context_type, context_id, category) 
DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW();

-- Final summary
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== ROLLBACK COMPLETE ===';
  RAISE NOTICE 'Organization support has been successfully rolled back.';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes reverted:';
  RAISE NOTICE '1. ✅ Removed organizations table';
  RAISE NOTICE '2. ✅ Removed organization_id column from barbershops';
  RAISE NOTICE '3. ✅ Dropped organization-related indexes';
  RAISE NOTICE '4. ✅ Removed organization RLS policies';
  RAISE NOTICE '5. ✅ Restored original barbershops data from backup';
  RAISE NOTICE '6. ✅ Restored original RLS policies';
  RAISE NOTICE '';
  RAISE NOTICE 'Backup tables preserved:';
  RAISE NOTICE '- barbershops_pre_org_migration_backup (original pre-migration state)';
  RAISE NOTICE '- barbershops_pre_rollback_backup (state before rollback)';
  RAISE NOTICE '- organizations_pre_rollback_backup (organizations before rollback)';
  RAISE NOTICE '';
  RAISE NOTICE 'System state: Reverted to pre-organization-support state';
  RAISE NOTICE 'Enterprise location management: Will use fallback access methods';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update application to use backward-compatible mode';
  RAISE NOTICE '2. Test enterprise location functionality';
  RAISE NOTICE '3. Clean up backup tables when satisfied (optional)';
  RAISE NOTICE '';
END $$;

-- ===============================================
-- OPTIONAL: CLEANUP BACKUP TABLES
-- ===============================================
-- Uncomment the following section if you want to clean up backup tables
-- immediately after rollback (not recommended - keep backups for safety)

/*
DO $$
BEGIN
  DROP TABLE IF EXISTS barbershops_pre_org_migration_backup;
  DROP TABLE IF EXISTS barbershops_pre_rollback_backup;
  DROP TABLE IF EXISTS organizations_pre_rollback_backup;
  
  RAISE NOTICE 'Backup tables cleaned up';
END $$;
*/
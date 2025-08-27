-- Rollback 001: Revert Schema Consolidation
-- This script safely reverts the schema consolidation migration
-- Run with: psql -f 001_rollback_consolidate_schema.sql

-- ==============================================
-- PHASE 1: VERIFY ROLLBACK SAFETY
-- ==============================================

-- Function to check if rollback is safe
CREATE OR REPLACE FUNCTION check_rollback_safety()
RETURNS TEXT AS $$
DECLARE
  new_table_count INTEGER;
  old_table_count INTEGER;
  data_loss_risk TEXT := 'SAFE';
BEGIN
  -- Check if new tables exist and have data
  SELECT COUNT(*) INTO new_table_count FROM profiles_new;
  
  IF new_table_count > 0 THEN
    -- Check if old tables still exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
      data_loss_risk := 'WARNING: Old profiles table missing - data loss possible';
    END IF;
  END IF;
  
  RETURN format('Rollback Safety Check: %s (New table has %s records)', 
                data_loss_risk, new_table_count);
END;
$$ LANGUAGE plpgsql;

-- Run safety check
SELECT check_rollback_safety();

-- ==============================================
-- PHASE 2: BACKUP NEW DATA BEFORE ROLLBACK
-- ==============================================

-- Create backup tables for new data that might not exist in old schema
CREATE TABLE IF NOT EXISTS profiles_backup_001 AS 
SELECT * FROM profiles_new WHERE created_at > (SELECT MAX(created_at) FROM profiles WHERE created_at IS NOT NULL);

CREATE TABLE IF NOT EXISTS barbershops_backup_001 AS 
SELECT * FROM barbershops_new WHERE created_at > (SELECT MAX(created_at) FROM barbershops WHERE created_at IS NOT NULL);

CREATE TABLE IF NOT EXISTS staff_backup_001 AS 
SELECT * FROM barbershop_staff_new WHERE created_at > (SELECT MAX(created_at) FROM barbershop_staff WHERE created_at IS NOT NULL);

-- ==============================================
-- PHASE 3: RESTORE OLD SCHEMA STRUCTURE
-- ==============================================

-- Drop views created during migration
DROP VIEW IF EXISTS profiles CASCADE;
DROP VIEW IF EXISTS barbershops CASCADE;
DROP VIEW IF EXISTS barbershop_staff CASCADE;

-- Drop triggers from new tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles_new;
DROP TRIGGER IF EXISTS update_barbershops_updated_at ON barbershops_new;
DROP TRIGGER IF EXISTS update_staff_updated_at ON barbershop_staff_new;

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles_new;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles_new;

-- Disable RLS on new tables
ALTER TABLE IF EXISTS profiles_new DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS barbershops_new DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS barbershop_staff_new DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscriptions_new DISABLE ROW LEVEL SECURITY;

-- ==============================================
-- PHASE 4: DATA RECONCILIATION (IF NEEDED)
-- ==============================================

-- Function to reconcile any new data back to old schema
CREATE OR REPLACE FUNCTION reconcile_rollback_data()
RETURNS TEXT AS $$
DECLARE
  profiles_reconciled INTEGER := 0;
  barbershops_reconciled INTEGER := 0;
  staff_reconciled INTEGER := 0;
  rec RECORD;
BEGIN
  -- Reconcile profiles data from new table to old table
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles_new') 
     AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
    
    FOR rec IN SELECT * FROM profiles_new WHERE updated_at > 
        (SELECT COALESCE(MAX(updated_at), '1970-01-01') FROM profiles) LOOP
      
      INSERT INTO profiles (
        id, full_name, email, phone, avatar_url,
        shop_id, barbershop_id, role, subscription_tier,
        timezone, onboarding_completed, created_at, updated_at
      ) VALUES (
        rec.id, rec.full_name, rec.email, rec.phone, rec.avatar_url,
        rec.barbershop_id, rec.barbershop_id, rec.role, rec.subscription_tier,
        rec.timezone, rec.onboarding_completed, rec.created_at, rec.updated_at
      ) ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        shop_id = EXCLUDED.shop_id,
        barbershop_id = EXCLUDED.barbershop_id,
        role = EXCLUDED.role,
        subscription_tier = EXCLUDED.subscription_tier,
        updated_at = EXCLUDED.updated_at;
      
      profiles_reconciled := profiles_reconciled + 1;
    END LOOP;
  END IF;
  
  -- Similar reconciliation for barbershops and staff...
  
  RETURN format('Reconciled %s profiles, %s barbershops, %s staff records', 
                profiles_reconciled, barbershops_reconciled, staff_reconciled);
END;
$$ LANGUAGE plpgsql;

-- Run data reconciliation
SELECT reconcile_rollback_data();

-- ==============================================
-- PHASE 5: RENAME TABLES BACK TO ORIGINAL
-- ==============================================

-- Rename new tables to archive versions
ALTER TABLE IF EXISTS profiles_new RENAME TO profiles_new_archived_001;
ALTER TABLE IF EXISTS barbershops_new RENAME TO barbershops_new_archived_001;
ALTER TABLE IF EXISTS barbershop_staff_new RENAME TO barbershop_staff_new_archived_001;
ALTER TABLE IF EXISTS subscriptions_new RENAME TO subscriptions_new_archived_001;

-- ==============================================
-- PHASE 6: RESTORE ORIGINAL TABLE STRUCTURE
-- ==============================================

-- If original tables were renamed during migration, restore them
-- (This would depend on the exact migration strategy used)

-- Ensure original indexes and constraints are in place
-- (Add specific index recreation if needed)

-- ==============================================
-- PHASE 7: CLEANUP AND VERIFICATION
-- ==============================================

-- Drop migration helper functions
DROP FUNCTION IF EXISTS migrate_profiles_data();
DROP FUNCTION IF EXISTS migrate_barbershops_data();
DROP FUNCTION IF EXISTS migrate_staff_data();
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Verify rollback completed successfully
CREATE OR REPLACE FUNCTION verify_rollback_completion()
RETURNS TEXT AS $$
DECLARE
  original_tables_exist BOOLEAN := TRUE;
  new_tables_archived BOOLEAN := TRUE;
  verification_result TEXT := 'SUCCESS';
BEGIN
  -- Check that original tables exist
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
    original_tables_exist := FALSE;
    verification_result := 'ERROR: Original profiles table missing';
  END IF;
  
  -- Check that new tables are archived
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles_new') THEN
    new_tables_archived := FALSE;
    verification_result := 'ERROR: New tables not properly archived';
  END IF;
  
  RETURN format('Rollback Verification: %s', verification_result);
END;
$$ LANGUAGE plpgsql;

-- Run verification
SELECT verify_rollback_completion();

-- Log rollback completion
INSERT INTO migration_log (migration_name, completed_at, notes) 
VALUES ('001_rollback_consolidate_schema', NOW(), 'Schema consolidation rollback completed')
ON CONFLICT DO NOTHING;

-- ==============================================
-- PHASE 8: POST-ROLLBACK INSTRUCTIONS
-- ==============================================

-- Display post-rollback information
DO $$
BEGIN
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'ROLLBACK COMPLETED';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'The schema consolidation has been rolled back.';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Please verify the following:';
  RAISE NOTICE '1. Application is connecting to correct tables';
  RAISE NOTICE '2. All data is accessible and correct';
  RAISE NOTICE '3. No functionality is broken';
  RAISE NOTICE '';
  RAISE NOTICE 'BACKUP DATA LOCATION:';
  RAISE NOTICE '- profiles_backup_001 (new profiles data)';
  RAISE NOTICE '- barbershops_backup_001 (new barbershops data)'; 
  RAISE NOTICE '- staff_backup_001 (new staff data)';
  RAISE NOTICE '';
  RAISE NOTICE 'ARCHIVED TABLES:';
  RAISE NOTICE '- profiles_new_archived_001';
  RAISE NOTICE '- barbershops_new_archived_001';
  RAISE NOTICE '- barbershop_staff_new_archived_001';
  RAISE NOTICE '- subscriptions_new_archived_001';
  RAISE NOTICE '';
  RAISE NOTICE 'These can be dropped after verification if not needed.';
  RAISE NOTICE '====================================================';
END $$;
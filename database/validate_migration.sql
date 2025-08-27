-- Migration Validation Script
-- This script validates the schema consolidation migration
-- Run after migration to ensure data integrity

-- ==============================================
-- VALIDATION FUNCTIONS
-- ==============================================

-- Function to validate profiles migration
CREATE OR REPLACE FUNCTION validate_profiles_migration()
RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Check 1: Row counts match
  RETURN QUERY
  WITH old_count AS (SELECT COUNT(*) as cnt FROM profiles WHERE TRUE),
       new_count AS (SELECT COUNT(*) as cnt FROM profiles_new WHERE TRUE)
  SELECT 
    'profiles_row_count'::TEXT,
    CASE WHEN old_count.cnt = new_count.cnt THEN 'PASS' ELSE 'FAIL' END::TEXT,
    format('Old: %s, New: %s', old_count.cnt, new_count.cnt)::TEXT
  FROM old_count, new_count;
  
  -- Check 2: All IDs migrated
  RETURN QUERY
  WITH missing_ids AS (
    SELECT p.id FROM profiles p 
    LEFT JOIN profiles_new pn ON p.id = pn.id 
    WHERE pn.id IS NULL
  )
  SELECT 
    'profiles_missing_ids'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    format('%s missing IDs', COUNT(*))::TEXT
  FROM missing_ids;
  
  -- Check 3: Barbershop ID field consolidation
  RETURN QUERY
  WITH field_check AS (
    SELECT 
      COUNT(*) as total_profiles,
      COUNT(barbershop_id) as has_barbershop_id,
      COUNT(CASE WHEN shop_id IS NOT NULL AND barbershop_id IS NULL THEN 1 END) as shop_id_not_migrated
    FROM profiles_new
  )
  SELECT 
    'profiles_barbershop_id_consolidation'::TEXT,
    CASE WHEN shop_id_not_migrated = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    format('%s total, %s with barbershop_id, %s unmigrated shop_ids', 
           total_profiles, has_barbershop_id, shop_id_not_migrated)::TEXT
  FROM field_check;
  
END;
$$ LANGUAGE plpgsql;

-- Function to validate barbershops migration
CREATE OR REPLACE FUNCTION validate_barbershops_migration()
RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Check 1: Row counts match
  RETURN QUERY
  WITH old_count AS (SELECT COUNT(*) as cnt FROM barbershops WHERE TRUE),
       new_count AS (SELECT COUNT(*) as cnt FROM barbershops_new WHERE TRUE)
  SELECT 
    'barbershops_row_count'::TEXT,
    CASE WHEN old_count.cnt = new_count.cnt THEN 'PASS' ELSE 'FAIL' END::TEXT,
    format('Old: %s, New: %s', old_count.cnt, new_count.cnt)::TEXT
  FROM old_count, new_count;
  
  -- Check 2: Owner references are valid
  RETURN QUERY
  WITH invalid_owners AS (
    SELECT b.id, b.owner_id 
    FROM barbershops_new b 
    LEFT JOIN auth.users u ON b.owner_id = u.id 
    WHERE b.owner_id IS NOT NULL AND u.id IS NULL
  )
  SELECT 
    'barbershops_valid_owners'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    format('%s invalid owner references', COUNT(*))::TEXT
  FROM invalid_owners;
  
END;
$$ LANGUAGE plpgsql;

-- Function to validate staff relationships
CREATE OR REPLACE FUNCTION validate_staff_migration()
RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Check 1: Row counts match
  RETURN QUERY
  WITH old_count AS (SELECT COUNT(*) as cnt FROM barbershop_staff WHERE TRUE),
       new_count AS (SELECT COUNT(*) as cnt FROM barbershop_staff_new WHERE TRUE)
  SELECT 
    'staff_row_count'::TEXT,
    CASE WHEN old_count.cnt = new_count.cnt THEN 'PASS' ELSE 'FAIL' END::TEXT,
    format('Old: %s, New: %s', old_count.cnt, new_count.cnt)::TEXT
  FROM old_count, new_count;
  
  -- Check 2: Foreign key integrity
  RETURN QUERY
  WITH integrity_check AS (
    SELECT 
      COUNT(*) as total_staff,
      COUNT(CASE WHEN p.id IS NULL THEN 1 END) as invalid_user_refs,
      COUNT(CASE WHEN b.id IS NULL THEN 1 END) as invalid_barbershop_refs
    FROM barbershop_staff_new bs
    LEFT JOIN auth.users p ON bs.user_id = p.id
    LEFT JOIN barbershops_new b ON bs.barbershop_id = b.id
  )
  SELECT 
    'staff_foreign_key_integrity'::TEXT,
    CASE WHEN invalid_user_refs = 0 AND invalid_barbershop_refs = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    format('%s total, %s invalid user refs, %s invalid barbershop refs', 
           total_staff, invalid_user_refs, invalid_barbershop_refs)::TEXT
  FROM integrity_check;
  
END;
$$ LANGUAGE plpgsql;

-- Function to validate subscription consolidation
CREATE OR REPLACE FUNCTION validate_subscription_consolidation()
RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Check 1: Single subscription per entity
  RETURN QUERY
  WITH duplicate_check AS (
    SELECT user_id, barbershop_id, COUNT(*) as cnt
    FROM subscriptions_new 
    WHERE status = 'active'
    GROUP BY user_id, barbershop_id 
    HAVING COUNT(*) > 1
  )
  SELECT 
    'subscriptions_no_duplicates'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    format('%s duplicate active subscriptions found', COUNT(*))::TEXT
  FROM duplicate_check;
  
  -- Check 2: Valid subscription holder constraint
  RETURN QUERY
  WITH constraint_check AS (
    SELECT 
      COUNT(*) as total_subs,
      COUNT(CASE WHEN user_id IS NOT NULL AND barbershop_id IS NOT NULL THEN 1 END) as both_set,
      COUNT(CASE WHEN user_id IS NULL AND barbershop_id IS NULL THEN 1 END) as neither_set
    FROM subscriptions_new
  )
  SELECT 
    'subscriptions_valid_holder_constraint'::TEXT,
    CASE WHEN both_set = 0 AND neither_set = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    format('%s total subs, %s with both holders, %s with no holder', 
           total_subs, both_set, neither_set)::TEXT
  FROM constraint_check;
  
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- MAIN VALIDATION FUNCTION
-- ==============================================

CREATE OR REPLACE FUNCTION run_migration_validation()
RETURNS TABLE(
  validation_category TEXT,
  check_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Validate profiles
  RETURN QUERY 
  SELECT 'PROFILES'::TEXT, * FROM validate_profiles_migration();
  
  -- Validate barbershops
  RETURN QUERY 
  SELECT 'BARBERSHOPS'::TEXT, * FROM validate_barbershops_migration();
  
  -- Validate staff relationships
  RETURN QUERY 
  SELECT 'STAFF'::TEXT, * FROM validate_staff_migration();
  
  -- Validate subscriptions
  RETURN QUERY 
  SELECT 'SUBSCRIPTIONS'::TEXT, * FROM validate_subscription_consolidation();
  
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- EXECUTION AND REPORTING
-- ==============================================

-- Run all validations
DO $$
DECLARE
  validation_rec RECORD;
  total_checks INTEGER := 0;
  passed_checks INTEGER := 0;
  failed_checks INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'MIGRATION VALIDATION REPORT';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  
  FOR validation_rec IN SELECT * FROM run_migration_validation() LOOP
    total_checks := total_checks + 1;
    
    IF validation_rec.status = 'PASS' THEN
      passed_checks := passed_checks + 1;
      RAISE NOTICE '[✓] %: % - %', 
        validation_rec.validation_category, 
        validation_rec.check_name, 
        validation_rec.details;
    ELSE
      failed_checks := failed_checks + 1;
      RAISE NOTICE '[✗] %: % - %', 
        validation_rec.validation_category, 
        validation_rec.check_name, 
        validation_rec.details;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'VALIDATION SUMMARY';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Total Checks: %', total_checks;
  RAISE NOTICE 'Passed: % (%.1f%%)', passed_checks, (passed_checks::FLOAT / total_checks * 100);
  RAISE NOTICE 'Failed: % (%.1f%%)', failed_checks, (failed_checks::FLOAT / total_checks * 100);
  RAISE NOTICE '';
  
  IF failed_checks = 0 THEN
    RAISE NOTICE '🎉 ALL VALIDATIONS PASSED!';
    RAISE NOTICE 'Migration is ready for production use.';
  ELSE
    RAISE NOTICE '⚠️  VALIDATION FAILURES DETECTED!';
    RAISE NOTICE 'Please review failed checks before proceeding.';
  END IF;
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
END $$;

-- ==============================================
-- ADDITIONAL DIAGNOSTIC QUERIES
-- ==============================================

-- Show sample data comparison
SELECT 'SAMPLE DATA COMPARISON' as info;

-- Profiles comparison (first 5 records)
SELECT 'PROFILES - OLD SCHEMA' as schema_type, id, full_name, email, shop_id, barbershop_id, role
FROM profiles 
ORDER BY created_at 
LIMIT 5;

SELECT 'PROFILES - NEW SCHEMA' as schema_type, id, full_name, email, NULL as shop_id, barbershop_id, role
FROM profiles_new 
ORDER BY created_at 
LIMIT 5;

-- Show subscription consolidation results
SELECT 'SUBSCRIPTION CONSOLIDATION SUMMARY' as info;

SELECT 
  'SUBSCRIPTIONS_NEW' as table_name,
  COUNT(*) as total_count,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as individual_subscriptions,
  COUNT(CASE WHEN barbershop_id IS NOT NULL THEN 1 END) as barbershop_subscriptions,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions
FROM subscriptions_new;

-- Show barbershop-staff relationships
SELECT 'BARBERSHOP-STAFF RELATIONSHIPS' as info;

SELECT 
  b.name as barbershop_name,
  COUNT(bs.user_id) as staff_count,
  ARRAY_AGG(bs.role) as roles
FROM barbershops_new b
LEFT JOIN barbershop_staff_new bs ON b.id = bs.barbershop_id AND bs.is_active = TRUE
GROUP BY b.id, b.name
ORDER BY staff_count DESC
LIMIT 10;

-- Clean up validation functions (optional)
-- DROP FUNCTION IF EXISTS validate_profiles_migration();
-- DROP FUNCTION IF EXISTS validate_barbershops_migration(); 
-- DROP FUNCTION IF EXISTS validate_staff_migration();
-- DROP FUNCTION IF EXISTS validate_subscription_consolidation();
-- DROP FUNCTION IF EXISTS run_migration_validation();
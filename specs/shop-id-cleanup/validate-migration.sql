-- ============================================================================
-- SHOP_ID TO BARBERSHOP_ID MIGRATION VALIDATION
-- ============================================================================
-- Purpose: Validate successful migration from shop_id to barbershop_id
-- Date: 2025-10-10
-- Run After: migrate-shop-id-data.sql
-- ============================================================================

-- ============================================================================
-- VALIDATION 1: CHECK FOR ORPHANED SHOP_ID DATA
-- ============================================================================
-- Verify no records have shop_id populated but barbershop_id NULL
-- ============================================================================

DO $$
DECLARE
    orphaned_profiles INT;
    orphaned_services INT;
    orphaned_customers INT;
    orphaned_appointment_records INT;
    orphaned_customers_backup INT;
    total_orphaned INT;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VALIDATION 1: Orphaned shop_id Check';
    RAISE NOTICE '========================================';

    SELECT COUNT(*) INTO orphaned_profiles
    FROM profiles WHERE shop_id IS NOT NULL AND barbershop_id IS NULL;

    SELECT COUNT(*) INTO orphaned_services
    FROM services WHERE shop_id IS NOT NULL AND barbershop_id IS NULL;

    SELECT COUNT(*) INTO orphaned_customers
    FROM customers WHERE shop_id IS NOT NULL AND barbershop_id IS NULL;

    SELECT COUNT(*) INTO orphaned_appointment_records
    FROM appointment_records WHERE shop_id IS NOT NULL AND barbershop_id IS NULL;

    SELECT COUNT(*) INTO orphaned_customers_backup
    FROM customers_backup WHERE shop_id IS NOT NULL AND barbershop_id IS NULL;

    total_orphaned := orphaned_profiles + orphaned_services + orphaned_customers +
                      orphaned_appointment_records + orphaned_customers_backup;

    RAISE NOTICE 'Orphaned records by table:';
    RAISE NOTICE '  profiles: %', orphaned_profiles;
    RAISE NOTICE '  services: %', orphaned_services;
    RAISE NOTICE '  customers: %', orphaned_customers;
    RAISE NOTICE '  appointment_records: %', orphaned_appointment_records;
    RAISE NOTICE '  customers_backup: %', orphaned_customers_backup;
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'TOTAL ORPHANED: %', total_orphaned;

    IF total_orphaned = 0 THEN
        RAISE NOTICE 'PASS: No orphaned shop_id data found';
    ELSE
        RAISE WARNING 'FAIL: Found % orphaned shop_id records', total_orphaned;
    END IF;
END $$;

-- ============================================================================
-- VALIDATION 2: VERIFY ALL RECORDS HAVE BARBERSHOP_ID
-- ============================================================================
-- Check that all records (excluding NULL-allowed cases) have barbershop_id
-- ============================================================================

DO $$
DECLARE
    profiles_total INT;
    profiles_with_barbershop_id INT;
    services_total INT;
    services_with_barbershop_id INT;
    customers_total INT;
    customers_with_barbershop_id INT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VALIDATION 2: barbershop_id Population';
    RAISE NOTICE '========================================';

    -- Profiles
    SELECT COUNT(*), COUNT(barbershop_id) INTO profiles_total, profiles_with_barbershop_id
    FROM profiles;

    RAISE NOTICE 'profiles: % of % have barbershop_id (%.1f%%)',
                 profiles_with_barbershop_id, profiles_total,
                 CASE WHEN profiles_total > 0
                      THEN (profiles_with_barbershop_id::float / profiles_total * 100)
                      ELSE 0
                 END;

    -- Services
    SELECT COUNT(*), COUNT(barbershop_id) INTO services_total, services_with_barbershop_id
    FROM services;

    RAISE NOTICE 'services: % of % have barbershop_id (%.1f%%)',
                 services_with_barbershop_id, services_total,
                 CASE WHEN services_total > 0
                      THEN (services_with_barbershop_id::float / services_total * 100)
                      ELSE 0
                 END;

    -- Customers
    SELECT COUNT(*), COUNT(barbershop_id) INTO customers_total, customers_with_barbershop_id
    FROM customers;

    RAISE NOTICE 'customers: % of % have barbershop_id (%.1f%%)',
                 customers_with_barbershop_id, customers_total,
                 CASE WHEN customers_total > 0
                      THEN (customers_with_barbershop_id::float / customers_total * 100)
                      ELSE 0
                 END;

    RAISE NOTICE 'PASS: barbershop_id population verified';
END $$;

-- ============================================================================
-- VALIDATION 3: FOREIGN KEY INTEGRITY CHECK
-- ============================================================================
-- Verify all barbershop_id values reference valid barbershops.id
-- ============================================================================

DO $$
DECLARE
    profiles_invalid INT;
    services_invalid INT;
    customers_invalid INT;
    customers_backup_invalid INT;
    total_invalid INT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VALIDATION 3: Foreign Key Integrity';
    RAISE NOTICE '========================================';

    -- Check profiles
    SELECT COUNT(*) INTO profiles_invalid
    FROM profiles
    WHERE barbershop_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM barbershops WHERE id = profiles.barbershop_id);

    -- Check services
    SELECT COUNT(*) INTO services_invalid
    FROM services
    WHERE barbershop_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM barbershops WHERE id = services.barbershop_id);

    -- Check customers
    SELECT COUNT(*) INTO customers_invalid
    FROM customers
    WHERE barbershop_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM barbershops WHERE id = customers.barbershop_id);

    -- Check customers_backup (handle varchar type)
    SELECT COUNT(*) INTO customers_backup_invalid
    FROM customers_backup
    WHERE barbershop_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM barbershops
        WHERE id::text = customers_backup.barbershop_id
      );

    total_invalid := profiles_invalid + services_invalid + customers_invalid + customers_backup_invalid;

    RAISE NOTICE 'Invalid foreign key references:';
    RAISE NOTICE '  profiles: %', profiles_invalid;
    RAISE NOTICE '  services: %', services_invalid;
    RAISE NOTICE '  customers: %', customers_invalid;
    RAISE NOTICE '  customers_backup: %', customers_backup_invalid;
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'TOTAL INVALID: %', total_invalid;

    IF total_invalid = 0 THEN
        RAISE NOTICE 'PASS: All foreign keys are valid';
    ELSE
        RAISE WARNING 'FAIL: Found % invalid foreign key references', total_invalid;
    END IF;
END $$;

-- ============================================================================
-- VALIDATION 4: DATA CONSISTENCY CHECK
-- ============================================================================
-- For records with BOTH shop_id and barbershop_id, verify they match
-- ============================================================================

DO $$
DECLARE
    profiles_mismatch INT;
    services_mismatch INT;
    customers_mismatch INT;
    customers_backup_mismatch INT;
    total_mismatch INT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VALIDATION 4: Data Consistency';
    RAISE NOTICE '========================================';

    -- Check profiles (both columns should match when both populated)
    SELECT COUNT(*) INTO profiles_mismatch
    FROM profiles
    WHERE shop_id IS NOT NULL
      AND barbershop_id IS NOT NULL
      AND shop_id::uuid != barbershop_id;

    -- Check services
    SELECT COUNT(*) INTO services_mismatch
    FROM services
    WHERE shop_id IS NOT NULL
      AND barbershop_id IS NOT NULL
      AND shop_id::uuid != barbershop_id;

    -- Check customers
    SELECT COUNT(*) INTO customers_mismatch
    FROM customers
    WHERE shop_id IS NOT NULL
      AND barbershop_id IS NOT NULL
      AND shop_id::uuid != barbershop_id;

    -- Check customers_backup (handle text/varchar types)
    SELECT COUNT(*) INTO customers_backup_mismatch
    FROM customers_backup
    WHERE shop_id IS NOT NULL
      AND barbershop_id IS NOT NULL
      AND shop_id != barbershop_id;

    total_mismatch := profiles_mismatch + services_mismatch +
                      customers_mismatch + customers_backup_mismatch;

    RAISE NOTICE 'Mismatched shop_id/barbershop_id:';
    RAISE NOTICE '  profiles: %', profiles_mismatch;
    RAISE NOTICE '  services: %', services_mismatch;
    RAISE NOTICE '  customers: %', customers_mismatch;
    RAISE NOTICE '  customers_backup: %', customers_backup_mismatch;
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'TOTAL MISMATCHES: %', total_mismatch;

    IF total_mismatch = 0 THEN
        RAISE NOTICE 'PASS: All data is consistent';
    ELSE
        RAISE WARNING 'FAIL: Found % data mismatches', total_mismatch;
    END IF;
END $$;

-- ============================================================================
-- VALIDATION 5: MIGRATION READINESS CHECK
-- ============================================================================
-- Determine if it's safe to drop shop_id columns
-- ============================================================================

DO $$
DECLARE
    total_issues INT := 0;
    orphaned_count INT;
    invalid_fk_count INT;
    mismatch_count INT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VALIDATION 5: Migration Readiness';
    RAISE NOTICE '========================================';

    -- Count total orphaned records
    SELECT SUM(cnt) INTO orphaned_count FROM (
        SELECT COUNT(*) as cnt FROM profiles WHERE shop_id IS NOT NULL AND barbershop_id IS NULL
        UNION ALL
        SELECT COUNT(*) FROM services WHERE shop_id IS NOT NULL AND barbershop_id IS NULL
        UNION ALL
        SELECT COUNT(*) FROM customers WHERE shop_id IS NOT NULL AND barbershop_id IS NULL
        UNION ALL
        SELECT COUNT(*) FROM appointment_records WHERE shop_id IS NOT NULL AND barbershop_id IS NULL
        UNION ALL
        SELECT COUNT(*) FROM customers_backup WHERE shop_id IS NOT NULL AND barbershop_id IS NULL
    ) AS counts;

    -- Count total invalid foreign keys
    SELECT SUM(cnt) INTO invalid_fk_count FROM (
        SELECT COUNT(*) as cnt FROM profiles
        WHERE barbershop_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM barbershops WHERE id = profiles.barbershop_id)
        UNION ALL
        SELECT COUNT(*) FROM services
        WHERE barbershop_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM barbershops WHERE id = services.barbershop_id)
        UNION ALL
        SELECT COUNT(*) FROM customers
        WHERE barbershop_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM barbershops WHERE id = customers.barbershop_id)
    ) AS counts;

    -- Count total mismatches
    SELECT SUM(cnt) INTO mismatch_count FROM (
        SELECT COUNT(*) as cnt FROM profiles
        WHERE shop_id IS NOT NULL AND barbershop_id IS NOT NULL
          AND shop_id::uuid != barbershop_id
        UNION ALL
        SELECT COUNT(*) FROM services
        WHERE shop_id IS NOT NULL AND barbershop_id IS NOT NULL
          AND shop_id::uuid != barbershop_id
        UNION ALL
        SELECT COUNT(*) FROM customers
        WHERE shop_id IS NOT NULL AND barbershop_id IS NOT NULL
          AND shop_id::uuid != barbershop_id
    ) AS counts;

    total_issues := COALESCE(orphaned_count, 0) + COALESCE(invalid_fk_count, 0) +
                    COALESCE(mismatch_count, 0);

    RAISE NOTICE 'Issues found:';
    RAISE NOTICE '  Orphaned records: %', COALESCE(orphaned_count, 0);
    RAISE NOTICE '  Invalid foreign keys: %', COALESCE(invalid_fk_count, 0);
    RAISE NOTICE '  Data mismatches: %', COALESCE(mismatch_count, 0);
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'TOTAL ISSUES: %', total_issues;
    RAISE NOTICE '';

    IF total_issues = 0 THEN
        RAISE NOTICE '========================================';
        RAISE NOTICE 'SUCCESS: READY TO DROP SHOP_ID COLUMNS';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'All validations passed. You may proceed with:';
        RAISE NOTICE '  - drop-shop-id-columns.sql';
    ELSE
        RAISE WARNING '========================================';
        RAISE WARNING 'FAILED: NOT READY TO DROP SHOP_ID';
        RAISE WARNING '========================================';
        RAISE WARNING 'Fix % issues before dropping shop_id columns', total_issues;
    END IF;
END $$;

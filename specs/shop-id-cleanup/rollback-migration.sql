-- ============================================================================
-- SHOP_ID TO BARBERSHOP_ID MIGRATION ROLLBACK
-- ============================================================================
-- Purpose: Rollback data migration from shop_id to barbershop_id
-- Date: 2025-10-10
-- WARNING: This will ONLY work if shop_id columns still exist
-- Use Case: If migration causes issues and needs to be reversed
-- ============================================================================

-- SAFETY WARNING
DO $$
BEGIN
    RAISE WARNING '========================================';
    RAISE WARNING 'MIGRATION ROLLBACK STARTING';
    RAISE WARNING '========================================';
    RAISE WARNING 'This will restore data from shop_id columns';
    RAISE WARNING 'Only run this if migration needs to be reversed';
    RAISE WARNING '';
    RAISE WARNING 'Proceeding in 5 seconds...';
END $$;

-- Wait message (PostgreSQL doesn't have SLEEP, so this is informational)
DO $$
BEGIN
    RAISE NOTICE 'Verify shop_id columns exist before proceeding';
END $$;

-- ============================================================================
-- ROLLBACK CHECK: Verify shop_id columns exist
-- ============================================================================

DO $$
DECLARE
    profiles_has_shop_id BOOLEAN;
    services_has_shop_id BOOLEAN;
    customers_has_shop_id BOOLEAN;
    appointment_records_has_shop_id BOOLEAN;
    customers_backup_has_shop_id BOOLEAN;
BEGIN
    -- Check if shop_id columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'shop_id'
    ) INTO profiles_has_shop_id;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'services' AND column_name = 'shop_id'
    ) INTO services_has_shop_id;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customers' AND column_name = 'shop_id'
    ) INTO customers_has_shop_id;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'appointment_records' AND column_name = 'shop_id'
    ) INTO appointment_records_has_shop_id;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customers_backup' AND column_name = 'shop_id'
    ) INTO customers_backup_has_shop_id;

    RAISE NOTICE 'shop_id column existence:';
    RAISE NOTICE '  profiles: %', profiles_has_shop_id;
    RAISE NOTICE '  services: %', services_has_shop_id;
    RAISE NOTICE '  customers: %', customers_has_shop_id;
    RAISE NOTICE '  appointment_records: %', appointment_records_has_shop_id;
    RAISE NOTICE '  customers_backup: %', customers_backup_has_shop_id;

    IF NOT (profiles_has_shop_id OR services_has_shop_id OR customers_has_shop_id OR
            appointment_records_has_shop_id OR customers_backup_has_shop_id) THEN
        RAISE EXCEPTION 'ABORT: No shop_id columns found. Rollback not possible.';
    END IF;
END $$;

-- ============================================================================
-- ROLLBACK 1: PROFILES TABLE
-- ============================================================================
-- Restore barbershop_id from shop_id (reverse migration)
-- ============================================================================

DO $$
DECLARE
    rollback_count INT;
BEGIN
    -- Only rollback records where shop_id exists but differs from barbershop_id
    UPDATE profiles
    SET barbershop_id = shop_id::uuid
    WHERE shop_id IS NOT NULL
      AND (barbershop_id IS NULL OR barbershop_id != shop_id::uuid);

    GET DIAGNOSTICS rollback_count = ROW_COUNT;

    IF rollback_count > 0 THEN
        RAISE NOTICE 'PROFILES: Rolled back % records', rollback_count;
    ELSE
        RAISE NOTICE 'PROFILES: No records needed rollback';
    END IF;
END $$;

-- ============================================================================
-- ROLLBACK 2: SERVICES TABLE
-- ============================================================================

DO $$
DECLARE
    rollback_count INT;
BEGIN
    UPDATE services
    SET barbershop_id = shop_id::uuid
    WHERE shop_id IS NOT NULL
      AND (barbershop_id IS NULL OR barbershop_id != shop_id::uuid);

    GET DIAGNOSTICS rollback_count = ROW_COUNT;

    IF rollback_count > 0 THEN
        RAISE NOTICE 'SERVICES: Rolled back % records', rollback_count;
    ELSE
        RAISE NOTICE 'SERVICES: No records needed rollback';
    END IF;
END $$;

-- ============================================================================
-- ROLLBACK 3: CUSTOMERS TABLE
-- ============================================================================

DO $$
DECLARE
    rollback_count INT;
BEGIN
    UPDATE customers
    SET barbershop_id = shop_id::uuid
    WHERE shop_id IS NOT NULL
      AND (barbershop_id IS NULL OR barbershop_id != shop_id::uuid);

    GET DIAGNOSTICS rollback_count = ROW_COUNT;

    IF rollback_count > 0 THEN
        RAISE NOTICE 'CUSTOMERS: Rolled back % records', rollback_count;
    ELSE
        RAISE NOTICE 'CUSTOMERS: No records needed rollback';
    END IF;
END $$;

-- ============================================================================
-- ROLLBACK 4: APPOINTMENT_RECORDS TABLE
-- ============================================================================

DO $$
DECLARE
    rollback_count INT;
BEGIN
    UPDATE appointment_records
    SET barbershop_id = shop_id::uuid
    WHERE shop_id IS NOT NULL
      AND (barbershop_id IS NULL OR barbershop_id != shop_id::uuid);

    GET DIAGNOSTICS rollback_count = ROW_COUNT;

    IF rollback_count > 0 THEN
        RAISE NOTICE 'APPOINTMENT_RECORDS: Rolled back % records', rollback_count;
    ELSE
        RAISE NOTICE 'APPOINTMENT_RECORDS: No records needed rollback';
    END IF;
END $$;

-- ============================================================================
-- ROLLBACK 5: CUSTOMERS_BACKUP TABLE
-- ============================================================================

DO $$
DECLARE
    rollback_count INT;
BEGIN
    -- Handle text/varchar type conversion
    UPDATE customers_backup
    SET barbershop_id = shop_id
    WHERE shop_id IS NOT NULL
      AND (barbershop_id IS NULL OR barbershop_id != shop_id);

    GET DIAGNOSTICS rollback_count = ROW_COUNT;

    IF rollback_count > 0 THEN
        RAISE NOTICE 'CUSTOMERS_BACKUP: Rolled back % records', rollback_count;
    ELSE
        RAISE NOTICE 'CUSTOMERS_BACKUP: No records needed rollback';
    END IF;
END $$;

-- ============================================================================
-- ROLLBACK SUMMARY
-- ============================================================================

DO $$
DECLARE
    profiles_count INT;
    services_count INT;
    customers_count INT;
    appointment_records_count INT;
    customers_backup_count INT;
    total_count INT;
BEGIN
    -- Count records after rollback
    SELECT COUNT(*) INTO profiles_count
    FROM profiles WHERE barbershop_id IS NOT NULL;

    SELECT COUNT(*) INTO services_count
    FROM services WHERE barbershop_id IS NOT NULL;

    SELECT COUNT(*) INTO customers_count
    FROM customers WHERE barbershop_id IS NOT NULL;

    SELECT COUNT(*) INTO appointment_records_count
    FROM appointment_records WHERE barbershop_id IS NOT NULL;

    SELECT COUNT(*) INTO customers_backup_count
    FROM customers_backup WHERE barbershop_id IS NOT NULL;

    total_count := profiles_count + services_count + customers_count +
                   appointment_records_count + customers_backup_count;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ROLLBACK SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Records with barbershop_id after rollback:';
    RAISE NOTICE '  profiles: %', profiles_count;
    RAISE NOTICE '  services: %', services_count;
    RAISE NOTICE '  customers: %', customers_count;
    RAISE NOTICE '  appointment_records: %', appointment_records_count;
    RAISE NOTICE '  customers_backup: %', customers_backup_count;
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'TOTAL RECORDS: %', total_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ROLLBACK COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Run validate-migration.sql to verify rollback';
    RAISE NOTICE '  2. Investigate why migration needed rollback';
    RAISE NOTICE '  3. Fix issues before re-running migration';
END $$;

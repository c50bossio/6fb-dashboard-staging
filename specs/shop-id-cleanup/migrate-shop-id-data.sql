-- ============================================================================
-- SHOP_ID TO BARBERSHOP_ID DATA MIGRATION
-- ============================================================================
-- Purpose: Migrate data from deprecated shop_id columns to barbershop_id
-- Date: 2025-10-10
-- Risk: LOW - Only copies data, does not delete
-- Rollback: See rollback-migration.sql
-- ============================================================================

-- SAFETY CHECKS BEFORE MIGRATION
-- ============================================================================

-- Verify barbershops table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'barbershops') THEN
        RAISE EXCEPTION 'CRITICAL: barbershops table does not exist. Migration aborted.';
    END IF;
END $$;

-- ============================================================================
-- MIGRATION 1: PROFILES TABLE
-- ============================================================================
-- Status: 4 rows with shop_id, 6 rows with barbershop_id
-- Action: No orphaned data (all shop_id rows also have barbershop_id)
-- Result: No action needed - data already synchronized
-- ============================================================================

DO $$
DECLARE
    orphaned_count INT;
BEGIN
    -- Check for orphaned shop_id data (shop_id NOT NULL, barbershop_id IS NULL)
    SELECT COUNT(*) INTO orphaned_count
    FROM profiles
    WHERE shop_id IS NOT NULL AND barbershop_id IS NULL;

    IF orphaned_count > 0 THEN
        RAISE NOTICE 'PROFILES: Found % orphaned shop_id records. Migrating...', orphaned_count;

        -- Copy shop_id to barbershop_id where barbershop_id is NULL
        UPDATE profiles
        SET barbershop_id = shop_id::uuid
        WHERE shop_id IS NOT NULL
          AND barbershop_id IS NULL
          AND EXISTS (SELECT 1 FROM barbershops WHERE id = shop_id::uuid);

        RAISE NOTICE 'PROFILES: Migrated % records', orphaned_count;
    ELSE
        RAISE NOTICE 'PROFILES: No orphaned shop_id data found. Skipping.';
    END IF;
END $$;

-- ============================================================================
-- MIGRATION 2: SERVICES TABLE
-- ============================================================================
-- Status: 3 rows with shop_id, 17 rows with barbershop_id
-- Action: All 17 rows already have barbershop_id populated
-- Result: No action needed - data already synchronized
-- ============================================================================

DO $$
DECLARE
    orphaned_count INT;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM services
    WHERE shop_id IS NOT NULL AND barbershop_id IS NULL;

    IF orphaned_count > 0 THEN
        RAISE NOTICE 'SERVICES: Found % orphaned shop_id records. Migrating...', orphaned_count;

        UPDATE services
        SET barbershop_id = shop_id::uuid
        WHERE shop_id IS NOT NULL
          AND barbershop_id IS NULL
          AND EXISTS (SELECT 1 FROM barbershops WHERE id = shop_id::uuid);

        RAISE NOTICE 'SERVICES: Migrated % records', orphaned_count;
    ELSE
        RAISE NOTICE 'SERVICES: No orphaned shop_id data found. Skipping.';
    END IF;
END $$;

-- ============================================================================
-- MIGRATION 3: CUSTOMERS TABLE
-- ============================================================================
-- Status: 0 rows with shop_id, 52 rows with barbershop_id
-- Action: Clean - no shop_id data exists
-- Result: No action needed
-- ============================================================================

DO $$
DECLARE
    orphaned_count INT;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM customers
    WHERE shop_id IS NOT NULL AND barbershop_id IS NULL;

    IF orphaned_count > 0 THEN
        RAISE NOTICE 'CUSTOMERS: Found % orphaned shop_id records. Migrating...', orphaned_count;

        UPDATE customers
        SET barbershop_id = shop_id::uuid
        WHERE shop_id IS NOT NULL
          AND barbershop_id IS NULL
          AND EXISTS (SELECT 1 FROM barbershops WHERE id = shop_id::uuid);

        RAISE NOTICE 'CUSTOMERS: Migrated % records', orphaned_count;
    ELSE
        RAISE NOTICE 'CUSTOMERS: No orphaned shop_id data found. Skipping.';
    END IF;
END $$;

-- ============================================================================
-- MIGRATION 4: APPOINTMENT_RECORDS TABLE
-- ============================================================================
-- Status: 0 rows total (empty table)
-- Action: No data to migrate
-- Result: No action needed
-- ============================================================================

DO $$
DECLARE
    orphaned_count INT;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM appointment_records
    WHERE shop_id IS NOT NULL AND barbershop_id IS NULL;

    IF orphaned_count > 0 THEN
        RAISE NOTICE 'APPOINTMENT_RECORDS: Found % orphaned shop_id records. Migrating...', orphaned_count;

        UPDATE appointment_records
        SET barbershop_id = shop_id::uuid
        WHERE shop_id IS NOT NULL
          AND barbershop_id IS NULL
          AND EXISTS (SELECT 1 FROM barbershops WHERE id = shop_id::uuid);

        RAISE NOTICE 'APPOINTMENT_RECORDS: Migrated % records', orphaned_count;
    ELSE
        RAISE NOTICE 'APPOINTMENT_RECORDS: No orphaned shop_id data found. Skipping.';
    END IF;
END $$;

-- ============================================================================
-- MIGRATION 5: CUSTOMERS_BACKUP TABLE
-- ============================================================================
-- Status: 101 rows with shop_id, 70 with barbershop_id, 31 ORPHANED
-- Action: CRITICAL - 31 rows need migration
-- Result: Copy shop_id to barbershop_id for orphaned records
-- ============================================================================

DO $$
DECLARE
    orphaned_count INT;
    migrated_count INT;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM customers_backup
    WHERE shop_id IS NOT NULL AND barbershop_id IS NULL;

    IF orphaned_count > 0 THEN
        RAISE NOTICE 'CUSTOMERS_BACKUP: Found % orphaned shop_id records. Migrating...', orphaned_count;

        -- Convert shop_id (text) to barbershop_id (varchar/uuid)
        -- Note: customers_backup has shop_id as TEXT, barbershop_id as VARCHAR
        UPDATE customers_backup
        SET barbershop_id = shop_id
        WHERE shop_id IS NOT NULL
          AND barbershop_id IS NULL
          AND EXISTS (
            SELECT 1 FROM barbershops
            WHERE id::text = shop_id
               OR name = shop_id  -- Fallback if shop_id contains name instead of UUID
          );

        GET DIAGNOSTICS migrated_count = ROW_COUNT;
        RAISE NOTICE 'CUSTOMERS_BACKUP: Migrated % of % records', migrated_count, orphaned_count;

        IF migrated_count < orphaned_count THEN
            RAISE WARNING 'CUSTOMERS_BACKUP: % records could not be migrated (invalid shop_id references)',
                         (orphaned_count - migrated_count);
        END IF;
    ELSE
        RAISE NOTICE 'CUSTOMERS_BACKUP: No orphaned shop_id data found. Skipping.';
    END IF;
END $$;

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================

DO $$
DECLARE
    profiles_orphaned INT;
    services_orphaned INT;
    customers_orphaned INT;
    appointment_records_orphaned INT;
    customers_backup_orphaned INT;
    total_orphaned INT;
BEGIN
    -- Count remaining orphaned records after migration
    SELECT COUNT(*) INTO profiles_orphaned
    FROM profiles WHERE shop_id IS NOT NULL AND barbershop_id IS NULL;

    SELECT COUNT(*) INTO services_orphaned
    FROM services WHERE shop_id IS NOT NULL AND barbershop_id IS NULL;

    SELECT COUNT(*) INTO customers_orphaned
    FROM customers WHERE shop_id IS NOT NULL AND barbershop_id IS NULL;

    SELECT COUNT(*) INTO appointment_records_orphaned
    FROM appointment_records WHERE shop_id IS NOT NULL AND barbershop_id IS NULL;

    SELECT COUNT(*) INTO customers_backup_orphaned
    FROM customers_backup WHERE shop_id IS NOT NULL AND barbershop_id IS NULL;

    total_orphaned := profiles_orphaned + services_orphaned + customers_orphaned +
                      appointment_records_orphaned + customers_backup_orphaned;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Remaining orphaned records:';
    RAISE NOTICE '  - profiles: %', profiles_orphaned;
    RAISE NOTICE '  - services: %', services_orphaned;
    RAISE NOTICE '  - customers: %', customers_orphaned;
    RAISE NOTICE '  - appointment_records: %', appointment_records_orphaned;
    RAISE NOTICE '  - customers_backup: %', customers_backup_orphaned;
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'TOTAL ORPHANED: %', total_orphaned;
    RAISE NOTICE '========================================';

    IF total_orphaned > 0 THEN
        RAISE WARNING 'Migration incomplete. % orphaned records remain.', total_orphaned;
    ELSE
        RAISE NOTICE 'SUCCESS: All shop_id data migrated to barbershop_id';
    END IF;
END $$;

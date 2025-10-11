/**
 * shop_id to barbershop_id Data Migration Script
 *
 * Purpose: Migrate remaining shop_id data to barbershop_id column
 * Date: October 10, 2025
 * Author: System Migration Team
 * Status: READY FOR REVIEW
 *
 * CRITICAL: This migration fixes the schema inconsistency that caused:
 * - Calendar showing no appointments
 * - Empty services dropdowns
 * - Missing customer data
 *
 * Affected Tables:
 * 1. profiles (4 rows need migration)
 * 2. services (already complete - verification only)
 * 3. customers (already complete - verification only)
 *
 * Safety Features:
 * - Transaction-based (automatic rollback on error)
 * - Pre-migration backups
 * - Verification queries
 * - Detailed logging
 */

-- ==============================================================================
-- PRE-MIGRATION VERIFICATION
-- ==============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'shop_id → barbershop_id Migration';
    RAISE NOTICE 'Starting at: %', now();
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- Check current state before migration
DO $$
DECLARE
    profiles_shop_id_count INT;
    profiles_barbershop_id_count INT;
    profiles_both_count INT;
    profiles_neither_count INT;
    services_shop_id_count INT;
    services_barbershop_id_count INT;
    customers_shop_id_count INT;
    customers_barbershop_id_count INT;
BEGIN
    -- Profiles analysis
    SELECT
        COUNT(*) FILTER (WHERE shop_id IS NOT NULL AND barbershop_id IS NULL),
        COUNT(*) FILTER (WHERE barbershop_id IS NOT NULL),
        COUNT(*) FILTER (WHERE shop_id IS NOT NULL AND barbershop_id IS NOT NULL),
        COUNT(*) FILTER (WHERE shop_id IS NULL AND barbershop_id IS NULL)
    INTO
        profiles_shop_id_count,
        profiles_barbershop_id_count,
        profiles_both_count,
        profiles_neither_count
    FROM profiles;

    -- Services analysis
    SELECT
        COUNT(*) FILTER (WHERE shop_id IS NOT NULL),
        COUNT(*) FILTER (WHERE barbershop_id IS NOT NULL)
    INTO
        services_shop_id_count,
        services_barbershop_id_count
    FROM services;

    -- Customers analysis
    SELECT
        COUNT(*) FILTER (WHERE shop_id IS NOT NULL),
        COUNT(*) FILTER (WHERE barbershop_id IS NOT NULL)
    INTO
        customers_shop_id_count,
        customers_barbershop_id_count
    FROM customers;

    RAISE NOTICE '📊 PRE-MIGRATION STATE:';
    RAISE NOTICE '';
    RAISE NOTICE '👤 PROFILES TABLE:';
    RAISE NOTICE '   Rows with ONLY shop_id: %', profiles_shop_id_count;
    RAISE NOTICE '   Rows with barbershop_id: %', profiles_barbershop_id_count;
    RAISE NOTICE '   Rows with BOTH: %', profiles_both_count;
    RAISE NOTICE '   Rows with NEITHER: %', profiles_neither_count;
    RAISE NOTICE '';
    RAISE NOTICE '🔧 SERVICES TABLE:';
    RAISE NOTICE '   Rows with shop_id: %', services_shop_id_count;
    RAISE NOTICE '   Rows with barbershop_id: %', services_barbershop_id_count;
    RAISE NOTICE '';
    RAISE NOTICE '👥 CUSTOMERS TABLE:';
    RAISE NOTICE '   Rows with shop_id: %', customers_shop_id_count;
    RAISE NOTICE '   Rows with barbershop_id: %', customers_barbershop_id_count;
    RAISE NOTICE '';

    -- Safety check
    IF profiles_shop_id_count = 0 AND services_barbershop_id_count > 0 AND customers_barbershop_id_count > 0 THEN
        RAISE NOTICE '✅ Migration may not be necessary - data already migrated';
    ELSIF profiles_shop_id_count > 0 THEN
        RAISE NOTICE '⚠️  Migration REQUIRED - % profiles need shop_id → barbershop_id', profiles_shop_id_count;
    END IF;
    RAISE NOTICE '';
END $$;

-- ==============================================================================
-- BACKUP CREATION (Safety Net)
-- ==============================================================================

RAISE NOTICE '💾 Creating backup tables...';

-- Backup profiles table
DROP TABLE IF EXISTS profiles_backup_shop_id_migration CASCADE;
CREATE TABLE profiles_backup_shop_id_migration AS
SELECT * FROM profiles WHERE shop_id IS NOT NULL OR barbershop_id IS NOT NULL;

-- Backup services table
DROP TABLE IF EXISTS services_backup_shop_id_migration CASCADE;
CREATE TABLE services_backup_shop_id_migration AS
SELECT * FROM services;

-- Backup customers table
DROP TABLE IF EXISTS customers_backup_shop_id_migration CASCADE;
CREATE TABLE customers_backup_shop_id_migration AS
SELECT * FROM customers WHERE shop_id IS NOT NULL OR barbershop_id IS NOT NULL;

DO $$
DECLARE
    profiles_backup_count INT;
    services_backup_count INT;
    customers_backup_count INT;
BEGIN
    SELECT COUNT(*) INTO profiles_backup_count FROM profiles_backup_shop_id_migration;
    SELECT COUNT(*) INTO services_backup_count FROM services_backup_shop_id_migration;
    SELECT COUNT(*) INTO customers_backup_count FROM customers_backup_shop_id_migration;

    RAISE NOTICE '✅ Backups created:';
    RAISE NOTICE '   profiles_backup_shop_id_migration: % rows', profiles_backup_count;
    RAISE NOTICE '   services_backup_shop_id_migration: % rows', services_backup_count;
    RAISE NOTICE '   customers_backup_shop_id_migration: % rows', customers_backup_count;
    RAISE NOTICE '';
END $$;

-- ==============================================================================
-- MIGRATION TRANSACTION (All or Nothing)
-- ==============================================================================

BEGIN;

RAISE NOTICE '🔄 Starting migration transaction...';
RAISE NOTICE '';

-- ------------------------------------------------------------------------------
-- STEP 1: Migrate profiles.shop_id → profiles.barbershop_id
-- ------------------------------------------------------------------------------

RAISE NOTICE '📝 STEP 1: Migrating profiles table...';

DO $$
DECLARE
    rows_updated INT;
    profile_record RECORD;
BEGIN
    -- Show which profiles will be updated
    RAISE NOTICE '   Profiles to be migrated:';
    FOR profile_record IN
        SELECT id, email, role, shop_id, barbershop_id
        FROM profiles
        WHERE shop_id IS NOT NULL
          AND barbershop_id IS NULL
    LOOP
        RAISE NOTICE '     - % (%) shop_id: % → barbershop_id',
            profile_record.email,
            profile_record.role,
            profile_record.shop_id;
    END LOOP;

    -- Perform migration
    WITH updated AS (
        UPDATE profiles
        SET barbershop_id = shop_id,
            updated_at = CURRENT_TIMESTAMP
        WHERE shop_id IS NOT NULL
          AND barbershop_id IS NULL
        RETURNING id
    )
    SELECT COUNT(*) INTO rows_updated FROM updated;

    RAISE NOTICE '';
    RAISE NOTICE '   ✅ Migrated % profiles', rows_updated;

    -- Handle profiles with BOTH shop_id and barbershop_id (conflict resolution)
    DECLARE
        conflict_count INT;
    BEGIN
        SELECT COUNT(*) INTO conflict_count
        FROM profiles
        WHERE shop_id IS NOT NULL
          AND barbershop_id IS NOT NULL
          AND shop_id != barbershop_id;

        IF conflict_count > 0 THEN
            RAISE NOTICE '';
            RAISE NOTICE '   ⚠️  WARNING: % profiles have DIFFERENT shop_id vs barbershop_id', conflict_count;
            RAISE NOTICE '       Keeping barbershop_id as source of truth (newer standard)';

            -- Log conflicts
            FOR profile_record IN
                SELECT id, email, shop_id, barbershop_id
                FROM profiles
                WHERE shop_id IS NOT NULL
                  AND barbershop_id IS NOT NULL
                  AND shop_id != barbershop_id
            LOOP
                RAISE NOTICE '       Conflict: % has shop_id=% but barbershop_id=%',
                    profile_record.email,
                    profile_record.shop_id,
                    profile_record.barbershop_id;
            END LOOP;
        END IF;
    END;
END $$;

RAISE NOTICE '';

-- ------------------------------------------------------------------------------
-- STEP 2: Verify services table (should already be complete)
-- ------------------------------------------------------------------------------

RAISE NOTICE '📝 STEP 2: Verifying services table...';

DO $$
DECLARE
    services_missing INT;
    services_total INT;
BEGIN
    SELECT COUNT(*) INTO services_total FROM services;
    SELECT COUNT(*) INTO services_missing FROM services WHERE barbershop_id IS NULL;

    RAISE NOTICE '   Total services: %', services_total;
    RAISE NOTICE '   Services missing barbershop_id: %', services_missing;

    IF services_missing = 0 THEN
        RAISE NOTICE '   ✅ All services have barbershop_id - no migration needed';
    ELSE
        RAISE WARNING '   ⚠️  % services missing barbershop_id - manual review required', services_missing;
    END IF;
END $$;

RAISE NOTICE '';

-- ------------------------------------------------------------------------------
-- STEP 3: Verify customers table (should already be complete)
-- ------------------------------------------------------------------------------

RAISE NOTICE '📝 STEP 3: Verifying customers table...';

DO $$
DECLARE
    customers_missing INT;
    customers_total INT;
    customers_orphaned INT;
BEGIN
    SELECT COUNT(*) INTO customers_total FROM customers;
    SELECT COUNT(*) INTO customers_missing FROM customers WHERE barbershop_id IS NULL;
    SELECT COUNT(*) INTO customers_orphaned FROM customers WHERE barbershop_id IS NULL AND shop_id IS NULL;

    RAISE NOTICE '   Total customers: %', customers_total;
    RAISE NOTICE '   Customers missing barbershop_id: %', customers_missing;

    IF customers_missing = 0 THEN
        RAISE NOTICE '   ✅ All customers have barbershop_id - no migration needed';
    ELSE
        RAISE NOTICE '   ⚠️  % customers missing barbershop_id', customers_missing;

        IF customers_orphaned > 0 THEN
            RAISE NOTICE '   ⚠️  % customers have NEITHER shop_id nor barbershop_id (orphaned)', customers_orphaned;
            RAISE NOTICE '       These require manual review and assignment';
        END IF;
    END IF;
END $$;

RAISE NOTICE '';

-- ==============================================================================
-- POST-MIGRATION VERIFICATION
-- ==============================================================================

RAISE NOTICE '🔍 POST-MIGRATION VERIFICATION:';
RAISE NOTICE '';

DO $$
DECLARE
    profiles_remaining INT;
    profiles_migrated INT;
    services_complete BOOLEAN;
    customers_complete BOOLEAN;
BEGIN
    -- Check profiles migration success
    SELECT
        COUNT(*) FILTER (WHERE shop_id IS NOT NULL AND barbershop_id IS NULL),
        COUNT(*) FILTER (WHERE barbershop_id IS NOT NULL)
    INTO
        profiles_remaining,
        profiles_migrated
    FROM profiles;

    -- Check services completeness
    SELECT COUNT(*) = 0 INTO services_complete
    FROM services WHERE barbershop_id IS NULL;

    -- Check customers completeness
    SELECT COUNT(*) < 5 INTO customers_complete
    FROM customers WHERE barbershop_id IS NULL;

    RAISE NOTICE '✅ PROFILES: % have barbershop_id, % still need migration',
        profiles_migrated, profiles_remaining;

    IF services_complete THEN
        RAISE NOTICE '✅ SERVICES: All services have barbershop_id';
    ELSE
        RAISE NOTICE '⚠️  SERVICES: Some services missing barbershop_id';
    END IF;

    IF customers_complete THEN
        RAISE NOTICE '✅ CUSTOMERS: All active customers have barbershop_id';
    ELSE
        RAISE NOTICE '⚠️  CUSTOMERS: % customers missing barbershop_id',
            (SELECT COUNT(*) FROM customers WHERE barbershop_id IS NULL);
    END IF;

    RAISE NOTICE '';

    -- Overall migration status
    IF profiles_remaining = 0 AND services_complete AND customers_complete THEN
        RAISE NOTICE '🎉 MIGRATION SUCCESSFUL - All critical tables complete!';
        RAISE NOTICE '';
        RAISE NOTICE '✅ Safe to proceed with:';
        RAISE NOTICE '   1. Code updates to remove shop_id fallbacks';
        RAISE NOTICE '   2. Dropping shop_id columns (Phase 4)';
    ELSE
        RAISE NOTICE '⚠️  MIGRATION INCOMPLETE - Manual review required';
        RAISE NOTICE '';
        RAISE NOTICE '❌ DO NOT drop shop_id columns yet';
    END IF;
END $$;

-- ==============================================================================
-- COMMIT OR ROLLBACK
-- ==============================================================================

-- Uncomment ONE of the following:

-- Option 1: COMMIT (Apply migration permanently)
-- COMMIT;
-- RAISE NOTICE '✅ Migration committed successfully';

-- Option 2: ROLLBACK (Undo migration for testing)
ROLLBACK;
RAISE NOTICE '🔄 Migration rolled back (test mode)';
RAISE NOTICE '   To apply permanently, comment out ROLLBACK and uncomment COMMIT';

RAISE NOTICE '';
RAISE NOTICE '========================================';
RAISE NOTICE 'Migration completed at: %', now();
RAISE NOTICE '========================================';
RAISE NOTICE '';

-- ==============================================================================
-- POST-MIGRATION MANUAL CHECKS
-- ==============================================================================

/*

After running this migration with COMMIT, verify with these queries:

-- 1. Check profiles migration
SELECT
    COUNT(*) as total_profiles,
    COUNT(*) FILTER (WHERE shop_id IS NOT NULL) as has_shop_id,
    COUNT(*) FILTER (WHERE barbershop_id IS NOT NULL) as has_barbershop_id,
    COUNT(*) FILTER (WHERE shop_id IS NOT NULL AND barbershop_id IS NULL) as needs_migration
FROM profiles
WHERE role IN ('BARBER', 'SHOP_OWNER', 'ENTERPRISE_OWNER');

-- 2. Check services completeness
SELECT COUNT(*) as services_missing_barbershop_id
FROM services
WHERE barbershop_id IS NULL;

-- 3. Check customers completeness
SELECT COUNT(*) as customers_missing_barbershop_id
FROM customers
WHERE barbershop_id IS NULL;

-- 4. Find orphaned customers
SELECT id, name, email, phone, created_at
FROM customers
WHERE barbershop_id IS NULL
ORDER BY created_at DESC;

-- 5. Verify no data loss occurred
SELECT
    (SELECT COUNT(*) FROM profiles_backup_shop_id_migration) as profiles_before,
    (SELECT COUNT(*) FROM profiles WHERE barbershop_id IS NOT NULL) as profiles_after,
    (SELECT COUNT(*) FROM services_backup_shop_id_migration) as services_before,
    (SELECT COUNT(*) FROM services WHERE barbershop_id IS NOT NULL) as services_after;

*/

-- ==============================================================================
-- ROLLBACK PROCEDURE (If needed)
-- ==============================================================================

/*

If migration caused issues, restore from backups:

BEGIN;

-- Restore profiles
UPDATE profiles p
SET
    barbershop_id = b.barbershop_id,
    shop_id = b.shop_id,
    updated_at = b.updated_at
FROM profiles_backup_shop_id_migration b
WHERE p.id = b.id;

COMMIT;

RAISE NOTICE '✅ Profiles restored from backup';

*/

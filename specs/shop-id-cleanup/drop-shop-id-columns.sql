-- ============================================================================
-- DROP SHOP_ID COLUMNS - FINAL MIGRATION STEP
-- ============================================================================
-- Purpose: Remove deprecated shop_id columns after successful migration
-- Date: 2025-10-10
-- Risk: HIGH - IRREVERSIBLE without backup
-- Prerequisites:
--   1. Run migrate-shop-id-data.sql successfully
--   2. Run validate-migration.sql with all checks passing
--   3. Verify application is using barbershop_id (not shop_id)
--   4. Create database backup before running
-- ============================================================================

-- CRITICAL SAFETY WARNING
DO $$
BEGIN
    RAISE WARNING '========================================';
    RAISE WARNING 'CRITICAL: ABOUT TO DROP SHOP_ID COLUMNS';
    RAISE WARNING '========================================';
    RAISE WARNING 'This operation is IRREVERSIBLE';
    RAISE WARNING 'Data in shop_id columns will be PERMANENTLY DELETED';
    RAISE WARNING '';
    RAISE WARNING 'Prerequisites (verify ALL before proceeding):';
    RAISE WARNING '  [✓] migrate-shop-id-data.sql completed successfully';
    RAISE WARNING '  [✓] validate-migration.sql passed all checks';
    RAISE WARNING '  [✓] Database backup created';
    RAISE WARNING '  [✓] Application code updated to use barbershop_id';
    RAISE WARNING '  [✓] No active transactions using shop_id';
    RAISE WARNING '';
    RAISE WARNING 'If you are NOT 100%% certain, STOP NOW';
    RAISE WARNING '========================================';
END $$;

-- ============================================================================
-- SAFETY CHECK 1: Verify migration completed successfully
-- ============================================================================

DO $$
DECLARE
    orphaned_count INT;
    invalid_fk_count INT;
    mismatch_count INT;
    total_issues INT;
BEGIN
    RAISE NOTICE 'Running pre-drop safety checks...';

    -- Count orphaned shop_id records
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

    -- Count invalid foreign keys
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

    -- Count data mismatches
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

    RAISE NOTICE 'Safety check results:';
    RAISE NOTICE '  Orphaned shop_id records: %', COALESCE(orphaned_count, 0);
    RAISE NOTICE '  Invalid foreign keys: %', COALESCE(invalid_fk_count, 0);
    RAISE NOTICE '  Data mismatches: %', COALESCE(mismatch_count, 0);
    RAISE NOTICE '  TOTAL ISSUES: %', total_issues;

    IF total_issues > 0 THEN
        RAISE EXCEPTION 'ABORT: Migration validation failed. Found % issues. Fix before dropping columns.', total_issues;
    ELSE
        RAISE NOTICE 'PASS: All safety checks passed';
    END IF;
END $$;

-- ============================================================================
-- SAFETY CHECK 2: Verify foreign key constraints
-- ============================================================================

DO $$
DECLARE
    fk_constraint_count INT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Checking foreign key constraints on shop_id columns...';

    -- Check if any foreign keys exist on shop_id columns (other than profiles.shop_id)
    SELECT COUNT(*) INTO fk_constraint_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'shop_id'
      AND kcu.table_name NOT IN ('profiles', 'user_shop_access_history'); -- These have valid shop_id FKs

    IF fk_constraint_count > 0 THEN
        RAISE WARNING 'Found % unexpected foreign key constraints on shop_id', fk_constraint_count;
        RAISE WARNING 'These will be dropped with the column';
    ELSE
        RAISE NOTICE 'PASS: No unexpected foreign keys on shop_id columns';
    END IF;
END $$;

-- ============================================================================
-- DROP OPERATION 1: PROFILES TABLE
-- ============================================================================
-- Drop profiles.shop_id column and its foreign key constraint
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Dropping profiles.shop_id';
    RAISE NOTICE '========================================';

    -- Drop foreign key constraint first
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'profiles_shop_id_fkey'
          AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles DROP CONSTRAINT profiles_shop_id_fkey;
        RAISE NOTICE 'Dropped constraint: profiles_shop_id_fkey';
    END IF;

    -- Drop column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'shop_id'
    ) THEN
        ALTER TABLE profiles DROP COLUMN shop_id;
        RAISE NOTICE 'SUCCESS: Dropped column profiles.shop_id';
    ELSE
        RAISE NOTICE 'SKIP: profiles.shop_id already dropped';
    END IF;
END $$;

-- ============================================================================
-- DROP OPERATION 2: SERVICES TABLE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Dropping services.shop_id';
    RAISE NOTICE '========================================';

    -- Drop any foreign key constraints (if exist)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'services_shop_id_fkey'
          AND table_name = 'services'
    ) THEN
        ALTER TABLE services DROP CONSTRAINT services_shop_id_fkey;
        RAISE NOTICE 'Dropped constraint: services_shop_id_fkey';
    END IF;

    -- Drop column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'services' AND column_name = 'shop_id'
    ) THEN
        ALTER TABLE services DROP COLUMN shop_id;
        RAISE NOTICE 'SUCCESS: Dropped column services.shop_id';
    ELSE
        RAISE NOTICE 'SKIP: services.shop_id already dropped';
    END IF;
END $$;

-- ============================================================================
-- DROP OPERATION 3: CUSTOMERS TABLE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Dropping customers.shop_id';
    RAISE NOTICE '========================================';

    -- Drop column (no foreign key constraint exists)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customers' AND column_name = 'shop_id'
    ) THEN
        ALTER TABLE customers DROP COLUMN shop_id;
        RAISE NOTICE 'SUCCESS: Dropped column customers.shop_id';
    ELSE
        RAISE NOTICE 'SKIP: customers.shop_id already dropped';
    END IF;
END $$;

-- ============================================================================
-- DROP OPERATION 4: APPOINTMENT_RECORDS TABLE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Dropping appointment_records.shop_id';
    RAISE NOTICE '========================================';

    -- Drop column (no data, no foreign key)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'appointment_records' AND column_name = 'shop_id'
    ) THEN
        ALTER TABLE appointment_records DROP COLUMN shop_id;
        RAISE NOTICE 'SUCCESS: Dropped column appointment_records.shop_id';
    ELSE
        RAISE NOTICE 'SKIP: appointment_records.shop_id already dropped';
    END IF;
END $$;

-- ============================================================================
-- DROP OPERATION 5: CUSTOMERS_BACKUP TABLE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Dropping customers_backup.shop_id';
    RAISE NOTICE '========================================';

    -- Drop column (backup table, no constraints)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customers_backup' AND column_name = 'shop_id'
    ) THEN
        ALTER TABLE customers_backup DROP COLUMN shop_id;
        RAISE NOTICE 'SUCCESS: Dropped column customers_backup.shop_id';
    ELSE
        RAISE NOTICE 'SKIP: customers_backup.shop_id already dropped';
    END IF;
END $$;

-- ============================================================================
-- SPECIAL CASE: TABLES WITH SHOP_ID ONLY (NOT TO BE DROPPED)
-- ============================================================================
-- These tables intentionally keep shop_id:
--   - barbers.shop_id (TEXT, 8 rows) - Keep for legacy compatibility
--   - inventory.shop_id (UUID, 0 rows) - Consider adding barbershop_id instead
--   - invoice_history.shop_id (UUID, 0 rows) - Consider adding barbershop_id instead
--   - payout_history.shop_id (UUID, 0 rows) - Consider adding barbershop_id instead
--   - user_shop_access_history.shop_id (UUID, 2 rows, has FK) - Keep for audit trail
--   - production_barbers (VIEW) - Will be handled separately
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TABLES WITH shop_id ONLY (NOT DROPPED)';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'The following tables keep shop_id:';
    RAISE NOTICE '  - barbers (TEXT, 8 rows) - Legacy compatibility';
    RAISE NOTICE '  - inventory (UUID, 0 rows) - Consider migration';
    RAISE NOTICE '  - invoice_history (UUID, 0 rows) - Consider migration';
    RAISE NOTICE '  - payout_history (UUID, 0 rows) - Consider migration';
    RAISE NOTICE '  - user_shop_access_history (UUID, 2 rows) - Audit trail';
    RAISE NOTICE '';
    RAISE NOTICE 'RECOMMENDATION: Consider migrating these tables';
    RAISE NOTICE 'in a future migration for complete consistency.';
END $$;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

DO $$
DECLARE
    remaining_shop_id_count INT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FINAL VERIFICATION';
    RAISE NOTICE '========================================';

    -- Count remaining tables with shop_id column
    SELECT COUNT(*) INTO remaining_shop_id_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'shop_id'
      AND table_name IN ('profiles', 'services', 'customers',
                         'appointment_records', 'customers_backup');

    IF remaining_shop_id_count = 0 THEN
        RAISE NOTICE 'SUCCESS: All targeted shop_id columns dropped';
    ELSE
        RAISE WARNING 'WARNING: % shop_id columns still exist', remaining_shop_id_count;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '  - profiles.shop_id: DROPPED';
    RAISE NOTICE '  - services.shop_id: DROPPED';
    RAISE NOTICE '  - customers.shop_id: DROPPED';
    RAISE NOTICE '  - appointment_records.shop_id: DROPPED';
    RAISE NOTICE '  - customers_backup.shop_id: DROPPED';
    RAISE NOTICE '';
    RAISE NOTICE 'Remaining shop_id columns (intentional):';
    RAISE NOTICE '  - barbers.shop_id (legacy compatibility)';
    RAISE NOTICE '  - inventory.shop_id (consider future migration)';
    RAISE NOTICE '  - invoice_history.shop_id (consider future migration)';
    RAISE NOTICE '  - payout_history.shop_id (consider future migration)';
    RAISE NOTICE '  - user_shop_access_history.shop_id (audit trail)';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SHOP_ID COLUMN DROP COMPLETE';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- POST-MIGRATION RECOMMENDATIONS
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Verify application still functions correctly';
    RAISE NOTICE '  2. Monitor error logs for shop_id references';
    RAISE NOTICE '  3. Update application code to remove shop_id references';
    RAISE NOTICE '  4. Consider migrating remaining shop_id tables:';
    RAISE NOTICE '     - inventory, invoice_history, payout_history';
    RAISE NOTICE '  5. Update API documentation';
    RAISE NOTICE '  6. Archive migration scripts for reference';
    RAISE NOTICE '';
    RAISE NOTICE 'Migration completed successfully!';
END $$;

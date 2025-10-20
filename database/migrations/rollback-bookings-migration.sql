-- ============================================================================
-- ROLLBACK SCRIPT: Undo bookings → appointments migration
-- ============================================================================
-- Purpose: Safely rollback the migration if something goes wrong
-- Safety: Uses backup table to restore original state
-- Date: 2025-10-20
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '⚠️  ROLLBACK INITIATED';
  RAISE NOTICE '⚠️  This will remove all migrated bookings from appointments table';
  RAISE NOTICE '';
END $$;

-- STEP 1: Verify backup exists
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bookings_backup_20251020') THEN
    RAISE EXCEPTION '❌ Backup table bookings_backup_20251020 not found. Cannot rollback.';
  END IF;

  RAISE NOTICE '✅ Backup table found. Proceeding with rollback...';
END $$;

-- STEP 2: Count what will be removed
-- ============================================================================

DO $$
DECLARE
  migration_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migration_count
  FROM appointments
  WHERE booking_source = 'legacy_migration';

  RAISE NOTICE '📊 Records to be removed: %', migration_count;
END $$;

-- STEP 3: Remove migrated records from appointments
-- ============================================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM appointments
  WHERE booking_source = 'legacy_migration';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE '✅ Removed % migrated records from appointments', deleted_count;
END $$;

-- STEP 4: Restore original bookings table (if needed)
-- ============================================================================

DO $$
DECLARE
  original_count INTEGER;
  current_count INTEGER;
BEGIN
  -- Check current bookings count
  SELECT COUNT(*) INTO current_count FROM bookings;
  SELECT COUNT(*) INTO original_count FROM bookings_backup_20251020;

  IF current_count < original_count THEN
    RAISE NOTICE '⚠️  Bookings table has fewer records than backup. Restoring...';

    -- Restore missing records
    INSERT INTO bookings
    SELECT * FROM bookings_backup_20251020
    WHERE id NOT IN (SELECT id FROM bookings)
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE '✅ Restored bookings table from backup';
  ELSE
    RAISE NOTICE '✅ Bookings table intact, no restoration needed';
  END IF;
END $$;

-- STEP 5: Verification
-- ============================================================================

DO $$
DECLARE
  remaining_migrations INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_migrations
  FROM appointments
  WHERE booking_source = 'legacy_migration';

  IF remaining_migrations > 0 THEN
    RAISE NOTICE '⚠️  WARNING: % migration records still remain', remaining_migrations;
  ELSE
    RAISE NOTICE '✅ All migration records successfully removed';
  END IF;
END $$;

-- STEP 6: Clean up migration view
-- ============================================================================

DROP VIEW IF EXISTS migration_summary_20251020;

RAISE NOTICE '🎉 ROLLBACK COMPLETE';
RAISE NOTICE '';
RAISE NOTICE '📋 Next Steps:';
RAISE NOTICE '   1. Verify bookings table is intact';
RAISE NOTICE '   2. Review appointments table';
RAISE NOTICE '   3. Backup table still exists: bookings_backup_20251020';
RAISE NOTICE '';

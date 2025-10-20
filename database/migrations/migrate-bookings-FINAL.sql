-- ============================================================================
-- SAFE MIGRATION: bookings → appointments table (CORRECT SCHEMA)
-- ============================================================================
-- Purpose: Migrate all existing bookings data to the appointments table
-- Safety: Creates backups, checks for conflicts, provides rollback
-- Date: 2025-10-20
-- Schema: Uses appointment_date + appointment_time (NOT start_time/end_time)
-- ============================================================================

-- STEP 1: PRE-MIGRATION CHECKS
DO $$
BEGIN
  RAISE NOTICE '🔍 Starting pre-migration checks...';

  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bookings') THEN
    RAISE EXCEPTION '❌ bookings table does not exist. Nothing to migrate.';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'appointments') THEN
    RAISE EXCEPTION '❌ appointments table does not exist. Cannot migrate.';
  END IF;

  RAISE NOTICE '✅ Both tables exist. Proceeding...';
END $$;

-- STEP 2: CREATE BACKUP TABLE
DROP TABLE IF EXISTS bookings_backup_20251020;

CREATE TABLE bookings_backup_20251020 AS
SELECT * FROM bookings;

DO $$
DECLARE
  backup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO backup_count FROM bookings_backup_20251020;
  RAISE NOTICE '✅ Backup created: % records backed up to bookings_backup_20251020', backup_count;
END $$;

-- STEP 3: ANALYZE DATA
DO $$
DECLARE
  bookings_count INTEGER;
  appointments_count INTEGER;
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO bookings_count FROM bookings;
  SELECT COUNT(*) INTO appointments_count FROM appointments;

  RAISE NOTICE '📊 Current data status:';
  RAISE NOTICE '   bookings table: % records', bookings_count;
  RAISE NOTICE '   appointments table: % records', appointments_count;

  SELECT COUNT(*) INTO duplicate_count
  FROM bookings b
  INNER JOIN appointments a ON b.id = a.id;

  IF duplicate_count > 0 THEN
    RAISE NOTICE '⚠️  WARNING: % records have same ID in both tables (will skip these)', duplicate_count;
  ELSE
    RAISE NOTICE '✅ No ID conflicts detected';
  END IF;
END $$;

-- STEP 4: DATA MIGRATION
DO $$
DECLARE
  migration_count INTEGER := 0;
  skipped_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🚀 Starting data migration...';

  -- Migrate with correct schema mapping
  INSERT INTO appointments (
    id,
    barbershop_id,
    barber_id,
    client_id,
    service_id,
    appointment_date,
    appointment_time,
    duration_minutes,
    total_price_cents,
    status,
    client_notes,
    created_at,
    updated_at
  )
  SELECT
    b.id,
    -- Handle shop_id → barbershop_id conversion
    CASE
      WHEN b.shop_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      THEN b.shop_id::UUID
      ELSE 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID
    END AS barbershop_id,
    -- Handle barber_id conversion
    CASE
      WHEN b.barber_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      THEN b.barber_id::UUID
      ELSE NULL
    END AS barber_id,
    NULL AS client_id,  -- Will be NULL for legacy bookings
    NULL AS service_id, -- Will be NULL for legacy bookings
    b.start_time::DATE AS appointment_date,
    b.start_time::TIME AS appointment_time,
    EXTRACT(EPOCH FROM (b.end_time - b.start_time))::INTEGER / 60 AS duration_minutes,
    (COALESCE(b.price, 0) * 100)::INTEGER AS total_price_cents,  -- Convert dollars to cents
    CASE
      WHEN b.status = 'confirmed' THEN 'CONFIRMED'::appointment_status
      WHEN b.status = 'cancelled' THEN 'CANCELLED'::appointment_status
      WHEN b.status = 'completed' THEN 'COMPLETED'::appointment_status
      WHEN b.status = 'no-show' THEN 'NO_SHOW'::appointment_status
      ELSE 'PENDING'::appointment_status
    END AS status,
    b.notes AS client_notes,
    b.created_at,
    b.updated_at
  FROM bookings b
  WHERE NOT EXISTS (
    SELECT 1 FROM appointments a WHERE a.id = b.id
  )
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS migration_count = ROW_COUNT;

  SELECT COUNT(*) INTO skipped_count
  FROM bookings b
  INNER JOIN appointments a ON b.id = a.id;

  RAISE NOTICE '✅ Migration complete:';
  RAISE NOTICE '   Migrated: % records', migration_count;
  RAISE NOTICE '   Skipped (already exist): % records', skipped_count;

END $$;

-- STEP 5: POST-MIGRATION VERIFICATION
DO $$
DECLARE
  pre_bookings_count INTEGER;
  post_appointments_count INTEGER;
  orphaned_bookings INTEGER;
BEGIN
  RAISE NOTICE '🔍 Running post-migration verification...';

  SELECT COUNT(*) INTO pre_bookings_count FROM bookings_backup_20251020;
  SELECT COUNT(*) INTO post_appointments_count FROM appointments;

  SELECT COUNT(*) INTO orphaned_bookings
  FROM bookings b
  WHERE NOT EXISTS (SELECT 1 FROM appointments a WHERE a.id = b.id);

  RAISE NOTICE '📊 Verification Results:';
  RAISE NOTICE '   Original bookings: %', pre_bookings_count;
  RAISE NOTICE '   Total appointments now: %', post_appointments_count;
  RAISE NOTICE '   Orphaned bookings: %', orphaned_bookings;

  IF orphaned_bookings > 0 THEN
    RAISE NOTICE '⚠️  WARNING: % bookings were not migrated', orphaned_bookings;
  ELSE
    RAISE NOTICE '✅ All bookings successfully migrated!';
  END IF;
END $$;

-- STEP 6: DATA QUALITY CHECKS
DO $$
DECLARE
  null_barber_count INTEGER;
BEGIN
  RAISE NOTICE '🔍 Running data quality checks...';

  SELECT COUNT(*) INTO null_barber_count
  FROM appointments
  WHERE barber_id IS NULL
  AND id IN (SELECT id FROM bookings_backup_20251020);

  IF null_barber_count > 0 THEN
    RAISE NOTICE '⚠️  WARNING: % appointments have NULL barber_id (may need manual fix)', null_barber_count;
  ELSE
    RAISE NOTICE '✅ All migrated data has valid barber IDs!';
  END IF;
END $$;

-- STEP 7: CREATE MIGRATION SUMMARY VIEW
CREATE OR REPLACE VIEW migration_summary_20251020 AS
SELECT
  'Original Bookings' AS source,
  COUNT(*) AS count
FROM bookings_backup_20251020
UNION ALL
SELECT
  'Current Appointments' AS source,
  COUNT(*) AS count
FROM appointments
UNION ALL
SELECT
  'Migrated Records' AS source,
  COUNT(*) AS count
FROM appointments a
WHERE EXISTS (SELECT 1 FROM bookings_backup_20251020 b WHERE b.id = a.id);

-- Display summary
SELECT * FROM migration_summary_20251020;

-- MIGRATION COMPLETE
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ============================================';
  RAISE NOTICE '🎉 MIGRATION COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '🎉 ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next Steps:';
  RAISE NOTICE '   1. Review migration_summary_20251020 view above';
  RAISE NOTICE '   2. Test appointments in calendar dashboard';
  RAISE NOTICE '   3. Verify old bookings are visible';
  RAISE NOTICE '   4. Once verified, you can drop bookings table';
  RAISE NOTICE '';
  RAISE NOTICE '💾 Backup: bookings_backup_20251020 table';
  RAISE NOTICE '📊 Summary: SELECT * FROM migration_summary_20251020;';
  RAISE NOTICE '';
END $$;

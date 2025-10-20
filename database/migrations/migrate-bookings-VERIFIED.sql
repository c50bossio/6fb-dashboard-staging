-- ============================================================================
-- SAFE MIGRATION: bookings → appointments (VERIFIED SCHEMA)
-- ============================================================================
-- Date: 2025-10-20
-- Schema: Verified against live database query - ONLY uses existing columns
-- Columns verified: 26 total columns in appointments table
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

-- STEP 2: CREATE BACKUP
DROP TABLE IF EXISTS bookings_backup_20251020;
CREATE TABLE bookings_backup_20251020 AS SELECT * FROM bookings;

DO $$
DECLARE backup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO backup_count FROM bookings_backup_20251020;
  RAISE NOTICE '✅ Backup created: % records', backup_count;
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

  RAISE NOTICE '📊 Current data:';
  RAISE NOTICE '   bookings: % records', bookings_count;
  RAISE NOTICE '   appointments: % records', appointments_count;

  SELECT COUNT(*) INTO duplicate_count
  FROM bookings b
  INNER JOIN appointments a ON b.id = a.id;

  IF duplicate_count > 0 THEN
    RAISE NOTICE '⚠️  % records already exist (will skip)', duplicate_count;
  ELSE
    RAISE NOTICE '✅ No conflicts';
  END IF;
END $$;

-- STEP 4: MIGRATE DATA (ONLY EXISTING COLUMNS)
DO $$
DECLARE
  migration_count INTEGER := 0;
  skipped_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🚀 Migrating data...';

  -- Insert ONLY columns that exist in appointments table
  INSERT INTO appointments (
    id,
    barbershop_id,
    barber_id,
    client_id,
    service_id,
    scheduled_at,
    duration_minutes,
    price,
    status,
    notes,
    client_name,
    client_phone,
    client_email,
    service_price,
    total_amount,
    is_test,
    created_at,
    updated_at
  )
  SELECT
    b.id,
    b.barbershop_id,
    -- Handle barber_id UUID conversion
    CASE
      WHEN b.barber_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      THEN b.barber_id::UUID
      ELSE NULL
    END AS barber_id,
    NULL AS client_id,
    b.service_id,
    b.scheduled_at,
    b.duration_minutes,
    b.price,
    b.status,
    b.notes,
    b.customer_name AS client_name,
    b.customer_phone AS client_phone,
    b.customer_email AS client_email,
    b.price AS service_price,
    b.price AS total_amount,
    false AS is_test,
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
  WHERE EXISTS (SELECT 1 FROM appointments a WHERE a.id = b.id);

  RAISE NOTICE '✅ Migration complete:';
  RAISE NOTICE '   Migrated: % records', migration_count;
  RAISE NOTICE '   Skipped: % records', skipped_count;
END $$;

-- STEP 5: VERIFY
DO $$
DECLARE
  pre_count INTEGER;
  post_count INTEGER;
  orphaned INTEGER;
BEGIN
  RAISE NOTICE '🔍 Verification...';

  SELECT COUNT(*) INTO pre_count FROM bookings_backup_20251020;
  SELECT COUNT(*) INTO post_count FROM appointments;
  SELECT COUNT(*) INTO orphaned
  FROM bookings b
  WHERE NOT EXISTS (SELECT 1 FROM appointments a WHERE a.id = b.id);

  RAISE NOTICE '📊 Results:';
  RAISE NOTICE '   Original bookings: %', pre_count;
  RAISE NOTICE '   Total appointments: %', post_count;
  RAISE NOTICE '   Orphaned: %', orphaned;

  IF orphaned = 0 THEN
    RAISE NOTICE '✅ All bookings migrated!';
  ELSE
    RAISE NOTICE '⚠️  % bookings not migrated', orphaned;
  END IF;
END $$;

-- STEP 6: SUMMARY
CREATE OR REPLACE VIEW migration_summary_20251020 AS
SELECT 'Original Bookings' AS source, COUNT(*) AS count FROM bookings_backup_20251020
UNION ALL
SELECT 'Current Appointments', COUNT(*) FROM appointments
UNION ALL
SELECT 'Migrated Records', COUNT(*) FROM appointments a
WHERE EXISTS (SELECT 1 FROM bookings_backup_20251020 b WHERE b.id = a.id);

SELECT * FROM migration_summary_20251020;

-- COMPLETE
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ==========================================';
  RAISE NOTICE '🎉 MIGRATION COMPLETED!';
  RAISE NOTICE '🎉 ==========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next: Test calendar dashboard';
  RAISE NOTICE '💾 Backup: bookings_backup_20251020';
  RAISE NOTICE '📊 Summary: SELECT * FROM migration_summary_20251020;';
  RAISE NOTICE '';
END $$;

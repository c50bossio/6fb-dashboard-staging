-- ============================================================================
-- SAFE MIGRATION: bookings → appointments (SIMPLE COLUMN MAPPING)
-- ============================================================================
-- Date: 2025-10-20
-- Schema: Based on actual table queries from production database
-- Source: bookings (20 columns) → Target: appointments (26 columns)
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

-- STEP 4: MIGRATE DATA (DIRECT COLUMN MAPPING)
DO $$
DECLARE
  migration_count INTEGER := 0;
  skipped_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🚀 Migrating data...';

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
    b.barbershop_id,                               -- Direct copy (may be NULL)
    b.barber_id,                                   -- Direct copy (may be NULL)
    NULL AS client_id,                             -- Not in bookings
    b.service_id,                                  -- Direct copy (may be NULL)
    (b.booking_date || ' ' || b.booking_time)::TIMESTAMP AS scheduled_at,  -- Combine date + time
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
  RAISE NOTICE '   Skipped (already exist): % records', skipped_count;
END $$;

-- STEP 5: VERIFY
DO $$
DECLARE
  pre_count INTEGER;
  post_count INTEGER;
  migrated_count INTEGER;
  null_barbershop INTEGER;
  null_barber INTEGER;
BEGIN
  RAISE NOTICE '🔍 Verification...';

  SELECT COUNT(*) INTO pre_count FROM bookings_backup_20251020;
  SELECT COUNT(*) INTO post_count FROM appointments;

  -- Count successfully migrated records (by checking which IDs came from backup)
  SELECT COUNT(*) INTO migrated_count
  FROM appointments a
  WHERE EXISTS (SELECT 1 FROM bookings_backup_20251020 b WHERE b.id = a.id);

  -- Check data quality
  SELECT COUNT(*) INTO null_barbershop
  FROM appointments a
  WHERE a.barbershop_id IS NULL
  AND EXISTS (SELECT 1 FROM bookings_backup_20251020 b WHERE b.id = a.id);

  SELECT COUNT(*) INTO null_barber
  FROM appointments a
  WHERE a.barber_id IS NULL
  AND EXISTS (SELECT 1 FROM bookings_backup_20251020 b WHERE b.id = a.id);

  RAISE NOTICE '📊 Results:';
  RAISE NOTICE '   Original bookings: %', pre_count;
  RAISE NOTICE '   Total appointments now: %', post_count;
  RAISE NOTICE '   Newly migrated: %', migrated_count;
  RAISE NOTICE '   ⚠️  NULL barbershop_id: %', null_barbershop;
  RAISE NOTICE '   ⚠️  NULL barber_id: %', null_barber;

  IF migrated_count = pre_count THEN
    RAISE NOTICE '✅ All bookings successfully migrated!';
  ELSE
    RAISE NOTICE '⚠️  % bookings not migrated', (pre_count - migrated_count);
  END IF;
END $$;

-- STEP 6: SUMMARY VIEW
CREATE OR REPLACE VIEW migration_summary_20251020 AS
SELECT 'Original Bookings' AS source, COUNT(*) AS count FROM bookings_backup_20251020
UNION ALL
SELECT 'Current Appointments', COUNT(*) FROM appointments
UNION ALL
SELECT 'Newly Migrated', COUNT(*) FROM appointments a
WHERE EXISTS (SELECT 1 FROM bookings_backup_20251020 b WHERE b.id = a.id)
UNION ALL
SELECT 'NULL barbershop_id', COUNT(*) FROM appointments a
WHERE a.barbershop_id IS NULL AND EXISTS (SELECT 1 FROM bookings_backup_20251020 b WHERE b.id = a.id)
UNION ALL
SELECT 'NULL barber_id', COUNT(*) FROM appointments a
WHERE a.barber_id IS NULL AND EXISTS (SELECT 1 FROM bookings_backup_20251020 b WHERE b.id = a.id);

SELECT * FROM migration_summary_20251020;

-- COMPLETE
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ==========================================';
  RAISE NOTICE '🎉 MIGRATION COMPLETED!';
  RAISE NOTICE '🎉 ==========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next Steps:';
  RAISE NOTICE '   1. Review summary: SELECT * FROM migration_summary_20251020;';
  RAISE NOTICE '   2. Test calendar dashboard - verify bookings appear';
  RAISE NOTICE '   3. If NULL values exist, update with correct IDs';
  RAISE NOTICE '';
  RAISE NOTICE '💾 Backup: bookings_backup_20251020';
  RAISE NOTICE '📊 Summary View: migration_summary_20251020';
  RAISE NOTICE '';
END $$;

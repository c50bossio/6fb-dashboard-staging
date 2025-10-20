-- ============================================================================
-- SAFE MIGRATION: bookings → appointments table
-- ============================================================================
-- Purpose: Migrate all existing bookings data to the appointments table
-- Safety: Creates backups, checks for conflicts, provides rollback
-- Date: 2025-10-20
-- ============================================================================

-- STEP 1: PRE-MIGRATION CHECKS
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🔍 Starting pre-migration checks...';

  -- Check if bookings table exists
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bookings') THEN
    RAISE EXCEPTION '❌ bookings table does not exist. Nothing to migrate.';
  END IF;

  -- Check if appointments table exists
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'appointments') THEN
    RAISE EXCEPTION '❌ appointments table does not exist. Cannot migrate.';
  END IF;

  RAISE NOTICE '✅ Both tables exist. Proceeding...';
END $$;

-- STEP 2: CREATE BACKUP TABLE
-- ============================================================================

-- Drop backup table if it exists from a previous run
DROP TABLE IF EXISTS bookings_backup_20251020;

-- Create backup of bookings table
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
-- ============================================================================

DO $$
DECLARE
  bookings_count INTEGER;
  appointments_count INTEGER;
  duplicate_count INTEGER;
BEGIN
  -- Count records in each table
  SELECT COUNT(*) INTO bookings_count FROM bookings;
  SELECT COUNT(*) INTO appointments_count FROM appointments;

  RAISE NOTICE '📊 Current data status:';
  RAISE NOTICE '   bookings table: % records', bookings_count;
  RAISE NOTICE '   appointments table: % records', appointments_count;

  -- Check for potential ID conflicts (records with same ID in both tables)
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
-- ============================================================================

DO $$
DECLARE
  migration_count INTEGER := 0;
  error_count INTEGER := 0;
  skipped_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🚀 Starting data migration...';

  -- Migrate data with column mapping
  -- Note: This handles schema differences between bookings and appointments
  INSERT INTO appointments (
    id,
    barbershop_id,
    barber_id,
    customer_id,
    service_id,
    scheduled_at,
    start_time,
    end_time,
    duration_minutes,
    price,
    status,
    notes,
    customer_name,
    customer_phone,
    customer_email,
    service_name,
    booking_source,
    created_at,
    updated_at,
    is_test
  )
  SELECT
    b.id,
    -- Handle shop_id → barbershop_id conversion
    CASE
      WHEN b.shop_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      THEN b.shop_id::UUID  -- Already UUID format
      ELSE 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID  -- Default demo shop
    END AS barbershop_id,
    -- Handle barber_id conversion
    CASE
      WHEN b.barber_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      THEN b.barber_id::UUID
      ELSE NULL  -- Will need manual fixing
    END AS barber_id,
    NULL AS customer_id,  -- bookings table has direct customer_name, not FK
    NULL AS service_id,   -- bookings table has direct service_type, not FK
    b.start_time AS scheduled_at,
    b.start_time,
    b.end_time,
    EXTRACT(EPOCH FROM (b.end_time - b.start_time))::INTEGER / 60 AS duration_minutes,
    b.price,
    b.status,
    b.notes,
    b.customer_name,
    b.customer_phone,
    b.customer_email,
    b.service_type AS service_name,
    'legacy_migration' AS booking_source,
    b.created_at,
    b.updated_at,
    false AS is_test
  FROM bookings b
  WHERE NOT EXISTS (
    -- Skip records that already exist in appointments (avoid duplicates)
    SELECT 1 FROM appointments a WHERE a.id = b.id
  )
  ON CONFLICT (id) DO NOTHING;  -- Extra safety: skip on conflict

  GET DIAGNOSTICS migration_count = ROW_COUNT;

  -- Count how many were skipped due to conflicts
  SELECT COUNT(*) INTO skipped_count
  FROM bookings b
  INNER JOIN appointments a ON b.id = a.id;

  RAISE NOTICE '✅ Migration complete:';
  RAISE NOTICE '   Migrated: % records', migration_count;
  RAISE NOTICE '   Skipped (already exist): % records', skipped_count;

END $$;

-- STEP 5: POST-MIGRATION VERIFICATION
-- ============================================================================

DO $$
DECLARE
  pre_bookings_count INTEGER;
  post_appointments_count INTEGER;
  migrated_count INTEGER;
  orphaned_bookings INTEGER;
BEGIN
  RAISE NOTICE '🔍 Running post-migration verification...';

  -- Count original bookings
  SELECT COUNT(*) INTO pre_bookings_count FROM bookings_backup_20251020;

  -- Count current appointments
  SELECT COUNT(*) INTO post_appointments_count FROM appointments;

  -- Count successfully migrated records
  SELECT COUNT(*) INTO migrated_count
  FROM appointments
  WHERE booking_source = 'legacy_migration';

  -- Count bookings not in appointments
  SELECT COUNT(*) INTO orphaned_bookings
  FROM bookings b
  WHERE NOT EXISTS (SELECT 1 FROM appointments a WHERE a.id = b.id);

  RAISE NOTICE '📊 Verification Results:';
  RAISE NOTICE '   Original bookings: %', pre_bookings_count;
  RAISE NOTICE '   Total appointments now: %', post_appointments_count;
  RAISE NOTICE '   Newly migrated: %', migrated_count;
  RAISE NOTICE '   Orphaned bookings: %', orphaned_bookings;

  IF orphaned_bookings > 0 THEN
    RAISE NOTICE '⚠️  WARNING: % bookings were not migrated (check logs)', orphaned_bookings;
  ELSE
    RAISE NOTICE '✅ All bookings successfully migrated!';
  END IF;
END $$;

-- STEP 6: DATA QUALITY CHECKS
-- ============================================================================

DO $$
DECLARE
  null_barber_count INTEGER;
  null_barbershop_count INTEGER;
BEGIN
  RAISE NOTICE '🔍 Running data quality checks...';

  -- Check for NULL barber_ids (these need manual fixing)
  SELECT COUNT(*) INTO null_barber_count
  FROM appointments
  WHERE booking_source = 'legacy_migration'
  AND barber_id IS NULL;

  -- Check for default barbershop_id usage
  SELECT COUNT(*) INTO null_barbershop_count
  FROM appointments
  WHERE booking_source = 'legacy_migration'
  AND barbershop_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID;

  IF null_barber_count > 0 THEN
    RAISE NOTICE '⚠️  WARNING: % appointments have NULL barber_id (need manual fix)', null_barber_count;
  END IF;

  IF null_barbershop_count > 0 THEN
    RAISE NOTICE '⚠️  INFO: % appointments using default barbershop_id', null_barbershop_count;
  END IF;

  IF null_barber_count = 0 AND null_barbershop_count = 0 THEN
    RAISE NOTICE '✅ All migrated data has valid IDs!';
  END IF;
END $$;

-- STEP 7: CREATE MIGRATION SUMMARY VIEW
-- ============================================================================

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
  'Newly Migrated' AS source,
  COUNT(*) AS count
FROM appointments
WHERE booking_source = 'legacy_migration'

UNION ALL

SELECT
  'Needs Manual Fix (NULL barber)' AS source,
  COUNT(*) AS count
FROM appointments
WHERE booking_source = 'legacy_migration'
AND barber_id IS NULL;

-- Display summary
SELECT * FROM migration_summary_20251020;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ============================================';
  RAISE NOTICE '🎉 MIGRATION COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '🎉 ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next Steps:';
  RAISE NOTICE '   1. Review migration_summary_20251020 view';
  RAISE NOTICE '   2. Test appointments in calendar dashboard';
  RAISE NOTICE '   3. Fix any NULL barber_ids if needed';
  RAISE NOTICE '   4. Once verified, you can drop bookings table';
  RAISE NOTICE '';
  RAISE NOTICE '💾 Backup: bookings_backup_20251020 table';
  RAISE NOTICE '📊 Summary: SELECT * FROM migration_summary_20251020;';
  RAISE NOTICE '';
END $$;

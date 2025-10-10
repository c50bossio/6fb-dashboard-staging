-- Migration: Standardize Recurrence Rule Format
-- Description: Convert all recurrence_rule values to consistent JSON format
-- Date: 2025-10-07
-- Author: Claude Code (AI Assistant)
--
-- This migration addresses format inconsistencies in the recurrence_rule column
-- where some appointments use plain RRule strings while others use JSON objects.
--
-- BEFORE:
--   Plain string: "DTSTART:20251008T100000Z\nFREQ=WEEKLY;COUNT=4"
--   JSON format:  '{"rrule":"...","duration":"PT45M","timezone":"America/Los_Angeles"}'
--
-- AFTER:
--   All use JSON: '{"rrule":"...","duration":"PT45M","timezone":"America/Los_Angeles"}'
--
-- Safety: This migration is REVERSIBLE and includes a rollback function

-- Step 1: Create a backup table for safety
DO $$
BEGIN
  -- Drop backup table if it exists from previous migration attempt
  DROP TABLE IF EXISTS appointments_recurrence_backup;

  -- Create backup of current recurrence rules
  CREATE TABLE appointments_recurrence_backup AS
  SELECT
    id,
    recurrence_rule,
    is_recurring,
    scheduled_at,
    duration_minutes,
    created_at
  FROM appointments
  WHERE is_recurring = true;

  RAISE NOTICE 'Created backup table with % recurring appointments',
    (SELECT COUNT(*) FROM appointments_recurrence_backup);
END $$;

-- Step 2: Create function to detect format type
CREATE OR REPLACE FUNCTION detect_recurrence_format(rule_text TEXT)
RETURNS TEXT AS $$
BEGIN
  -- NULL check
  IF rule_text IS NULL THEN
    RETURN 'null';
  END IF;

  -- Try to parse as JSON
  BEGIN
    PERFORM rule_text::json;
    -- Check if it has the required rrule field
    IF rule_text::json->>'rrule' IS NOT NULL THEN
      RETURN 'json';
    ELSE
      RETURN 'invalid_json';
    END IF;
  EXCEPTION WHEN others THEN
    -- Not valid JSON, check if it's a plain RRule
    IF rule_text LIKE '%FREQ=%' THEN
      RETURN 'legacy';
    ELSE
      RETURN 'invalid';
    END IF;
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 3: Create function to convert legacy format to JSON
CREATE OR REPLACE FUNCTION migrate_legacy_to_json(
  rule_text TEXT,
  default_timezone TEXT DEFAULT 'America/Los_Angeles',
  duration_minutes INTEGER DEFAULT 60
)
RETURNS JSON AS $$
DECLARE
  extracted_timezone TEXT;
  duration_iso TEXT;
  hours INTEGER;
  minutes INTEGER;
BEGIN
  -- Validate input
  IF rule_text IS NULL OR rule_text = '' THEN
    RAISE EXCEPTION 'Cannot migrate null or empty recurrence rule';
  END IF;

  -- Try to extract timezone from TZID parameter
  extracted_timezone := (SELECT regexp_replace(rule_text, '.*TZID=([^:\s]+).*', '\1'));
  IF extracted_timezone = rule_text THEN
    -- No TZID found, use default
    extracted_timezone := default_timezone;
  END IF;

  -- Convert duration_minutes to ISO 8601 format
  hours := duration_minutes / 60;
  minutes := duration_minutes % 60;

  IF hours > 0 AND minutes > 0 THEN
    duration_iso := 'PT' || hours || 'H' || minutes || 'M';
  ELSIF hours > 0 THEN
    duration_iso := 'PT' || hours || 'H';
  ELSE
    duration_iso := 'PT' || minutes || 'M';
  END IF;

  -- Build JSON structure
  RETURN json_build_object(
    'rrule', rule_text,
    'duration', duration_iso,
    'timezone', extracted_timezone
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 4: Analyze current format distribution
DO $$
DECLARE
  total_recurring INTEGER;
  json_format INTEGER;
  legacy_format INTEGER;
  invalid_format INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_recurring
  FROM appointments
  WHERE is_recurring = true;

  SELECT COUNT(*) INTO json_format
  FROM appointments
  WHERE is_recurring = true
    AND detect_recurrence_format(recurrence_rule) = 'json';

  SELECT COUNT(*) INTO legacy_format
  FROM appointments
  WHERE is_recurring = true
    AND detect_recurrence_format(recurrence_rule) = 'legacy';

  SELECT COUNT(*) INTO invalid_format
  FROM appointments
  WHERE is_recurring = true
    AND detect_recurrence_format(recurrence_rule) IN ('null', 'invalid', 'invalid_json');

  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'Recurrence Rule Format Analysis';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'Total recurring appointments: %', total_recurring;
  RAISE NOTICE '  JSON format (no migration needed): %', json_format;
  RAISE NOTICE '  Legacy format (will migrate): %', legacy_format;
  RAISE NOTICE '  Invalid/null (requires manual review): %', invalid_format;
  RAISE NOTICE '═══════════════════════════════════════';
END $$;

-- Step 5: Perform the migration
DO $$
DECLARE
  migration_count INTEGER := 0;
  error_count INTEGER := 0;
  appointment_record RECORD;
  new_json_rule JSON;
BEGIN
  RAISE NOTICE 'Starting recurrence rule migration...';

  -- Loop through all legacy format appointments
  FOR appointment_record IN
    SELECT id, recurrence_rule, duration_minutes, barbershop_id
    FROM appointments
    WHERE is_recurring = true
      AND detect_recurrence_format(recurrence_rule) = 'legacy'
  LOOP
    BEGIN
      -- Convert to JSON format
      new_json_rule := migrate_legacy_to_json(
        appointment_record.recurrence_rule,
        'America/Los_Angeles', -- Default timezone, could be per-barbershop
        COALESCE(appointment_record.duration_minutes, 60)
      );

      -- Update the appointment
      UPDATE appointments
      SET recurrence_rule = new_json_rule::TEXT
      WHERE id = appointment_record.id;

      migration_count := migration_count + 1;

      IF migration_count % 10 = 0 THEN
        RAISE NOTICE '  Migrated % appointments...', migration_count;
      END IF;

    EXCEPTION WHEN others THEN
      error_count := error_count + 1;
      RAISE WARNING 'Failed to migrate appointment %: %', appointment_record.id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'Migration Complete';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'Successfully migrated: %', migration_count;
  RAISE NOTICE 'Errors encountered: %', error_count;
  RAISE NOTICE '═══════════════════════════════════════';
END $$;

-- Step 6: Add validation constraint (optional, for future enforcement)
-- Uncomment this after verifying migration success
/*
ALTER TABLE appointments
ADD CONSTRAINT recurrence_rule_json_format
CHECK (
  is_recurring = false OR
  (
    recurrence_rule IS NOT NULL AND
    recurrence_rule::json->>'rrule' IS NOT NULL AND
    recurrence_rule::json->>'duration' IS NOT NULL AND
    recurrence_rule::json->>'timezone' IS NOT NULL
  )
);

COMMENT ON CONSTRAINT recurrence_rule_json_format ON appointments IS
  'Ensures recurrence_rule is valid JSON with required fields: rrule, duration, timezone';
*/

-- Step 7: Verify migration results
DO $$
DECLARE
  total_recurring INTEGER;
  json_format INTEGER;
  legacy_format INTEGER;
  migration_success_rate NUMERIC;
BEGIN
  SELECT COUNT(*) INTO total_recurring
  FROM appointments
  WHERE is_recurring = true;

  SELECT COUNT(*) INTO json_format
  FROM appointments
  WHERE is_recurring = true
    AND detect_recurrence_format(recurrence_rule) = 'json';

  SELECT COUNT(*) INTO legacy_format
  FROM appointments
  WHERE is_recurring = true
    AND detect_recurrence_format(recurrence_rule) = 'legacy';

  IF total_recurring > 0 THEN
    migration_success_rate := (json_format::NUMERIC / total_recurring) * 100;
  ELSE
    migration_success_rate := 100;
  END IF;

  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'Post-Migration Verification';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'Total recurring appointments: %', total_recurring;
  RAISE NOTICE 'JSON format: % (%.1f%%)', json_format, migration_success_rate;
  RAISE NOTICE 'Legacy format remaining: %', legacy_format;

  IF legacy_format = 0 THEN
    RAISE NOTICE '✓ Migration 100%% successful!';
  ELSE
    RAISE WARNING '⚠ % appointments still in legacy format', legacy_format;
  END IF;
  RAISE NOTICE '═══════════════════════════════════════';
END $$;

-- Step 8: Create rollback function (for emergency use)
CREATE OR REPLACE FUNCTION rollback_recurrence_migration()
RETURNS TABLE(restored_count INTEGER) AS $$
DECLARE
  count INTEGER := 0;
BEGIN
  -- Check if backup exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments_recurrence_backup') THEN
    RAISE EXCEPTION 'Backup table appointments_recurrence_backup does not exist';
  END IF;

  -- Restore from backup
  UPDATE appointments a
  SET recurrence_rule = b.recurrence_rule
  FROM appointments_recurrence_backup b
  WHERE a.id = b.id;

  GET DIAGNOSTICS count = ROW_COUNT;

  RAISE NOTICE 'Rolled back % appointments to original format', count;

  RETURN QUERY SELECT count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rollback_recurrence_migration IS
  'Emergency rollback function to restore original recurrence_rule values from backup table';

-- Instructions for using this migration:
--
-- 1. Run this migration on a TEST database first
-- 2. Verify the format analysis results
-- 3. Check migration success rate
-- 4. Test expansion API with migrated data
-- 5. If successful, run on PRODUCTION
-- 6. After verification in production, uncomment Step 6 to add constraint
-- 7. After 30 days with no issues, drop backup table:
--    DROP TABLE appointments_recurrence_backup;
--
-- To rollback (emergency only):
--    SELECT rollback_recurrence_migration();

-- ================================================================
-- BOOKING ECOSYSTEM CONSOLIDATION ROLLBACK
-- ================================================================
-- Purpose: Rollback the booking ecosystem consolidation migration
-- WARNING: This will restore the duplicate tables structure
-- Use only if migration fails or needs to be reversed
--
-- Author: Claude Code
-- Date: 2025-10-10
-- ================================================================

-- ================================================================
-- SECTION 1: DROP BACKWARD-COMPATIBLE VIEWS
-- ================================================================

DROP VIEW IF EXISTS bookings_legacy CASCADE;
DROP VIEW IF EXISTS barbers_legacy CASCADE;

RAISE NOTICE 'Dropped backward-compatible views';

-- ================================================================
-- SECTION 2: RESTORE LEGACY RLS POLICIES
-- ================================================================

-- Restore original appointments RLS policies
DROP POLICY IF EXISTS "Users can view their appointments" ON appointments;

CREATE POLICY "Clients can view their own appointments" ON appointments
  FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Staff can view barbershop appointments" ON appointments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM barbershop_staff bs
      WHERE bs.barbershop_id = appointments.barbershop_id
      AND bs.user_id = auth.uid()
      AND bs.is_active = true
    )
  );

RAISE NOTICE 'Restored original RLS policies';

-- ================================================================
-- SECTION 3: RESTORE shop_id COLUMN IN SERVICES
-- ================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'services' AND column_name = 'shop_id'
    ) THEN
        ALTER TABLE services ADD COLUMN shop_id UUID;

        -- Copy barbershop_id back to shop_id
        UPDATE services
        SET shop_id = barbershop_id;

        RAISE NOTICE 'Restored shop_id column in services table';
    END IF;
END $$;

-- ================================================================
-- SECTION 4: ROLLBACK COMPLETE
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'ROLLBACK COMPLETE';
    RAISE NOTICE '================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'The database has been rolled back to pre-migration state.';
    RAISE NOTICE '';
    RAISE NOTICE 'Note: Migrated data in appointments and barbershop_staff tables';
    RAISE NOTICE 'has NOT been removed. You will need to manually clean up if needed.';
    RAISE NOTICE '';
    RAISE NOTICE 'The bookings and barbers tables remain as they were.';
    RAISE NOTICE '================================================================';
END $$;

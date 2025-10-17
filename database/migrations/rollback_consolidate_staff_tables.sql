-- ============================================================================
-- STAFF TABLE CONSOLIDATION ROLLBACK
-- ============================================================================
-- Purpose: Safely rollback the staff table consolidation migration
--          Restores appointments foreign key to profiles table
--
-- Date: 2025-10-11
-- Database: Supabase PostgreSQL
--
-- WARNING: This rollback preserves the staff table but restores the original
--          appointments foreign key relationship. Run this ONLY if the
--          migration caused issues and you need to revert immediately.
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== STAFF TABLE CONSOLIDATION ROLLBACK ===';
    RAISE NOTICE 'Starting rollback process...';
    RAISE NOTICE 'Timestamp: %', NOW();
END $$;

-- ============================================================================
-- PHASE 1: PRE-ROLLBACK VALIDATION
-- ============================================================================

DO $$
DECLARE
    v_staff_count INT;
    v_appointments_count INT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== PHASE 1: PRE-ROLLBACK VALIDATION ===';

    -- Count current state
    SELECT COUNT(*) INTO v_staff_count FROM staff;
    SELECT COUNT(*) INTO v_appointments_count FROM appointments WHERE barber_id IS NOT NULL;

    RAISE NOTICE 'Current staff records: %', v_staff_count;
    RAISE NOTICE 'Appointments with barber_id: %', v_appointments_count;
END $$;

-- ============================================================================
-- PHASE 2: BACKUP STAFF TABLE DATA
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== PHASE 2: BACKUP STAFF TABLE ===';
END $$;

-- Create backup table with timestamp
CREATE TABLE IF NOT EXISTS staff_backup_pre_rollback AS
SELECT * FROM staff;

DO $$
DECLARE
    v_backup_count INT;
BEGIN
    SELECT COUNT(*) INTO v_backup_count FROM staff_backup_pre_rollback;
    RAISE NOTICE 'Backed up % staff records to staff_backup_pre_rollback', v_backup_count;
END $$;

-- ============================================================================
-- PHASE 3: RESTORE APPOINTMENTS FOREIGN KEY TO PROFILES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== PHASE 3: RESTORE APPOINTMENTS FOREIGN KEY ===';
END $$;

-- STEP 3.1: Drop current foreign key constraint (pointing to staff)
ALTER TABLE public.appointments
DROP CONSTRAINT IF EXISTS appointments_barber_id_fkey;

DO $$
BEGIN
    RAISE NOTICE 'Dropped appointments_barber_id_fkey constraint (staff reference)';
END $$;

-- STEP 3.2: Verify all barber_id values exist in profiles table
DO $$
DECLARE
    v_orphaned_count INT;
BEGIN
    SELECT COUNT(*)
    INTO v_orphaned_count
    FROM appointments a
    WHERE a.barber_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = a.barber_id);

    IF v_orphaned_count > 0 THEN
        RAISE WARNING 'Found % appointments with barber_id not in profiles table', v_orphaned_count;
        RAISE NOTICE 'These appointments will have barber_id set to NULL';

        -- Set orphaned barber_id to NULL
        UPDATE appointments
        SET barber_id = NULL
        WHERE barber_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = barber_id);
    ELSE
        RAISE NOTICE 'All appointment barber_id values exist in profiles table';
    END IF;
END $$;

-- STEP 3.3: Add foreign key constraint back to profiles table
ALTER TABLE public.appointments
ADD CONSTRAINT appointments_barber_id_fkey
FOREIGN KEY (barber_id)
REFERENCES public.profiles(id)
ON DELETE SET NULL;

DO $$
BEGIN
    RAISE NOTICE 'Restored appointments_barber_id_fkey constraint pointing to profiles table';
END $$;

-- ============================================================================
-- PHASE 4: DISABLE STAFF TABLE (DO NOT DROP YET)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== PHASE 4: DISABLE STAFF TABLE ===';
END $$;

-- Disable RLS policies on staff table
DROP POLICY IF EXISTS "public_view_active_staff" ON public.staff;
DROP POLICY IF EXISTS "users_view_own_shop_staff" ON public.staff;
DROP POLICY IF EXISTS "staff_view_own_record" ON public.staff;
DROP POLICY IF EXISTS "shop_owners_manage_staff" ON public.staff;
DROP POLICY IF EXISTS "enterprise_owners_manage_all_staff" ON public.staff;
DROP POLICY IF EXISTS "staff_update_own_profile" ON public.staff;
DROP POLICY IF EXISTS "service_role_full_access" ON public.staff;

-- Remove triggers
DROP TRIGGER IF EXISTS update_staff_updated_at_trigger ON public.staff;
DROP FUNCTION IF EXISTS update_staff_updated_at();

-- Drop legacy views
DROP VIEW IF EXISTS barbershop_staff_legacy;
DROP VIEW IF EXISTS barbers_legacy;

DO $$
BEGIN
    RAISE NOTICE 'Disabled RLS policies, triggers, and views on staff table';
    RAISE NOTICE 'NOTE: Staff table preserved for data recovery - not dropped';
END $$;

-- ============================================================================
-- PHASE 5: VERIFY ROLLBACK SUCCESS
-- ============================================================================

DO $$
DECLARE
    v_constraint_exists BOOLEAN;
    v_appointments_count INT;
    v_orphaned_count INT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== PHASE 5: VERIFY ROLLBACK ===';

    -- Check constraint exists
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'appointments_barber_id_fkey'
        AND table_name = 'appointments'
    ) INTO v_constraint_exists;

    IF v_constraint_exists THEN
        RAISE NOTICE 'SUCCESS: appointments_barber_id_fkey constraint exists';
    ELSE
        RAISE WARNING 'FAILED: appointments_barber_id_fkey constraint not found';
    END IF;

    -- Count appointments
    SELECT COUNT(*) INTO v_appointments_count
    FROM appointments WHERE barber_id IS NOT NULL;
    RAISE NOTICE 'Appointments with barber_id: %', v_appointments_count;

    -- Check for orphaned appointments
    SELECT COUNT(*) INTO v_orphaned_count
    FROM appointments a
    WHERE a.barber_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = a.barber_id);

    IF v_orphaned_count > 0 THEN
        RAISE WARNING 'Found % orphaned appointments - THIS SHOULD BE ZERO!', v_orphaned_count;
    ELSE
        RAISE NOTICE 'No orphaned appointments - referential integrity maintained';
    END IF;
END $$;

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=============================================================';
    RAISE NOTICE 'ROLLBACK COMPLETE: Appointments now reference profiles table';
    RAISE NOTICE 'Timestamp: %', NOW();
    RAISE NOTICE '=============================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'ROLLBACK SUMMARY:';
    RAISE NOTICE '1. Appointments foreign key restored to profiles table';
    RAISE NOTICE '2. Staff table preserved with backup at staff_backup_pre_rollback';
    RAISE NOTICE '3. RLS policies and triggers disabled on staff table';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Investigate why migration needed rollback';
    RAISE NOTICE '2. Fix issues in migration script';
    RAISE NOTICE '3. Test migration in staging environment';
    RAISE NOTICE '4. Re-run migration when ready';
    RAISE NOTICE '';
    RAISE NOTICE 'DATA PRESERVED:';
    RAISE NOTICE '  - staff table (disabled but not dropped)';
    RAISE NOTICE '  - staff_backup_pre_rollback (rollback backup)';
    RAISE NOTICE '';
    RAISE NOTICE 'TO CLEAN UP AFTER ROLLBACK (optional):';
    RAISE NOTICE '  DROP TABLE IF EXISTS staff CASCADE;';
    RAISE NOTICE '  DROP TABLE IF EXISTS staff_backup_pre_rollback;';
    RAISE NOTICE '';
END $$;

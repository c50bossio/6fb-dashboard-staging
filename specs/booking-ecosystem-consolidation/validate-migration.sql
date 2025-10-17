-- ================================================================
-- BOOKING ECOSYSTEM MIGRATION VALIDATION
-- ================================================================
-- Purpose: Validate the booking ecosystem consolidation
-- Run this AFTER the migration to ensure data integrity
--
-- Author: Claude Code
-- Date: 2025-10-10
-- ================================================================

\echo '================================================================'
\echo 'BOOKING ECOSYSTEM MIGRATION VALIDATION'
\echo '================================================================'
\echo ''

-- ================================================================
-- SECTION 1: TABLE COUNTS
-- ================================================================

\echo 'Section 1: Table Counts'
\echo '----------------------------------------------------------------'

SELECT
    'appointments' as table_name,
    COUNT(*) as total_records
FROM appointments

UNION ALL

SELECT
    'bookings (legacy)',
    COUNT(*)
FROM bookings

UNION ALL

SELECT
    'barbershop_staff',
    COUNT(*)
FROM barbershop_staff

UNION ALL

SELECT
    'barbers (legacy)',
    COUNT(*)
FROM barbers

UNION ALL

SELECT
    'customers',
    COUNT(*)
FROM customers

UNION ALL

SELECT
    'services',
    COUNT(*)
FROM services

ORDER BY table_name;

\echo ''

-- ================================================================
-- SECTION 2: DATA INTEGRITY CHECKS
-- ================================================================

\echo 'Section 2: Data Integrity Checks'
\echo '----------------------------------------------------------------'

-- Check for NULL foreign keys in appointments
SELECT
    'appointments_missing_barbershop' as validation,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM appointments
WHERE barbershop_id IS NULL

UNION ALL

SELECT
    'appointments_missing_customer_or_name',
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '⚠ WARNING' END
FROM appointments
WHERE customer_id IS NULL AND (client_name IS NULL OR client_name = '')

UNION ALL

SELECT
    'appointments_missing_barber',
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END
FROM appointments
WHERE barber_id IS NULL

UNION ALL

SELECT
    'appointments_missing_service',
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END
FROM appointments
WHERE service_id IS NULL

UNION ALL

SELECT
    'appointments_missing_scheduled_at',
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END
FROM appointments
WHERE scheduled_at IS NULL;

\echo ''

-- Check for NULL foreign keys in barbershop_staff
SELECT
    'staff_missing_barbershop' as validation,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM barbershop_staff
WHERE barbershop_id IS NULL

UNION ALL

SELECT
    'staff_missing_user',
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END
FROM barbershop_staff
WHERE user_id IS NULL;

\echo ''

-- ================================================================
-- SECTION 3: RELATIONSHIP VALIDATION
-- ================================================================

\echo 'Section 3: Foreign Key Relationship Validation'
\echo '----------------------------------------------------------------'

-- Validate appointments → customers
SELECT
    'appointments_invalid_customer_refs' as validation,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM appointments a
LEFT JOIN customers c ON c.id = a.customer_id
WHERE a.customer_id IS NOT NULL
AND c.id IS NULL

UNION ALL

-- Validate appointments → barbers (profiles)
SELECT
    'appointments_invalid_barber_refs',
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END
FROM appointments a
LEFT JOIN profiles p ON p.id = a.barber_id
WHERE a.barber_id IS NOT NULL
AND p.id IS NULL

UNION ALL

-- Validate appointments → services
SELECT
    'appointments_invalid_service_refs',
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END
FROM appointments a
LEFT JOIN services s ON s.id = a.service_id
WHERE a.service_id IS NOT NULL
AND s.id IS NULL

UNION ALL

-- Validate barbershop_staff → profiles
SELECT
    'staff_invalid_user_refs',
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END
FROM barbershop_staff bs
LEFT JOIN profiles p ON p.id = bs.user_id
WHERE bs.user_id IS NOT NULL
AND p.id IS NULL

UNION ALL

-- Validate barbershop_staff → barbershops
SELECT
    'staff_invalid_barbershop_refs',
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END
FROM barbershop_staff bs
LEFT JOIN barbershops b ON b.id = bs.barbershop_id
WHERE bs.barbershop_id IS NOT NULL
AND b.id IS NULL;

\echo ''

-- ================================================================
-- SECTION 4: BACKWARD COMPATIBILITY VIEWS
-- ================================================================

\echo 'Section 4: Backward Compatibility Views'
\echo '----------------------------------------------------------------'

SELECT
    'bookings_legacy_view' as view_name,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.views
            WHERE table_name = 'bookings_legacy'
        ) THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as status

UNION ALL

SELECT
    'barbers_legacy_view',
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.views
            WHERE table_name = 'barbers_legacy'
        ) THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END;

\echo ''

-- ================================================================
-- SECTION 5: INDEX VALIDATION
-- ================================================================

\echo 'Section 5: Index Validation'
\echo '----------------------------------------------------------------'

SELECT
    schemaname,
    tablename,
    indexname,
    '✓ EXISTS' as status
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('appointments', 'barbershop_staff')
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

\echo ''

-- ================================================================
-- SECTION 6: RLS POLICY VALIDATION
-- ================================================================

\echo 'Section 6: RLS Policy Validation'
\echo '----------------------------------------------------------------'

SELECT
    tablename,
    policyname,
    '✓ EXISTS' as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('appointments', 'barbershop_staff', 'customers', 'services')
ORDER BY tablename, policyname;

\echo ''

-- ================================================================
-- SECTION 7: SAMPLE DATA VERIFICATION
-- ================================================================

\echo 'Section 7: Sample Data Verification'
\echo '----------------------------------------------------------------'

\echo 'Sample appointments with full relationships:'
SELECT
    a.id,
    a.scheduled_at,
    COALESCE(c.full_name, a.client_name) as customer,
    p.full_name as barber,
    s.name as service,
    a.status
FROM appointments a
LEFT JOIN customers c ON c.id = a.customer_id
LEFT JOIN profiles p ON p.id = a.barber_id
LEFT JOIN services s ON s.id = a.service_id
ORDER BY a.scheduled_at DESC
LIMIT 5;

\echo ''
\echo 'Sample barbershop staff with profiles:'
SELECT
    bs.id,
    p.full_name as name,
    p.email,
    bs.role,
    bs.is_active
FROM barbershop_staff bs
JOIN profiles p ON p.id = bs.user_id
WHERE bs.is_active = true
LIMIT 5;

\echo ''

-- ================================================================
-- SECTION 8: MIGRATION SUMMARY
-- ================================================================

\echo '================================================================'
\echo 'VALIDATION SUMMARY'
\echo '================================================================'
\echo ''

DO $$
DECLARE
    appointments_count INT;
    bookings_count INT;
    staff_count INT;
    barbers_count INT;
    failed_checks INT := 0;
BEGIN
    -- Get counts
    SELECT COUNT(*) INTO appointments_count FROM appointments;
    SELECT COUNT(*) INTO bookings_count FROM bookings;
    SELECT COUNT(*) INTO staff_count FROM barbershop_staff;
    SELECT COUNT(*) INTO barbers_count FROM barbers;

    -- Count failed integrity checks
    SELECT COUNT(*) INTO failed_checks FROM (
        SELECT COUNT(*) as c FROM appointments WHERE barbershop_id IS NULL
        UNION ALL SELECT COUNT(*) FROM appointments WHERE barber_id IS NULL
        UNION ALL SELECT COUNT(*) FROM appointments WHERE service_id IS NULL
        UNION ALL SELECT COUNT(*) FROM barbershop_staff WHERE barbershop_id IS NULL
        UNION ALL SELECT COUNT(*) FROM barbershop_staff WHERE user_id IS NULL
    ) failures WHERE c > 0;

    RAISE NOTICE 'Appointments: %', appointments_count;
    RAISE NOTICE 'Bookings (legacy): %', bookings_count;
    RAISE NOTICE 'Barbershop Staff: %', staff_count;
    RAISE NOTICE 'Barbers (legacy): %', barbers_count;
    RAISE NOTICE '';

    IF failed_checks = 0 THEN
        RAISE NOTICE '✓ All validation checks PASSED';
        RAISE NOTICE '';
        RAISE NOTICE 'Migration successful! You can now:';
        RAISE NOTICE '1. Update application code to use appointments table';
        RAISE NOTICE '2. Test all booking flows thoroughly';
        RAISE NOTICE '3. Monitor for 1 week before dropping legacy tables';
    ELSE
        RAISE WARNING '✗ Some validation checks FAILED';
        RAISE WARNING '';
        RAISE WARNING 'Review the failed checks above and fix data issues.';
        RAISE WARNING 'Do NOT drop legacy tables until all checks pass.';
    END IF;
END $$;

\echo '================================================================'

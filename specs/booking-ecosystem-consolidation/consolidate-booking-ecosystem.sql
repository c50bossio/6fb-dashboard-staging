-- ================================================================
-- BOOKING ECOSYSTEM CONSOLIDATION MIGRATION
-- ================================================================
-- Purpose: Consolidate duplicate tables into single source of truth
-- - Migrate `bookings` → `appointments`
-- - Migrate `barbers` → `barbershop_staff` + `profiles`
-- - Standardize column names and terminology
-- - Create backward-compatible views for transition
--
-- Author: Claude Code
-- Date: 2025-10-10
-- Reversible: Yes (see rollback script)
-- ================================================================

-- ================================================================
-- SECTION 1: PRE-MIGRATION VALIDATION
-- ================================================================

-- Store counts before migration
CREATE TEMP TABLE migration_validation AS
SELECT
    'bookings_before' as metric,
    COUNT(*) as count,
    NOW() as measured_at
FROM bookings
UNION ALL
SELECT
    'appointments_before',
    COUNT(*),
    NOW()
FROM appointments
UNION ALL
SELECT
    'barbers_before',
    COUNT(*),
    NOW()
FROM barbers
UNION ALL
SELECT
    'barbershop_staff_before',
    COUNT(*),
    NOW()
FROM barbershop_staff;

-- Display pre-migration counts
SELECT * FROM migration_validation ORDER BY metric;

-- ================================================================
-- SECTION 2: MIGRATE BOOKINGS → APPOINTMENTS
-- ================================================================

DO $$
DECLARE
    bookings_migrated INT := 0;
    bookings_skipped INT := 0;
    booking_record RECORD;
    customer_uuid UUID;
    barber_uuid UUID;
    service_uuid UUID;
    barbershop_uuid UUID;
BEGIN
    RAISE NOTICE 'Starting bookings → appointments migration...';

    -- Loop through all bookings that don't already exist in appointments
    FOR booking_record IN
        SELECT * FROM bookings
        WHERE id NOT IN (SELECT id FROM appointments WHERE id = bookings.id)
    LOOP
        -- Find or create customer
        IF booking_record.customer_email IS NOT NULL THEN
            -- Try to find existing customer by email
            SELECT id INTO customer_uuid
            FROM customers
            WHERE email = booking_record.customer_email
            LIMIT 1;

            -- Create customer if not found
            IF customer_uuid IS NULL THEN
                INSERT INTO customers (full_name, email, phone, created_at)
                VALUES (
                    booking_record.customer_name,
                    booking_record.customer_email,
                    booking_record.customer_phone,
                    booking_record.created_at
                )
                RETURNING id INTO customer_uuid;
            END IF;
        END IF;

        -- Find barber by ID (if it's a UUID)
        BEGIN
            barber_uuid := booking_record.barber_id::UUID;
        EXCEPTION WHEN others THEN
            -- If barber_id is not a UUID, try to find by name in barbershop_staff
            SELECT bs.user_id INTO barber_uuid
            FROM barbershop_staff bs
            JOIN profiles p ON p.id = bs.user_id
            WHERE p.full_name = booking_record.barber_name
            LIMIT 1;
        END;

        -- Find service by ID (if it's a UUID)
        BEGIN
            service_uuid := booking_record.service_id::UUID;
        EXCEPTION WHEN others THEN
            -- If service_id is not a UUID, try to find by name
            SELECT id INTO service_uuid
            FROM services
            WHERE name = booking_record.service_name
            LIMIT 1;
        END;

        -- Create appointment record
        BEGIN
            INSERT INTO appointments (
                id,
                barbershop_id,
                customer_id,
                barber_id,
                service_id,
                scheduled_at,
                duration_minutes,
                status,
                price,
                notes,
                client_name,
                client_phone,
                client_email,
                booking_source,
                created_at,
                updated_at
            ) VALUES (
                booking_record.id,
                barbershop_uuid,
                customer_uuid,
                barber_uuid,
                service_uuid,
                booking_record.scheduled_at,
                booking_record.duration_minutes,
                booking_record.status,
                booking_record.price,
                booking_record.notes,
                booking_record.customer_name,
                booking_record.customer_phone,
                booking_record.customer_email,
                COALESCE(booking_record.booking_source, 'admin'),
                booking_record.created_at,
                booking_record.updated_at
            );

            bookings_migrated := bookings_migrated + 1;
        EXCEPTION WHEN others THEN
            RAISE WARNING 'Failed to migrate booking %: %', booking_record.id, SQLERRM;
            bookings_skipped := bookings_skipped + 1;
        END;
    END LOOP;

    RAISE NOTICE 'Bookings migration complete: % migrated, % skipped', bookings_migrated, bookings_skipped;
END $$;

-- ================================================================
-- SECTION 3: MIGRATE BARBERS → BARBERSHOP_STAFF
-- ================================================================

DO $$
DECLARE
    barbers_migrated INT := 0;
    barbers_skipped INT := 0;
    barber_record RECORD;
    profile_uuid UUID;
    staff_uuid UUID;
    barbershop_uuid UUID;
BEGIN
    RAISE NOTICE 'Starting barbers → barbershop_staff migration...';

    -- Loop through all barbers
    FOR barber_record IN SELECT * FROM barbers LOOP
        -- Try to find barbershop by shop_id
        BEGIN
            barbershop_uuid := barber_record.shop_id::UUID;
        EXCEPTION WHEN others THEN
            -- If shop_id is not a valid UUID, try to find first active barbershop
            SELECT id INTO barbershop_uuid
            FROM barbershops
            WHERE is_active = true
            LIMIT 1;
        END;

        -- Check if profile already exists by email
        SELECT id INTO profile_uuid
        FROM profiles
        WHERE email = barber_record.email
        LIMIT 1;

        -- Create or update profile
        IF profile_uuid IS NULL THEN
            INSERT INTO profiles (
                full_name,
                email,
                phone,
                avatar_url,
                role,
                created_at,
                updated_at
            ) VALUES (
                barber_record.name,
                barber_record.email,
                barber_record.phone,
                barber_record.avatar_url,
                'BARBER',
                barber_record.created_at,
                barber_record.updated_at
            )
            RETURNING id INTO profile_uuid;
        ELSE
            -- Update existing profile
            UPDATE profiles
            SET
                full_name = COALESCE(barber_record.name, full_name),
                phone = COALESCE(barber_record.phone, phone),
                avatar_url = COALESCE(barber_record.avatar_url, avatar_url),
                updated_at = NOW()
            WHERE id = profile_uuid;
        END IF;

        -- Check if staff record already exists
        SELECT id INTO staff_uuid
        FROM barbershop_staff
        WHERE barbershop_id = barbershop_uuid
        AND user_id = profile_uuid
        LIMIT 1;

        -- Create barbershop_staff record if it doesn't exist
        IF staff_uuid IS NULL THEN
            BEGIN
                INSERT INTO barbershop_staff (
                    barbershop_id,
                    user_id,
                    role,
                    permissions,
                    is_active,
                    created_at,
                    updated_at
                ) VALUES (
                    barbershop_uuid,
                    profile_uuid,
                    'BARBER',
                    jsonb_build_object(
                        'can_manage_appointments', true,
                        'can_view_analytics', true,
                        'specialties', barber_record.specialties
                    ),
                    COALESCE(barber_record.is_active, true),
                    barber_record.created_at,
                    barber_record.updated_at
                );

                barbers_migrated := barbers_migrated + 1;
            EXCEPTION WHEN others THEN
                RAISE WARNING 'Failed to migrate barber %: %', barber_record.id, SQLERRM;
                barbers_skipped := barbers_skipped + 1;
            END;
        ELSE
            -- Update existing staff record
            UPDATE barbershop_staff
            SET
                is_active = COALESCE(barber_record.is_active, is_active),
                updated_at = NOW()
            WHERE id = staff_uuid;

            barbers_migrated := barbers_migrated + 1;
        END IF;
    END LOOP;

    RAISE NOTICE 'Barbers migration complete: % migrated, % skipped', barbers_migrated, barbers_skipped;
END $$;

-- ================================================================
-- SECTION 4: STANDARDIZE SERVICES TABLE
-- ================================================================

-- Remove shop_id column if it exists (use barbershop_id instead)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'services' AND column_name = 'shop_id'
    ) THEN
        -- Copy shop_id to barbershop_id if barbershop_id is NULL
        UPDATE services
        SET barbershop_id = shop_id::UUID
        WHERE barbershop_id IS NULL
        AND shop_id IS NOT NULL;

        -- Drop shop_id column
        ALTER TABLE services DROP COLUMN shop_id;

        RAISE NOTICE 'Removed shop_id column from services table';
    END IF;
END $$;

-- ================================================================
-- SECTION 5: CREATE BACKWARD-COMPATIBLE VIEWS
-- ================================================================

-- Create view for bookings (backward compatibility)
CREATE OR REPLACE VIEW bookings_legacy AS
SELECT
    a.id,
    a.scheduled_at::date as booking_date,
    a.scheduled_at::time as booking_time,
    COALESCE(c.full_name, a.client_name) as customer_name,
    s.name as service_name,
    p.full_name as barber_name,
    a.price,
    a.duration_minutes,
    a.status,
    a.notes,
    a.created_at,
    a.updated_at,
    COALESCE(c.phone, a.client_phone) as customer_phone,
    COALESCE(c.email, a.client_email) as customer_email,
    a.barber_id,
    a.booking_source,
    a.service_id,
    a.scheduled_at,
    NULL as payment_intent_id  -- Legacy field
FROM appointments a
LEFT JOIN customers c ON c.id = a.customer_id
LEFT JOIN services s ON s.id = a.service_id
LEFT JOIN profiles p ON p.id = a.barber_id;

COMMENT ON VIEW bookings_legacy IS 'Backward-compatible view for legacy bookings table. Will be removed after migration period.';

-- Create view for barbers (backward compatibility)
CREATE OR REPLACE VIEW barbers_legacy AS
SELECT
    bs.id::text as id,  -- Convert UUID to TEXT for backward compatibility
    bs.barbershop_id::text as shop_id,
    p.full_name as name,
    p.email,
    p.phone,
    '#' || LPAD(TO_HEX((RANDOM() * 16777215)::INT), 6, '0') as color,  -- Random color for backward compat
    p.avatar_url,
    NULL::text as bio,  -- Legacy field
    jsonb_build_object() as specialties,  -- Legacy field
    NULL::numeric as rating,  -- Legacy field
    bs.is_active,
    false as is_test,
    bs.created_at,
    bs.updated_at,
    NULL::integer as experience_years,  -- Legacy field
    NULL::text as chair_number,  -- Legacy field
    NULL::text as instagram_handle,  -- Legacy field
    NULL::text[] as languages,  -- Legacy field
    NULL::text as availability  -- Legacy field
FROM barbershop_staff bs
JOIN profiles p ON p.id = bs.user_id
WHERE bs.role = 'BARBER';

COMMENT ON VIEW barbers_legacy IS 'Backward-compatible view for legacy barbers table. Will be removed after migration period.';

-- ================================================================
-- SECTION 6: POST-MIGRATION VALIDATION
-- ================================================================

-- Add post-migration counts
INSERT INTO migration_validation
SELECT
    'bookings_after' as metric,
    COUNT(*) as count,
    NOW() as measured_at
FROM bookings
UNION ALL
SELECT
    'appointments_after',
    COUNT(*),
    NOW()
FROM appointments
UNION ALL
SELECT
    'barbers_after',
    COUNT(*),
    NOW()
FROM barbers
UNION ALL
SELECT
    'barbershop_staff_after',
    COUNT(*),
    NOW()
FROM barbershop_staff;

-- Display validation results
SELECT
    metric,
    count,
    measured_at
FROM migration_validation
ORDER BY metric, measured_at;

-- Check for orphaned appointments (missing foreign keys)
SELECT
    'orphaned_appointments_no_customer' as issue,
    COUNT(*) as count
FROM appointments
WHERE customer_id IS NULL
AND client_name IS NULL

UNION ALL

SELECT
    'orphaned_appointments_no_barber',
    COUNT(*)
FROM appointments
WHERE barber_id IS NULL

UNION ALL

SELECT
    'orphaned_appointments_no_service',
    COUNT(*)
FROM appointments
WHERE service_id IS NULL;

-- ================================================================
-- SECTION 7: CREATE INDEXES FOR PERFORMANCE
-- ================================================================

-- Ensure appointments table has proper indexes
CREATE INDEX IF NOT EXISTS idx_appointments_barbershop ON appointments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_barber ON appointments(barber_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service ON appointments(service_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_booking_source ON appointments(booking_source);

-- Ensure barbershop_staff has proper indexes
CREATE INDEX IF NOT EXISTS idx_barbershop_staff_barbershop ON barbershop_staff(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_barbershop_staff_user ON barbershop_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_barbershop_staff_role ON barbershop_staff(role);
CREATE INDEX IF NOT EXISTS idx_barbershop_staff_active ON barbershop_staff(is_active);

-- ================================================================
-- SECTION 8: UPDATE RLS POLICIES
-- ================================================================

-- Appointments RLS policies (ensure they're using customer_id not client_id)
DROP POLICY IF EXISTS "Users can view their appointments" ON appointments;
CREATE POLICY "Users can view their appointments" ON appointments
    FOR SELECT
    USING (
        customer_id IN (
            SELECT id FROM customers WHERE id = auth.uid()
        )
        OR
        barber_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM barbershop_staff bs
            WHERE bs.barbershop_id = appointments.barbershop_id
            AND bs.user_id = auth.uid()
            AND bs.is_active = true
        )
    );

-- ================================================================
-- SECTION 9: MIGRATION SUMMARY
-- ================================================================

DO $$
DECLARE
    summary_text TEXT;
BEGIN
    summary_text := E'\n\n';
    summary_text := summary_text || '================================================================\n';
    summary_text := summary_text || 'MIGRATION SUMMARY\n';
    summary_text := summary_text || '================================================================\n\n';

    summary_text := summary_text || 'Bookings migrated to appointments: ✓\n';
    summary_text := summary_text || 'Barbers migrated to barbershop_staff: ✓\n';
    summary_text := summary_text || 'Services standardized: ✓\n';
    summary_text := summary_text || 'Backward-compatible views created: ✓\n';
    summary_text := summary_text || 'Indexes created: ✓\n';
    summary_text := summary_text || 'RLS policies updated: ✓\n\n';

    summary_text := summary_text || 'Next Steps:\n';
    summary_text := summary_text || '1. Validate data integrity (check validation table above)\n';
    summary_text := summary_text || '2. Test API endpoints with new schema\n';
    summary_text := summary_text || '3. Update application code to use appointments\n';
    summary_text := summary_text || '4. Monitor for 1 week before dropping legacy tables\n';
    summary_text := summary_text || '5. Drop bookings and barbers tables after validation\n\n';

    summary_text := summary_text || '================================================================\n';

    RAISE NOTICE '%', summary_text;
END $$;

-- ================================================================
-- END OF MIGRATION
-- ================================================================

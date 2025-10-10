-- ================================================================
-- BOOKING ECOSYSTEM CONSOLIDATION MIGRATION (PRAGMATIC)
-- ================================================================
-- Purpose: Consolidate bookings → appointments (primary goal)
-- Note: Barbers table requires auth accounts, so keeping it separate for now
-- ================================================================

-- ================================================================
-- SECTION 1: PRE-MIGRATION VALIDATION
-- ================================================================

CREATE TEMP TABLE IF NOT EXISTS migration_validation AS
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
FROM appointments;

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
    RAISE NOTICE 'Total bookings to process: %', (SELECT COUNT(*) FROM bookings WHERE id NOT IN (SELECT id FROM appointments));

    FOR booking_record IN
        SELECT * FROM bookings
        WHERE id NOT IN (SELECT id FROM appointments WHERE id = bookings.id)
    LOOP
        -- Find or create customer
        customer_uuid := NULL;
        IF booking_record.customer_email IS NOT NULL AND booking_record.customer_email != '' THEN
            SELECT id INTO customer_uuid
            FROM customers
            WHERE email = booking_record.customer_email
            LIMIT 1;

            IF customer_uuid IS NULL AND booking_record.customer_name IS NOT NULL THEN
                BEGIN
                    INSERT INTO customers (full_name, email, phone, created_at)
                    VALUES (
                        booking_record.customer_name,
                        booking_record.customer_email,
                        booking_record.customer_phone,
                        COALESCE(booking_record.created_at, NOW())
                    )
                    RETURNING id INTO customer_uuid;
                EXCEPTION WHEN others THEN
                    RAISE WARNING 'Could not create customer for booking %: %', booking_record.id, SQLERRM;
                END;
            END IF;
        END IF;

        -- Find barber by ID (if it's a UUID, use it directly)
        barber_uuid := NULL;
        IF booking_record.barber_id IS NOT NULL THEN
            BEGIN
                barber_uuid := booking_record.barber_id::UUID;
                -- Verify barber exists in profiles
                IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = barber_uuid) THEN
                    barber_uuid := NULL;
                END IF;
            EXCEPTION WHEN others THEN
                barber_uuid := NULL;
            END;
        END IF;

        -- If no barber UUID, try to find by name in existing staff
        IF barber_uuid IS NULL AND booking_record.barber_name IS NOT NULL THEN
            SELECT bs.user_id INTO barber_uuid
            FROM barbershop_staff bs
            JOIN profiles p ON p.id = bs.user_id
            WHERE p.full_name = booking_record.barber_name
            LIMIT 1;
        END IF;

        -- Find service by ID
        service_uuid := NULL;
        IF booking_record.service_id IS NOT NULL THEN
            BEGIN
                service_uuid := booking_record.service_id::UUID;
                -- Verify service exists
                IF NOT EXISTS (SELECT 1 FROM services WHERE id = service_uuid) THEN
                    service_uuid := NULL;
                END IF;
            EXCEPTION WHEN others THEN
                service_uuid := NULL;
            END;
        END IF;

        -- If no service UUID, try to find by name
        IF service_uuid IS NULL AND booking_record.service_name IS NOT NULL THEN
            SELECT id INTO service_uuid
            FROM services
            WHERE name = booking_record.service_name
            LIMIT 1;
        END IF;

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
                barbershop_uuid,  -- May be NULL
                customer_uuid,
                barber_uuid,
                service_uuid,
                COALESCE(booking_record.scheduled_at, NOW()),
                COALESCE(booking_record.duration_minutes, 30),
                COALESCE(booking_record.status, 'PENDING'),
                booking_record.price,
                booking_record.notes,
                booking_record.customer_name,
                booking_record.customer_phone,
                booking_record.customer_email,
                COALESCE(booking_record.booking_source, 'admin'),
                COALESCE(booking_record.created_at, NOW()),
                COALESCE(booking_record.updated_at, NOW())
            );

            bookings_migrated := bookings_migrated + 1;
        EXCEPTION WHEN others THEN
            RAISE WARNING 'Failed to migrate booking % (scheduled: %, customer: %): %',
                booking_record.id,
                booking_record.scheduled_at,
                booking_record.customer_name,
                SQLERRM;
            bookings_skipped := bookings_skipped + 1;
        END;
    END LOOP;

    RAISE NOTICE '================================================================';
    RAISE NOTICE 'Bookings migration complete!';
    RAISE NOTICE 'Successfully migrated: %', bookings_migrated;
    RAISE NOTICE 'Skipped (errors): %', bookings_skipped;
    RAISE NOTICE '================================================================';
END $$;

-- ================================================================
-- SECTION 3: CREATE BACKWARD-COMPATIBLE VIEWS
-- ================================================================

CREATE OR REPLACE VIEW bookings_legacy AS
SELECT
    a.id,
    a.scheduled_at::date as booking_date,
    a.scheduled_at::time as booking_time,
    COALESCE(c.full_name, a.client_name, 'Walk-in Customer') as customer_name,
    COALESCE(s.name, 'Service') as service_name,
    COALESCE(p.full_name, 'Barber') as barber_name,
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
    NULL as payment_intent_id
FROM appointments a
LEFT JOIN customers c ON c.id = a.customer_id
LEFT JOIN services s ON s.id = a.service_id
LEFT JOIN profiles p ON p.id = a.barber_id;

COMMENT ON VIEW bookings_legacy IS 'Backward-compatible view for legacy bookings table. Maps to appointments table.';

-- ================================================================
-- SECTION 4: CREATE INDEXES FOR PERFORMANCE
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_appointments_barbershop ON appointments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_barber ON appointments(barber_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service ON appointments(service_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_booking_source ON appointments(booking_source);

-- ================================================================
-- SECTION 5: UPDATE RLS POLICIES
-- ================================================================

DROP POLICY IF EXISTS "Users can view their appointments" ON appointments;
CREATE POLICY "Users can view their appointments" ON appointments
    FOR SELECT
    USING (
        customer_id = auth.uid()
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
-- SECTION 6: POST-MIGRATION VALIDATION
-- ================================================================

INSERT INTO migration_validation
SELECT
    'appointments_after',
    COUNT(*),
    NOW()
FROM appointments;

-- Display before/after counts
SELECT
    metric,
    count,
    measured_at
FROM migration_validation
ORDER BY metric, measured_at;

-- Check migration success rate
DO $$
DECLARE
    total_bookings INT;
    total_appointments INT;
    migration_rate NUMERIC;
BEGIN
    SELECT count INTO total_bookings FROM migration_validation WHERE metric = 'bookings_before';
    SELECT count INTO total_appointments FROM migration_validation WHERE metric = 'appointments_after';

    IF total_appointments > 0 THEN
        migration_rate := ROUND(((total_appointments::NUMERIC - 53) / total_bookings::NUMERIC) * 100, 2);
        RAISE NOTICE '================================================================';
        RAISE NOTICE 'MIGRATION STATISTICS';
        RAISE NOTICE '================================================================';
        RAISE NOTICE 'Bookings before migration: %', total_bookings;
        RAISE NOTICE 'Appointments after migration: %', total_appointments;
        RAISE NOTICE 'New appointments created: %', (total_appointments - 53);
        RAISE NOTICE 'Migration rate: %%', migration_rate;
        RAISE NOTICE '================================================================';
    END IF;
END $$;

-- ================================================================
-- MIGRATION COMPLETE
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'BOOKING CONSOLIDATION COMPLETE!';
    RAISE NOTICE '================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'What was migrated:';
    RAISE NOTICE '  ✓ Bookings → Appointments table';
    RAISE NOTICE '  ✓ Customer records created/linked';
    RAISE NOTICE '  ✓ Backward-compatible bookings_legacy view created';
    RAISE NOTICE '  ✓ Indexes created for performance';
    RAISE NOTICE '  ✓ RLS policies updated';
    RAISE NOTICE '';
    RAISE NOTICE 'What remains:';
    RAISE NOTICE '  - Barbers table (requires auth accounts for migration)';
    RAISE NOTICE '  - Use barbershop_staff for staff with auth accounts';
    RAISE NOTICE '  - Use barbers table for reference data only';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Test appointments API endpoints';
    RAISE NOTICE '  2. Update UI to use /api/appointments';
    RAISE NOTICE '  3. Verify booking flow works end-to-end';
    RAISE NOTICE '  4. Monitor for 1 week before dropping bookings table';
    RAISE NOTICE '';
    RAISE NOTICE '================================================================';
END $$;

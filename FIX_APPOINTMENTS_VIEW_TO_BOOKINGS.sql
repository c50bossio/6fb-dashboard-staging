-- Fix appointments view to point to bookings table (where the real data is)

-- Step 1: Check how many rows are in bookings vs appointment_records
SELECT 'bookings' as table_name, COUNT(*) as row_count FROM bookings
UNION ALL
SELECT 'appointment_records', COUNT(*) FROM appointment_records;

-- Step 2: Drop the current appointments view
DROP VIEW IF EXISTS appointments CASCADE;

-- Step 3: Recreate appointments view pointing to bookings table
CREATE VIEW appointments AS
SELECT 
    id,
    shop_id,
    shop_id as barbershop_id,  -- Provide both names for compatibility
    barber_id,
    barber_name,
    customer_id,
    customer_name,
    customer_phone,
    customer_email,
    service_id,
    service_name,
    start_time,
    end_time,
    duration_minutes,
    status,
    price,
    notes,
    is_recurring,
    recurring_pattern,
    is_test,
    created_at,
    updated_at,
    reminder_24h_sent,
    reminder_2h_sent,
    confirmation_sent,
    google_calendar_event_id,
    calendar_synced,
    calendar_synced_at
FROM bookings;

-- Step 4: Grant proper permissions
GRANT SELECT ON appointments TO authenticated;
GRANT SELECT ON appointments TO anon;

-- Step 5: Verify the fix - should now show actual appointment data
SELECT 
    COUNT(*) as total_appointments,
    COUNT(shop_id) as has_shop_id,
    COUNT(barbershop_id) as has_barbershop_id,
    COUNT(DISTINCT shop_id) as unique_shops
FROM appointments;
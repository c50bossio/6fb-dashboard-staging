-- Fix the appointments VIEW to include shop_id column
-- The appointment_records table already has shop_id, but the view doesn't expose it

-- Step 1: Check what the current appointments view selects
SELECT definition 
FROM pg_views 
WHERE viewname = 'appointments' 
AND schemaname = 'public';

-- Step 2: Drop and recreate the appointments view to include shop_id
DROP VIEW IF EXISTS appointments CASCADE;

-- Step 3: Recreate appointments view with shop_id included
CREATE VIEW appointments AS
SELECT 
    id,
    barber_id,
    barber_name,
    shop_id,  -- Add this crucial column
    customer_id,
    customer_name,
    service_id,
    service_name,
    start_time,
    end_time,
    date,
    duration_minutes,
    status,
    notes,
    price,
    created_at,
    updated_at
FROM appointment_records;

-- Step 4: Grant proper permissions on the view
GRANT SELECT ON appointments TO authenticated;
GRANT SELECT ON appointments TO anon;

-- Step 5: Test that shop_id is now accessible
SELECT 
    COUNT(*) as total_appointments,
    COUNT(shop_id) as appointments_with_shop_id,
    COUNT(DISTINCT shop_id) as unique_shops
FROM appointments
LIMIT 5;
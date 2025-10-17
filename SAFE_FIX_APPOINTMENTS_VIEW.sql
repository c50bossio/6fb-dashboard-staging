-- Safe fix for appointments view - only select columns that actually exist

-- Step 1: Show ALL columns in appointment_records table first
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'appointment_records' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Drop the current appointments view
DROP VIEW IF EXISTS appointments CASCADE;

-- Step 3: Create a simple view with just the columns we KNOW exist
-- Based on your screenshot, we know these exist: barber_id, shop_id
CREATE VIEW appointments AS
SELECT 
    *,  -- Select all columns from appointment_records
    shop_id as barbershop_id  -- Also provide an alias for compatibility
FROM appointment_records;

-- Step 4: Grant permissions
GRANT SELECT ON appointments TO authenticated;
GRANT SELECT ON appointments TO anon;

-- Step 5: Test the fix
SELECT 
    COUNT(*) as total_appointments,
    COUNT(shop_id) as appointments_with_shop_id
FROM appointments
LIMIT 5;
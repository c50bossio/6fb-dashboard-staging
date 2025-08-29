-- Simple fix: Just recreate the view with all columns
-- Both shop_id and barbershop_id already exist in appointment_records

-- Step 1: Drop the current appointments view
DROP VIEW IF EXISTS appointments CASCADE;

-- Step 2: Create the view with all columns (no aliases needed)
CREATE VIEW appointments AS
SELECT * FROM appointment_records;

-- Step 3: Grant permissions
GRANT SELECT ON appointments TO authenticated;
GRANT SELECT ON appointments TO anon;

-- Step 4: Verify both columns are now accessible
SELECT 
    COUNT(*) as total_appointments,
    COUNT(shop_id) as has_shop_id,
    COUNT(barbershop_id) as has_barbershop_id
FROM appointments;
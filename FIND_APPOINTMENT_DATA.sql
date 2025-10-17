-- Find where the actual appointment data is stored

-- Check all appointment-related tables for data
SELECT 'appointment_records' as table_name, COUNT(*) as row_count FROM appointment_records
UNION ALL
SELECT 'appointments_archive_20250120', COUNT(*) FROM appointments_archive_20250120  
UNION ALL
SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL
SELECT 'appointment_details', COUNT(*) FROM appointment_details
UNION ALL  
SELECT 'production_bookings', COUNT(*) FROM production_bookings
ORDER BY row_count DESC;

-- Show sample data from the table with the most rows
-- (Run this after seeing which table has data)

-- Also check if there are other appointment tables we missed
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name ILIKE '%appointment%' 
     OR table_name ILIKE '%booking%'
     OR table_name ILIKE '%schedule%'
     OR table_name ILIKE '%calendar%')
ORDER BY table_name;
-- Check the actual appointment_records table schema
-- This appears to be the main base table

-- Step 1: Show all columns in appointment_records table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'appointment_records' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Show sample data to understand the structure
SELECT * FROM appointment_records LIMIT 3;

-- Step 3: Check what the appointments VIEW is actually selecting from
SELECT definition 
FROM pg_views 
WHERE viewname = 'appointments' 
AND schemaname = 'public';

-- Step 4: Check bookings table too (might be another source)
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND table_schema = 'public'
AND (column_name ILIKE '%shop%' OR column_name ILIKE '%barber%')
ORDER BY column_name;
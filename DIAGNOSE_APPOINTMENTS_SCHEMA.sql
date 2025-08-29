-- Diagnose the actual appointments table schema
-- Find out what columns exist in appointments_archive_20250120

-- Step 1: Show all columns in the appointments_archive_20250120 table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'appointments_archive_20250120' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Show sample data (first 3 rows)
SELECT * FROM appointments_archive_20250120 LIMIT 3;

-- Step 3: Check if there are any shop/barbershop related columns
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'appointments_archive_20250120' 
AND table_schema = 'public'
AND (column_name ILIKE '%shop%' OR column_name ILIKE '%barber%')
ORDER BY column_name;

-- Step 4: Look for other appointment-related tables
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name ILIKE '%appointment%' OR table_name ILIKE '%booking%')
ORDER BY table_name;
-- Check which tables actually have appointment data

-- Check row counts for all appointment/booking tables
SELECT 'appointment_records' as table_name, COUNT(*) as row_count FROM appointment_records
UNION ALL
SELECT 'appointments_archive_20250120', COUNT(*) FROM appointments_archive_20250120  
UNION ALL
SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL
SELECT 'booking_links', COUNT(*) FROM booking_links
UNION ALL
SELECT 'calendar_conflicts', COUNT(*) FROM calendar_conflicts
UNION ALL
SELECT 'calendar_integrations', COUNT(*) FROM calendar_integrations
UNION ALL
SELECT 'calendar_sync_history', COUNT(*) FROM calendar_sync_history
ORDER BY row_count DESC;

-- Show sample data from the bookings table (most likely candidate)
SELECT * FROM bookings LIMIT 3;

-- Check what the production_bookings VIEW selects from
SELECT definition 
FROM pg_views 
WHERE viewname = 'production_bookings' 
AND schemaname = 'public';

-- Show columns in the bookings table
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND table_schema = 'public'
ORDER BY ordinal_position;
-- ===============================================
-- APPLY MASTER SCHEMA - SAFE MIGRATION SCRIPT
-- ===============================================
-- This script safely applies the MASTER_SCHEMA.sql with data preservation
-- Run this in your Supabase SQL editor or psql

-- 1. BACKUP EXISTING DATA (if any)
-- Create backup tables for existing data
DO $$
BEGIN
    -- Backup profiles if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        DROP TABLE IF EXISTS profiles_backup;
        CREATE TABLE profiles_backup AS SELECT * FROM profiles;
        RAISE NOTICE 'Backed up profiles table';
    END IF;
    
    -- Backup other critical tables if they exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'barbershops') THEN
        DROP TABLE IF EXISTS barbershops_backup;
        CREATE TABLE barbershops_backup AS SELECT * FROM barbershops;
        RAISE NOTICE 'Backed up barbershops table';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') THEN
        DROP TABLE IF EXISTS appointments_backup;
        CREATE TABLE appointments_backup AS SELECT * FROM appointments;
        RAISE NOTICE 'Backed up appointments table';
    END IF;
END $$;

-- 2. APPLY MASTER SCHEMA
-- Note: The master schema will be applied here
-- For safety, we're creating this as a separate step

\echo 'Step 1: Backup completed'
\echo 'Step 2: Ready to apply MASTER_SCHEMA.sql'
\echo ''
\echo 'Next steps:'
\echo '1. Run database/MASTER_SCHEMA.sql in your Supabase SQL editor'
\echo '2. Then run this migration script: database/RESTORE_DATA.sql'
\echo ''
\echo 'This ensures data safety during the schema migration.'
-- Phase 1: ID Standardization Migration
-- Standardizes all shop identification to use barbershop_id consistently
-- Eliminates shop_id in favor of barbershop_id everywhere

-- This migration is part of the approved 12-week system overhaul
-- Addresses the dual ID system causing lookup complexity

-- ==========================================
-- STEP 1: Analyze Current ID Patterns
-- ==========================================

-- First, let's see what we currently have
-- Query to check profiles table structure
DO $$
BEGIN
    RAISE NOTICE 'Analyzing current ID patterns...';
    
    -- Check if profiles table has both shop_id and barbershop_id columns
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'profiles' AND column_name = 'shop_id') THEN
        RAISE NOTICE 'Found shop_id column in profiles table';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'profiles' AND column_name = 'barbershop_id') THEN
        RAISE NOTICE 'Found barbershop_id column in profiles table';
    END IF;
END $$;

-- ==========================================
-- STEP 2: Profile Table Standardization
-- ==========================================

-- Add barbershop_id column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS barbershop_id UUID REFERENCES barbershops(id) ON DELETE SET NULL;

-- Copy data from shop_id to barbershop_id if shop_id exists and barbershop_id is null
UPDATE profiles 
SET barbershop_id = shop_id 
WHERE shop_id IS NOT NULL 
AND barbershop_id IS NULL
AND EXISTS (SELECT 1 FROM information_schema.columns 
           WHERE table_name = 'profiles' AND column_name = 'shop_id');

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_barbershop_id ON profiles(barbershop_id);

-- ==========================================
-- STEP 3: Update Related Tables
-- ==========================================

-- Ensure all related tables use barbershop_id pattern
-- appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE;

-- Copy from shop_id if needed
UPDATE appointments 
SET barbershop_id = shop_id 
WHERE shop_id IS NOT NULL 
AND barbershop_id IS NULL
AND EXISTS (SELECT 1 FROM information_schema.columns 
           WHERE table_name = 'appointments' AND column_name = 'shop_id');

-- services table  
ALTER TABLE services
ADD COLUMN IF NOT EXISTS barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE;

UPDATE services 
SET barbershop_id = shop_id 
WHERE shop_id IS NOT NULL 
AND barbershop_id IS NULL
AND EXISTS (SELECT 1 FROM information_schema.columns 
           WHERE table_name = 'services' AND column_name = 'shop_id');

-- ==========================================
-- STEP 4: Create Unified Tenant Resolution Function
-- ==========================================

-- This replaces the complex lookup patterns throughout the codebase
CREATE OR REPLACE FUNCTION get_user_barbershop_id(user_id UUID)
RETURNS UUID AS $$
DECLARE
    result_barbershop_id UUID;
BEGIN
    -- Check if user has direct barbershop_id in profiles
    SELECT barbershop_id INTO result_barbershop_id
    FROM profiles 
    WHERE id = user_id AND barbershop_id IS NOT NULL;
    
    IF result_barbershop_id IS NOT NULL THEN
        RETURN result_barbershop_id;
    END IF;
    
    -- Check if user is staff member at a barbershop
    SELECT barbershop_id INTO result_barbershop_id
    FROM barbershop_staff 
    WHERE user_id = user_id AND is_active = true
    LIMIT 1;
    
    RETURN result_barbershop_id; -- Returns NULL if no association found
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- STEP 5: Update Row Level Security Policies
-- ==========================================

-- Create helper function for RLS policies
CREATE OR REPLACE FUNCTION private.user_has_barbershop_access(barbershop_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_barbershop_id(auth.uid()) = barbershop_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================  
-- STEP 6: Data Integrity Checks
-- ==========================================

-- Function to validate ID standardization
CREATE OR REPLACE FUNCTION validate_id_standardization()
RETURNS TABLE(table_name TEXT, issue_count BIGINT, description TEXT) AS $$
BEGIN
    -- Check for profiles with both shop_id and barbershop_id but different values
    RETURN QUERY
    SELECT 'profiles'::TEXT, 
           COUNT(*)::BIGINT,
           'Profiles with conflicting shop_id and barbershop_id values'::TEXT
    FROM profiles 
    WHERE shop_id IS NOT NULL 
    AND barbershop_id IS NOT NULL 
    AND shop_id != barbershop_id
    AND EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'profiles' AND column_name = 'shop_id');
    
    -- Check for appointments missing barbershop_id
    RETURN QUERY
    SELECT 'appointments'::TEXT,
           COUNT(*)::BIGINT,
           'Appointments missing barbershop_id'::TEXT
    FROM appointments
    WHERE barbershop_id IS NULL;
    
    -- Check for services missing barbershop_id  
    RETURN QUERY
    SELECT 'services'::TEXT,
           COUNT(*)::BIGINT,
           'Services missing barbershop_id'::TEXT
    FROM services
    WHERE barbershop_id IS NULL;
    
END;
$$ LANGUAGE plpgsql;

-- Run validation
SELECT * FROM validate_id_standardization();

-- ==========================================
-- STEP 7: Create Migration Log
-- ==========================================

CREATE TABLE IF NOT EXISTS migration_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    migration_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'started', 'completed', 'failed'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO migration_log (migration_name, status, notes)
VALUES ('phase1_id_standardization', 'completed', 
        'Standardized all ID patterns to use barbershop_id. Created get_user_barbershop_id() function for unified tenant resolution.');

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Phase 1 ID Standardization completed successfully!';
    RAISE NOTICE 'New unified function: get_user_barbershop_id(user_id UUID)';
    RAISE NOTICE 'Next: Update application code to use standardized patterns';
END $$;
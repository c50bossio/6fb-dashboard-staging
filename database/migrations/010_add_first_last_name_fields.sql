-- Add First/Last Name Fields Migration
-- File: 010_add_first_last_name_fields.sql
-- Created: 2025-08-26
-- Purpose: Add first_name and last_name fields to profiles table and migrate existing data

-- =======================================
-- ADD FIRST AND LAST NAME FIELDS
-- =======================================

-- Add new fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- =======================================
-- DATA MIGRATION - SPLIT EXISTING FULL_NAME
-- =======================================

-- Function to split full name into first and last name
CREATE OR REPLACE FUNCTION split_full_name_to_first_last()
RETURNS void AS $$
DECLARE
    profile_record RECORD;
    name_parts TEXT[];
    first_name_part TEXT;
    last_name_part TEXT;
BEGIN
    -- Process each profile that has a full_name but no first_name/last_name
    FOR profile_record IN 
        SELECT id, full_name 
        FROM profiles 
        WHERE full_name IS NOT NULL 
        AND full_name != ''
        AND (first_name IS NULL OR first_name = '')
        AND (last_name IS NULL OR last_name = '')
    LOOP
        -- Split the full name by spaces
        name_parts := string_to_array(trim(profile_record.full_name), ' ');
        
        -- Handle different name scenarios
        IF array_length(name_parts, 1) = 1 THEN
            -- Single name - put it in first_name
            first_name_part := name_parts[1];
            last_name_part := '';
        ELSIF array_length(name_parts, 1) = 2 THEN
            -- Two parts - first and last
            first_name_part := name_parts[1];
            last_name_part := name_parts[2];
        ELSIF array_length(name_parts, 1) > 2 THEN
            -- Multiple parts - first is first name, rest is last name
            first_name_part := name_parts[1];
            last_name_part := array_to_string(name_parts[2:array_length(name_parts, 1)], ' ');
        ELSE
            -- Empty or null - skip
            CONTINUE;
        END IF;
        
        -- Clean up the parts
        first_name_part := trim(first_name_part);
        last_name_part := trim(last_name_part);
        
        -- Update the profile
        UPDATE profiles 
        SET 
            first_name = CASE WHEN first_name_part = '' THEN NULL ELSE first_name_part END,
            last_name = CASE WHEN last_name_part = '' THEN NULL ELSE last_name_part END
        WHERE id = profile_record.id;
        
        RAISE NOTICE 'Split name for profile %: "%" -> first: "%", last: "%"', 
                     profile_record.id, profile_record.full_name, first_name_part, last_name_part;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the migration function
SELECT split_full_name_to_first_last();

-- Drop the temporary function
DROP FUNCTION split_full_name_to_first_last();

-- =======================================
-- CREATE INDEXES FOR PERFORMANCE
-- =======================================

-- Add indexes on name fields for searching
CREATE INDEX IF NOT EXISTS idx_profiles_first_name ON profiles(first_name);
CREATE INDEX IF NOT EXISTS idx_profiles_last_name ON profiles(last_name);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_search ON profiles(LOWER(first_name || ' ' || last_name));

-- =======================================
-- CREATE HELPER FUNCTIONS
-- =======================================

-- Function to generate full name from first and last name
CREATE OR REPLACE FUNCTION get_full_name(first_name TEXT, last_name TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Handle various combinations of first and last name
    IF first_name IS NOT NULL AND last_name IS NOT NULL THEN
        RETURN trim(first_name || ' ' || last_name);
    ELSIF first_name IS NOT NULL THEN
        RETURN trim(first_name);
    ELSIF last_name IS NOT NULL THEN
        RETURN trim(last_name);
    ELSE
        RETURN NULL;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get display name (with fallback to email)
CREATE OR REPLACE FUNCTION get_display_name(first_name TEXT, last_name TEXT, email TEXT)
RETURNS TEXT AS $$
DECLARE
    full_name TEXT;
BEGIN
    full_name := get_full_name(first_name, last_name);
    
    IF full_name IS NOT NULL AND full_name != '' THEN
        RETURN full_name;
    ELSIF email IS NOT NULL THEN
        -- Extract name part from email as fallback
        RETURN split_part(email, '@', 1);
    ELSE
        RETURN 'Unknown User';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =======================================
-- UPDATE EXISTING TRIGGERS AND FUNCTIONS
-- =======================================

-- Create or replace trigger to keep full_name in sync (for backward compatibility)
CREATE OR REPLACE FUNCTION sync_full_name_from_parts()
RETURNS TRIGGER AS $$
BEGIN
    -- If first_name or last_name changed, update full_name
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND 
       (NEW.first_name IS DISTINCT FROM OLD.first_name OR NEW.last_name IS DISTINCT FROM OLD.last_name) THEN
        NEW.full_name := get_full_name(NEW.first_name, NEW.last_name);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically sync full_name when first_name or last_name changes
DROP TRIGGER IF EXISTS sync_full_name_trigger ON profiles;
CREATE TRIGGER sync_full_name_trigger
    BEFORE INSERT OR UPDATE OF first_name, last_name ON profiles
    FOR EACH ROW EXECUTE FUNCTION sync_full_name_from_parts();

-- =======================================
-- VALIDATION CONSTRAINTS
-- =======================================

-- Add constraint to ensure at least first_name OR last_name is provided for active users
-- (Note: This is a soft constraint - we'll handle it in application logic)

-- Create a partial index for users with names
CREATE INDEX IF NOT EXISTS idx_profiles_named_users 
ON profiles(id) 
WHERE (first_name IS NOT NULL AND first_name != '') OR (last_name IS NOT NULL AND last_name != '');

-- =======================================
-- MIGRATION VERIFICATION
-- =======================================

-- Function to verify migration success
CREATE OR REPLACE FUNCTION verify_name_migration()
RETURNS TABLE(
    total_profiles INTEGER,
    profiles_with_full_name INTEGER,
    profiles_with_first_name INTEGER, 
    profiles_with_last_name INTEGER,
    profiles_with_both_names INTEGER,
    migration_success_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_profiles,
        COUNT(CASE WHEN full_name IS NOT NULL AND full_name != '' THEN 1 END)::INTEGER as profiles_with_full_name,
        COUNT(CASE WHEN first_name IS NOT NULL AND first_name != '' THEN 1 END)::INTEGER as profiles_with_first_name,
        COUNT(CASE WHEN last_name IS NOT NULL AND last_name != '' THEN 1 END)::INTEGER as profiles_with_last_name,
        COUNT(CASE WHEN (first_name IS NOT NULL AND first_name != '') AND (last_name IS NOT NULL AND last_name != '') THEN 1 END)::INTEGER as profiles_with_both_names,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(CASE WHEN (first_name IS NOT NULL AND first_name != '') OR (last_name IS NOT NULL AND last_name != '') THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
            ELSE 0 
        END as migration_success_rate
    FROM profiles;
END;
$$ LANGUAGE plpgsql;

-- Run verification
SELECT * FROM verify_name_migration();

-- =======================================
-- MIGRATION COMPLETE
-- =======================================

-- Success message
SELECT 'First/Last Name Migration Complete! Added first_name and last_name fields with automatic full_name sync.' as message;
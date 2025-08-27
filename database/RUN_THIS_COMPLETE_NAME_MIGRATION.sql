-- =====================================================
-- COMPLETE NAME FIELD MIGRATION FOR SUPABASE
-- Run this in Supabase SQL Editor
-- =====================================================
-- This migration adds first_name and last_name fields to the profiles table
-- and ensures they work consistently throughout the application
-- =====================================================

-- STEP 1: Add first_name and last_name columns
-- =====================================================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- STEP 2: Migrate existing full_name data to first/last
-- =====================================================
DO $$
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
            first_name_part := name_parts[1];
            last_name_part := '';
        ELSIF array_length(name_parts, 1) = 2 THEN
            first_name_part := name_parts[1];
            last_name_part := name_parts[2];
        ELSIF array_length(name_parts, 1) > 2 THEN
            first_name_part := name_parts[1];
            last_name_part := array_to_string(name_parts[2:array_length(name_parts, 1)], ' ');
        ELSE
            CONTINUE;
        END IF;
        
        -- Update the profile
        UPDATE profiles 
        SET 
            first_name = CASE WHEN trim(first_name_part) = '' THEN NULL ELSE trim(first_name_part) END,
            last_name = CASE WHEN trim(last_name_part) = '' THEN NULL ELSE trim(last_name_part) END
        WHERE id = profile_record.id;
    END LOOP;
END $$;

-- STEP 3: Create helper functions
-- =====================================================
CREATE OR REPLACE FUNCTION get_full_name(first_name TEXT, last_name TEXT)
RETURNS TEXT AS $$
BEGIN
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

-- STEP 4: Create sync trigger for full_name
-- =====================================================
CREATE OR REPLACE FUNCTION sync_full_name_from_parts()
RETURNS TRIGGER AS $$
BEGIN
    -- If first_name or last_name changed, update full_name
    IF (TG_OP = 'INSERT') OR 
       (TG_OP = 'UPDATE' AND (NEW.first_name IS DISTINCT FROM OLD.first_name OR NEW.last_name IS DISTINCT FROM OLD.last_name)) THEN
        NEW.full_name := get_full_name(NEW.first_name, NEW.last_name);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_full_name_trigger ON profiles;
CREATE TRIGGER sync_full_name_trigger
    BEFORE INSERT OR UPDATE OF first_name, last_name ON profiles
    FOR EACH ROW EXECUTE FUNCTION sync_full_name_from_parts();

-- STEP 5: Update user creation trigger
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_first_name TEXT;
    v_last_name TEXT;
    v_full_name TEXT;
    v_phone TEXT;
    v_shop_name TEXT;
    name_parts TEXT[];
BEGIN
    -- Extract first name from metadata (supports both camelCase and snake_case)
    v_first_name := COALESCE(
        NEW.raw_user_meta_data->>'firstName',
        NEW.raw_user_meta_data->>'first_name',
        NULL
    );
    
    -- Extract last name from metadata
    v_last_name := COALESCE(
        NEW.raw_user_meta_data->>'lastName',
        NEW.raw_user_meta_data->>'last_name',
        NULL
    );
    
    -- Extract phone
    v_phone := COALESCE(
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'phoneNumber',
        NULL
    );
    
    -- Extract shop name
    v_shop_name := COALESCE(
        NEW.raw_user_meta_data->>'shopName',
        NEW.raw_user_meta_data->>'shop_name',
        NULL
    );
    
    -- Get or construct full name
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'fullName',
        NULL
    );
    
    -- If we have first/last but no full name, construct it
    IF v_full_name IS NULL AND (v_first_name IS NOT NULL OR v_last_name IS NOT NULL) THEN
        v_full_name := TRIM(COALESCE(v_first_name, '') || ' ' || COALESCE(v_last_name, ''));
    END IF;
    
    -- If we have full name but no first/last, try to split it
    IF v_full_name IS NOT NULL AND v_first_name IS NULL AND v_last_name IS NULL THEN
        name_parts := string_to_array(trim(v_full_name), ' ');
        
        IF array_length(name_parts, 1) >= 1 THEN
            v_first_name := name_parts[1];
        END IF;
        
        IF array_length(name_parts, 1) >= 2 THEN
            v_last_name := array_to_string(name_parts[2:array_length(name_parts, 1)], ' ');
        END IF;
    END IF;
    
    -- Fallback to email username if no name data
    IF v_full_name IS NULL AND v_first_name IS NULL AND v_last_name IS NULL THEN
        v_full_name := split_part(NEW.email, '@', 1);
    END IF;
    
    -- Insert the profile with all name fields
    INSERT INTO public.profiles (
        id, 
        email, 
        first_name,
        last_name,
        full_name, 
        avatar_url, 
        role,
        phone,
        shop_name
    )
    VALUES (
        NEW.id,
        NEW.email,
        v_first_name,
        v_last_name,
        v_full_name,
        COALESCE(
            NEW.raw_user_meta_data->>'avatar_url',
            NEW.raw_user_meta_data->>'avatarUrl',
            NULL
        ),
        COALESCE(
            NEW.raw_user_meta_data->>'role',
            'CLIENT'
        ),
        v_phone,
        v_shop_name
    )
    ON CONFLICT (id) 
    DO UPDATE SET
        email = EXCLUDED.email,
        first_name = COALESCE(profiles.first_name, EXCLUDED.first_name),
        last_name = COALESCE(profiles.last_name, EXCLUDED.last_name),
        full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
        avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
        phone = COALESCE(profiles.phone, EXCLUDED.phone),
        shop_name = COALESCE(profiles.shop_name, EXCLUDED.shop_name),
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION 
    WHEN OTHERS THEN
        -- Log error but don't fail user creation
        RAISE LOG 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
        
        -- Still try to create a minimal profile
        INSERT INTO public.profiles (id, email, full_name)
        VALUES (NEW.id, NEW.email, split_part(NEW.email, '@', 1))
        ON CONFLICT (id) DO NOTHING;
        
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STEP 6: Update existing profiles from auth metadata
-- =====================================================
UPDATE profiles p
SET 
    first_name = COALESCE(
        p.first_name,
        u.raw_user_meta_data->>'firstName',
        u.raw_user_meta_data->>'first_name'
    ),
    last_name = COALESCE(
        p.last_name,
        u.raw_user_meta_data->>'lastName',
        u.raw_user_meta_data->>'last_name'
    ),
    phone = COALESCE(
        p.phone,
        u.raw_user_meta_data->>'phone',
        u.raw_user_meta_data->>'phoneNumber'
    )
FROM auth.users u
WHERE 
    p.id = u.id
    AND (p.first_name IS NULL OR p.last_name IS NULL OR p.phone IS NULL)
    AND u.raw_user_meta_data IS NOT NULL;

-- STEP 7: Create indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_first_name ON profiles(first_name);
CREATE INDEX IF NOT EXISTS idx_profiles_last_name ON profiles(last_name);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_search ON profiles(LOWER(first_name || ' ' || last_name));

-- STEP 8: Verification
-- =====================================================
DO $$
DECLARE
    total_count INTEGER;
    with_first INTEGER;
    with_last INTEGER;
    with_both INTEGER;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN first_name IS NOT NULL THEN 1 END),
        COUNT(CASE WHEN last_name IS NOT NULL THEN 1 END),
        COUNT(CASE WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN 1 END)
    INTO total_count, with_first, with_last, with_both
    FROM profiles;
    
    RAISE NOTICE '======================================';
    RAISE NOTICE 'MIGRATION COMPLETE!';
    RAISE NOTICE '======================================';
    RAISE NOTICE 'Total profiles: %', total_count;
    RAISE NOTICE 'Profiles with first_name: %', with_first;
    RAISE NOTICE 'Profiles with last_name: %', with_last;
    RAISE NOTICE 'Profiles with both names: %', with_both;
    RAISE NOTICE '======================================';
END $$;

-- Final verification query
SELECT 
    'Migration Status' as report,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN first_name IS NOT NULL THEN 1 END) as with_first_name,
    COUNT(CASE WHEN last_name IS NOT NULL THEN 1 END) as with_last_name,
    COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as with_full_name,
    COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as with_phone
FROM profiles;
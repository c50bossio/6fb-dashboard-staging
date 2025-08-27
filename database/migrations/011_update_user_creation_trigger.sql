-- Update User Creation Trigger for First/Last Name Fields
-- File: 011_update_user_creation_trigger.sql
-- Created: 2025-08-26
-- Purpose: Update the handle_new_user trigger to properly populate first_name and last_name from registration metadata

-- =======================================
-- UPDATE USER CREATION TRIGGER
-- =======================================

-- Update the handle_new_user function to include first_name and last_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_first_name TEXT;
    v_last_name TEXT;
    v_full_name TEXT;
    name_parts TEXT[];
BEGIN
    -- Extract first name from metadata
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
        COALESCE(
            NEW.raw_user_meta_data->>'phone',
            NEW.raw_user_meta_data->>'phoneNumber',
            NULL
        ),
        COALESCE(
            NEW.raw_user_meta_data->>'shopName',
            NEW.raw_user_meta_data->>'shop_name',
            NULL
        )
    )
    ON CONFLICT (id) 
    DO UPDATE SET
        email = EXCLUDED.email,
        first_name = COALESCE(profiles.first_name, EXCLUDED.first_name),
        last_name = COALESCE(profiles.last_name, EXCLUDED.last_name),
        full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
        avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
        role = COALESCE(profiles.role, EXCLUDED.role),
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

-- Ensure the trigger is properly set
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =======================================
-- UPDATE EXISTING PROFILES WITHOUT NAMES
-- =======================================

-- For existing profiles that have metadata but missing first/last names
-- This catches any profiles that were created before the trigger update
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
    )
FROM auth.users u
WHERE 
    p.id = u.id
    AND (p.first_name IS NULL OR p.last_name IS NULL)
    AND u.raw_user_meta_data IS NOT NULL;

-- =======================================
-- VERIFICATION
-- =======================================

-- Check how many profiles now have proper name fields
SELECT 
    'Profile Name Status' as check_type,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN first_name IS NOT NULL THEN 1 END) as with_first_name,
    COUNT(CASE WHEN last_name IS NOT NULL THEN 1 END) as with_last_name,
    COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as with_full_name,
    COUNT(CASE WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN 1 END) as with_both_names
FROM profiles;

-- =======================================
-- MIGRATION COMPLETE
-- =======================================

SELECT 'User creation trigger updated! New users will have first_name and last_name properly populated from registration.' as message;
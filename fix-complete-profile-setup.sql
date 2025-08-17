-- Complete fix for profile and barbershop setup
-- This resolves all 406 errors and missing column issues

-- Step 1: Add missing columns to barbershops table
ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 2: Add missing columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS shop_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;

-- Step 3: Create or update the barbershop (without slug first)
INSERT INTO barbershops (
    id,
    name,
    owner_id,
    address,
    phone
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Enterprise Barbershop',
    (SELECT id FROM auth.users WHERE email = 'dev-enterprise@test.com' LIMIT 1),
    '456 Enterprise Ave, Business City, BC 67890',
    '(555) 987-6543'
) ON CONFLICT (id) DO UPDATE
SET 
    name = EXCLUDED.name,
    updated_at = NOW();

-- Step 4: Update slug for the barbershop
UPDATE barbershops 
SET slug = 'enterprise-barbershop'
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- Step 5: Create or update the user profile
DO $$
DECLARE
    user_uuid UUID;
BEGIN
    -- Get the user's ID
    SELECT id INTO user_uuid 
    FROM auth.users 
    WHERE email = 'dev-enterprise@test.com'
    LIMIT 1;
    
    IF user_uuid IS NOT NULL THEN
        -- Insert or update profile
        INSERT INTO profiles (
            id,
            email,
            full_name,
            role,
            shop_id,
            shop_name,
            onboarding_completed,
            onboarding_step,
            onboarding_data
        ) VALUES (
            user_uuid,
            'dev-enterprise@test.com',
            'Dev Enterprise User',
            'ENTERPRISE_OWNER',
            '550e8400-e29b-41d4-a716-446655440000',
            'Enterprise Barbershop',
            false,
            0,
            '{}'
        ) ON CONFLICT (id) DO UPDATE
        SET 
            shop_name = COALESCE(profiles.shop_name, EXCLUDED.shop_name),
            shop_id = COALESCE(profiles.shop_id, EXCLUDED.shop_id),
            role = COALESCE(profiles.role, EXCLUDED.role),
            onboarding_data = COALESCE(profiles.onboarding_data, EXCLUDED.onboarding_data),
            onboarding_step = COALESCE(profiles.onboarding_step, EXCLUDED.onboarding_step),
            updated_at = NOW();
            
        RAISE NOTICE 'Profile processed for dev-enterprise@test.com with ID: %', user_uuid;
    ELSE
        RAISE NOTICE 'User dev-enterprise@test.com not found in auth.users table';
        RAISE NOTICE 'You may need to create the user account first or check the email address';
    END IF;
END $$;

-- Step 6: Verify everything is set up correctly
SELECT 
    'Profile Check' as check_type,
    p.id,
    p.email,
    p.role,
    p.shop_id,
    p.shop_name,
    p.onboarding_completed,
    p.onboarding_step,
    CASE 
        WHEN p.onboarding_data IS NOT NULL THEN '✅ Has onboarding_data'
        ELSE '❌ Missing onboarding_data'
    END as onboarding_data_status
FROM profiles p
INNER JOIN auth.users u ON p.id = u.id
WHERE u.email = 'dev-enterprise@test.com';

-- Step 7: Verify barbershop is set up
SELECT 
    'Barbershop Check' as check_type,
    id,
    name,
    slug,
    owner_id,
    CASE 
        WHEN slug IS NOT NULL THEN '✅ Has slug'
        ELSE '❌ Missing slug'
    END as slug_status
FROM barbershops
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- Step 8: Final validation - Test the exact query that was failing
SELECT 
    'Query Test' as test_type,
    shop_id,
    role,
    shop_name
FROM profiles
WHERE id = (SELECT id FROM auth.users WHERE email = 'dev-enterprise@test.com' LIMIT 1);
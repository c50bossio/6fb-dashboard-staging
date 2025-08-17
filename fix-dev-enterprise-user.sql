-- Fix the dev-enterprise@test.com user profile
-- This resolves the 406 errors for the actual user

-- First, ensure shop_name column exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS shop_name VARCHAR(255);

-- Find the user's ID and check their profile
SELECT 
    u.id as user_id,
    u.email,
    p.id as profile_id,
    p.role,
    p.shop_id,
    p.shop_name
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'dev-enterprise@test.com';

-- Create or update the profile for dev-enterprise@test.com
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
        -- Check if profile exists
        IF NOT EXISTS (
            SELECT 1 FROM profiles WHERE id = user_uuid
        ) THEN
            -- Create the profile
            INSERT INTO profiles (
                id,
                email,
                full_name,
                role,
                shop_id,
                shop_name,
                onboarding_completed,
                onboarding_step,
                onboarding_data,
                created_at,
                updated_at
            ) VALUES (
                user_uuid,
                'dev-enterprise@test.com',
                'Dev Enterprise User',
                'ENTERPRISE_OWNER',
                '550e8400-e29b-41d4-a716-446655440000',
                'Enterprise Barbershop',
                false,
                0,
                '{}',
                NOW(),
                NOW()
            );
            
            RAISE NOTICE 'Profile created for dev-enterprise@test.com with ID: %', user_uuid;
        ELSE
            -- Update existing profile to ensure all required fields are present
            UPDATE profiles 
            SET 
                shop_name = COALESCE(shop_name, 'Enterprise Barbershop'),
                shop_id = COALESCE(shop_id, '550e8400-e29b-41d4-a716-446655440000'),
                role = COALESCE(role, 'ENTERPRISE_OWNER'),
                onboarding_data = COALESCE(onboarding_data, '{}'),
                onboarding_step = COALESCE(onboarding_step, 0),
                updated_at = NOW()
            WHERE id = user_uuid;
            
            RAISE NOTICE 'Profile updated for dev-enterprise@test.com';
        END IF;
    ELSE
        RAISE NOTICE 'User dev-enterprise@test.com not found in auth.users table';
    END IF;
END $$;

-- Verify the profile now exists with all required columns
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.shop_id,
    p.shop_name,
    p.onboarding_completed,
    p.onboarding_step,
    p.onboarding_data::text as onboarding_data,
    p.created_at,
    p.updated_at
FROM profiles p
INNER JOIN auth.users u ON p.id = u.id
WHERE u.email = 'dev-enterprise@test.com';

-- Also ensure the barbershop exists for this user
INSERT INTO barbershops (
    id,
    name,
    slug,
    owner_id,
    address,
    phone,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Enterprise Barbershop',
    'enterprise-barbershop',
    (SELECT id FROM auth.users WHERE email = 'dev-enterprise@test.com' LIMIT 1),
    '456 Enterprise Ave, Business City, BC 67890',
    '(555) 987-6543',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE
SET 
    updated_at = NOW();

-- Show the final result
SELECT 
    'User Profile Check' as check_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Profile exists and is ready'
        ELSE '❌ Profile still missing'
    END as status
FROM profiles p
INNER JOIN auth.users u ON p.id = u.id
WHERE u.email = 'dev-enterprise@test.com'
AND p.shop_name IS NOT NULL
AND p.shop_id IS NOT NULL
AND p.onboarding_data IS NOT NULL;
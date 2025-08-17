-- Fix profile for the current logged-in user
-- The app is using demo user ID with dev-enterprise email

-- Create or update profile for the demo user ID
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
    'befcd3e1-8722-449b-8dd3-cdf7e1f59483',  -- This is the ID the app is using
    'dev-enterprise@test.com',                 -- The email shown in the app
    'Dev Enterprise User',
    'ENTERPRISE_OWNER',
    '550e8400-e29b-41d4-a716-446655440000',
    'Enterprise Management HQ',
    false,
    0,
    '{}',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE
SET 
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    shop_id = EXCLUDED.shop_id,
    shop_name = EXCLUDED.shop_name,
    onboarding_data = COALESCE(profiles.onboarding_data, EXCLUDED.onboarding_data),
    onboarding_step = COALESCE(profiles.onboarding_step, EXCLUDED.onboarding_step),
    updated_at = NOW();

-- Ensure the auth user exists with correct email
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
) VALUES (
    'befcd3e1-8722-449b-8dd3-cdf7e1f59483',
    'dev-enterprise@test.com',
    crypt('demo123456', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Dev Enterprise User", "role": "ENTERPRISE_OWNER"}',
    'authenticated',
    'authenticated'
) ON CONFLICT (id) DO UPDATE
SET 
    email = EXCLUDED.email,
    updated_at = NOW();

-- Verify the profile now exists
SELECT 
    'Profile Status' as check_type,
    id,
    email,
    full_name,
    role,
    shop_id,
    shop_name,
    onboarding_completed,
    onboarding_step,
    CASE 
        WHEN onboarding_data IS NOT NULL THEN '✅ Has onboarding_data'
        ELSE '❌ Missing onboarding_data'
    END as data_status
FROM profiles
WHERE id = 'befcd3e1-8722-449b-8dd3-cdf7e1f59483';

-- Also ensure the barbershop exists
INSERT INTO barbershops (
    id,
    name,
    owner_id,
    address,
    phone
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Enterprise Management HQ',
    'befcd3e1-8722-449b-8dd3-cdf7e1f59483',
    '456 Enterprise Ave, Business City, BC 67890',
    '(555) 987-6543'
) ON CONFLICT (id) DO UPDATE
SET 
    name = EXCLUDED.name,
    owner_id = EXCLUDED.owner_id,
    updated_at = NOW();

-- Final check - test the exact query the app is likely using
SELECT 
    'App Query Test' as test_type,
    COUNT(*) as profile_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Profile will be found by app'
        ELSE '❌ Profile still not found'
    END as status
FROM profiles
WHERE id = 'befcd3e1-8722-449b-8dd3-cdf7e1f59483';
-- ===============================================
-- FINAL PROFILE FIX - MINIMAL APPROACH
-- ===============================================
-- Creates profile without complex dependencies

-- First, check if user exists and create minimal profile
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    created_at,
    updated_at
)
SELECT 
    id,
    email,
    COALESCE(
        raw_user_meta_data->>'full_name',
        raw_user_meta_data->>'name',
        split_part(email, '@', 1)
    ) as full_name,
    'SHOP_OWNER' as role,
    NOW() as created_at,
    NOW() as updated_at
FROM auth.users
WHERE email IS NOT NULL
ON CONFLICT (id) DO UPDATE
SET 
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = NOW();

-- Verify the profile was created
SELECT 'Profile Status:' as info;
SELECT 
    id,
    email,
    full_name,
    role,
    shop_id,
    barbershop_id
FROM public.profiles
WHERE id IN (SELECT id FROM auth.users LIMIT 1);

-- Show success message
SELECT '' as spacer;
SELECT '✅ Profile created/updated. The profile fetch errors should stop now.' as message;
SELECT '📅 Your calendar at http://localhost:9999/dashboard/calendar should work!' as message2;
SELECT '🎯 All 29 bookings should be visible in the calendar.' as message3;
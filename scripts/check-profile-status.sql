-- ============================================================================
-- CHECK PROFILE STATUS FOR c50bossio@gmail.com
-- ============================================================================

-- Check what profile data exists
SELECT 
  'Profile Check' as step,
  id,
  email,
  full_name,
  role,
  barbershop_id,
  shop_id,
  subscription_tier,
  subscription_status,
  is_active,
  created_at,
  updated_at
FROM profiles 
WHERE id = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5';

-- Check if there are any other profiles with this email
SELECT 
  'Email Duplicates Check' as step,
  count(*) as profile_count
FROM profiles 
WHERE email = 'c50bossio@gmail.com';

-- Check all profiles with this email (in case there are duplicates)
SELECT 
  'All Email Profiles' as step,
  id,
  email,
  full_name,
  role,
  barbershop_id,
  shop_id
FROM profiles 
WHERE email = 'c50bossio@gmail.com';

-- Check if there are any barbershops this user could be associated with
SELECT 
  'Available Barbershops' as step,
  id,
  name,
  owner_id
FROM barbershops 
LIMIT 3;
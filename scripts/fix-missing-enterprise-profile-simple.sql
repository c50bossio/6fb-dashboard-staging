-- ============================================================================
-- SIMPLIFIED FIX FOR MISSING ENTERPRISE OWNER PROFILE
-- ============================================================================
-- Only uses core columns that exist in all profile table versions

-- STEP 1: Create the missing profile with ENTERPRISE_OWNER role
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  created_at,
  updated_at
) VALUES (
  'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5',
  'c50bossio@gmail.com',
  'Chris Bossio',
  'ENTERPRISE_OWNER',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  role = 'ENTERPRISE_OWNER',
  full_name = 'Chris Bossio',
  updated_at = NOW();

-- STEP 2: Associate with first available barbershop
UPDATE profiles 
SET barbershop_id = (SELECT id FROM barbershops ORDER BY created_at ASC LIMIT 1)
WHERE id = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5';

-- STEP 3: Verify it worked
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.barbershop_id,
  b.name as barbershop_name
FROM profiles p
LEFT JOIN barbershops b ON p.barbershop_id = b.id
WHERE p.id = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5';

-- SUCCESS MESSAGE
SELECT '✅ Profile created! Go to /shop/barbers and click "Refresh Data"' as result;
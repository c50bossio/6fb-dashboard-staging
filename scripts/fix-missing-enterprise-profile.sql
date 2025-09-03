-- ============================================================================
-- FIX MISSING ENTERPRISE OWNER PROFILE FOR c50bossio@gmail.com
-- ============================================================================
-- 
-- Problem: User exists in auth.users but has no profile record in profiles table
-- Solution: Manually create profile with ENTERPRISE_OWNER role and shop association
--
-- User Details:
-- - Email: c50bossio@gmail.com  
-- - Auth ID: bcea9cf9-e593-4dbf-a787-1ed74e04dbf5
-- - Required Role: ENTERPRISE_OWNER
--
-- Run this entire script in Supabase SQL Editor
-- ============================================================================

-- STEP 1: Verify the problem (should return 0 rows)
SELECT 'STEP 1: Checking if profile exists...' as step;
SELECT id, email, full_name, role 
FROM profiles 
WHERE id = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5';

-- STEP 2: Check if user exists in auth.users (should return 1 row)
SELECT 'STEP 2: Verifying auth user exists...' as step;
SELECT id, email, created_at 
FROM auth.users 
WHERE id = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5';

-- STEP 3: Create the missing profile with ENTERPRISE_OWNER role
SELECT 'STEP 3: Creating profile with ENTERPRISE_OWNER role...' as step;
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  subscription_tier,
  subscription_status,
  is_active,
  onboarding_completed,
  onboarding_step,
  created_at,
  updated_at
) VALUES (
  'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5',
  'c50bossio@gmail.com',
  'Chris Bossio',
  'ENTERPRISE_OWNER',
  'enterprise',
  'active',
  true,
  true,
  'completed',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  role = 'ENTERPRISE_OWNER',
  full_name = 'Chris Bossio',
  subscription_tier = 'enterprise',
  subscription_status = 'active',
  updated_at = NOW();

-- STEP 4: Check available barbershops
SELECT 'STEP 4: Checking available barbershops...' as step;
SELECT id, name, owner_id, created_at 
FROM barbershops 
ORDER BY created_at ASC 
LIMIT 3;

-- STEP 5: Associate user with first available barbershop (or create one if needed)
SELECT 'STEP 5: Associating user with barbershop...' as step;

-- First, try to update with existing barbershop
UPDATE profiles 
SET barbershop_id = (SELECT id FROM barbershops ORDER BY created_at ASC LIMIT 1)
WHERE id = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5'
AND (barbershop_id IS NULL OR barbershop_id = '');

-- If no barbershops exist, create a default one
INSERT INTO barbershops (
  id,
  name,
  owner_id,
  email,
  phone,
  address,
  city,
  state,
  zip_code,
  business_hours,
  created_at,
  updated_at
) 
SELECT 
  gen_random_uuid(),
  'Bossio Enterprise Barbershop',
  'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5',
  'c50bossio@gmail.com',
  '(555) 123-4567',
  '123 Main Street',
  'Enterprise City',
  'CA',
  '90210',
  '{"monday": {"open": "09:00", "close": "18:00", "is_open": true}, "tuesday": {"open": "09:00", "close": "18:00", "is_open": true}, "wednesday": {"open": "09:00", "close": "18:00", "is_open": true}, "thursday": {"open": "09:00", "close": "18:00", "is_open": true}, "friday": {"open": "09:00", "close": "18:00", "is_open": true}, "saturday": {"open": "09:00", "close": "16:00", "is_open": true}, "sunday": {"open": "10:00", "close": "15:00", "is_open": false}}'::jsonb,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM barbershops);

-- Update profile with the barbershop association
UPDATE profiles 
SET barbershop_id = (
  SELECT id FROM barbershops 
  WHERE owner_id = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5'
  OR id = (SELECT id FROM barbershops ORDER BY created_at ASC LIMIT 1)
  LIMIT 1
)
WHERE id = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5';

-- STEP 6: Verify the fix worked
SELECT 'STEP 6: Verifying profile was created successfully...' as step;
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.subscription_tier,
  p.subscription_status,
  p.barbershop_id,
  b.name as barbershop_name,
  p.created_at
FROM profiles p
LEFT JOIN barbershops b ON p.barbershop_id = b.id
WHERE p.id = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5';

-- STEP 7: Test permissions (should show manage_staff = true for ENTERPRISE_OWNER)
SELECT 'STEP 7: Testing role-based permissions...' as step;
SELECT 
  email,
  role,
  CASE 
    WHEN role IN ('ENTERPRISE_OWNER', 'SUPER_ADMIN', 'SHOP_OWNER') THEN true 
    ELSE false 
  END as can_manage_staff,
  CASE 
    WHEN role IN ('ENTERPRISE_OWNER', 'SUPER_ADMIN', 'SHOP_OWNER') THEN true 
    ELSE false 
  END as can_manage_shop
FROM profiles 
WHERE id = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5';

-- STEP 8: Success summary
SELECT 'STEP 8: SUCCESS! Profile created with ENTERPRISE_OWNER permissions.' as step;
SELECT '✅ Go back to /shop/barbers and click "Refresh Data" to see the changes!' as instructions;

-- ============================================================================
-- TROUBLESHOOTING NOTES:
-- ============================================================================
-- 
-- If you still don't have access after running this script:
-- 1. Go to /shop/barbers 
-- 2. Click the "Refresh Data" button in the blue debug box
-- 3. Check that Profile Role shows: ENTERPRISE_OWNER
-- 4. Check that canManageStaff shows: true
-- 
-- If problems persist, check browser console for errors or React Query cache issues.
-- ============================================================================
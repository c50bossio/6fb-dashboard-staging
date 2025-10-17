-- ============================================
-- FIX FOR 406 "Not Acceptable" ERRORS - CORRECTED VERSION
-- Run this script in your Supabase SQL Editor
-- Date: 2025-08-31
-- ============================================

-- Step 1: Fix RLS Policies on barbershops table (CRITICAL for 406 errors)
-- Drop old restrictive policies that may be causing the issue
DROP POLICY IF EXISTS "Public read access" ON barbershops;
DROP POLICY IF EXISTS "Authenticated users can read" ON barbershops;
DROP POLICY IF EXISTS "Users can update own barbershops" ON barbershops;
DROP POLICY IF EXISTS "Owners can update their barbershops" ON barbershops;
DROP POLICY IF EXISTS "Anyone can view active barbershops" ON barbershops;
DROP POLICY IF EXISTS "Owners can manage their barbershops" ON barbershops;
DROP POLICY IF EXISTS "barbershops_select_all" ON barbershops;
DROP POLICY IF EXISTS "barbershops_update_owner" ON barbershops;
DROP POLICY IF EXISTS "barbershops_insert_authenticated" ON barbershops;
DROP POLICY IF EXISTS "barbershops_delete_owner" ON barbershops;

-- Create new permissive policies for barbershops
-- This allows all authenticated users to read barbershops (fixes 406 errors)
CREATE POLICY "barbershops_select_all" 
  ON barbershops FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Allow owners and staff to update
CREATE POLICY "barbershops_update_owner" 
  ON barbershops FOR UPDATE 
  USING (
    auth.uid() = owner_id 
    OR 
    EXISTS (
      SELECT 1 FROM barbershop_staff 
      WHERE barbershop_staff.barbershop_id = barbershops.id 
      AND barbershop_staff.user_id = auth.uid()
      AND barbershop_staff.role IN ('OWNER', 'MANAGER')
    )
  );

-- Allow authenticated users to create barbershops
CREATE POLICY "barbershops_insert_authenticated" 
  ON barbershops FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow owners to delete their barbershops
CREATE POLICY "barbershops_delete_owner" 
  ON barbershops FOR DELETE 
  USING (auth.uid() = owner_id);

-- Step 2: Verify the user profile exists and has proper associations
-- Check if the user exists in auth.users
SELECT 
  id,
  email,
  created_at
FROM auth.users 
WHERE email = 'c50bossio@gmail.com';

-- Check if the user exists in profiles table
SELECT 
  id,
  email,
  role,
  shop_id,
  barbershop_id,
  subscription_status
FROM profiles 
WHERE email = 'c50bossio@gmail.com'
LIMIT 1;

-- Step 3: Check if barbershops exist for this user
SELECT 
  id,
  name,
  owner_id,
  created_at
FROM barbershops 
WHERE owner_id = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5'
LIMIT 5;

-- Step 4: If no barbershop exists, create one for the user
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
  country,
  created_at,
  updated_at
) 
SELECT 
  gen_random_uuid(),
  'Chris Bossio''s Barbershop',
  'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5',
  'c50bossio@gmail.com',
  '',
  '',
  '',
  '',
  '',
  'USA',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM barbershops 
  WHERE owner_id = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5'
);

-- Step 5: Update user profile to ensure proper role and barbershop association
UPDATE profiles 
SET 
  role = 'SHOP_OWNER',
  subscription_status = 'active',
  shop_id = (
    SELECT id FROM barbershops 
    WHERE owner_id = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5' 
    LIMIT 1
  ),
  barbershop_id = (
    SELECT id FROM barbershops 
    WHERE owner_id = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5' 
    LIMIT 1
  ),
  updated_at = NOW()
WHERE email = 'c50bossio@gmail.com';

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_barbershops_owner_id 
  ON barbershops(owner_id);

CREATE INDEX IF NOT EXISTS idx_barbershops_active 
  ON barbershops(is_active) 
  WHERE is_active IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_shop_id 
  ON profiles(shop_id) 
  WHERE shop_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_barbershop_id 
  ON profiles(barbershop_id) 
  WHERE barbershop_id IS NOT NULL;

-- Step 7: Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Step 8: Final verification
SELECT 
  'User Profile' as check_type,
  email,
  role,
  shop_id::text,
  barbershop_id::text
FROM profiles 
WHERE email = 'c50bossio@gmail.com'
UNION ALL  
SELECT 
  'Barbershop' as check_type,
  name as email,
  'N/A' as role,
  id::text as shop_id,
  'N/A' as barbershop_id
FROM barbershops 
WHERE owner_id = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5';

-- You should see the user profile and at least one barbershop after running this script
-- If successful, the 406 errors should be resolved immediately
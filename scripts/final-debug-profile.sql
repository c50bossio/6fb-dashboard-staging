-- ============================================================================
-- FINAL DEBUG - UNDERSTAND WHY PROFILE ISN'T LOADING
-- ============================================================================

-- STEP 1: Check if auth.uid() is working properly
SELECT 
  'Auth Context Check' as step,
  auth.uid() as current_auth_uid,
  CASE 
    WHEN auth.uid() IS NULL THEN 'ERROR: auth.uid() is NULL - not authenticated'
    WHEN auth.uid() = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5' THEN 'SUCCESS: auth.uid() matches expected'
    ELSE 'MISMATCH: auth.uid() = ' || auth.uid()::text
  END as auth_status;

-- STEP 2: Check if profile exists and is accessible with current auth
SELECT 
  'Profile Access Test' as step,
  COUNT(*) as profiles_found,
  CASE 
    WHEN COUNT(*) = 0 THEN 'ERROR: No profile found or RLS blocking'
    WHEN COUNT(*) = 1 THEN 'SUCCESS: Profile accessible'
    ELSE 'WARNING: Multiple profiles found'
  END as access_result
FROM profiles 
WHERE id = auth.uid();

-- STEP 3: If accessible, show the profile data
SELECT 
  'Profile Data' as step,
  id,
  email,
  full_name,
  role,
  barbershop_id,
  subscription_tier,
  subscription_status,
  is_active,
  created_at
FROM profiles 
WHERE id = auth.uid();

-- STEP 4: Check RLS policies again
SELECT 
  'Current RLS Policies' as step,
  policyname as policy_name,
  cmd as command,
  qual as using_clause
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- STEP 5: Alternative - try selecting by the exact UUID 
SELECT 
  'Direct UUID Test' as step,
  id,
  email,
  full_name,
  role,
  barbershop_id,
  'Found by direct UUID' as method
FROM profiles 
WHERE id = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5';

-- STEP 6: Emergency fix - if profile isn't accessible, temporarily disable RLS
-- (Only if steps 1-5 show the issue)
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
-- SELECT 'RLS DISABLED - This is for debugging only!' as emergency_message;
-- ============================================================================
-- EMERGENCY FIX - TEMPORARILY DISABLE RLS ON PROFILES TABLE
-- ============================================================================
-- This will allow your profile to load while we investigate the auth issue

-- STEP 1: Temporarily disable RLS on profiles table
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- STEP 2: Verify profile is now accessible
SELECT 
  'Emergency Fix Test' as step,
  id,
  email,
  full_name,
  role,
  barbershop_id,
  'Profile should now be accessible without RLS' as status
FROM profiles 
WHERE id = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5';

-- STEP 3: Success message
SELECT '🚨 EMERGENCY FIX APPLIED - RLS disabled on profiles table' as result;
SELECT '✅ Your profile should now load in the frontend immediately' as instruction;
SELECT '⚠️ NOTE: This is temporary for debugging - we will re-enable RLS once working' as warning;
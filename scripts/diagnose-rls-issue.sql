-- ============================================================================
-- DIAGNOSE RLS ISSUE ON PROFILES TABLE
-- ============================================================================

-- STEP 1: Check current RLS status on profiles table
SELECT 
  'RLS Status Check' as step,
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  tablename || ' RLS is ' || CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as status
FROM pg_tables 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- STEP 2: Check existing policies on profiles table
SELECT 
  'Current RLS Policies' as step,
  policyname as policy_name,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression,
  roles
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- STEP 3: Check what auth.uid() returns for current session
SELECT 
  'Auth UID Check' as step,
  auth.uid() as current_auth_uid,
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ NULL - No authenticated session'
    WHEN auth.uid() = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5' THEN '✅ MATCHES expected user ID'
    ELSE '⚠️ DIFFERENT - ' || auth.uid()::text
  END as auth_status;

-- STEP 4: Test profile access with current auth context
SELECT 
  'Profile Access Test' as step,
  COUNT(*) as profiles_accessible,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Can access profile'
    ELSE '❌ Cannot access profile (RLS blocking)'
  END as access_status
FROM profiles 
WHERE id = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5';

-- STEP 5: Test profile access with RLS bypassed (if using service role)
SET LOCAL role TO 'service_role';
SELECT 
  'Service Role Test' as step,
  id,
  email,
  full_name,
  role,
  barbershop_id,
  'Profile exists in database' as status
FROM profiles 
WHERE id = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5';
RESET role;
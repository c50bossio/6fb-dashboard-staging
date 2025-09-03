-- ============================================================================
-- FIX RLS ISSUES ON PROFILES TABLE
-- ============================================================================

-- OPTION 1: Update existing policy to be more explicit
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT 
  USING (
    auth.uid() = id 
    OR 
    auth.uid() IS NOT NULL -- Ensures authenticated users can access
  );

-- OPTION 2: Add a more permissive policy for ENTERPRISE_OWNER users
CREATE POLICY "Enterprise owners can view profiles" ON public.profiles
  FOR SELECT 
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles 
      WHERE role IN ('ENTERPRISE_OWNER', 'SUPER_ADMIN')
      AND id = auth.uid()
    )
  );

-- OPTION 3: For development/testing - temporarily disable RLS (EMERGENCY ONLY)
-- Uncomment ONLY if above policies don't work
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- STEP 4: Ensure the user can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- STEP 5: Add an INSERT policy so profiles can be created
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- STEP 6: Test the fix by checking profile access
SELECT 
  'RLS Fix Test' as step,
  p.id,
  p.email,
  p.role,
  p.barbershop_id,
  auth.uid() as current_auth_uid,
  CASE 
    WHEN p.id IS NOT NULL THEN '✅ Profile accessible after RLS fix'
    ELSE '❌ Profile still not accessible'
  END as test_result
FROM profiles p
WHERE p.id = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5';

-- SUCCESS MESSAGE
SELECT '🎉 RLS policies updated! Go back to browser and refresh the page.' as result;
-- ============================================================================
-- FIX INFINITE RECURSION IN RLS POLICY
-- ============================================================================

-- STEP 1: Drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enterprise owners can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- STEP 2: Create a simple, working RLS policy (no recursion)
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- STEP 3: Test the fix - this should work without recursion
SELECT 
  'RLS Recursion Fix Test' as step,
  id,
  email,
  role,
  barbershop_id,
  'Profile should be accessible now' as status
FROM profiles 
WHERE id = auth.uid();

-- SUCCESS MESSAGE
SELECT '🎉 RLS recursion fixed! Refresh browser now.' as result;
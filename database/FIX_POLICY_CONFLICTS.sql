-- ============================================================================
-- FIX: Clean up duplicate/conflicting RLS policies
-- ============================================================================
-- This fixes the 500/406 errors by removing duplicate policies
-- ============================================================================

-- ============================================================================
-- Part 1: Clean up organizations table - Remove ALL old policies
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view organizations" ON public.organizations;
DROP POLICY IF EXISTS "Organization owners can insert" ON public.organizations;
DROP POLICY IF EXISTS "Organization owners can update" ON public.organizations;
DROP POLICY IF EXISTS "Owners can delete their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can insert their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Public can view active organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;
DROP POLICY IF EXISTS "Owners can manage their organizations" ON public.organizations;

-- Create SINGLE, clean policy for each operation
CREATE POLICY "organizations_select_policy"
    ON public.organizations
    FOR SELECT
    USING (true); -- Anyone can view all organizations

CREATE POLICY "organizations_insert_policy"
    ON public.organizations
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id); -- Only owner can insert

CREATE POLICY "organizations_update_policy"
    ON public.organizations
    FOR UPDATE
    USING (auth.uid() = owner_id); -- Only owner can update

CREATE POLICY "organizations_delete_policy"
    ON public.organizations
    FOR DELETE
    USING (auth.uid() = owner_id); -- Only owner can delete

-- ============================================================================
-- Part 2: Verify user_context_preferences policies (should be clean already)
-- ============================================================================

-- These should already exist from the previous migration, but let's verify
-- Drop and recreate to ensure no conflicts

DROP POLICY IF EXISTS "Users can view their own context preferences" ON public.user_context_preferences;
DROP POLICY IF EXISTS "Users can insert their own context preferences" ON public.user_context_preferences;
DROP POLICY IF EXISTS "Users can update their own context preferences" ON public.user_context_preferences;
DROP POLICY IF EXISTS "Users can delete their own context preferences" ON public.user_context_preferences;

CREATE POLICY "user_context_select_policy"
    ON public.user_context_preferences
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "user_context_insert_policy"
    ON public.user_context_preferences
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_context_update_policy"
    ON public.user_context_preferences
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "user_context_delete_policy"
    ON public.user_context_preferences
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Show clean policy list (should be exactly 4 per table)
SELECT
    tablename,
    policyname,
    cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('user_context_preferences', 'organizations')
ORDER BY tablename, cmd, policyname;

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- You should now see:
-- ✅ organizations: exactly 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- ✅ user_context_preferences: exactly 4 policies (SELECT, INSERT, UPDATE, DELETE)
--
-- Next: Hard refresh browser (Cmd+Shift+R) to test!
-- ============================================================================

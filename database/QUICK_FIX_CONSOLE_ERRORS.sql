-- ============================================================================
-- QUICK FIX: Eliminate Console 400/500 Errors
-- ============================================================================
-- Run this in Supabase SQL Editor to fix the console errors in AI Command Center
--
-- This migration creates:
-- 1. user_context_preferences table (fixes 400 Bad Request errors)
-- 2. Fixes organizations table RLS policies (fixes 500 Internal Server errors)
-- ============================================================================

-- ============================================================================
-- Part 1: Create user_context_preferences table
-- ============================================================================

-- Drop table if exists (clean slate)
DROP TABLE IF EXISTS public.user_context_preferences CASCADE;

-- Create table
CREATE TABLE public.user_context_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    default_context JSONB,
    last_context JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create index for fast lookups
CREATE INDEX idx_user_context_preferences_user_id
    ON public.user_context_preferences(user_id);

-- Enable Row Level Security
ALTER TABLE public.user_context_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (users can only access their own data)
CREATE POLICY "Users can view their own context preferences"
    ON public.user_context_preferences
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own context preferences"
    ON public.user_context_preferences
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own context preferences"
    ON public.user_context_preferences
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own context preferences"
    ON public.user_context_preferences
    FOR DELETE
    USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.user_context_preferences TO authenticated;
GRANT SELECT ON public.user_context_preferences TO anon;

-- ============================================================================
-- Part 2: Fix organizations table (create if doesn't exist, fix RLS)
-- ============================================================================

-- Create organizations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index if not exists
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id
    ON public.organizations(owner_id);

-- Enable Row Level Security
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can insert their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can delete their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can manage their organizations" ON public.organizations;

-- Create fresh RLS policies
CREATE POLICY "Anyone can view organizations"
    ON public.organizations
    FOR SELECT
    USING (true);

CREATE POLICY "Owners can insert their organizations"
    ON public.organizations
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their organizations"
    ON public.organizations
    FOR UPDATE
    USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their organizations"
    ON public.organizations
    FOR DELETE
    USING (auth.uid() = owner_id);

-- Grant permissions
GRANT ALL ON public.organizations TO authenticated;
GRANT SELECT ON public.organizations TO anon;

-- ============================================================================
-- Part 3: Add update triggers for automatic timestamps
-- ============================================================================

-- Create or replace the update function (reusable)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for user_context_preferences
DROP TRIGGER IF EXISTS update_user_context_preferences_updated_at
    ON public.user_context_preferences;

CREATE TRIGGER update_user_context_preferences_updated_at
    BEFORE UPDATE ON public.user_context_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for organizations
DROP TRIGGER IF EXISTS update_organizations_updated_at
    ON public.organizations;

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Verification Queries (run these to confirm success)
-- ============================================================================

-- Check if tables exist
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('user_context_preferences', 'organizations')
ORDER BY table_name;

-- Check if RLS is enabled
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user_context_preferences', 'organizations');

-- Check policies
SELECT
    tablename,
    policyname,
    cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('user_context_preferences', 'organizations')
ORDER BY tablename, policyname;

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- After running this migration:
-- ✅ user_context_preferences table created (fixes 400 errors)
-- ✅ organizations table verified/fixed (fixes 500 errors)
-- ✅ RLS policies properly configured
-- ✅ Triggers added for automatic timestamp updates
-- ✅ Proper permissions granted
--
-- Next step: Hard refresh browser (Cmd+Shift+R) to see clean console!
-- ============================================================================

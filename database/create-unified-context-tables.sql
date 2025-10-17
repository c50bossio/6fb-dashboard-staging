-- ============================================================================
-- Create Unified Context Tables for AI Command Center
-- ============================================================================
-- This migration creates the tables needed by UnifiedContextProvider
-- to manage organization and user context preferences
--
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. CREATE USER_CONTEXT_PREFERENCES TABLE
-- ============================================================================
-- Stores user's preferred context (organization/location/resource) and last used context
CREATE TABLE IF NOT EXISTS public.user_context_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    default_context JSONB,
    last_context JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure one record per user
    UNIQUE(user_id)
);

-- Add index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_context_preferences_user_id
    ON public.user_context_preferences(user_id);

-- Enable Row Level Security
ALTER TABLE public.user_context_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own preferences
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
-- 2. VERIFY AND FIX ORGANIZATIONS TABLE
-- ============================================================================
-- The organizations table should already exist, but we'll verify and fix RLS policies

-- Create organizations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id
    ON public.organizations(owner_id);

-- Enable Row Level Security
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can manage their organizations" ON public.organizations;

-- Create comprehensive RLS policies
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
-- 3. ADD UPDATE TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to update updated_at automatically
DROP TRIGGER IF EXISTS update_user_context_preferences_updated_at
    ON public.user_context_preferences;
CREATE TRIGGER update_user_context_preferences_updated_at
    BEFORE UPDATE ON public.user_context_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizations_updated_at
    ON public.organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. VERIFICATION QUERIES
-- ============================================================================

-- Verify tables were created successfully
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('user_context_preferences', 'organizations')
ORDER BY table_name;

-- Verify RLS is enabled
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user_context_preferences', 'organizations');

-- Verify policies exist
SELECT
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('user_context_preferences', 'organizations')
ORDER BY tablename, policyname;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- The following tables are now ready:
--   ✓ user_context_preferences - Stores user context preferences
--   ✓ organizations - Stores enterprise organization data
--
-- Both tables have:
--   ✓ Row Level Security enabled
--   ✓ Proper RLS policies for user data isolation
--   ✓ Update triggers for timestamp management
--   ✓ Indexes for query performance
--   ✓ Proper foreign key constraints
-- ============================================================================

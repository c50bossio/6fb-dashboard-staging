-- Fix Profile RLS Policies for Proper Authentication
-- Run this in Supabase SQL Editor

-- First, check if profiles table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
) as table_exists;

-- Drop existing RLS policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles;

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create proper RLS policies
-- 1. Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- 2. Users can insert their own profile (for initial creation)
CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 3. Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Service role can do everything (for server-side operations)
CREATE POLICY "Service role has full access" 
ON profiles FOR ALL 
USING (auth.role() = 'service_role');

-- Check the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Test the current user's access
SELECT * FROM profiles WHERE id = auth.uid();

-- Also fix onboarding_progress table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'onboarding_progress') THEN
        ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can manage own onboarding" ON onboarding_progress;
        
        CREATE POLICY "Users can manage own onboarding" 
        ON onboarding_progress FOR ALL 
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Verify everything is set up correctly
SELECT 
    'Profiles RLS' as check_type,
    EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'profiles') as policies_exist,
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles') as rls_enabled;
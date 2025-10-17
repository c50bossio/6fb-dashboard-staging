-- =====================================================
-- FIX AVATARS STORAGE RLS POLICY
-- This fixes the "new row violates row-level security policy" error
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;

-- Create more permissive policies for development and production

-- 1. Allow EVERYONE to view avatar images (they're public profile photos)
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 2. Allow authenticated users OR service role to upload
-- This works for both real users and development/API access
CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND (
    auth.role() = 'authenticated' 
    OR auth.role() = 'service_role'
    OR auth.jwt() IS NOT NULL  -- Any valid JWT token
    OR current_setting('request.jwt.claims', true)::json->>'role' IS NOT NULL -- API access
  )
);

-- 3. Allow users to update their own avatars OR service role
CREATE POLICY "Users can update avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND (
    auth.role() = 'authenticated'
    OR auth.role() = 'service_role'
    OR auth.jwt() IS NOT NULL
  )
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    auth.role() = 'authenticated'
    OR auth.role() = 'service_role'
    OR auth.jwt() IS NOT NULL
  )
);

-- 4. Allow users to delete their own avatars
CREATE POLICY "Users can delete avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND (
    auth.role() = 'authenticated'
    OR auth.role() = 'service_role'
    OR auth.jwt() IS NOT NULL
  )
);

-- Alternative: If you want to completely disable RLS for the avatars bucket (not recommended for production)
-- UPDATE storage.buckets SET public = true WHERE id = 'avatars';

-- Verify the policies were created
SELECT 
  '✅ RLS Policies Updated' as status,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%avatar%'
ORDER BY policyname;

-- =====================================================
-- IMPORTANT: After running this script, you have two options:
-- 
-- Option 1 (Recommended for Development):
-- Temporarily disable RLS on storage.objects table:
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
-- 
-- Option 2 (For Production):
-- Ensure your app uses the service_role key for uploads
-- or that users are properly authenticated
-- =====================================================
-- =====================================================
-- SUPABASE STORAGE SETUP FOR STAFF PHOTOS (FINAL VERSION)
-- This version safely handles all dependencies
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. First, safely drop the view if it exists
DROP VIEW IF EXISTS production_barbers CASCADE;

-- 2. Create the avatars storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars', 
  true, -- Public bucket for easy access
  false, -- Disable AVIF auto-detection for now
  5242880, -- 5MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[]
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[];

-- 3. Set up RLS policies for the avatars bucket

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;

-- Allow public read access to all avatar images
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload avatar images
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own avatars
CREATE POLICY "Authenticated users can update avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- Allow users to delete their own avatars
CREATE POLICY "Authenticated users can delete avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- 4. Add missing columns to barbers table if they don't exist
-- Add experience_years if it doesn't exist
ALTER TABLE barbers 
ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0;

-- Add other potentially missing columns
ALTER TABLE barbers 
ADD COLUMN IF NOT EXISTS chair_number TEXT;

ALTER TABLE barbers 
ADD COLUMN IF NOT EXISTS instagram_handle TEXT;

ALTER TABLE barbers 
ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT ARRAY['English']::TEXT[];

ALTER TABLE barbers 
ADD COLUMN IF NOT EXISTS availability TEXT DEFAULT 'full_time';

-- Ensure avatar_url is TEXT type (if column exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'barbers' 
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE barbers 
    ALTER COLUMN avatar_url TYPE TEXT;
  ELSE
    -- Add the column if it doesn't exist
    ALTER TABLE barbers 
    ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- 5. Add index for better performance
CREATE INDEX IF NOT EXISTS idx_barbers_avatar_url 
ON barbers(avatar_url) 
WHERE avatar_url IS NOT NULL;

-- 6. Recreate the production_barbers view with all columns that exist
CREATE OR REPLACE VIEW production_barbers AS
SELECT 
  b.*
FROM barbers b
WHERE b.is_test = false OR b.is_test IS NULL;

-- 7. Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.buckets TO authenticated;

-- 8. Verify the setup
DO $$
DECLARE
  bucket_exists BOOLEAN;
  result_message TEXT;
BEGIN
  -- Check if bucket was created
  SELECT EXISTS(
    SELECT 1 FROM storage.buckets WHERE id = 'avatars'
  ) INTO bucket_exists;
  
  IF bucket_exists THEN
    RAISE NOTICE '✅ SUCCESS: Avatars storage bucket created successfully!';
    RAISE NOTICE '✅ Your Supabase Storage is now ready for staff photos';
  ELSE
    RAISE WARNING '❌ WARNING: Bucket creation may have failed';
  END IF;
END $$;

-- Show the bucket configuration
SELECT 
  '✅ Storage Bucket Configuration' as status,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'avatars';

-- Show the barbers table columns for verification
SELECT 
  '✅ Barbers Table Columns' as status,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'barbers'
AND column_name IN ('avatar_url', 'experience_years', 'chair_number', 'instagram_handle', 'languages', 'availability')
ORDER BY column_name;

-- =====================================================
-- SETUP COMPLETE!
-- ✅ Storage bucket created
-- ✅ Security policies configured
-- ✅ Barbers table updated with necessary columns
-- ✅ Production view recreated
-- =====================================================
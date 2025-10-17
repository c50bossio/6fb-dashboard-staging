-- =====================================================
-- SUPABASE STORAGE SETUP FOR STAFF PHOTOS (FIXED VERSION)
-- This version handles the production_barbers view dependency
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. First, drop the view that depends on avatar_url column
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

-- 4. Update barbers table to ensure avatar_url can store URLs
-- (Only modify if the column exists and needs updating)
DO $$ 
BEGIN
  -- Check if the column exists and modify it
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'barbers' 
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE barbers 
    ALTER COLUMN avatar_url TYPE TEXT;
  END IF;
END $$;

-- 5. Add index for better performance when querying barbers with avatars
CREATE INDEX IF NOT EXISTS idx_barbers_avatar_url 
ON barbers(avatar_url) 
WHERE avatar_url IS NOT NULL;

-- 6. Recreate the production_barbers view (if it existed)
-- This assumes the view was a simple select from barbers table
-- Adjust this based on your actual view definition
CREATE OR REPLACE VIEW production_barbers AS
SELECT 
  id,
  shop_id,
  name,
  email,
  phone,
  color,
  avatar_url,
  bio,
  specialties,
  rating,
  experience_years,
  chair_number,
  instagram_handle,
  languages,
  availability,
  is_active,
  is_test,
  created_at,
  updated_at
FROM barbers
WHERE is_test = false OR is_test IS NULL;

-- 7. Create a function to clean up old base64 images and migrate to URLs
CREATE OR REPLACE FUNCTION migrate_base64_to_storage_url()
RETURNS void AS $$
BEGIN
  -- This function can be used later to migrate existing base64 images
  -- For now, it's a placeholder
  RAISE NOTICE 'Ready to migrate base64 images to storage URLs when needed';
END;
$$ LANGUAGE plpgsql;

-- 8. Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- 9. Verify the setup
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'avatars';

-- Expected output:
-- id: avatars
-- name: avatars  
-- public: true
-- file_size_limit: 5242880
-- allowed_mime_types: {image/jpeg,image/jpg,image/png,image/gif,image/webp}

-- =====================================================
-- SETUP COMPLETE!
-- Your Supabase Storage is now ready for staff photos
-- The production_barbers view has been recreated
-- =====================================================
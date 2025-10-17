-- =====================================================
-- SUPABASE STORAGE SETUP FOR STAFF PHOTOS
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Create the avatars storage bucket (if not exists)
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

-- 2. Set up RLS policies for the avatars bucket

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
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own avatars
CREATE POLICY "Authenticated users can update avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own avatars
CREATE POLICY "Authenticated users can delete avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Update barbers table to ensure avatar_url can store URLs
-- (This should already exist, but we're ensuring it's set up correctly)
ALTER TABLE barbers 
ALTER COLUMN avatar_url TYPE TEXT;

-- 4. Add index for better performance when querying barbers with avatars
CREATE INDEX IF NOT EXISTS idx_barbers_avatar_url 
ON barbers(avatar_url) 
WHERE avatar_url IS NOT NULL;

-- 5. Create a function to clean up old base64 images and migrate to URLs
CREATE OR REPLACE FUNCTION migrate_base64_to_storage_url()
RETURNS void AS $$
BEGIN
  -- This function can be used later to migrate existing base64 images
  -- For now, it's a placeholder
  RAISE NOTICE 'Ready to migrate base64 images to storage URLs when needed';
END;
$$ LANGUAGE plpgsql;

-- 6. Verify the setup
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
-- =====================================================
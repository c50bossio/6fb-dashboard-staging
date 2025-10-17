-- ============================================
-- SUPABASE STORAGE SETUP FOR SERVICE IMAGES
-- ============================================
-- Run this ONCE in your Supabase SQL Editor to create the storage bucket
-- Path: SQL Editor > New Query > Paste this > Run

-- 1. Create the storage bucket for service images
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'service-images',
  'service-images', 
  true, -- Public bucket so images can be displayed without authentication
  false, -- Disable AVIF auto-detection for now
  5242880, -- 5MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']::text[];

-- 2. Set up RLS policies for the bucket
-- Allow anyone to view images (since bucket is public)
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'service-images');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'service-images' 
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to update their own images
CREATE POLICY "Authenticated users can update images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'service-images' 
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete their own images
CREATE POLICY "Authenticated users can delete images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'service-images' 
    AND auth.role() = 'authenticated'
  );

-- 3. Verify the bucket was created
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'service-images';

-- Expected output:
-- id              | name           | public | file_size_limit | allowed_mime_types
-- ----------------+----------------+--------+-----------------+-------------------
-- service-images  | service-images | true   | 5242880         | {image/jpeg,image/jpg,image/png,image/webp,image/gif}

-- ✅ Storage bucket setup complete!
-- You can now upload service images up to 5MB in size.
-- Supported formats: JPEG, PNG, WebP, GIF

-- 📝 NOTES:
-- • Images are publicly accessible (good for service displays)
-- • 5MB limit prevents huge uploads
-- • Only image formats are allowed (no PDFs, videos, etc.)
-- • The bucket name 'service-images' matches what the code expects
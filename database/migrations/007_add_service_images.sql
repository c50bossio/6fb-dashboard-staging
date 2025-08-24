-- Migration: Add image support to services table
-- Date: 2025-08-24
-- Purpose: Enable service image uploads for visual service presentation
-- Author: System

-- ============================================
-- Add image columns to services table
-- ============================================

-- Add image_url column for main service image
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add thumbnail_url for performance optimization (optional smaller version)
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add image metadata for better management
ALTER TABLE services
ADD COLUMN IF NOT EXISTS image_metadata JSONB DEFAULT '{}';

-- ============================================
-- Create indexes for performance
-- ============================================

-- Index for services with images (for filtering)
CREATE INDEX IF NOT EXISTS idx_services_has_image 
ON services((image_url IS NOT NULL));

-- ============================================
-- Update RLS policies if needed
-- ============================================

-- Note: Existing RLS policies for services table already cover these new columns
-- No additional policies needed as image_url is just data, not a separate resource

-- ============================================
-- Add comments for documentation
-- ============================================

COMMENT ON COLUMN services.image_url IS 'URL to the main service image stored in Supabase Storage';
COMMENT ON COLUMN services.thumbnail_url IS 'URL to a thumbnail version for performance optimization';
COMMENT ON COLUMN services.image_metadata IS 'JSON metadata about the image (dimensions, size, upload date, etc.)';

-- ============================================
-- Migration complete
-- ============================================

-- To apply this migration in production:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Or use: supabase db push (if using Supabase CLI)
-- 3. Verify with: SELECT column_name FROM information_schema.columns WHERE table_name = 'services';
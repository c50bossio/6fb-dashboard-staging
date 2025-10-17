-- ============================================
-- QUICK MIGRATION SCRIPT FOR SERVICE IMAGES
-- ============================================
-- Run this entire script in your Supabase SQL Editor
-- Path: SQL Editor > New Query > Paste this > Run

-- 1. Add image columns to services table
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS image_metadata JSONB DEFAULT '{}';

-- 2. Create performance index
CREATE INDEX IF NOT EXISTS idx_services_has_image 
ON services((image_url IS NOT NULL));

-- 3. Add documentation comments
COMMENT ON COLUMN services.image_url IS 'URL to the main service image stored in Supabase Storage';
COMMENT ON COLUMN services.thumbnail_url IS 'URL to a thumbnail version for performance optimization';
COMMENT ON COLUMN services.image_metadata IS 'JSON metadata about the image (dimensions, size, upload date, etc.)';

-- 4. Verify the migration worked
SELECT 
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'services' 
    AND column_name IN ('image_url', 'thumbnail_url', 'image_metadata')
ORDER BY 
    ordinal_position;

-- Expected output:
-- column_name      | data_type | is_nullable
-- -----------------+-----------+-------------
-- image_url        | text      | YES
-- thumbnail_url    | text      | YES  
-- image_metadata   | jsonb     | YES

-- ✅ Migration complete! 
-- You can now upload images for services in your application.
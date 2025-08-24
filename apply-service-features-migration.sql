-- ============================================
-- SERVICE FEATURES MIGRATION
-- ============================================
-- Adds support for featured services, online booking control, 
-- and consultation requirements to the services table
--
-- Run this entire script in your Supabase SQL Editor:
-- Path: SQL Editor > New Query > Paste this > Run

-- 1. Add feature columns to services table
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS online_booking_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS requires_consultation BOOLEAN DEFAULT false;

-- 2. Create indexes for performance
-- Index for featured services (commonly filtered)
CREATE INDEX IF NOT EXISTS idx_services_featured 
ON services(shop_id, is_featured) 
WHERE is_featured = true;

-- Index for bookable services
CREATE INDEX IF NOT EXISTS idx_services_bookable 
ON services(shop_id, online_booking_enabled, is_active) 
WHERE online_booking_enabled = true AND is_active = true;

-- 3. Add documentation comments
COMMENT ON COLUMN services.is_featured IS 'Whether this service should be highlighted/promoted in the UI';
COMMENT ON COLUMN services.online_booking_enabled IS 'Whether customers can book this service online (vs phone/walk-in only)';
COMMENT ON COLUMN services.requires_consultation IS 'Whether this service requires a consultation before booking';

-- 4. Update existing services to sensible defaults (optional)
-- This ensures all existing services are bookable online by default
UPDATE services 
SET online_booking_enabled = true 
WHERE online_booking_enabled IS NULL;

-- 5. Verify the migration worked
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'services' 
    AND column_name IN ('is_featured', 'online_booking_enabled', 'requires_consultation')
ORDER BY 
    ordinal_position;

-- Expected output:
-- column_name              | data_type | is_nullable | column_default
-- -------------------------+-----------+-------------+----------------
-- is_featured              | boolean   | YES         | false
-- online_booking_enabled   | boolean   | YES         | true
-- requires_consultation    | boolean   | YES         | false

-- ✅ Migration complete! 
-- All service features are now available in your application.
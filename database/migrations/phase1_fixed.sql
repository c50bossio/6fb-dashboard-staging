-- Phase 1: ID Standardization Migration (Fixed)
-- This properly handles the string shop_id issue and completes our Phase 1-2 standardization

-- ==========================================
-- STEP 1: Add barbershop_id to services table
-- ==========================================
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE;

-- Since shop_id contains strings like "demo-shop-001", we need a different approach
-- We'll need to properly link services to actual barbershops
-- For now, add the column structure

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_services_barbershop_id ON services(barbershop_id);

-- ==========================================
-- STEP 2: Add barbershop_id to appointments table
-- ==========================================
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_appointments_barbershop_id ON appointments(barbershop_id);

-- ==========================================
-- STEP 3: Add barbershop_id to customers table
-- ==========================================
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_customers_barbershop_id ON customers(barbershop_id);

-- ==========================================
-- STEP 4: Fix column names for services
-- ==========================================
-- Add 'active' column to services (our code expects this)
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- If there's an is_active column, copy its data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'services' AND column_name = 'is_active') THEN
        UPDATE services SET active = is_active WHERE active IS NULL;
    END IF;
END $$;

-- ==========================================
-- STEP 5: Handle the data migration
-- ==========================================
-- First, let's check if we have any real barbershops
-- If you have a specific barbershop ID, update this:

-- Option 1: If you have a default barbershop, uncomment and update this:
-- UPDATE services 
-- SET barbershop_id = 'YOUR-BARBERSHOP-UUID-HERE'
-- WHERE barbershop_id IS NULL;

-- Option 2: Create a default barbershop if none exists:
INSERT INTO barbershops (id, name, owner_id, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'Default Barbershop',
    (SELECT id FROM auth.users LIMIT 1),
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM barbershops LIMIT 1);

-- Link orphaned services to the default barbershop
UPDATE services 
SET barbershop_id = (SELECT id FROM barbershops LIMIT 1)
WHERE barbershop_id IS NULL;

-- Link orphaned appointments to the default barbershop
UPDATE appointments 
SET barbershop_id = (SELECT id FROM barbershops LIMIT 1)
WHERE barbershop_id IS NULL;

-- Link orphaned customers to the default barbershop
UPDATE customers 
SET barbershop_id = (SELECT id FROM barbershops LIMIT 1)
WHERE barbershop_id IS NULL;

-- ==========================================
-- CLEANUP: Remove the old shop_id columns (Phase 1-2 doesn't need them)
-- ==========================================
-- Only uncomment these if you're sure you want to remove shop_id:
-- ALTER TABLE services DROP COLUMN IF EXISTS shop_id;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS shop_id;
-- ALTER TABLE customers DROP COLUMN IF EXISTS shop_id;

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================
-- After running, check with:
-- SELECT COUNT(*) as total_services, 
--        COUNT(barbershop_id) as services_with_barbershop
-- FROM services;

-- SELECT id, name FROM barbershops;
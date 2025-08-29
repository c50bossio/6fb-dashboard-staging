-- Phase 1: ID Standardization Migration (Simplified)
-- Run this in Supabase SQL Editor
-- This adds barbershop_id columns to match our Phase 1-2 system design

-- ==========================================
-- STEP 1: Add barbershop_id to services table
-- ==========================================
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE;

-- Copy existing shop_id data to barbershop_id
UPDATE services 
SET barbershop_id = shop_id::uuid
WHERE shop_id IS NOT NULL 
AND barbershop_id IS NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_services_barbershop_id ON services(barbershop_id);

-- ==========================================
-- STEP 2: Add barbershop_id to appointments table
-- ==========================================
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE;

-- Copy existing shop_id data to barbershop_id
UPDATE appointments 
SET barbershop_id = shop_id::uuid
WHERE shop_id IS NOT NULL 
AND barbershop_id IS NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_appointments_barbershop_id ON appointments(barbershop_id);

-- ==========================================
-- STEP 3: Add barbershop_id to customers table
-- ==========================================
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE;

-- Copy existing shop_id data to barbershop_id
UPDATE customers 
SET barbershop_id = shop_id::uuid
WHERE shop_id IS NOT NULL 
AND barbershop_id IS NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_customers_barbershop_id ON customers(barbershop_id);

-- ==========================================
-- STEP 4: Fix column names
-- ==========================================
-- Add 'active' column to services if it's called something else
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
-- VERIFICATION QUERIES (Run these after migration)
-- ==========================================
-- Check services table:
-- SELECT COUNT(*) as total, 
--        COUNT(barbershop_id) as with_barbershop_id,
--        COUNT(shop_id) as with_shop_id
-- FROM services;

-- Check appointments table:
-- SELECT COUNT(*) as total,
--        COUNT(barbershop_id) as with_barbershop_id,
--        COUNT(shop_id) as with_shop_id  
-- FROM appointments;

-- Check customers table:
-- SELECT COUNT(*) as total,
--        COUNT(barbershop_id) as with_barbershop_id,
--        COUNT(shop_id) as with_shop_id
-- FROM customers;
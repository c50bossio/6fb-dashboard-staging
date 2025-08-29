-- Check and Fix Migration
-- Let's first understand what we have before making changes

-- ==========================================
-- STEP 1: Check what exists
-- ==========================================

-- Check if appointments is a view or table
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
AND table_name IN ('appointments', 'services', 'customers', 'barbershops');

-- Check columns in services
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'services'
AND column_name IN ('shop_id', 'barbershop_id', 'active', 'is_active')
ORDER BY column_name;

-- ==========================================
-- STEP 2: Fix services table to match our code
-- ==========================================

-- Our code expects 'active' but database has 'is_active'
-- Let's add an 'active' column that mirrors is_active
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS active BOOLEAN;

-- Copy is_active to active
UPDATE services 
SET active = is_active 
WHERE active IS NULL;

-- Our code expects 'barbershop_id' but database has 'shop_id'  
-- Since appointments already has barbershop_id, let's add it to services too
ALTER TABLE services
ADD COLUMN IF NOT EXISTS barbershop_id UUID;

-- For existing services, copy shop_id to barbershop_id if it's a valid UUID
-- First check if we have any valid UUIDs in shop_id
UPDATE services
SET barbershop_id = 
    CASE 
        WHEN shop_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN shop_id::uuid
        ELSE NULL
    END
WHERE barbershop_id IS NULL;

-- If no valid UUIDs, link to first available barbershop
UPDATE services
SET barbershop_id = (SELECT id FROM barbershops LIMIT 1)
WHERE barbershop_id IS NULL;

-- ==========================================  
-- STEP 3: Verify the changes
-- ==========================================

-- Check services columns after migration
SELECT 
    COUNT(*) as total_services,
    COUNT(barbershop_id) as with_barbershop_id,
    COUNT(active) as with_active
FROM services;

-- Check if we can now query with the expected columns
SELECT id, name, barbershop_id, active
FROM services
LIMIT 5;
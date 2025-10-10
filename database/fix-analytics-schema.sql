-- Fix Analytics Schema Issues
-- This script addresses the missing columns and UUID format issues

-- 1. Add missing last_visit_at column to customers table (if it doesn't exist)
ALTER TABLE IF EXISTS customers 
ADD COLUMN IF NOT EXISTS last_visit_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Create demo barbershop with proper UUID if it doesn't exist
INSERT INTO barbershops (id, name, created_at, updated_at)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
    'Demo Barbershop',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 3. Update any existing demo data to use the proper UUID
UPDATE customers 
SET barbershop_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid
WHERE barbershop_id IS NULL OR barbershop_id::text = 'demo-shop-001';

UPDATE appointments 
SET barbershop_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid
WHERE barbershop_id IS NULL OR barbershop_id::text = 'demo-shop-001';

UPDATE services 
SET barbershop_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid
WHERE barbershop_id IS NULL OR barbershop_id::text = 'demo-shop-001';

-- 4. Insert some demo data for testing analytics
INSERT INTO customers (id, barbershop_id, name, email, phone, created_at, last_visit_at)
VALUES 
    (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'John Smith', 'john@example.com', '+1234567890', NOW() - INTERVAL '30 days', NOW() - INTERVAL '5 days'),
    (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'Mike Johnson', 'mike@example.com', '+1234567891', NOW() - INTERVAL '60 days', NOW() - INTERVAL '10 days'),
    (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'David Brown', 'david@example.com', '+1234567892', NOW() - INTERVAL '15 days', NOW() - INTERVAL '2 days')
ON CONFLICT (email) DO NOTHING;

-- 5. Insert demo services
INSERT INTO services (id, barbershop_id, name, price, duration, created_at)
VALUES 
    (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'Classic Cut', 25.00, 30, NOW()),
    (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'Beard Trim', 15.00, 15, NOW()),
    (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'Full Service', 40.00, 45, NOW())
ON CONFLICT (barbershop_id, name) DO NOTHING;

-- 6. Insert demo appointments for revenue data
WITH demo_customers AS (
    SELECT id as customer_id FROM customers 
    WHERE barbershop_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid 
    LIMIT 3
),
demo_services AS (
    SELECT id as service_id, price FROM services 
    WHERE barbershop_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid
)
INSERT INTO appointments (id, barbershop_id, customer_id, service_id, status, start_time, end_time, price, created_at)
SELECT 
    gen_random_uuid(),
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
    dc.customer_id,
    ds.service_id,
    'completed',
    NOW() - INTERVAL '7 days' + (ROW_NUMBER() OVER () || ' hours')::INTERVAL,
    NOW() - INTERVAL '7 days' + (ROW_NUMBER() OVER () || ' hours')::INTERVAL + INTERVAL '30 minutes',
    ds.price,
    NOW() - INTERVAL '7 days'
FROM demo_customers dc
CROSS JOIN demo_services ds
LIMIT 5
ON CONFLICT DO NOTHING;

-- 7. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customers_barbershop_last_visit ON customers(barbershop_id, last_visit_at);
CREATE INDEX IF NOT EXISTS idx_appointments_barbershop_status ON appointments(barbershop_id, status);
CREATE INDEX IF NOT EXISTS idx_services_barbershop ON services(barbershop_id);

-- Output confirmation
SELECT 
    'Schema fixes applied successfully!' as message,
    (SELECT COUNT(*) FROM customers WHERE barbershop_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid) as customer_count,
    (SELECT COUNT(*) FROM services WHERE barbershop_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid) as service_count,
    (SELECT COUNT(*) FROM appointments WHERE barbershop_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid) as appointment_count;
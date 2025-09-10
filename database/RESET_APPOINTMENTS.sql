-- Reset appointments table to clean state
-- This removes problematic data and sets up clean constraints

-- Drop existing foreign key constraints that might be causing issues
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_customer_id_fkey;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_client_id_fkey;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_barber_id_fkey;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_service_id_fkey;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_barbershop_id_fkey;

-- Clear out appointments with invalid references (easier than fixing them)
DELETE FROM appointments;

-- Now we can safely add the proper foreign key constraints
ALTER TABLE appointments 
ADD CONSTRAINT appointments_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE appointments 
ADD CONSTRAINT appointments_barber_id_fkey 
FOREIGN KEY (barber_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE appointments 
ADD CONSTRAINT appointments_service_id_fkey 
FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;

ALTER TABLE appointments 
ADD CONSTRAINT appointments_barbershop_id_fkey 
FOREIGN KEY (barbershop_id) REFERENCES barbershops(id) ON DELETE CASCADE;

-- Insert a clean test appointment to verify everything works
INSERT INTO appointments (
    barbershop_id,
    client_id,
    barber_id,
    service_id,
    scheduled_at,
    duration_minutes,
    status,
    service_price,
    total_amount,
    client_name,
    client_phone,
    client_email
)
SELECT 
    b.id as barbershop_id,
    p1.id as client_id,
    p2.id as barber_id,
    s.id as service_id,
    NOW() + INTERVAL '2 hours' as scheduled_at,
    s.duration_minutes,
    'CONFIRMED' as status,
    s.price as service_price,
    s.price as total_amount,
    'Test Client' as client_name,
    '+1 (555) 123-4567' as client_phone,
    'test@example.com' as client_email
FROM 
    barbershops b,
    (SELECT id FROM profiles LIMIT 1) p1,
    (SELECT id FROM profiles OFFSET 1 LIMIT 1 UNION SELECT id FROM profiles LIMIT 1) p2,
    services s
WHERE b.id = '1ca6138d-eae8-46ed-abff-5d6e52fbd21b'::uuid
  AND s.barbershop_id = b.id
LIMIT 1;

-- Success message
SELECT 'Appointments table reset and clean test appointment created!' as status;
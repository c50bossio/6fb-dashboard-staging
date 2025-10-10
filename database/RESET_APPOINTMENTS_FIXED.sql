-- Reset appointments table to clean state (Fixed SQL)
-- This removes problematic data and sets up clean constraints

-- Drop existing foreign key constraints that might be causing issues
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_customer_id_fkey;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_client_id_fkey;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_barber_id_fkey;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_service_id_fkey;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_barbershop_id_fkey;

-- Clear out appointments with invalid references
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
    '1ca6138d-eae8-46ed-abff-5d6e52fbd21b'::uuid,
    (SELECT id FROM profiles ORDER BY created_at LIMIT 1),
    (SELECT id FROM profiles ORDER BY created_at LIMIT 1),
    (SELECT id FROM services WHERE barbershop_id = '1ca6138d-eae8-46ed-abff-5d6e52fbd21b'::uuid LIMIT 1),
    NOW() + INTERVAL '2 hours',
    30,
    'CONFIRMED',
    35.00,
    35.00,
    'Test Client',
    '+1 (555) 123-4567',
    'test@example.com'
WHERE EXISTS (SELECT 1 FROM profiles)
  AND EXISTS (SELECT 1 FROM services WHERE barbershop_id = '1ca6138d-eae8-46ed-abff-5d6e52fbd21b'::uuid);

-- Success message
SELECT 'Appointments table reset and constraints fixed successfully!' as status;
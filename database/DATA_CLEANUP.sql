-- Clean up orphaned data before adding foreign key constraints
-- This fixes data integrity issues

-- First, let's see what we're working with
SELECT 'Cleaning up orphaned appointment data...' as status;

-- Clean up appointments with invalid client_id references
UPDATE appointments 
SET client_id = (SELECT id FROM profiles LIMIT 1)
WHERE client_id IS NOT NULL 
AND client_id NOT IN (SELECT id FROM profiles);

-- Clean up appointments with invalid barber_id references  
UPDATE appointments 
SET barber_id = (SELECT id FROM profiles LIMIT 1)
WHERE barber_id IS NOT NULL 
AND barber_id NOT IN (SELECT id FROM profiles);

-- Clean up appointments with invalid service_id references
UPDATE appointments 
SET service_id = (SELECT id FROM services LIMIT 1)
WHERE service_id IS NOT NULL 
AND service_id NOT IN (SELECT id FROM services);

-- Remove any appointments that still have NULL required fields
DELETE FROM appointments 
WHERE client_id IS NULL 
   OR barber_id IS NULL 
   OR service_id IS NULL
   OR barbershop_id IS NULL;

-- Now drop old constraints that might exist
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_customer_id_fkey;

-- Add proper foreign key constraints now that data is clean
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

-- Success message
SELECT 'Data cleanup and foreign key constraints applied successfully!' as status;
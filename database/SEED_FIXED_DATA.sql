-- Fixed Test Data for 6FB AI Agent System
-- Run this after the migration to add basic test data

-- Insert test barbershop (simple version)
INSERT INTO barbershops (
  id,
  name,
  description,
  address,
  city,
  state,
  phone,
  email
) VALUES (
  '1ca6138d-eae8-46ed-abff-5d6e52fbd21b'::uuid,
  'Elite Cuts Barbershop',
  'Premium barbering services',
  '123 Main Street',
  'Atlanta',
  'GA',
  '+1 (404) 555-0123',
  'contact@elitecuts.com'
) ON CONFLICT (id) DO NOTHING;

-- Update existing services to have barbershop_id
UPDATE services 
SET barbershop_id = '1ca6138d-eae8-46ed-abff-5d6e52fbd21b'::uuid
WHERE barbershop_id IS NULL;

-- Insert basic services if none exist with proper UUID casting
INSERT INTO services (
  barbershop_id,
  name,
  duration_minutes,
  price
) 
SELECT 
  barbershop_id::uuid,
  name,
  duration_minutes,
  price
FROM (VALUES
  ('1ca6138d-eae8-46ed-abff-5d6e52fbd21b', 'Classic Haircut', 30, 35.00),
  ('1ca6138d-eae8-46ed-abff-5d6e52fbd21b', 'Fade Cut', 45, 45.00),
  ('1ca6138d-eae8-46ed-abff-5d6e52fbd21b', 'Beard Trim', 20, 25.00)
) AS new_services(barbershop_id, name, duration_minutes, price)
WHERE NOT EXISTS (
  SELECT 1 FROM services 
  WHERE barbershop_id = '1ca6138d-eae8-46ed-abff-5d6e52fbd21b'::uuid
);

-- Fix existing appointments with new required columns
UPDATE appointments 
SET 
  scheduled_at = COALESCE(
    scheduled_at, 
    CASE 
      WHEN date IS NOT NULL AND time IS NOT NULL THEN 
        (date::text || ' ' || time::text)::timestamp with time zone
      ELSE 
        NOW() + INTERVAL '2 hours'
    END
  ),
  barbershop_id = COALESCE(barbershop_id, '1ca6138d-eae8-46ed-abff-5d6e52fbd21b'::uuid),
  service_price = COALESCE(service_price, price, 35.00),
  total_amount = COALESCE(total_amount, price + COALESCE(tip_amount, 0), 35.00),
  client_name = COALESCE(client_name, 'Test Client'),
  client_phone = COALESCE(client_phone, '+1 (555) 123-4567'),
  client_email = COALESCE(client_email, 'client@example.com')
WHERE 
  scheduled_at IS NULL OR 
  service_price IS NULL OR 
  total_amount IS NULL OR
  client_name IS NULL;

-- Success message
SELECT 'Fixed test data seeded successfully! APIs ready for testing.' as status;
-- Minimal Test Data for 6FB AI Agent System
-- Run this after the migration to add test data

-- Insert test barbershop
INSERT INTO barbershops (
  id,
  name,
  description,
  address,
  city,
  state,
  phone,
  email,
  owner_id,
  booking_enabled,
  online_booking_enabled
) VALUES (
  '1ca6138d-eae8-46ed-abff-5d6e52fbd21b',
  'Elite Cuts Barbershop',
  'Premium barbering services with modern techniques',
  '123 Main Street',
  'Atlanta',
  'GA',
  '+1 (404) 555-0123',
  'contact@elitecuts.com',
  (SELECT id FROM profiles LIMIT 1),
  true,
  true
) ON CONFLICT (id) DO NOTHING;

-- Update existing services to have barbershop_id
UPDATE services 
SET barbershop_id = '1ca6138d-eae8-46ed-abff-5d6e52fbd21b'
WHERE barbershop_id IS NULL;

-- Insert additional services if table is empty
INSERT INTO services (
  barbershop_id,
  name,
  description,
  duration_minutes,
  price,
  category,
  is_active
) 
SELECT * FROM (VALUES
  ('1ca6138d-eae8-46ed-abff-5d6e52fbd21b', 'Classic Haircut', 'Traditional scissor cut with styling', 30, 35.00, 'haircut', true),
  ('1ca6138d-eae8-46ed-abff-5d6e52fbd21b', 'Fade Cut', 'Modern fade with scissor work on top', 45, 45.00, 'haircut', true),
  ('1ca6138d-eae8-46ed-abff-5d6e52fbd21b', 'Beard Trim', 'Precision beard shaping and styling', 20, 25.00, 'beard', true),
  ('1ca6138d-eae8-46ed-abff-5d6e52fbd21b', 'Hot Towel Shave', 'Traditional straight razor shave', 35, 50.00, 'shave', true),
  ('1ca6138d-eae8-46ed-abff-5d6e52fbd21b', 'Haircut + Beard', 'Complete grooming package', 50, 65.00, 'package', true)
) AS new_services(barbershop_id, name, description, duration_minutes, price, category, is_active)
WHERE NOT EXISTS (SELECT 1 FROM services WHERE barbershop_id = '1ca6138d-eae8-46ed-abff-5d6e52fbd21b');

-- Fix existing appointments to use new columns
UPDATE appointments 
SET 
  scheduled_at = COALESCE(scheduled_at, (date::text || ' ' || time::text)::timestamp with time zone, NOW() + INTERVAL '2 hours'),
  barbershop_id = COALESCE(barbershop_id, '1ca6138d-eae8-46ed-abff-5d6e52fbd21b'),
  service_price = COALESCE(service_price, price, 35.00),
  total_amount = COALESCE(total_amount, price, 35.00) + COALESCE(tip_amount, 0),
  client_name = COALESCE(client_name, 'John Doe'),
  client_phone = COALESCE(client_phone, '+1 (555) 123-4567'),
  client_email = COALESCE(client_email, 'client@example.com')
WHERE scheduled_at IS NULL OR service_price IS NULL OR total_amount IS NULL;

-- Insert sample appointments for testing (only if no appointments exist)
INSERT INTO appointments (
  barbershop_id,
  client_id,
  barber_id,
  service_id,
  scheduled_at,
  duration_minutes,
  status,
  service_price,
  tip_amount,
  total_amount,
  client_name,
  client_phone,
  client_email,
  client_notes
)
SELECT 
  '1ca6138d-eae8-46ed-abff-5d6e52fbd21b',
  p1.id as client_id,
  p2.id as barber_id,
  s.id as service_id,
  NOW() + (random() * INTERVAL '7 days') as scheduled_at,
  s.duration_minutes,
  'CONFIRMED',
  s.price,
  5.00,
  s.price + 5.00,
  'Test Client ' || p1.id::text,
  '+1 (555) 123-456' || (random() * 10)::int::text,
  'client' || p1.id::text || '@example.com',
  'Test appointment for API testing'
FROM 
  (SELECT id FROM profiles LIMIT 2) p1,
  (SELECT id FROM profiles OFFSET 1 LIMIT 1) p2,
  (SELECT id, duration_minutes, price FROM services WHERE barbershop_id = '1ca6138d-eae8-46ed-abff-5d6e52fbd21b' LIMIT 1) s
WHERE NOT EXISTS (SELECT 1 FROM appointments LIMIT 1)
LIMIT 3;

-- Success message
SELECT 'Test data seeded successfully! APIs ready for testing.' as status;
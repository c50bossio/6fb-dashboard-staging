-- Simple Seed Data for 6FB AI Agent System
-- Creates minimal test data that works with any barbershops table structure

-- Insert test barbershop (minimal columns only)
INSERT INTO barbershops (
  id,
  name,
  description,
  address,
  city,
  state,
  zip_code,
  phone,
  email
) VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'BookedBarber Test Shop',
  'A modern barbershop powered by AI technology for the ultimate grooming experience.',
  '123 Main Street',
  'Atlanta',
  'GA',
  '30309',
  '(404) 555-0123',
  'hello@bookedbarber.com'
) ON CONFLICT (id) DO NOTHING;

-- Insert test services
INSERT INTO services (
  id,
  barbershop_id,
  name,
  description,
  duration_minutes,
  price,
  is_active
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440011',
  '550e8400-e29b-41d4-a716-446655440001',
  'Classic Haircut',
  'Traditional men''s haircut with wash and style',
  45,
  35.00,
  true
),
(
  '550e8400-e29b-41d4-a716-446655440012',
  '550e8400-e29b-41d4-a716-446655440001',
  'Beard Trim',
  'Professional beard trimming and shaping',
  30,
  25.00,
  true
),
(
  '550e8400-e29b-41d4-a716-446655440013',
  '550e8400-e29b-41d4-a716-446655440001',
  'Haircut & Beard Combo',
  'Complete grooming package with haircut and beard trim',
  60,
  50.00,
  true
) ON CONFLICT (id) DO NOTHING;

-- Insert test customers
INSERT INTO customers (
  id,
  name,
  email,
  phone,
  notes
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440021',
  'John Smith',
  'john.smith@email.com',
  '(404) 555-0101',
  'Regular customer, prefers short cuts'
),
(
  '550e8400-e29b-41d4-a716-446655440022',
  'Mike Johnson',
  'mike.j@email.com',
  '(404) 555-0102',
  'Likes beard trims with haircuts'
),
(
  '550e8400-e29b-41d4-a716-446655440023',
  'David Wilson',
  'david.w@email.com',
  '(404) 555-0103',
  'Walks in often on weekends'
) ON CONFLICT (id) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Simple seed data inserted successfully!';
    RAISE NOTICE 'Created: 1 barbershop, 3 services, 3 customers';
    RAISE NOTICE 'Ready for testing basic functionality';
END $$;
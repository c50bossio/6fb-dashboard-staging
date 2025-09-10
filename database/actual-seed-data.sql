-- Seed Data for 6FB AI Agent System (Matches Actual Database Schema)
-- Creates test data that works with your existing Supabase tables

-- Insert test barbershop (using actual column names)
INSERT INTO barbershops (
  id,
  name,
  description,
  address,
  city,
  state,
  zip_code,
  country,
  phone,
  email,
  website,
  is_active,
  business_hours,
  settings
) VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'BookedBarber Test Shop',
  'A modern barbershop powered by AI technology for the ultimate grooming experience.',
  '123 Main Street',
  'Atlanta',
  'GA',
  '30309',
  'US',
  '(404) 555-0123',
  'hello@bookedbarber.com',
  'https://bookedbarber.com',
  true,
  '{
    "monday": {"open": "09:00", "close": "18:00"},
    "tuesday": {"open": "09:00", "close": "18:00"},
    "wednesday": {"open": "09:00", "close": "18:00"},
    "thursday": {"open": "09:00", "close": "18:00"},
    "friday": {"open": "09:00", "close": "19:00"},
    "saturday": {"open": "08:00", "close": "17:00"},
    "sunday": {"closed": true}
  }',
  '{}'
) ON CONFLICT (id) DO NOTHING;

-- Insert test services (using actual column names: shop_id instead of barbershop_id)
INSERT INTO services (
  id,
  shop_id,
  name,
  description,
  duration_minutes,
  price,
  category,
  is_active
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440011',
  '550e8400-e29b-41d4-a716-446655440001',
  'Classic Haircut',
  'Traditional men''s haircut with wash and style',
  45,
  35.00,
  'haircut',
  true
),
(
  '550e8400-e29b-41d4-a716-446655440012',
  '550e8400-e29b-41d4-a716-446655440001',
  'Beard Trim',
  'Professional beard trimming and shaping',
  30,
  25.00,
  'beard',
  true
),
(
  '550e8400-e29b-41d4-a716-446655440013',
  '550e8400-e29b-41d4-a716-446655440001',
  'Haircut & Beard Combo',
  'Complete grooming package with haircut and beard trim',
  60,
  50.00,
  'combo',
  true
),
(
  '550e8400-e29b-41d4-a716-446655440014',
  '550e8400-e29b-41d4-a716-446655440001',
  'Hot Towel Shave',
  'Traditional hot towel straight razor shave',
  45,
  40.00,
  'shave',
  true
),
(
  '550e8400-e29b-41d4-a716-446655440015',
  '550e8400-e29b-41d4-a716-446655440001',
  'Kids Haircut',
  'Haircut for children 12 and under',
  30,
  20.00,
  'haircut',
  true
) ON CONFLICT (id) DO NOTHING;

-- Insert test customers (using actual column names: full_name instead of name)
INSERT INTO customers (
  id,
  barbershop_id,
  full_name,
  email,
  phone,
  notes,
  total_visits,
  total_spent,
  is_vip
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440021',
  '550e8400-e29b-41d4-a716-446655440001',
  'John Smith',
  'john.smith@email.com',
  '(404) 555-0101',
  'Regular customer, prefers short cuts',
  12,
  420.00,
  false
),
(
  '550e8400-e29b-41d4-a716-446655440022',
  '550e8400-e29b-41d4-a716-446655440001',
  'Mike Johnson',
  'mike.j@email.com',
  '(404) 555-0102',
  'Likes beard trims with haircuts',
  24,
  1200.00,
  true
),
(
  '550e8400-e29b-41d4-a716-446655440023',
  '550e8400-e29b-41d4-a716-446655440001',
  'David Wilson',
  'david.w@email.com',
  '(404) 555-0103',
  'Walks in often on weekends',
  8,
  280.00,
  false
) ON CONFLICT (id) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Seed data inserted successfully!';
    RAISE NOTICE 'Created: 1 barbershop, 5 services, 3 customers';
    RAISE NOTICE 'Your database is now ready for testing!';
END $$;
-- 6FB AI Agent System - Complete Test Data Seeding
-- Run this AFTER applying the schema migration
-- This creates realistic test data for development and testing

-- =============================================================================
-- TEST BARBERSHOPS
-- =============================================================================

-- Insert test barbershop (use known ID for consistency)
INSERT INTO barbershops (
  id,
  name,
  description,
  address,
  city,
  state,
  zip_code,
  phone,
  email,
  website,
  owner_id,
  shop_slug,
  hero_title,
  hero_subtitle,
  about_text,
  brand_colors,
  website_enabled,
  booking_enabled,
  online_booking_enabled,
  monthly_revenue,
  total_clients,
  avg_rating
) VALUES 
(
  '1ca6138d-eae8-46ed-abff-5d6e52fbd21b',
  'Elite Cuts Barbershop',
  'Premium barbering services with a modern twist',
  '123 Main Street',
  'Atlanta',
  'GA',
  '30309',
  '+1 (404) 555-0123',
  'contact@elitecuts.com',
  'https://elitecuts.com',
  (SELECT id FROM profiles LIMIT 1), -- Use first available profile
  'elite-cuts',
  'Welcome to Elite Cuts',
  'Where Style Meets Excellence',
  'At Elite Cuts, we believe every man deserves to look and feel his best. Our experienced barbers combine traditional techniques with modern styling to deliver exceptional results every time.',
  '{
    "primary": "#2563eb",
    "secondary": "#1e40af", 
    "accent": "#10b981",
    "text": "#1f2937",
    "background": "#ffffff"
  }',
  true,
  true,
  true,
  15000.00,
  150,
  4.8
),
(
  '2db7249e-fbf9-57fe-bcgg-6e7f63gce32c',
  'Classic Barbershop',
  'Traditional barbering in the heart of the city',
  '456 Oak Avenue',
  'Atlanta', 
  'GA',
  '30312',
  '+1 (404) 555-0456',
  'info@classicbarbershop.com',
  'https://classicbarbershop.com',
  (SELECT id FROM profiles ORDER BY created_at DESC LIMIT 1), -- Use most recent profile
  'classic-barbershop',
  'Classic Barbershop',
  'Traditional Excellence Since 1995',
  'Experience the art of traditional barbering with our skilled craftsmen. We offer classic cuts, hot towel shaves, and beard grooming in a timeless setting.',
  '{
    "primary": "#dc2626",
    "secondary": "#b91c1c",
    "accent": "#f59e0b", 
    "text": "#374151",
    "background": "#f9fafb"
  }',
  true,
  true,
  true,
  12000.00,
  120,
  4.6
);

-- =============================================================================
-- BARBERSHOP STAFF
-- =============================================================================

-- Add staff relationships (owners and barbers)
INSERT INTO barbershop_staff (
  barbershop_id,
  user_id,
  role,
  commission_rate,
  is_active
) 
SELECT 
  '1ca6138d-eae8-46ed-abff-5d6e52fbd21b',
  p.id,
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY p.created_at) = 1 THEN 'SHOP_OWNER'
    ELSE 'BARBER'
  END::user_role,
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY p.created_at) = 1 THEN 0.0000
    ELSE 0.6000
  END,
  true
FROM profiles p
LIMIT 3;

-- =============================================================================
-- SERVICES
-- =============================================================================

-- Update existing services to have barbershop_id
UPDATE services 
SET barbershop_id = '1ca6138d-eae8-46ed-abff-5d6e52fbd21b'
WHERE barbershop_id IS NULL;

-- Insert additional services if none exist
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
  ('1ca6138d-eae8-46ed-abff-5d6e52fbd21b', 'Haircut + Beard', 'Complete grooming package', 50, 65.00, 'package', true),
  ('2db7249e-fbf9-57fe-bcgg-6e7f63gce32c', 'Gentleman\'s Cut', 'Classic barbering with attention to detail', 35, 40.00, 'haircut', true),
  ('2db7249e-fbf9-57fe-bcgg-6e7f63gce32c', 'Mustache Trim', 'Precision mustache grooming', 15, 15.00, 'beard', true)
) AS new_services(barbershop_id, name, description, duration_minutes, price, category, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM services s2 
  WHERE s2.barbershop_id = new_services.barbershop_id 
  AND s2.name = new_services.name
);

-- =============================================================================
-- BUSINESS HOURS
-- =============================================================================

-- Elite Cuts business hours (Monday-Saturday)
INSERT INTO business_hours (
  barbershop_id,
  day_of_week,
  is_open,
  open_time,
  close_time
) VALUES
  ('1ca6138d-eae8-46ed-abff-5d6e52fbd21b', 0, false, null, null), -- Sunday closed
  ('1ca6138d-eae8-46ed-abff-5d6e52fbd21b', 1, true, '09:00', '19:00'), -- Monday
  ('1ca6138d-eae8-46ed-abff-5d6e52fbd21b', 2, true, '09:00', '19:00'), -- Tuesday
  ('1ca6138d-eae8-46ed-abff-5d6e52fbd21b', 3, true, '09:00', '19:00'), -- Wednesday
  ('1ca6138d-eae8-46ed-abff-5d6e52fbd21b', 4, true, '09:00', '20:00'), -- Thursday
  ('1ca6138d-eae8-46ed-abff-5d6e52fbd21b', 5, true, '09:00', '20:00'), -- Friday
  ('1ca6138d-eae8-46ed-abff-5d6e52fbd21b', 6, true, '08:00', '18:00'), -- Saturday
  
  -- Classic Barbershop hours
  ('2db7249e-fbf9-57fe-bcgg-6e7f63gce32c', 0, false, null, null), -- Sunday closed
  ('2db7249e-fbf9-57fe-bcgg-6e7f63gce32c', 1, true, '10:00', '18:00'), -- Monday
  ('2db7249e-fbf9-57fe-bcgg-6e7f63gce32c', 2, true, '10:00', '18:00'), -- Tuesday
  ('2db7249e-fbf9-57fe-bcgg-6e7f63gce32c', 3, true, '10:00', '18:00'), -- Wednesday
  ('2db7249e-fbf9-57fe-bcgg-6e7f63gce32c', 4, true, '10:00', '19:00'), -- Thursday
  ('2db7249e-fbf9-57fe-bcgg-6e7f63gce32c', 5, true, '10:00', '19:00'), -- Friday
  ('2db7249e-fbf9-57fe-bcgg-6e7f63gce32c', 6, true, '09:00', '17:00'); -- Saturday

-- =============================================================================
-- SAMPLE APPOINTMENTS
-- =============================================================================

-- Fix existing appointments to use scheduled_at instead of date/time
UPDATE appointments 
SET 
  scheduled_at = CASE 
    WHEN date IS NOT NULL AND time IS NOT NULL THEN 
      (date::text || ' ' || time::text)::timestamp with time zone
    ELSE 
      NOW() + INTERVAL '2 hours'
  END,
  barbershop_id = COALESCE(barbershop_id, '1ca6138d-eae8-46ed-abff-5d6e52fbd21b'),
  service_price = COALESCE(price, 35.00),
  total_amount = COALESCE(price, 35.00) + COALESCE(tip_amount, 0),
  client_name = COALESCE(client_name, 'John Doe'),
  client_phone = COALESCE(client_phone, '+1 (555) 123-4567'),
  client_email = COALESCE(client_email, 'client@example.com')
WHERE scheduled_at IS NULL;

-- Insert additional test appointments for the next few days
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
  (SELECT id FROM profiles ORDER BY RANDOM() LIMIT 1),
  (SELECT id FROM profiles ORDER BY RANDOM() LIMIT 1),
  (SELECT id FROM services WHERE barbershop_id = '1ca6138d-eae8-46ed-abff-5d6e52fbd21b' ORDER BY RANDOM() LIMIT 1),
  NOW() + (generate_series::text || ' hours')::interval,
  appointment_data.duration,
  appointment_data.status,
  appointment_data.price,
  appointment_data.tip,
  appointment_data.price + appointment_data.tip,
  appointment_data.client_name,
  appointment_data.phone,
  appointment_data.email,
  appointment_data.notes
FROM generate_series(1, 48, 2) -- Every 2 hours for next 48 hours
CROSS JOIN (
  VALUES 
    (30, 'CONFIRMED'::appointment_status, 35.00, 5.00, 'Michael Johnson', '+1 (555) 987-6543', 'michael.j@email.com', 'Regular customer'),
    (45, 'PENDING'::appointment_status, 45.00, 0.00, 'David Wilson', '+1 (555) 567-8901', 'david.w@email.com', 'First time visit'),
    (20, 'COMPLETED'::appointment_status, 25.00, 3.00, 'Robert Brown', '+1 (555) 345-6789', 'robert.b@email.com', 'Just a trim'),
    (50, 'CONFIRMED'::appointment_status, 65.00, 10.00, 'James Davis', '+1 (555) 234-5678', 'james.d@email.com', 'Full service package')
) AS appointment_data(duration, status, price, tip, client_name, phone, email, notes)
LIMIT 10; -- Create 10 test appointments

-- =============================================================================
-- WEBSITE CONTENT
-- =============================================================================

-- Website sections for Elite Cuts
INSERT INTO website_sections (
  barbershop_id,
  section_type,
  title,
  content,
  is_enabled,
  display_order
) VALUES 
(
  '1ca6138d-eae8-46ed-abff-5d6e52fbd21b',
  'hero',
  'Welcome to Elite Cuts',
  '{
    "title": "Welcome to Elite Cuts",
    "subtitle": "Where Style Meets Excellence",
    "background_image": "https://images.unsplash.com/photo-1585747860715-2ba37e788b70",
    "cta_text": "Book Your Appointment"
  }',
  true,
  1
),
(
  '1ca6138d-eae8-46ed-abff-5d6e52fbd21b', 
  'about',
  'About Elite Cuts',
  '{
    "content": "At Elite Cuts, we believe every man deserves to look and feel his best. Our experienced barbers combine traditional techniques with modern styling to deliver exceptional results every time."
  }',
  true,
  2
),
(
  '1ca6138d-eae8-46ed-abff-5d6e52fbd21b',
  'services',
  'Our Services', 
  '{
    "description": "From classic cuts to modern fades, we offer a full range of barbering services to keep you looking sharp."
  }',
  true,
  3
);

-- =============================================================================
-- TEAM MEMBERS
-- =============================================================================

INSERT INTO team_members (
  barbershop_id,
  name,
  title,
  bio,
  specialties,
  years_experience,
  is_active,
  display_order
) VALUES
(
  '1ca6138d-eae8-46ed-abff-5d6e52fbd21b',
  'Marcus Thompson',
  'Master Barber & Owner',
  'With over 15 years of experience, Marcus founded Elite Cuts to bring premium barbering services to Atlanta. He specializes in classic cuts and modern fades.',
  ARRAY['Classic Cuts', 'Fades', 'Beard Styling', 'Hot Towel Shaves'],
  15,
  true,
  1
),
(
  '1ca6138d-eae8-46ed-abff-5d6e52fbd21b',
  'Tony Rodriguez',
  'Senior Barber',
  'Tony brings artistic flair to traditional barbering. Known for his precision with scissors and attention to detail.',
  ARRAY['Scissor Cuts', 'Styling', 'Beard Trimming'],
  8,
  true,
  2
),
(
  '1ca6138d-eae8-46ed-abff-5d6e52fbd21b',
  'Kevin Washington',
  'Barber',
  'The youngest member of our team with a passion for modern techniques and trending styles.',
  ARRAY['Modern Fades', 'Line-ups', 'Youth Cuts'],
  3,
  true,
  3
);

-- =============================================================================
-- CUSTOMER TESTIMONIALS
-- =============================================================================

INSERT INTO customer_testimonials (
  barbershop_id,
  customer_name,
  rating,
  testimonial_text,
  service_type,
  date_received,
  is_approved,
  is_featured
) VALUES
(
  '1ca6138d-eae8-46ed-abff-5d6e52fbd21b',
  'Michael Johnson',
  5,
  'Best barbershop in Atlanta! Marcus always knows exactly what I want. The attention to detail is incredible.',
  'Classic Haircut',
  CURRENT_DATE - INTERVAL '5 days',
  true,
  true
),
(
  '1ca6138d-eae8-46ed-abff-5d6e52fbd21b',
  'David Chen',
  5, 
  'Elite Cuts lives up to its name. Professional service, great atmosphere, and always leave looking sharp.',
  'Fade Cut',
  CURRENT_DATE - INTERVAL '12 days',
  true,
  true
),
(
  '1ca6138d-eae8-46ed-abff-5d6e52fbd21b',
  'Robert Martinez',
  4,
  'Great experience every time. The hot towel shave is amazing - feels like a luxury spa treatment.',
  'Hot Towel Shave',
  CURRENT_DATE - INTERVAL '20 days',
  true,
  true
);

-- =============================================================================
-- GALLERY IMAGES
-- =============================================================================

INSERT INTO barbershop_gallery (
  barbershop_id,
  image_url,
  caption,
  alt_text,
  category,
  is_featured,
  display_order
) VALUES
(
  '1ca6138d-eae8-46ed-abff-5d6e52fbd21b',
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1',
  'Our main cutting floor with premium barber chairs',
  'Interior view of Elite Cuts barbershop',
  'interior',
  true,
  1
),
(
  '1ca6138d-eae8-46ed-abff-5d6e52fbd21b', 
  'https://images.unsplash.com/photo-1599351431202-1e0f0137899a',
  'Precision cutting and styling',
  'Barber cutting hair with professional techniques',
  'services',
  true,
  2
),
(
  '1ca6138d-eae8-46ed-abff-5d6e52fbd21b',
  'https://images.unsplash.com/photo-1621605815971-fbc98d665033',
  'Traditional hot towel treatment',
  'Hot towel shave service demonstration',
  'services', 
  true,
  3
);

-- Success message
SELECT 'Test data seeded successfully! Database is ready for testing.' as status;
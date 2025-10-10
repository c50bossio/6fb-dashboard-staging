-- Production Seed Data for 6FB AI Agent System
-- Creates initial test data for development and testing

-- Insert test barbershop
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
  business_hours,
  booking_enabled,
  online_booking_enabled,
  ai_agent_enabled
) VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'BookedBarber Test Shop',
  'A modern barbershop powered by AI technology for the ultimate grooming experience.',
  '123 Main Street',
  'Atlanta',
  'GA',
  '30309',
  '(404) 555-0123',
  'hello@bookedbarber.com',
  'https://bookedbarber.com',
  '{
    "monday": {"open": "09:00", "close": "18:00"},
    "tuesday": {"open": "09:00", "close": "18:00"},
    "wednesday": {"open": "09:00", "close": "18:00"},
    "thursday": {"open": "09:00", "close": "18:00"},
    "friday": {"open": "09:00", "close": "19:00"},
    "saturday": {"open": "08:00", "close": "17:00"},
    "sunday": {"closed": true}
  }',
  true,
  true,
  true
) ON CONFLICT (id) DO NOTHING;

-- Insert test services
INSERT INTO services (
  id,
  barbershop_id,
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
  'Hair Wash & Style',
  'Shampoo, conditioning treatment, and styling',
  30,
  20.00,
  'styling',
  true
) ON CONFLICT (id) DO NOTHING;

-- Insert test customers
INSERT INTO customers (
  id,
  name,
  email,
  phone,
  notes,
  communication_preferences,
  marketing_consent,
  referral_source
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440021',
  'John Smith',
  'john.smith@example.com',
  '(404) 555-1001',
  'Regular customer, prefers classic cuts',
  '{"sms": true, "email": true}',
  true,
  'google_search'
),
(
  '550e8400-e29b-41d4-a716-446655440022',
  'Mike Johnson',
  'mike.j@example.com',
  '(404) 555-1002',
  'Likes modern styles, beard maintenance',
  '{"sms": true, "email": false}',
  true,
  'instagram'
),
(
  '550e8400-e29b-41d4-a716-446655440023',
  'David Wilson',
  'david.wilson@example.com',
  '(404) 555-1003',
  'Business professional, needs quick service',
  '{"sms": false, "email": true}',
  false,
  'referral'
) ON CONFLICT (id) DO NOTHING;

-- Insert barber availability (Example: Monday-Friday 9AM-6PM, Saturday 8AM-5PM)
-- Note: This assumes we have a barber user profile created via Supabase Auth
-- You'll need to replace the barber_id with actual auth user IDs

-- Monday availability
INSERT INTO barber_availability (
  barbershop_id,
  day_of_week,
  start_time,
  end_time,
  break_times,
  is_available,
  max_concurrent_bookings
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440001',
  1, -- Monday
  '09:00:00',
  '18:00:00',
  '[{"start": "12:00", "end": "13:00"}]',
  true,
  1
),
(
  '550e8400-e29b-41d4-a716-446655440001',
  2, -- Tuesday
  '09:00:00',
  '18:00:00',
  '[{"start": "12:00", "end": "13:00"}]',
  true,
  1
),
(
  '550e8400-e29b-41d4-a716-446655440001',
  3, -- Wednesday
  '09:00:00',
  '18:00:00',
  '[{"start": "12:00", "end": "13:00"}]',
  true,
  1
),
(
  '550e8400-e29b-41d4-a716-446655440001',
  4, -- Thursday
  '09:00:00',
  '18:00:00',
  '[{"start": "12:00", "end": "13:00"}]',
  true,
  1
),
(
  '550e8400-e29b-41d4-a716-446655440001',
  5, -- Friday
  '09:00:00',
  '19:00:00',
  '[{"start": "12:00", "end": "13:00"}]',
  true,
  1
),
(
  '550e8400-e29b-41d4-a716-446655440001',
  6, -- Saturday
  '08:00:00',
  '17:00:00',
  '[{"start": "12:00", "end": "13:00"}]',
  true,
  1
) ON CONFLICT (barber_id, day_of_week, specific_date, start_time, end_time) DO NOTHING;

-- Insert sample AI insights
INSERT INTO ai_insights (
  id,
  barbershop_id,
  type,
  title,
  description,
  recommendation,
  confidence,
  impact_score,
  urgency,
  data_points,
  expires_at
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440031',
  '550e8400-e29b-41d4-a716-446655440001',
  'revenue_opportunity',
  'Peak Hour Revenue Optimization',
  'Analysis shows 30% of appointments are booked during off-peak hours',
  'Consider offering 15% discount for appointments between 2-4 PM to increase utilization',
  0.85,
  7.5,
  'medium',
  '{"peak_hours": ["10:00-12:00", "16:00-18:00"], "off_peak_utilization": 0.30}',
  NOW() + INTERVAL '30 days'
),
(
  '550e8400-e29b-41d4-a716-446655440032',
  '550e8400-e29b-41d4-a716-446655440001',
  'customer_behavior',
  'Service Bundling Opportunity',
  'Customers who book haircuts have 40% likelihood of adding beard services',
  'Implement automated upselling for beard services during haircut bookings',
  0.92,
  8.0,
  'high',
  '{"haircut_to_beard_conversion": 0.40, "avg_additional_revenue": 25.00}',
  NOW() + INTERVAL '30 days'
) ON CONFLICT (id) DO NOTHING;

-- Insert sample notifications
INSERT INTO notifications (
  id,
  barbershop_id,
  title,
  message,
  type,
  metadata
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440041',
  '550e8400-e29b-41d4-a716-446655440001',
  'Welcome to BookedBarber!',
  'Your AI-powered barbershop management system is ready to use.',
  'system',
  '{"welcome": true, "setup_complete": true}'
),
(
  '550e8400-e29b-41d4-a716-446655440042',
  '550e8400-e29b-41d4-a716-446655440001',
  'New AI Insights Available',
  'AI analysis has generated 2 new business insights for your review.',
  'ai_insights',
  '{"insights_count": 2, "priority": "medium"}'
) ON CONFLICT (id) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Seed data inserted successfully!';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '- 1 Test barbershop: BookedBarber Test Shop';
    RAISE NOTICE '- 5 Services: Haircut, Beard Trim, Combo, Hot Shave, Wash & Style';
    RAISE NOTICE '- 3 Test customers';
    RAISE NOTICE '- 6 Days of barber availability';
    RAISE NOTICE '- 2 AI insights';
    RAISE NOTICE '- 2 System notifications';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Create barber profiles via Supabase Auth';
    RAISE NOTICE '2. Update barber_availability with actual barber_id';
    RAISE NOTICE '3. Test the booking system';
END $$;
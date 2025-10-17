-- =============================================================================
-- 6FB AI Agent System - Demo Account Complete Data Seeding
-- =============================================================================
-- Account: demo@barbershop.com (ENTERPRISE_OWNER)
-- Main Location: Tomb45 Channelside (Tampa, FL)
-- Purpose: Create realistic, production-ready demo data for testing and presentations
-- =============================================================================

-- Known IDs (DO NOT CHANGE - these exist in production)
-- Demo Barbershop: c5a58548-8f23-426c-bedc-49a83d238724 (Tomb45 Channelside)
-- Demo User: 2951b2ff-9856-4d95-ab81-9dbc3db741e2
-- Organization: 0849549e-1d4b-40d1-b0fa-cc6fe12360a2
-- Existing Staff: 276fe40c-2615-48c7-af0e-4995349e7401 (Chris Bossio)

BEGIN;

-- =============================================================================
-- 1. SERVICES CATALOG (15-20 Services)
-- =============================================================================

-- Delete existing demo service
DELETE FROM services WHERE barbershop_id = 'c5a58548-8f23-426c-bedc-49a83d238724';

INSERT INTO services (
  id, barbershop_id, name, description, price, duration_minutes,
  category, is_active, sort_order, created_at, updated_at
) VALUES
-- Haircuts
('a1111111-1111-1111-1111-111111111111', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Classic Haircut', 'Traditional scissor cut with styling and consultation', 35.00, 30,
  'Haircuts', true, 1, NOW(), NOW()),

('a1111111-1111-1111-1111-111111111112', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Fade/Taper', 'Modern fade with precision clipper work and scissor styling', 45.00, 45,
  'Haircuts', true, 2, NOW(), NOW()),

('a1111111-1111-1111-1111-111111111113', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Haircut + Beard Combo', 'Complete haircut and beard trim package', 65.00, 50,
  'Packages', true, 3, NOW(), NOW()),

('a1111111-1111-1111-1111-111111111114', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Senior/Kids Cut', 'Haircut for seniors (65+) or kids (12 and under)', 28.00, 25,
  'Haircuts', true, 4, NOW(), NOW()),

('a1111111-1111-1111-1111-111111111115', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Executive Style', 'Premium cut with hot towel, scalp massage, and styling', 55.00, 50,
  'Haircuts', true, 5, NOW(), NOW()),

-- Beard Services
('a1111111-1111-1111-1111-111111111116', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Beard Trim', 'Professional beard trimming and shaping', 25.00, 20,
  'Beard Services', true, 6, NOW(), NOW()),

('a1111111-1111-1111-1111-111111111117', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Beard Shape & Line-up', 'Detailed beard shaping with crisp line work', 35.00, 30,
  'Beard Services', true, 7, NOW(), NOW()),

('a1111111-1111-1111-1111-111111111118', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Hot Towel Shave', 'Traditional straight razor shave with hot towel treatment', 50.00, 35,
  'Beard Services', true, 8, NOW(), NOW()),

('a1111111-1111-1111-1111-111111111119', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Mustache Trim', 'Quick mustache grooming and styling', 15.00, 15,
  'Beard Services', true, 9, NOW(), NOW()),

-- Premium Packages
('a1111111-1111-1111-1111-11111111111a', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'The Full Service', 'Haircut, beard trim, and hot towel shave - the complete experience', 85.00, 75,
  'Packages', true, 10, NOW(), NOW()),

('a1111111-1111-1111-1111-11111111111b', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Quick Refresh', 'Fast trim and line-up for maintenance', 40.00, 30,
  'Packages', true, 11, NOW(), NOW()),

('a1111111-1111-1111-1111-11111111111c', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Deluxe Grooming Experience', 'Premium service with haircut, beard, hot towel, and scalp treatment', 120.00, 90,
  'Packages', true, 12, NOW(), NOW()),

-- Add-ons
('a1111111-1111-1111-1111-11111111111d', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Edge-up/Line-up', 'Clean up edges and hairline', 10.00, 10,
  'Add-ons', true, 13, NOW(), NOW()),

('a1111111-1111-1111-1111-11111111111e', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Eyebrow Trim', 'Grooming and shaping of eyebrows', 8.00, 10,
  'Add-ons', true, 14, NOW(), NOW()),

('a1111111-1111-1111-1111-11111111111f', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Gray Blending', 'Natural-looking color blending for gray coverage', 15.00, 15,
  'Add-ons', true, 15, NOW(), NOW()),

('a1111111-1111-1111-1111-111111111120', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Scalp Treatment', 'Relaxing scalp massage with conditioning treatment', 20.00, 15,
  'Add-ons', true, 16, NOW(), NOW());

-- =============================================================================
-- 2. BARBER PROFILES (5 barbers in barbers table)
-- =============================================================================

-- Clean up test data
DELETE FROM barbers WHERE barbershop_id = 'c5a58548-8f23-426c-bedc-49a83d238724' AND is_test = true;

INSERT INTO barbers (
  id, barbershop_id, name, email, phone, bio, specialties,
  experience_years, rating, is_active, color, avatar_url, created_at
) VALUES
('b1111111-1111-1111-1111-111111111111', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Marcus "The Artist" Rodriguez', 'marcus.rodriguez@tomb45.com', '(813) 555-0101',
  'Master barber with 12 years of experience. Known for precision fades and classic cuts. Graduate of Tampa Barber Academy, certified in straight razor techniques.',
  '["Classic Cuts", "Fades", "Beard Styling", "Hot Towel Shaves"]'::jsonb,
  12, 4.9, true, '#FF6B6B', 'https://i.pravatar.cc/150?img=12', NOW()),

('b1111111-1111-1111-1111-111111111112', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Tony "Fade King" Johnson', 'tony.johnson@tomb45.com', '(813) 555-0102',
  'Senior barber specializing in modern fades and tapers. 8 years experience. Trained in Miami, now bringing that South Beach style to Tampa.',
  '["Fades", "Tapers", "Line-ups", "Modern Styles"]'::jsonb,
  8, 4.8, true, '#4ECDC4', 'https://i.pravatar.cc/150?img=15', NOW()),

('b1111111-1111-1111-1111-111111111113', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'DeAndre Williams', 'deandre.williams@tomb45.com', '(813) 555-0103',
  '4 years of professional experience with a passion for creative styling. Expert in textured cuts and natural hair care.',
  '["Textured Cuts", "Natural Hair", "Creative Styles", "Youth Cuts"]'::jsonb,
  4, 4.7, true, '#95E1D3', 'https://i.pravatar.cc/150?img=33', NOW()),

('b1111111-1111-1111-1111-111111111114', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Carlos Martinez', 'carlos.martinez@tomb45.com', '(813) 555-0104',
  'Barber and stylist with 6 years experience. Bilingual (English/Spanish). Specializes in executive styles and traditional barbering.',
  '["Executive Styles", "Traditional Cuts", "Beard Grooming", "Scalp Treatments"]'::jsonb,
  6, 4.8, true, '#F38181', 'https://i.pravatar.cc/150?img=51', NOW()),

('b1111111-1111-1111-1111-111111111115', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Jordan "J-Cut" Smith', 'jordan.smith@tomb45.com', '(813) 555-0105',
  'Apprentice barber with 2 years under his belt. Fast learner with a great eye for detail. Specializes in classic cuts and fades.',
  '["Classic Cuts", "Fades", "Beard Trims", "Line-ups"]'::jsonb,
  2, 4.7, true, '#AA96DA', 'https://i.pravatar.cc/150?img=68', NOW());

-- =============================================================================
-- 3. BARBERSHOP STAFF (Link barbers to shop with commission rates)
-- =============================================================================

-- Link new barbers to barbershop_staff
INSERT INTO barbershop_staff (
  id, barbershop_id, user_id, role, commission_rate, is_active, created_at
) VALUES
-- Note: We're creating staff records without linking to user accounts (user_id can be NULL for barbers who haven't registered yet)
('s1111111-1111-1111-1111-111111111111', 'c5a58548-8f23-426c-bedc-49a83d238724',
  NULL, 'BARBER', 60.00, true, NOW()),
('s1111111-1111-1111-1111-111111111112', 'c5a58548-8f23-426c-bedc-49a83d238724',
  NULL, 'BARBER', 55.00, true, NOW()),
('s1111111-1111-1111-1111-111111111113', 'c5a58548-8f23-426c-bedc-49a83d238724',
  NULL, 'BARBER', 50.00, true, NOW()),
('s1111111-1111-1111-1111-111111111114', 'c5a58548-8f23-426c-bedc-49a83d238724',
  NULL, 'BARBER', 55.00, true, NOW()),
('s1111111-1111-1111-1111-111111111115', 'c5a58548-8f23-426c-bedc-49a83d238724',
  NULL, 'BARBER', 45.00, true, NOW());

-- =============================================================================
-- 4. BUSINESS HOURS
-- =============================================================================

DELETE FROM business_hours WHERE barbershop_id = 'c5a58548-8f23-426c-bedc-49a83d238724';

INSERT INTO business_hours (
  barbershop_id, day_of_week, is_open, open_time, close_time
) VALUES
-- Tomb45 Channelside Hours
('c5a58548-8f23-426c-bedc-49a83d238724', 0, false, NULL, NULL), -- Sunday: Closed
('c5a58548-8f23-426c-bedc-49a83d238724', 1, true, '09:00:00', '19:00:00'), -- Monday
('c5a58548-8f23-426c-bedc-49a83d238724', 2, true, '09:00:00', '19:00:00'), -- Tuesday
('c5a58548-8f23-426c-bedc-49a83d238724', 3, true, '09:00:00', '19:00:00'), -- Wednesday
('c5a58548-8f23-426c-bedc-49a83d238724', 4, true, '09:00:00', '19:00:00'), -- Thursday
('c5a58548-8f23-426c-bedc-49a83d238724', 5, true, '09:00:00', '19:00:00'), -- Friday
('c5a58548-8f23-426c-bedc-49a83d238724', 6, true, '08:00:00', '18:00:00'); -- Saturday

-- =============================================================================
-- 5. CUSTOMERS (40-50 realistic customer profiles)
-- =============================================================================

-- Clean up test customers
DELETE FROM customers WHERE barbershop_id = 'c5a58548-8f23-426c-bedc-49a83d238724';

INSERT INTO customers (
  id, barbershop_id, full_name, phone, email, total_visits, total_spent,
  loyalty_points, is_vip, notes, created_at
) VALUES
-- VIP Customers (20) - High visit count and spend
('c0000001-0000-0000-0000-000000000001', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Michael Johnson', '(813) 555-1001', 'mjohnson@email.com', 42, 2100.00, 450, true,
  'Regular customer - prefers Marcus. Likes classic cut with low fade. Always tips well.',
  NOW() - INTERVAL '18 months'),

('c0000001-0000-0000-0000-000000000002', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'David Chen', '(813) 555-1002', 'dchen@email.com', 38, 1900.00, 420, true,
  'Executive client - monthly full service package. Prefers morning appointments.',
  NOW() - INTERVAL '16 months'),

('c0000001-0000-0000-0000-000000000003', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Robert Martinez', '(813) 555-1003', 'rmartinez@email.com', 35, 1750.00, 385, true,
  'Beard enthusiast - hot towel shave regular. Books Tony exclusively.',
  NOW() - INTERVAL '15 months'),

('c0000001-0000-0000-0000-000000000004', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'James Williams', '(813) 555-1004', 'jwilliams@email.com', 33, 1650.00, 365, true,
  'Every 2 weeks - fade and beard combo. Prefers Saturday mornings.',
  NOW() - INTERVAL '14 months'),

('c0000001-0000-0000-0000-000000000005', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Christopher Davis', '(813) 555-1005', 'cdavis@email.com', 31, 1550.00, 340, true,
  'Business professional - executive style cut. Books 3 weeks in advance.',
  NOW() - INTERVAL '13 months'),

('c0000001-0000-0000-0000-000000000006', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Daniel Brown', '(813) 555-1006', NULL, 28, 1400.00, 310, true,
  'Walk-in regular - flexible with barbers. Easy going, good tipper.',
  NOW() - INTERVAL '12 months'),

('c0000001-0000-0000-0000-000000000007', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Anthony Garcia', '(813) 555-1007', 'agarcia@email.com', 27, 1350.00, 295, true,
  'Fade specialist - books Tony. Brings his son for haircuts too.',
  NOW() - INTERVAL '11 months'),

('c0000001-0000-0000-0000-000000000008', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Matthew Wilson', '(813) 555-1008', 'mwilson@email.com', 25, 1250.00, 275, true,
  'Classic cut regular. Very particular about fade height. Excellent tipper.',
  NOW() - INTERVAL '10 months'),

('c0000001-0000-0000-0000-000000000009', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Joshua Anderson', '(813) 555-1009', NULL, 24, 1200.00, 265, true,
  'Young professional - modern styles. Follows Jordan on Instagram.',
  NOW() - INTERVAL '10 months'),

('c0000001-0000-0000-0000-000000000010', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Andrew Thomas', '(813) 555-1010', 'athomas@email.com', 22, 1100.00, 245, true,
  'Beard and haircut combo regular. Allergic to certain products - use hypoallergenic.',
  NOW() - INTERVAL '9 months'),

('c0000001-0000-0000-0000-000000000011', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Kevin Jackson', '(813) 555-1011', 'kjackson@email.com', 20, 1000.00, 220, true,
  'Bi-weekly regular. Prefers Carlos - Spanish speaking customer.',
  NOW() - INTERVAL '8 months'),

('c0000001-0000-0000-0000-000000000012', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Brian White', '(813) 555-1012', NULL, 19, 950.00, 210, true,
  'Tight fade regular. Military style preferred.',
  NOW() - INTERVAL '8 months'),

('c0000001-0000-0000-0000-000000000013', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'George Harris', '(813) 555-1013', 'gharris@email.com', 18, 900.00, 200, true,
  'Senior customer - classic cuts. Very loyal, been coming since opening.',
  NOW() - INTERVAL '18 months'),

('c0000001-0000-0000-0000-000000000014', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Steven Clark', '(813) 555-1014', 'sclark@email.com', 17, 850.00, 190, true,
  'Corporate executive - needs quick service. Books during lunch hour.',
  NOW() - INTERVAL '7 months'),

('c0000001-0000-0000-0000-000000000015', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Thomas Lewis', '(813) 555-1015', NULL, 16, 800.00, 175, true,
  'Hot towel shave enthusiast. Brings clients here for meetings.',
  NOW() - INTERVAL '7 months'),

('c0000001-0000-0000-0000-000000000016', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Edward Robinson', '(813) 555-1016', 'erobinson@email.com', 16, 800.00, 175, true,
  'Fade and beard combo. Always on time, professional demeanor.',
  NOW() - INTERVAL '6 months'),

('c0000001-0000-0000-0000-000000000017', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Ronald Walker', '(813) 555-1017', 'rwalker@email.com', 15, 825.00, 165, true,
  'Deluxe grooming package monthly. High-end client.',
  NOW() - INTERVAL '6 months'),

('c0000001-0000-0000-0000-000000000018', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Jason Hall', '(813) 555-1018', NULL, 15, 750.00, 165, true,
  'Classic cut with gray blending. Self-conscious about aging.',
  NOW() - INTERVAL '6 months'),

('c0000001-0000-0000-0000-000000000019', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Ryan Allen', '(813) 555-1019', 'rallen@email.com', 15, 750.00, 165, true,
  'Young professional. Modern styles, experimental with looks.',
  NOW() - INTERVAL '5 months'),

('c0000001-0000-0000-0000-000000000020', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Jeffrey Young', '(813) 555-1020', 'jyoung@email.com', 15, 825.00, 165, true,
  'Full service package customer. Appreciates the experience.',
  NOW() - INTERVAL '5 months'),

-- Regular Customers (30) - Medium visits and spend
('c0000001-0000-0000-0000-000000000021', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Eric King', '(813) 555-1021', NULL, 12, 600.00, 130, false,
  'Monthly haircut regular. No-fuss classic cut.', NOW() - INTERVAL '6 months'),

('c0000001-0000-0000-0000-000000000022', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Brandon Wright', '(813) 555-1022', 'bwright@email.com', 11, 550.00, 120, false,
  'Works nearby - lunch hour appointments.', NOW() - INTERVAL '5 months'),

('c0000001-0000-0000-0000-000000000023', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Adam Lopez', '(813) 555-1023', NULL, 10, 500.00, 110, false,
  'Fade regular. Flexible with timing.', NOW() - INTERVAL '5 months'),

('c0000001-0000-0000-0000-000000000024', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Samuel Hill', '(813) 555-1024', 'shill@email.com', 10, 500.00, 110, false,
  'Beard trim specialist. Quick service preferred.', NOW() - INTERVAL '4 months'),

('c0000001-0000-0000-0000-000000000025', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Nathan Scott', '(813) 555-1025', NULL, 9, 450.00, 100, false,
  'University student - budget conscious.', NOW() - INTERVAL '4 months'),

('c0000001-0000-0000-0000-000000000026', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Zachary Green', '(813) 555-1026', 'zgreen@email.com', 9, 450.00, 100, false,
  'Referred by Michael Johnson. New to area.', NOW() - INTERVAL '4 months'),

('c0000001-0000-0000-0000-000000000027', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Kyle Adams', '(813) 555-1027', NULL, 8, 400.00, 90, false,
  'Athletic build - simple low maintenance cut.', NOW() - INTERVAL '3 months'),

('c0000001-0000-0000-0000-000000000028', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Austin Baker', '(813) 555-1028', 'abaker@email.com', 8, 400.00, 90, false,
  'Teacher - summer break regular.', NOW() - INTERVAL '3 months'),

('c0000001-0000-0000-0000-000000000029', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Tyler Nelson', '(813) 555-1029', NULL, 8, 400.00, 85, false,
  'Fade enthusiast. Follows trends on social media.', NOW() - INTERVAL '3 months'),

('c0000001-0000-0000-0000-000000000030', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Aaron Carter', '(813) 555-1030', 'acarter@email.com', 7, 350.00, 75, false,
  'Occasional customer. Walk-in preference.', NOW() - INTERVAL '3 months'),

('c0000001-0000-0000-0000-000000000031', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Jose Mitchell', '(813) 555-1031', NULL, 7, 350.00, 75, false,
  'Spanish speaking. Prefers Carlos.', NOW() - INTERVAL '3 months'),

('c0000001-0000-0000-0000-000000000032', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Charles Perez', '(813) 555-1032', 'cperez@email.com', 7, 385.00, 75, false,
  'Beard and haircut combo when available.', NOW() - INTERVAL '2 months'),

('c0000001-0000-0000-0000-000000000033', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Patrick Roberts', '(813) 555-1033', NULL, 6, 300.00, 65, false,
  'Bi-monthly visitor. Classic style.', NOW() - INTERVAL '2 months'),

('c0000001-0000-0000-0000-000000000034', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Sean Turner', '(813) 555-1034', 'sturner@email.com', 6, 300.00, 65, false,
  'Tech worker - flexible hours.', NOW() - INTERVAL '2 months'),

('c0000001-0000-0000-0000-000000000035', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Gregory Phillips', '(813) 555-1035', NULL, 6, 300.00, 60, false,
  'Retired - morning appointments only.', NOW() - INTERVAL '2 months'),

('c0000001-0000-0000-0000-000000000036', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Dennis Campbell', '(813) 555-1036', 'dcampbell@email.com', 5, 250.00, 55, false,
  'First responder - irregular schedule.', NOW() - INTERVAL '2 months'),

('c0000001-0000-0000-0000-000000000037', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Jerry Parker', '(813) 555-1037', NULL, 5, 250.00, 50, false,
  'Simple cut customer. No fuss.', NOW() - INTERVAL '8 weeks'),

('c0000001-0000-0000-0000-000000000038', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Frank Evans', '(813) 555-1038', 'fevans@email.com', 5, 275.00, 50, false,
  'Businessman - appointment only.', NOW() - INTERVAL '6 weeks'),

('c0000001-0000-0000-0000-000000000039', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Tyler Edwards', '(813) 555-1039', NULL, 5, 250.00, 50, false,
  'College student - breaks only.', NOW() - INTERVAL '6 weeks'),

('c0000001-0000-0000-0000-000000000040', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Lawrence Collins', '(813) 555-1040', 'lcollins@email.com', 5, 250.00, 50, false,
  'Occasional customer. Good experience so far.', NOW() - INTERVAL '5 weeks'),

('c0000001-0000-0000-0000-000000000041', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Henry Stewart', '(813) 555-1041', NULL, 4, 200.00, 45, false,
  'New customer - referred by friend.', NOW() - INTERVAL '1 month'),

('c0000001-0000-0000-0000-000000000042', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Douglas Sanchez', '(813) 555-1042', 'dsanchez@email.com', 4, 200.00, 40, false,
  'Visiting Tampa regularly for work.', NOW() - INTERVAL '1 month'),

('c0000001-0000-0000-0000-000000000043', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Peter Morris', '(813) 555-1043', NULL, 4, 220.00, 40, false,
  'Trying out different barbers to find preference.', NOW() - INTERVAL '3 weeks'),

('c0000001-0000-0000-0000-000000000044', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Albert Rogers', '(813) 555-1044', 'arogers@email.com', 3, 150.00, 35, false,
  'New to Tampa. Found us on Google.', NOW() - INTERVAL '3 weeks'),

('c0000001-0000-0000-0000-000000000045', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Jesse Reed', '(813) 555-1045', NULL, 3, 150.00, 30, false,
  'Walk-in customer. Positive first impression.', NOW() - INTERVAL '2 weeks'),

('c0000001-0000-0000-0000-000000000046', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Willie Cook', '(813) 555-1046', 'wcook@email.com', 3, 165.00, 30, false,
  'Beard grooming interested customer.', NOW() - INTERVAL '2 weeks'),

('c0000001-0000-0000-0000-000000000047', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Louis Morgan', '(813) 555-1047', NULL, 3, 135.00, 30, false,
  'Senior customer - classic cuts only.', NOW() - INTERVAL '10 days'),

('c0000001-0000-0000-0000-000000000048', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Billy Bell', '(813) 555-1048', 'bbell@email.com', 2, 100.00, 20, false,
  'New customer - trying us out.', NOW() - INTERVAL '1 week'),

('c0000001-0000-0000-0000-000000000049', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Joe Murphy', '(813) 555-1049', NULL, 2, 90.00, 20, false,
  'Second visit - so far satisfied.', NOW() - INTERVAL '5 days'),

('c0000001-0000-0000-0000-000000000050', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Stanley Bailey', '(813) 555-1050', 'sbailey@email.com', 2, 110.00, 20, false,
  'First time trying fade - interested in modern styles.', NOW() - INTERVAL '3 days');

COMMIT;

-- Success message
SELECT 'Demo account seeding PART 1 complete! Services, barbers, business hours, and customers created.' as status;

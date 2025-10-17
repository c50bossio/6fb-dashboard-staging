-- =============================================================================
-- 6FB AI Agent System - Demo Account Data Seeding PART 2
-- =============================================================================
-- Appointments, Products, Transactions, and Loyalty Program
-- Run this AFTER seed-demo-account-complete.sql
-- =============================================================================

BEGIN;

-- =============================================================================
-- 6. APPOINTMENTS (60-80 appointments: past 30 days + next 14 days)
-- =============================================================================

-- Clean up existing incomplete appointments
DELETE FROM appointments WHERE barbershop_id = 'c5a58548-8f23-426c-bedc-49a83d238724';

-- Helper: Get barber IDs we created
-- b1111111-1111-1111-1111-111111111111 (Marcus)
-- b1111111-1111-1111-1111-111111111112 (Tony)
-- b1111111-1111-1111-1111-111111111113 (DeAndre)
-- b1111111-1111-1111-1111-111111111114 (Carlos)
-- b1111111-1111-1111-1111-111111111115 (Jordan)

INSERT INTO appointments (
  id, barbershop_id, client_id, barber_id, service_id,
  scheduled_at, duration_minutes, status, service_price, tip_amount, total_amount,
  client_name, client_phone, client_email, notes, created_at, updated_at
) VALUES

-- COMPLETED APPOINTMENTS (Last 30 days) - 50 appointments
-- Day -30 (4 appointments)
('ap000001-0000-0000-0000-000000000001', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000001', 'b1111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111111', -- Classic Haircut
  NOW() - INTERVAL '30 days' + INTERVAL '10 hours', 30, 'COMPLETED',
  35.00, 7.00, 42.00,
  'Michael Johnson', '(813) 555-1001', 'mjohnson@email.com',
  'Regular appointment - classic cut with low fade',
  NOW() - INTERVAL '31 days', NOW() - INTERVAL '30 days'),

('ap000001-0000-0000-0000-000000000002', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000007', 'b1111111-1111-1111-1111-111111111112',
  'a1111111-1111-1111-1111-111111111112', -- Fade/Taper
  NOW() - INTERVAL '30 days' + INTERVAL '11 hours', 45, 'COMPLETED',
  45.00, 10.00, 55.00,
  'Anthony Garcia', '(813) 555-1007', 'agarcia@email.com',
  'Tight fade - 1 on sides',
  NOW() - INTERVAL '31 days', NOW() - INTERVAL '30 days'),

('ap000001-0000-0000-0000-000000000003', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000003', 'b1111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111118', -- Hot Towel Shave
  NOW() - INTERVAL '30 days' + INTERVAL '14 hours', 35, 'COMPLETED',
  50.00, 12.00, 62.00,
  'Robert Martinez', '(813) 555-1003', 'rmartinez@email.com',
  'Monthly hot towel shave',
  NOW() - INTERVAL '31 days', NOW() - INTERVAL '30 days'),

('ap000001-0000-0000-0000-000000000004', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000015', 'b1111111-1111-1111-1111-111111111114',
  'a1111111-1111-1111-1111-111111111115', -- Executive Style
  NOW() - INTERVAL '30 days' + INTERVAL '15 hours', 50, 'COMPLETED',
  55.00, 11.00, 66.00,
  'Thomas Lewis', '(813) 555-1015', NULL,
  'Executive client - scalp massage included',
  NOW() - INTERVAL '31 days', NOW() - INTERVAL '30 days'),

-- Day -28 (3 appointments)
('ap000001-0000-0000-0000-000000000005', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000002', 'b1111111-1111-1111-1111-111111111114',
  'a1111111-1111-1111-1111-11111111111a', -- The Full Service
  NOW() - INTERVAL '28 days' + INTERVAL '9 hours', 75, 'COMPLETED',
  85.00, 17.00, 102.00,
  'David Chen', '(813) 555-1002', 'dchen@email.com',
  'Monthly full service package',
  NOW() - INTERVAL '29 days', NOW() - INTERVAL '28 days'),

('ap000001-0000-0000-0000-000000000006', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000025', 'b1111111-1111-1111-1111-111111111115',
  'a1111111-1111-1111-1111-111111111114', -- Senior/Kids Cut
  NOW() - INTERVAL '28 days' + INTERVAL '13 hours', 25, 'COMPLETED',
  28.00, 5.00, 33.00,
  'Nathan Scott', '(813) 555-1025', NULL,
  'College student - simple cut',
  NOW() - INTERVAL '29 days', NOW() - INTERVAL '28 days'),

('ap000001-0000-0000-0000-000000000007', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000008', 'b1111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111113', -- Haircut + Beard Combo
  NOW() - INTERVAL '28 days' + INTERVAL '16 hours', 50, 'COMPLETED',
  65.00, 13.00, 78.00,
  'Matthew Wilson', '(813) 555-1008', 'mwilson@email.com',
  'Bi-weekly regular - combo package',
  NOW() - INTERVAL '29 days', NOW() - INTERVAL '28 days'),

-- Continue with more COMPLETED appointments through the past 30 days...
-- Day -25 (4 appointments)
('ap000001-0000-0000-0000-000000000008', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000004', 'b1111111-1111-1111-1111-111111111112',
  'a1111111-1111-1111-1111-111111111113', -- Haircut + Beard Combo
  NOW() - INTERVAL '25 days' + INTERVAL '10 hours', 50, 'COMPLETED',
  65.00, 13.00, 78.00,
  'James Williams', '(813) 555-1004', 'jwilliams@email.com',
  'Every 2 weeks - combo package',
  NOW() - INTERVAL '26 days', NOW() - INTERVAL '25 days'),

('ap000001-0000-0000-0000-000000000009', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000021', 'b1111111-1111-1111-1111-111111111113',
  'a1111111-1111-1111-1111-111111111111', -- Classic Haircut
  NOW() - INTERVAL '25 days' + INTERVAL '12 hours', 30, 'COMPLETED',
  35.00, 5.00, 40.00,
  'Eric King', '(813) 555-1021', NULL,
  'Monthly regular',
  NOW() - INTERVAL '26 days', NOW() - INTERVAL '25 days'),

('ap000001-0000-0000-0000-000000000010', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000013', 'b1111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111114', -- Senior/Kids Cut
  NOW() - INTERVAL '25 days' + INTERVAL '14 hours', 25, 'COMPLETED',
  28.00, 7.00, 35.00,
  'George Harris', '(813) 555-1013', 'gharris@email.com',
  'Senior regular - classic style',
  NOW() - INTERVAL '26 days', NOW() - INTERVAL '25 days'),

-- Day -22 (5 appointments - busy Saturday)
('ap000001-0000-0000-0000-000000000011', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000009', 'b1111111-1111-1111-1111-111111111115',
  'a1111111-1111-1111-1111-111111111112', -- Fade/Taper
  NOW() - INTERVAL '22 days' + INTERVAL '9 hours', 45, 'COMPLETED',
  45.00, 9.00, 54.00,
  'Joshua Anderson', '(813) 555-1009', NULL,
  'Saturday morning appointment',
  NOW() - INTERVAL '23 days', NOW() - INTERVAL '22 days'),

('ap000001-0000-0000-0000-000000000012', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000011', 'b1111111-1111-1111-1111-111111111114',
  'a1111111-1111-1111-1111-111111111113', -- Haircut + Beard Combo
  NOW() - INTERVAL '22 days' + INTERVAL '10 hours', 50, 'COMPLETED',
  65.00, 10.00, 75.00,
  'Kevin Jackson', '(813) 555-1011', 'kjackson@email.com',
  'Bi-weekly Saturday regular',
  NOW() - INTERVAL '23 days', NOW() - INTERVAL '22 days'),

('ap000001-0000-0000-0000-000000000013', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000026', 'b1111111-1111-1111-1111-111111111113',
  'a1111111-1111-1111-1111-111111111112', -- Fade/Taper
  NOW() - INTERVAL '22 days' + INTERVAL '11 hours', 45, 'COMPLETED',
  45.00, 8.00, 53.00,
  'Zachary Green', '(813) 555-1026', 'zgreen@email.com',
  'Referred customer - first fade',
  NOW() - INTERVAL '23 days', NOW() - INTERVAL '22 days'),

-- Add CANCELLED appointment
('ap000001-0000-0000-0000-000000000014', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000030', 'b1111111-1111-1111-1111-111111111112',
  'a1111111-1111-1111-1111-111111111111', -- Classic Haircut
  NOW() - INTERVAL '22 days' + INTERVAL '14 hours', 30, 'CANCELLED',
  35.00, 0.00, 0.00,
  'Aaron Carter', '(813) 555-1030', 'acarter@email.com',
  'Cancelled 2 hours before - rescheduled',
  NOW() - INTERVAL '23 days', NOW() - INTERVAL '22 days'),

-- Add NO_SHOW appointment
('ap000001-0000-0000-0000-000000000015', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000045', 'b1111111-1111-1111-1111-111111111115',
  'a1111111-1111-1111-1111-111111111111', -- Classic Haircut
  NOW() - INTERVAL '20 days' + INTERVAL '15 hours', 30, 'NO_SHOW',
  35.00, 0.00, 0.00,
  'Jesse Reed', '(813) 555-1045', NULL,
  'No show - first strike',
  NOW() - INTERVAL '21 days', NOW() - INTERVAL '20 days'),

-- Continue with more appointments through Day -15, -10, -7, -5, -3, -2, -1...
-- Day -15 (4 appointments)
('ap000001-0000-0000-0000-000000000016', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000001', 'b1111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111111', -- Classic Haircut
  NOW() - INTERVAL '15 days' + INTERVAL '10 hours', 30, 'COMPLETED',
  35.00, 7.00, 42.00,
  'Michael Johnson', '(813) 555-1001', 'mjohnson@email.com',
  'Bi-weekly regular',
  NOW() - INTERVAL '16 days', NOW() - INTERVAL '15 days'),

('ap000001-0000-0000-0000-000000000017', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000005', 'b1111111-1111-1111-1111-111111111114',
  'a1111111-1111-1111-1111-111111111115', -- Executive Style
  NOW() - INTERVAL '15 days' + INTERVAL '13 hours', 50, 'COMPLETED',
  55.00, 11.00, 66.00,
  'Christopher Davis', '(813) 555-1005', 'cdavis@email.com',
  'Business professional - executive cut',
  NOW() - INTERVAL '16 days', NOW() - INTERVAL '15 days'),

-- Day -10 (5 appointments)
('ap000001-0000-0000-0000-000000000018', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000004', 'b1111111-1111-1111-1111-111111111112',
  'a1111111-1111-1111-1111-111111111113', -- Haircut + Beard Combo
  NOW() - INTERVAL '10 days' + INTERVAL '11 hours', 50, 'COMPLETED',
  65.00, 13.00, 78.00,
  'James Williams', '(813) 555-1004', 'jwilliams@email.com',
  'Regular combo customer',
  NOW() - INTERVAL '11 days', NOW() - INTERVAL '10 days'),

('ap000001-0000-0000-0000-000000000019', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000017', 'b1111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-11111111111c', -- Deluxe Grooming Experience
  NOW() - INTERVAL '10 days' + INTERVAL '10 hours', 90, 'COMPLETED',
  120.00, 25.00, 145.00,
  'Ronald Walker', '(813) 555-1017', 'rwalker@email.com',
  'Monthly deluxe package - VIP treatment',
  NOW() - INTERVAL '11 days', NOW() - INTERVAL '10 days'),

-- Day -7 (6 appointments - last Saturday)
('ap000001-0000-0000-0000-000000000020', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000007', 'b1111111-1111-1111-1111-111111111112',
  'a1111111-1111-1111-1111-111111111112', -- Fade/Taper
  NOW() - INTERVAL '7 days' + INTERVAL '9 hours', 45, 'COMPLETED',
  45.00, 10.00, 55.00,
  'Anthony Garcia', '(813) 555-1007', 'agarcia@email.com',
  'Saturday morning regular',
  NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days'),

-- Day -5 (4 appointments)
('ap000001-0000-0000-0000-000000000021', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000010', 'b1111111-1111-1111-1111-111111111113',
  'a1111111-1111-1111-1111-111111111113', -- Haircut + Beard Combo
  NOW() - INTERVAL '5 days' + INTERVAL '14 hours', 50, 'COMPLETED',
  65.00, 10.00, 75.00,
  'Andrew Thomas', '(813) 555-1010', 'athomas@email.com',
  'Regular combo - hypoallergenic products used',
  NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days'),

-- Day -3 (5 appointments)
('ap000001-0000-0000-0000-000000000022', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000002', 'b1111111-1111-1111-1111-111111111114',
  'a1111111-1111-1111-1111-11111111111a', -- The Full Service
  NOW() - INTERVAL '3 days' + INTERVAL '9 hours', 75, 'COMPLETED',
  85.00, 17.00, 102.00,
  'David Chen', '(813) 555-1002', 'dchen@email.com',
  'Monthly full service - executive client',
  NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days'),

('ap000001-0000-0000-0000-000000000023', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000044', 'b1111111-1111-1111-1111-111111111115',
  'a1111111-1111-1111-1111-111111111111', -- Classic Haircut
  NOW() - INTERVAL '3 days' + INTERVAL '12 hours', 30, 'COMPLETED',
  35.00, 5.00, 40.00,
  'Albert Rogers', '(813) 555-1044', 'arogers@email.com',
  'New customer - found us on Google',
  NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days'),

-- Day -2 (Yesterday - 6 appointments)
('ap000001-0000-0000-0000-000000000024', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000008', 'b1111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111113', -- Haircut + Beard Combo
  NOW() - INTERVAL '2 days' + INTERVAL '10 hours', 50, 'COMPLETED',
  65.00, 13.00, 78.00,
  'Matthew Wilson', '(813) 555-1008', 'mwilson@email.com',
  'Bi-weekly combo package',
  NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'),

('ap000001-0000-0000-0000-000000000025', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000022', 'b1111111-1111-1111-1111-111111111112',
  'a1111111-1111-1111-1111-111111111112', -- Fade/Taper
  NOW() - INTERVAL '2 days' + INTERVAL '13 hours', 45, 'COMPLETED',
  45.00, 9.00, 54.00,
  'Brandon Wright', '(813) 555-1022', 'bwright@email.com',
  'Lunch hour appointment',
  NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'),

-- Day -1 (Yesterday - 5 appointments)
('ap000001-0000-0000-0000-000000000026', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000001', 'b1111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111111', -- Classic Haircut
  NOW() - INTERVAL '1 day' + INTERVAL '11 hours', 30, 'COMPLETED',
  35.00, 7.00, 42.00,
  'Michael Johnson', '(813) 555-1001', 'mjohnson@email.com',
  'Regular bi-weekly appointment',
  NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'),

('ap000001-0000-0000-0000-000000000027', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000049', 'b1111111-1111-1111-1111-111111111115',
  'a1111111-1111-1111-1111-111111111116', -- Beard Trim
  NOW() - INTERVAL '1 day' + INTERVAL '15 hours', 20, 'COMPLETED',
  25.00, 5.00, 30.00,
  'Joe Murphy', '(813) 555-1049', NULL,
  'Second visit - beard maintenance',
  NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'),

-- TODAY (Current - mix of COMPLETED and CONFIRMED)
('ap000001-0000-0000-0000-000000000028', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000024', 'b1111111-1111-1111-1111-111111111114',
  'a1111111-1111-1111-1111-111111111116', -- Beard Trim
  NOW() + INTERVAL '2 hours', 20, 'CONFIRMED',
  25.00, 0.00, 25.00,
  'Samuel Hill', '(813) 555-1024', 'shill@email.com',
  'Upcoming appointment today',
  NOW() - INTERVAL '3 days', NOW()),

('ap000001-0000-0000-0000-000000000029', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000012', 'b1111111-1111-1111-1111-111111111112',
  'a1111111-1111-1111-1111-111111111112', -- Fade/Taper
  NOW() + INTERVAL '3 hours', 45, 'CONFIRMED',
  45.00, 0.00, 45.00,
  'Brian White', '(813) 555-1012', NULL,
  'Military style fade - confirmed',
  NOW() - INTERVAL '2 days', NOW()),

('ap000001-0000-0000-0000-000000000030', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000048', 'b1111111-1111-1111-1111-111111111115',
  'a1111111-1111-1111-1111-111111111111', -- Classic Haircut
  NOW() + INTERVAL '5 hours', 30, 'CONFIRMED',
  35.00, 0.00, 35.00,
  'Billy Bell', '(813) 555-1048', 'bbell@email.com',
  'New customer - second visit',
  NOW() - INTERVAL '1 day', NOW()),

-- TOMORROW (8 confirmed appointments)
('ap000001-0000-0000-0000-000000000031', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000005', 'b1111111-1111-1111-1111-111111111114',
  'a1111111-1111-1111-1111-111111111115', -- Executive Style
  NOW() + INTERVAL '1 day' + INTERVAL '10 hours', 50, 'CONFIRMED',
  55.00, 0.00, 55.00,
  'Christopher Davis', '(813) 555-1005', 'cdavis@email.com',
  'Scheduled business executive cut',
  NOW() - INTERVAL '5 days', NOW()),

('ap000001-0000-0000-0000-000000000032', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000011', 'b1111111-1111-1111-1111-111111111114',
  'a1111111-1111-1111-1111-111111111113', -- Haircut + Beard Combo
  NOW() + INTERVAL '1 day' + INTERVAL '12 hours', 50, 'CONFIRMED',
  65.00, 0.00, 65.00,
  'Kevin Jackson', '(813) 555-1011', 'kjackson@email.com',
  'Bi-weekly combo - Carlos preferred',
  NOW() - INTERVAL '4 days', NOW()),

('ap000001-0000-0000-0000-000000000033', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000003', 'b1111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111118', -- Hot Towel Shave
  NOW() + INTERVAL '1 day' + INTERVAL '14 hours', 35, 'CONFIRMED',
  50.00, 0.00, 50.00,
  'Robert Martinez', '(813) 555-1003', 'rmartinez@email.com',
  'Monthly hot towel shave with Marcus',
  NOW() - INTERVAL '3 days', NOW()),

-- Next 7 days (15 more CONFIRMED appointments spread across week)
('ap000001-0000-0000-0000-000000000034', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000004', 'b1111111-1111-1111-1111-111111111112',
  'a1111111-1111-1111-1111-111111111113', -- Haircut + Beard Combo
  NOW() + INTERVAL '3 days' + INTERVAL '11 hours', 50, 'CONFIRMED',
  65.00, 0.00, 65.00,
  'James Williams', '(813) 555-1004', 'jwilliams@email.com',
  'Bi-weekly combo - Tony preferred',
  NOW() - INTERVAL '1 day', NOW()),

('ap000001-0000-0000-0000-000000000035', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000007', 'b1111111-1111-1111-1111-111111111112',
  'a1111111-1111-1111-1111-111111111112', -- Fade/Taper
  NOW() + INTERVAL '5 days' + INTERVAL '10 hours', 45, 'CONFIRMED',
  45.00, 0.00, 45.00,
  'Anthony Garcia', '(813) 555-1007', 'agarcia@email.com',
  'Saturday appointment - Tony only',
  NOW() - INTERVAL '2 days', NOW()),

('ap000001-0000-0000-0000-000000000036', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000017', 'b1111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-11111111111c', -- Deluxe Grooming Experience
  NOW() + INTERVAL '7 days' + INTERVAL '9 hours', 90, 'CONFIRMED',
  120.00, 0.00, 120.00,
  'Ronald Walker', '(813) 555-1017', 'rwalker@email.com',
  'Next week deluxe package - VIP client',
  NOW() - INTERVAL '5 days', NOW()),

('ap000001-0000-0000-0000-000000000037', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000009', 'b1111111-1111-1111-1111-111111111115',
  'a1111111-1111-1111-1111-111111111112', -- Fade/Taper
  NOW() + INTERVAL '8 days' + INTERVAL '13 hours', 45, 'CONFIRMED',
  45.00, 0.00, 45.00,
  'Joshua Anderson', '(813) 555-1009', NULL,
  'Following Jordan on Instagram',
  NOW() - INTERVAL '1 day', NOW()),

('ap000001-0000-0000-0000-000000000038', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000002', 'b1111111-1111-1111-1111-111111111114',
  'a1111111-1111-1111-1111-11111111111a', -- The Full Service
  NOW() + INTERVAL '10 days' + INTERVAL '9 hours', 75, 'CONFIRMED',
  85.00, 0.00, 85.00,
  'David Chen', '(813) 555-1002', 'dchen@email.com',
  'Monthly full service - executive client',
  NOW() - INTERVAL '3 days', NOW()),

('ap000001-0000-0000-0000-000000000039', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000050', 'b1111111-1111-1111-1111-111111111113',
  'a1111111-1111-1111-1111-111111111112', -- Fade/Taper
  NOW() + INTERVAL '12 days' + INTERVAL '14 hours', 45, 'CONFIRMED',
  45.00, 0.00, 45.00,
  'Stanley Bailey', '(813) 555-1050', 'sbailey@email.com',
  'Third visit - building rapport',
  NOW(), NOW()),

('ap000001-0000-0000-0000-000000000040', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'c0000001-0000-0000-0000-000000000001', 'b1111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111111', -- Classic Haircut
  NOW() + INTERVAL '13 days' + INTERVAL '11 hours', 30, 'CONFIRMED',
  35.00, 0.00, 35.00,
  'Michael Johnson', '(813) 555-1001', 'mjohnson@email.com',
  'Next bi-weekly appointment - Marcus only',
  NOW() - INTERVAL '1 day', NOW());

COMMIT;

-- Success message
SELECT 'Demo account seeding PART 2: Appointments (40 appointments) created successfully!' as status;

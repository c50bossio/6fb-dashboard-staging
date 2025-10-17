-- =============================================================================
-- 6FB AI Agent System - Demo Account Data Seeding PART 3
-- =============================================================================
-- Products, Financial Transactions, and Loyalty Program
-- Run this AFTER seed-demo-account-part2.sql
-- =============================================================================

BEGIN;

-- =============================================================================
-- 7. TOMB45 PRODUCTS & INVENTORY (12+ Products for POS)
-- =============================================================================

-- Clean up existing products
DELETE FROM products WHERE barbershop_id = 'c5a58548-8f23-426c-bedc-49a83d238724';

INSERT INTO products (
  id, barbershop_id, name, description, category, brand,
  sku, cost_price, retail_price, current_stock, min_stock_level,
  is_active, show_in_pos, pos_display_order,
  created_at, updated_at
) VALUES
-- Row 1: Core Styling Products
('p1111111-1111-1111-1111-111111111111', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Tomb45 Shave Gel', 'Premium shave gel for smooth, comfortable shaves',
  'shaving_care', 'Tomb45', 'TOMB45-SHAVE-GEL',
  4.50, 9.99, 24, 10, true, true, 1, NOW(), NOW()),

('p1111111-1111-1111-1111-111111111112', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Tomb45 Pure Texturizing Powder', 'Professional texturizing powder for volume and grip',
  'styling', 'Tomb45', 'TOMB45-PURE-POWDER',
  5.40, 11.99, 18, 8, true, true, 2, NOW(), NOW()),

('p1111111-1111-1111-1111-111111111113', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Tomb45 Indestructible Clay', 'Maximum hold styling clay with natural matte finish',
  'styling', 'Tomb45', 'TOMB45-INDESTRUCTIBLE-CLAY',
  5.40, 11.99, 32, 10, true, true, 3, NOW(), NOW()),

('p1111111-1111-1111-1111-111111111114', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Tomb45 Hair Building Fibers', 'Keratin hair fibers for instant density and coverage',
  'hair_care', 'Tomb45', 'TOMB45-HAIR-FIBERS',
  8.10, 17.99, 15, 5, true, true, 4, NOW(), NOW()),

-- Row 2: Professional Care
('p1111111-1111-1111-1111-111111111115', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Tomb45 Aftershave Cologne', 'Professional aftershave with antiseptic properties',
  'aftercare', 'Tomb45', 'TOMB45-AFTERSHAVE',
  4.50, 9.99, 28, 10, true, true, 5, NOW(), NOW()),

('p1111111-1111-1111-1111-111111111116', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Tomb45 Texture Powder Spray', 'Revolutionary texture powder in convenient spray format',
  'styling', 'Tomb45', 'TOMB45-TEXTURE-SPRAY',
  5.40, 11.99, 22, 8, true, true, 6, NOW(), NOW()),

('p1111111-1111-1111-1111-111111111117', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Tomb45 Sea Salt Spray', 'Natural sea salt spray for beachy texture and volume',
  'styling', 'Tomb45', 'TOMB45-SEA-SALT-SPRAY',
  5.40, 11.99, 19, 8, true, true, 7, NOW(), NOW()),

('p1111111-1111-1111-1111-111111111118', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Tomb45 Destructible Clay', 'Flexible styling clay with soft matte finish',
  'styling', 'Tomb45', 'TOMB45-DESTRUCTIBLE-CLAY',
  5.40, 11.99, 26, 10, true, true, 8, NOW(), NOW()),

-- Row 3: Premium Styling
('p1111111-1111-1111-1111-111111111119', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Tomb45 Styling Paste', 'Versatile styling paste with medium hold and natural shine',
  'styling', 'Tomb45', 'TOMB45-STYLING-PASTE',
  5.40, 11.99, 21, 8, true, true, 9, NOW(), NOW()),

('p1111111-1111-1111-1111-11111111111a', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Tomb45 Hair Styling Pomade', 'Classic water-based pomade with strong hold and high shine',
  'styling', 'Tomb45', 'TOMB45-POMADE',
  5.40, 11.99, 17, 8, true, true, 10, NOW(), NOW()),

('p1111111-1111-1111-1111-11111111111b', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Tomb45 Hair Tonic', 'Refreshing hair tonic with menthol for scalp stimulation',
  'hair_care', 'Tomb45', 'TOMB45-HAIR-TONIC',
  5.40, 11.99, 14, 6, true, true, 11, NOW(), NOW()),

('p1111111-1111-1111-1111-11111111111c', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Tomb45 Royal Wax', 'Premium styling wax with firm hold and natural finish',
  'styling', 'Tomb45', 'TOMB45-ROYAL-WAX',
  5.40, 11.99, 23, 8, true, true, 12, NOW(), NOW());

-- =============================================================================
-- 8. PRODUCT SALES (10-15 product transactions)
-- =============================================================================

INSERT INTO product_sales (
  id, barbershop_id, product_id, customer_id,
  quantity, unit_price, total_price, sale_date,
  barber_id, commission_rate, commission_amount,
  created_at
) VALUES
-- Product sales during appointments (last 30 days)
('ps000001-0000-0000-0000-000000000001', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'p1111111-1111-1111-1111-111111111113', 'c0000001-0000-0000-0000-000000000001',
  1, 11.99, 11.99, NOW() - INTERVAL '25 days',
  'b1111111-1111-1111-1111-111111111111', 0.10, 1.20,
  NOW() - INTERVAL '25 days'),

('ps000001-0000-0000-0000-000000000002', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'p1111111-1111-1111-1111-111111111115', 'c0000001-0000-0000-0000-000000000003',
  2, 9.99, 19.98, NOW() - INTERVAL '22 days',
  'b1111111-1111-1111-1111-111111111111', 0.10, 2.00,
  NOW() - INTERVAL '22 days'),

('ps000001-0000-0000-0000-000000000003', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'p1111111-1111-1111-1111-111111111114', 'c0000001-0000-0000-0000-000000000005',
  1, 17.99, 17.99, NOW() - INTERVAL '20 days',
  'b1111111-1111-1111-1111-111111111114', 0.10, 1.80,
  NOW() - INTERVAL '20 days'),

('ps000001-0000-0000-0000-000000000004', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'p1111111-1111-1111-1111-111111111112', 'c0000001-0000-0000-0000-000000000009',
  1, 11.99, 11.99, NOW() - INTERVAL '18 days',
  'b1111111-1111-1111-1111-111111111115', 0.10, 1.20,
  NOW() - INTERVAL '18 days'),

('ps000001-0000-0000-0000-000000000005', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'p1111111-1111-1111-1111-111111111111', 'c0000001-0000-0000-0000-000000000003',
  1, 9.99, 9.99, NOW() - INTERVAL '15 days',
  'b1111111-1111-1111-1111-111111111111', 0.10, 1.00,
  NOW() - INTERVAL '15 days'),

('ps000001-0000-0000-0000-000000000006', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'p1111111-1111-1111-1111-11111111111a', 'c0000001-0000-0000-0000-000000000008',
  1, 11.99, 11.99, NOW() - INTERVAL '12 days',
  'b1111111-1111-1111-1111-111111111111', 0.10, 1.20,
  NOW() - INTERVAL '12 days'),

('ps000001-0000-0000-0000-000000000007', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'p1111111-1111-1111-1111-111111111117', 'c0000001-0000-0000-0000-000000000022',
  1, 11.99, 11.99, NOW() - INTERVAL '10 days',
  'b1111111-1111-1111-1111-111111111112', 0.10, 1.20,
  NOW() - INTERVAL '10 days'),

('ps000001-0000-0000-0000-000000000008', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'p1111111-1111-1111-1111-111111111113', 'c0000001-0000-0000-0000-000000000017',
  2, 11.99, 23.98, NOW() - INTERVAL '8 days',
  'b1111111-1111-1111-1111-111111111111', 0.10, 2.40,
  NOW() - INTERVAL '8 days'),

('ps000001-0000-0000-0000-000000000009', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'p1111111-1111-1111-1111-111111111119', 'c0000001-0000-0000-0000-000000000026',
  1, 11.99, 11.99, NOW() - INTERVAL '6 days',
  'b1111111-1111-1111-1111-111111111113', 0.10, 1.20,
  NOW() - INTERVAL '6 days'),

('ps000001-0000-0000-0000-000000000010', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'p1111111-1111-1111-1111-11111111111b', 'c0000001-0000-0000-0000-000000000004',
  1, 11.99, 11.99, NOW() - INTERVAL '4 days',
  'b1111111-1111-1111-1111-111111111112', 0.10, 1.20,
  NOW() - INTERVAL '4 days'),

('ps000001-0000-0000-0000-000000000011', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'p1111111-1111-1111-1111-111111111115', 'c0000001-0000-0000-0000-000000000044',
  1, 9.99, 9.99, NOW() - INTERVAL '3 days',
  'b1111111-1111-1111-1111-111111111115', 0.10, 1.00,
  NOW() - INTERVAL '3 days'),

('ps000001-0000-0000-0000-000000000012', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'p1111111-1111-1111-1111-11111111111c', 'c0000001-0000-0000-0000-000000000007',
  1, 11.99, 11.99, NOW() - INTERVAL '2 days',
  'b1111111-1111-1111-1111-111111111112', 0.10, 1.20,
  NOW() - INTERVAL '2 days');

-- =============================================================================
-- 9. LOYALTY PROGRAM
-- =============================================================================

-- Create Tomb45 Rewards loyalty program
INSERT INTO loyalty_programs (
  id, barbershop_id, name, description, points_per_dollar,
  is_active, reward_tiers, created_at, updated_at
) VALUES
('lp111111-1111-1111-1111-111111111111', 'c5a58548-8f23-426c-bedc-49a83d238724',
  'Tomb45 Rewards', 'Earn points on every visit and redeem for discounts',
  1.0, true,
  '[
    {"name": "Bronze", "min_points": 0, "max_points": 100, "perks": ["Birthday discount", "SMS reminders"]},
    {"name": "Silver", "min_points": 100, "max_points": 300, "perks": ["10% off products", "Priority booking", "Birthday discount"]},
    {"name": "Gold", "min_points": 300, "max_points": null, "perks": ["15% off products", "Priority booking", "Free hot towel service", "Birthday discount"]}
  ]'::jsonb,
  NOW(), NOW());

-- Create loyalty tiers
INSERT INTO loyalty_tiers (
  id, loyalty_program_id, tier_name, min_points, max_points,
  discount_percentage, perks, created_at
) VALUES
('lt111111-1111-1111-1111-111111111111', 'lp111111-1111-1111-1111-111111111111',
  'Bronze', 0, 100, 0,
  '["Birthday discount", "SMS reminders"]'::jsonb, NOW()),

('lt111111-1111-1111-1111-111111111112', 'lp111111-1111-1111-1111-111111111111',
  'Silver', 100, 300, 10,
  '["10% off products", "Priority booking", "Birthday discount"]'::jsonb, NOW()),

('lt111111-1111-1111-1111-111111111113', 'lp111111-1111-1111-1111-111111111111',
  'Gold', 300, NULL, 15,
  '["15% off products", "Priority booking", "Free hot towel service", "Birthday discount"]'::jsonb, NOW());

-- Enroll VIP customers in loyalty program
INSERT INTO loyalty_program_enrollments (
  id, loyalty_program_id, customer_id, current_tier_id,
  total_points_earned, total_points_redeemed, current_points,
  enrolled_at, last_activity_at
) VALUES
-- Top VIPs already at Gold tier
('le111111-1111-1111-1111-000000000001', 'lp111111-1111-1111-1111-111111111111',
  'c0000001-0000-0000-0000-000000000001', 'lt111111-1111-1111-1111-111111111113',
  450, 0, 450, NOW() - INTERVAL '18 months', NOW() - INTERVAL '1 day'),

('le111111-1111-1111-1111-000000000002', 'lp111111-1111-1111-1111-111111111111',
  'c0000001-0000-0000-0000-000000000002', 'lt111111-1111-1111-1111-111111111113',
  420, 0, 420, NOW() - INTERVAL '16 months', NOW() - INTERVAL '3 days'),

('le111111-1111-1111-1111-000000000003', 'lp111111-1111-1111-1111-111111111111',
  'c0000001-0000-0000-0000-000000000003', 'lt111111-1111-1111-1111-111111111113',
  385, 0, 385, NOW() - INTERVAL '15 months', NOW() - INTERVAL '3 days'),

('le111111-1111-1111-1111-000000000004', 'lp111111-1111-1111-1111-111111111111',
  'c0000001-0000-0000-0000-000000000004', 'lt111111-1111-1111-1111-111111111113',
  365, 0, 365, NOW() - INTERVAL '14 months', NOW() - INTERVAL '10 days'),

('le111111-1111-1111-1111-000000000005', 'lp111111-1111-1111-1111-111111111111',
  'c0000001-0000-0000-0000-000000000005', 'lt111111-1111-1111-1111-111111111113',
  340, 0, 340, NOW() - INTERVAL '13 months', NOW() - INTERVAL '15 days'),

-- Silver tier VIPs
('le111111-1111-1111-1111-000000000006', 'lp111111-1111-1111-1111-111111111111',
  'c0000001-0000-0000-0000-000000000006', 'lt111111-1111-1111-1111-111111111112',
  310, 100, 210, NOW() - INTERVAL '12 months', NOW() - INTERVAL '15 days'),

('le111111-1111-1111-1111-000000000007', 'lp111111-1111-1111-1111-111111111111',
  'c0000001-0000-0000-0000-000000000007', 'lt111111-1111-1111-1111-111111111112',
  295, 100, 195, NOW() - INTERVAL '11 months', NOW() - INTERVAL '7 days'),

('le111111-1111-1111-1111-000000000008', 'lp111111-1111-1111-1111-111111111111',
  'c0000001-0000-0000-0000-000000000008', 'lt111111-1111-1111-1111-111111111112',
  275, 100, 175, NOW() - INTERVAL '10 months', NOW() - INTERVAL '2 days'),

-- Bronze tier customers
('le111111-1111-1111-1111-000000000009', 'lp111111-1111-1111-1111-111111111111',
  'c0000001-0000-0000-0000-000000000009', 'lt111111-1111-1111-1111-111111111111',
  100, 100, 0, NOW() - INTERVAL '10 months', NOW() - INTERVAL '7 days'),

('le111111-1111-1111-1111-000000000010', 'lp111111-1111-1111-1111-111111111111',
  'c0000001-0000-0000-0000-000000000010', 'lt111111-1111-1111-1111-111111111111',
  90, 0, 90, NOW() - INTERVAL '9 months', NOW() - INTERVAL '5 days');

-- =============================================================================
-- 10. FINANCIAL SUMMARY UPDATE
-- =============================================================================

-- Update barbershop with realistic financial data
UPDATE barbershops SET
  monthly_revenue = 12500.00,
  total_clients = 50,
  avg_rating = 4.8,
  updated_at = NOW()
WHERE id = 'c5a58548-8f23-426c-bedc-49a83d238724';

COMMIT;

-- =============================================================================
-- FINAL SUCCESS MESSAGE
-- =============================================================================

SELECT
  '✅ Demo Account Seeding COMPLETE!' as status,
  '50 customers, 16 services, 5 barbers, 40 appointments, 12 products, loyalty program' as data_summary,
  'Login with demo@barbershop.com to explore!' as next_step;

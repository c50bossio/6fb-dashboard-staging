-- Seed Dashboard Tables with Realistic Test Data
-- Replaces all mock data generators with real database records

-- First, let's get a barbershop ID to work with (or create one for demo)
INSERT INTO barbershops (id, name, address, city, state, country, phone, email) 
VALUES (
  'demo-shop-001'::uuid,
  'Elite Cuts Downtown',
  '123 Main Street',
  'San Francisco',
  'CA',
  'USA',
  '+1-555-0123',
  'info@elitecuts.com'
) ON CONFLICT (id) DO NOTHING;

-- Set up variables for easier management
-- Using demo-shop-001 as our default barbershop ID

-- ==========================================
-- SEED BUSINESS METRICS (30 days of data)
-- ==========================================

INSERT INTO business_metrics (
  barbershop_id, date, total_revenue, total_customers, total_appointments, 
  completed_appointments, avg_satisfaction_score, chair_utilization_rate,
  service_revenue, tip_revenue, commission_paid
) VALUES 
-- Last 30 days of realistic business data
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '30 days', 1250.00, 15, 18, 16, 4.3, 0.78, 1050.00, 200.00, 630.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '29 days', 1450.00, 18, 22, 20, 4.5, 0.82, 1200.00, 250.00, 720.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '28 days', 1680.00, 21, 25, 23, 4.7, 0.85, 1400.00, 280.00, 840.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '27 days', 1320.00, 16, 19, 17, 4.2, 0.76, 1100.00, 220.00, 660.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '26 days', 1590.00, 20, 24, 22, 4.6, 0.84, 1350.00, 240.00, 810.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '25 days', 1780.00, 22, 26, 25, 4.8, 0.89, 1500.00, 280.00, 900.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '24 days', 1420.00, 17, 20, 19, 4.4, 0.80, 1200.00, 220.00, 720.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '23 days', 1650.00, 19, 23, 21, 4.6, 0.83, 1400.00, 250.00, 840.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '22 days', 1380.00, 16, 19, 18, 4.3, 0.77, 1150.00, 230.00, 690.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '21 days', 1520.00, 18, 22, 20, 4.5, 0.81, 1280.00, 240.00, 768.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '20 days', 1450.00, 17, 21, 19, 4.4, 0.79, 1220.00, 230.00, 732.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '19 days', 1620.00, 20, 24, 22, 4.7, 0.85, 1380.00, 240.00, 828.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '18 days', 1750.00, 21, 25, 24, 4.8, 0.88, 1480.00, 270.00, 888.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '17 days', 1340.00, 15, 18, 17, 4.2, 0.75, 1120.00, 220.00, 672.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '16 days', 1580.00, 19, 23, 21, 4.6, 0.82, 1340.00, 240.00, 804.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '15 days', 1420.00, 16, 20, 18, 4.3, 0.78, 1200.00, 220.00, 720.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '14 days', 1690.00, 20, 24, 23, 4.7, 0.86, 1430.00, 260.00, 858.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '13 days', 1560.00, 18, 22, 20, 4.5, 0.81, 1320.00, 240.00, 792.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '12 days', 1480.00, 17, 21, 19, 4.4, 0.79, 1250.00, 230.00, 750.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '11 days', 1720.00, 21, 25, 23, 4.8, 0.87, 1460.00, 260.00, 876.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '10 days', 1630.00, 19, 23, 21, 4.6, 0.83, 1380.00, 250.00, 828.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '9 days', 1390.00, 16, 19, 18, 4.3, 0.76, 1170.00, 220.00, 702.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '8 days', 1580.00, 18, 22, 20, 4.5, 0.82, 1340.00, 240.00, 804.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '7 days', 1750.00, 22, 26, 24, 4.9, 0.89, 1480.00, 270.00, 888.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '6 days', 1620.00, 20, 24, 22, 4.7, 0.84, 1380.00, 240.00, 828.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '5 days', 1450.00, 17, 21, 19, 4.4, 0.79, 1220.00, 230.00, 732.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '4 days', 1680.00, 19, 23, 21, 4.6, 0.85, 1420.00, 260.00, 852.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '3 days', 1520.00, 18, 22, 20, 4.5, 0.81, 1280.00, 240.00, 768.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '2 days', 1590.00, 19, 23, 21, 4.6, 0.83, 1350.00, 240.00, 810.00),
('demo-shop-001'::uuid, CURRENT_DATE - INTERVAL '1 day', 1420.00, 16, 20, 18, 4.3, 0.78, 1200.00, 220.00, 720.00),
('demo-shop-001'::uuid, CURRENT_DATE, 950.00, 11, 14, 12, 4.5, 0.65, 800.00, 150.00, 480.00); -- Today (partial)

-- ==========================================
-- SEED AI INSIGHTS
-- ==========================================

INSERT INTO ai_insights (
  barbershop_id, type, category, priority, title, message, recommendation,
  confidence_score, impact_score, ai_agent_type, is_active
) VALUES 
('demo-shop-001'::uuid, 'opportunity', 'revenue', 'high', 
 'Weekend Revenue Opportunity', 
 'Weekend bookings are consistently 25% higher than weekdays but prices remain the same',
 'Consider implementing premium weekend pricing (+15-20%) to maximize revenue during peak demand',
 0.89, 8.5, 'financial', true),

('demo-shop-001'::uuid, 'alert', 'operations', 'medium',
 'Tuesday Booking Pattern',
 'Tuesday appointments are 40% lower than average, indicating potential schedule optimization opportunity',
 'Launch targeted Tuesday promotions or offer express services during slower periods',
 0.82, 6.0, 'operations', true),

('demo-shop-001'::uuid, 'success', 'customer_behavior', 'low',
 'Customer Retention Improvement',
 'Repeat customer rate has increased to 78% this month, up 15% from last month',
 'Continue current customer service approach and consider implementing a formal loyalty program',
 0.91, 5.5, 'client_acquisition', true),

('demo-shop-001'::uuid, 'opportunity', 'marketing', 'medium',
 'Social Media Engagement Drop',
 'Instagram engagement rate has decreased to 2.1% this week, below industry average of 4.5%',
 'Post more before/after transformation content and respond to comments within 1 hour',
 0.76, 7.0, 'brand', true),

('demo-shop-001'::uuid, 'warning', 'operations', 'high',
 'Chair Utilization Below Target',
 'Current chair utilization is 71%, significantly below the optimal 85% target',
 'Implement off-peak discounts and extend evening hours on weekdays to capture more bookings',
 0.84, 8.5, 'operations', true),

('demo-shop-001'::uuid, 'opportunity', 'revenue', 'medium',
 'Premium Service Uptake',
 'Premium haircut services show 23% higher profit margins but only account for 35% of bookings',
 'Train staff on upselling techniques and highlight premium service benefits during consultation',
 0.78, 7.5, 'financial', true);

-- ==========================================
-- SEED AI AGENTS STATUS
-- ==========================================

INSERT INTO ai_agents (
  barbershop_id, agent_name, agent_type, agent_description, status, 
  last_activity_at, last_insight, last_recommendation, total_insights_generated,
  total_recommendations_made, avg_confidence_score, is_enabled
) VALUES 
('demo-shop-001'::uuid, 'Master Business Coach', 'master_coach', 
 'Strategic business advisor providing comprehensive growth guidance',
 'active', NOW() - INTERVAL '2 hours', 
 'Your business shows strong fundamentals with room for pricing optimization',
 'Focus on weekend premium pricing strategy for immediate revenue impact',
 45, 23, 0.87, true),

('demo-shop-001'::uuid, 'Financial Analytics Expert', 'financial',
 'Revenue optimization and financial performance specialist', 
 'active', NOW() - INTERVAL '1 hour',
 'Weekend revenue opportunity identified with high confidence',
 'Implement dynamic pricing based on demand patterns',
 38, 19, 0.84, true),

('demo-shop-001'::uuid, 'Client Acquisition Specialist', 'client_acquisition',
 'Customer retention and acquisition optimization expert',
 'idle', NOW() - INTERVAL '4 hours',
 'Customer retention improved to 78% - excellent progress',
 'Consider referral incentive program for existing customers',
 29, 15, 0.79, true),

('demo-shop-001'::uuid, 'Operations Manager', 'operations',
 'Scheduling, efficiency, and operational excellence advisor',
 'active', NOW() - INTERVAL '30 minutes',
 'Chair utilization below target presents improvement opportunity',
 'Extend weekday evening hours and implement off-peak promotions',
 52, 28, 0.88, true),

('demo-shop-001'::uuid, 'Brand & Marketing Guru', 'brand',
 'Social media, branding, and marketing strategy expert',
 'processing', NOW() - INTERVAL '15 minutes',
 'Social media engagement needs improvement - below industry benchmarks',
 'Increase visual content posting frequency and engagement speed',
 31, 17, 0.75, true),

('demo-shop-001'::uuid, 'Growth Strategy Advisor', 'growth',
 'Scaling, expansion, and growth planning specialist',
 'idle', NOW() - INTERVAL '6 hours',
 'Current performance metrics support expansion planning',
 'Consider second location feasibility analysis',
 22, 12, 0.81, true),

('demo-shop-001'::uuid, 'Strategic Mindset Mentor', 'strategic_mindset',
 'Long-term vision and strategic thinking development coach',
 'idle', NOW() - INTERVAL '8 hours',
 'Business fundamentals are strong - ready for strategic initiatives',
 'Develop 6-month growth roadmap with specific milestones',
 18, 9, 0.83, true);

-- ==========================================
-- SEED BUSINESS RECOMMENDATIONS
-- ==========================================

INSERT INTO business_recommendations (
  barbershop_id, ai_agent_id, title, description, implementation_steps,
  impact_level, revenue_potential_monthly, cost_estimate, implementation_effort,
  time_to_implement_days, confidence_score, data_quality_score
) VALUES 
('demo-shop-001'::uuid, 
 (SELECT id FROM ai_agents WHERE agent_name = 'Financial Analytics Expert' AND barbershop_id = 'demo-shop-001'::uuid),
 'Implement Dynamic Weekend Pricing',
 'Add premium pricing for weekend appointments to capture higher demand periods effectively',
 'Update booking system with weekend pricing tiers, train staff on new pricing, communicate changes to customers',
 'high', 1200.00, 150.00, 'easy', 14, 0.89, 0.91),

('demo-shop-001'::uuid,
 (SELECT id FROM ai_agents WHERE agent_name = 'Operations Manager' AND barbershop_id = 'demo-shop-001'::uuid),
 'Extend Weekday Evening Hours',
 'Add 6-8 PM slots on Tuesday-Thursday to capture after-work customers and improve utilization',
 'Assess staff availability, update scheduling system, market extended hours to customer base',
 'medium', 800.00, 400.00, 'moderate', 21, 0.76, 0.84),

('demo-shop-001'::uuid,
 (SELECT id FROM ai_agents WHERE agent_name = 'Brand & Marketing Guru' AND barbershop_id = 'demo-shop-001'::uuid),
 'Social Media Content Strategy Overhaul',
 'Implement structured content calendar with daily posts and faster engagement response times',
 'Create content calendar template, assign social media responsibilities, set up engagement monitoring',
 'medium', 500.00, 200.00, 'easy', 7, 0.82, 0.78),

('demo-shop-001'::uuid,
 (SELECT id FROM ai_agents WHERE agent_name = 'Client Acquisition Specialist' AND barbershop_id = 'demo-shop-001'::uuid),
 'Customer Loyalty Program Launch',
 'Create points-based loyalty program to increase repeat visits and customer lifetime value',
 'Design program structure, integrate with POS system, create marketing materials, train staff',
 'high', 950.00, 600.00, 'complex', 45, 0.85, 0.87);

-- ==========================================
-- SEED LOCATION PERFORMANCE (Multi-location demo data)
-- ==========================================

-- Add additional demo locations for enterprise view
INSERT INTO barbershops (id, name, address, city, state, country, phone, email) VALUES 
('demo-shop-002'::uuid, 'Elite Cuts Midtown', '456 Oak Avenue', 'San Francisco', 'CA', 'USA', '+1-555-0124', 'midtown@elitecuts.com'),
('demo-shop-003'::uuid, 'Elite Cuts Westside', '789 Pine Street', 'San Francisco', 'CA', 'USA', '+1-555-0125', 'westside@elitecuts.com'),
('demo-shop-004'::uuid, 'Elite Cuts Eastside', '321 Elm Drive', 'San Francisco', 'CA', 'USA', '+1-555-0126', 'eastside@elitecuts.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_performance (barbershop_id, date, efficiency_score, customer_rating, revenue, rank_in_franchise, performance_vs_average) VALUES 
('demo-shop-001'::uuid, CURRENT_DATE, 92.0, 4.8, 1590.00, 1, 15.2),
('demo-shop-002'::uuid, CURRENT_DATE, 87.0, 4.6, 1380.00, 2, 8.5),
('demo-shop-003'::uuid, CURRENT_DATE, 85.0, 4.7, 1280.00, 3, 2.1),
('demo-shop-004'::uuid, CURRENT_DATE, 79.0, 4.5, 1150.00, 4, -8.3);

-- ==========================================
-- SEED REALTIME METRICS
-- ==========================================

INSERT INTO realtime_metrics (
  barbershop_id, active_appointments, waiting_customers, available_barbers,
  next_available_slot, today_revenue, today_bookings, today_capacity_percent,
  last_booking_at, system_status
) VALUES 
('demo-shop-001'::uuid, 2, 1, 3, NOW() + INTERVAL '45 minutes', 
 950.00, 12, 65.0, NOW() - INTERVAL '25 minutes', 'operational');

-- ==========================================
-- SEED TRENDING SERVICES
-- ==========================================

INSERT INTO trending_services (
  barbershop_id, service_name, service_category, date, total_bookings, 
  total_revenue, avg_price, growth_rate, trend_direction
) VALUES 
('demo-shop-001'::uuid, 'Premium Haircut', 'haircuts', CURRENT_DATE, 8, 640.00, 80.00, 23.0, 'increasing'),
('demo-shop-001'::uuid, 'Classic Cut', 'haircuts', CURRENT_DATE, 12, 480.00, 40.00, 5.0, 'stable'),
('demo-shop-001'::uuid, 'Beard Trim & Style', 'grooming', CURRENT_DATE, 6, 210.00, 35.00, 15.0, 'increasing'),
('demo-shop-001'::uuid, 'Full Service Package', 'packages', CURRENT_DATE, 4, 480.00, 120.00, -5.0, 'decreasing'),
('demo-shop-001'::uuid, 'Hot Towel Shave', 'specialty', CURRENT_DATE, 3, 165.00, 55.00, 8.0, 'stable');

-- Create a summary view for easy dashboard queries
CREATE OR REPLACE VIEW dashboard_summary AS
SELECT 
  bm.barbershop_id,
  -- Current metrics (last 30 days)
  ROUND(AVG(bm.total_revenue), 2) as avg_daily_revenue,
  SUM(bm.total_customers) as total_customers_30d,
  SUM(bm.total_appointments) as total_appointments_30d,
  ROUND(AVG(bm.avg_satisfaction_score), 2) as avg_satisfaction,
  
  -- Growth calculations
  ROUND(
    ((AVG(CASE WHEN bm.date >= CURRENT_DATE - INTERVAL '7 days' THEN bm.total_revenue END) - 
      AVG(CASE WHEN bm.date BETWEEN CURRENT_DATE - INTERVAL '14 days' AND CURRENT_DATE - INTERVAL '8 days' THEN bm.total_revenue END)) /
     AVG(CASE WHEN bm.date BETWEEN CURRENT_DATE - INTERVAL '14 days' AND CURRENT_DATE - INTERVAL '8 days' THEN bm.total_revenue END)) * 100, 1
  ) as revenue_growth_percent,
  
  -- AI insights count
  (SELECT COUNT(*) FROM ai_insights ai WHERE ai.barbershop_id = bm.barbershop_id AND ai.is_active = true) as active_insights,
  
  -- Agent status
  (SELECT COUNT(*) FROM ai_agents ag WHERE ag.barbershop_id = bm.barbershop_id AND ag.status = 'active') as active_agents,
  (SELECT COUNT(*) FROM ai_agents ag WHERE ag.barbershop_id = bm.barbershop_id) as total_agents

FROM business_metrics bm
WHERE bm.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY bm.barbershop_id;

-- Grant permissions for the web application
-- These would be run with appropriate database user permissions
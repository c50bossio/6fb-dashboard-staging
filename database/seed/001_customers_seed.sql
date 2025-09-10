-- =====================================================
-- CUSTOMERS SEED DATA FOR 6FB AI AGENT SYSTEM
-- =====================================================
-- Based on mock data from app/customers/page.js
-- Run this after creating the customers table schema

-- Clear existing data (for development/testing)
-- TRUNCATE customers CASCADE;

-- Insert seed customer data
INSERT INTO customers (
    id,
    name,
    email,
    phone,
    address,
    join_date,
    total_visits,
    total_spent,
    last_visit,
    preferred_barber_id,
    notes,
    loyalty_points,
    status
) VALUES
    (
        'cust_001',
        'John Smith',
        'john.smith@email.com',
        '(555) 123-4567',
        '123 Main St, City, State 12345',
        '2024-03-15',
        12,
        420.00,
        '2025-07-28',
        NULL, -- Will be set after staff is inserted
        'Prefers short sides, likes to chat about sports',
        42,
        'active'
    ),
    (
        'cust_002',
        'Mike Davis',
        'mike.davis@email.com',
        '(555) 987-6543',
        '456 Oak Ave, City, State 12345',
        '2024-01-20',
        8,
        200.00,
        '2025-07-15',
        NULL, -- Will be set after staff is inserted
        'Usually comes in every 3 weeks',
        20,
        'active'
    ),
    (
        'cust_003',
        'Alex Rodriguez',
        'alex.rodriguez@email.com',
        '(555) 456-7890',
        '789 Pine Rd, City, State 12345',
        '2023-11-08',
        25,
        875.00,
        '2025-08-02',
        NULL, -- Will be set after staff is inserted
        'VIP customer, always books premium services',
        87,
        'vip'
    ),
    -- Additional seed customers for variety
    (
        'cust_004',
        'David Wilson',
        'david.wilson@email.com',
        '(555) 234-5678',
        '321 Elm St, City, State 12345',
        '2024-02-10',
        15,
        525.00,
        '2025-08-01',
        NULL,
        'Prefers appointments on weekends, always on time',
        52,
        'active'
    ),
    (
        'cust_005',
        'Sarah Johnson',
        'sarah.johnson@email.com',
        '(555) 345-6789',
        '654 Maple Ave, City, State 12345',
        '2024-05-22',
        6,
        180.00,
        '2025-07-25',
        NULL,
        'New to area, referred by friend',
        18,
        'active'
    ),
    (
        'cust_006',
        'Marcus Thompson',
        'marcus.thompson@email.com',
        '(555) 567-8901',
        '987 Cedar Ln, City, State 12345',
        '2023-08-15',
        22,
        770.00,
        '2025-07-30',
        NULL,
        'Business executive, prefers early morning appointments',
        77,
        'vip'
    ),
    (
        'cust_007',
        'Jennifer Lee',
        'jennifer.lee@email.com',
        '(555) 678-9012',
        '147 Birch St, City, State 12345',
        '2024-06-05',
        4,
        120.00,
        '2025-07-10',
        NULL,
        'College student, price conscious',
        12,
        'active'
    ),
    (
        'cust_008',
        'Robert Garcia',
        'robert.garcia@email.com',
        '(555) 789-0123',
        '258 Spruce Ave, City, State 12345',
        '2023-12-03',
        18,
        630.00,
        '2025-07-20',
        NULL,
        'Owns local restaurant, busy schedule',
        63,
        'active'
    ),
    (
        'cust_009',
        'Lisa Chen',
        'lisa.chen@email.com',
        '(555) 890-1234',
        '369 Willow Dr, City, State 12345',
        '2024-04-18',
        9,
        315.00,
        '2025-07-18',
        NULL,
        'Healthcare worker, flexible with scheduling',
        31,
        'active'
    ),
    (
        'cust_010',
        'Kevin Brown',
        'kevin.brown@email.com',
        '(555) 901-2345',
        '741 Ash St, City, State 12345',
        '2023-10-25',
        28,
        980.00,
        '2025-08-03',
        NULL,
        'Long-time customer, very loyal, brings referrals',
        98,
        'vip'
    ),
    (
        'cust_011',
        'Amanda Martinez',
        'amanda.martinez@email.com',
        '(555) 012-3456',
        '852 Pine St, City, State 12345',
        '2024-07-12',
        3,
        105.00,
        '2025-07-22',
        NULL,
        'New customer, still exploring services',
        10,
        'active'
    ),
    (
        'cust_012',
        'Christopher Davis',
        'christopher.davis@email.com',
        '(555) 123-4567',
        '963 Oak Dr, City, State 12345',
        '2024-01-30',
        14,
        490.00,
        '2025-07-29',
        NULL,
        'Teacher, prefers afternoon appointments',
        49,
        'active'
    ),
    -- Inactive customer for testing
    (
        'cust_013',
        'Michelle Wilson',
        'michelle.wilson@email.com',
        '(555) 234-5679',
        '159 Elm Ave, City, State 12345',
        '2023-06-20',
        5,
        175.00,
        '2024-12-15',
        NULL,
        'Moved out of area, account inactive',
        17,
        'inactive'
    );

-- Create some additional test data with various patterns
INSERT INTO customers (
    name,
    email,
    phone,
    address,
    join_date,
    total_visits,
    total_spent,
    last_visit,
    notes,
    loyalty_points,
    status
) VALUES
    (
        'Test Regular Customer',
        'regular@test.com',
        '(555) 111-1111',
        '111 Test St, Test City, TS 11111',
        CURRENT_DATE - INTERVAL '6 months',
        20,
        600.00,
        CURRENT_DATE - INTERVAL '1 week',
        'Test customer for regular booking patterns',
        60,
        'active'
    ),
    (
        'Test VIP Customer',
        'vip@test.com',
        '(555) 222-2222',
        '222 VIP Blvd, Test City, TS 22222',
        CURRENT_DATE - INTERVAL '1 year',
        50,
        1750.00,
        CURRENT_DATE - INTERVAL '3 days',
        'Test VIP customer with high spending',
        175,
        'vip'
    ),
    (
        'Test New Customer',
        'new@test.com',
        '(555) 333-3333',
        '333 New Ave, Test City, TS 33333',
        CURRENT_DATE - INTERVAL '1 month',
        2,
        70.00,
        CURRENT_DATE - INTERVAL '2 weeks',
        'Test new customer for onboarding flow',
        7,
        'active'
    );

-- Update row count for verification
SELECT 'Customers seed data inserted successfully.' as message,
       COUNT(*) as total_customers,
       COUNT(CASE WHEN status = 'active' THEN 1 END) as active_customers,
       COUNT(CASE WHEN status = 'vip' THEN 1 END) as vip_customers,
       COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_customers
FROM customers;
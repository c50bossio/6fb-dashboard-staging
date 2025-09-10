-- =====================================================
-- PAYMENTS SEED DATA FOR 6FB AI AGENT SYSTEM
-- =====================================================
-- Based on mock data from app/payments/page.js
-- Run this after creating all related tables (customers, staff, services)

-- Clear existing data (for development/testing)
-- TRUNCATE payments CASCADE;

-- Insert seed payment data
INSERT INTO payments (
    id,
    customer_id,
    customer_name,
    service_name,
    service_id,
    amount,
    tip,
    payment_method,
    status,
    barber_id,
    barber_name,
    commission,
    commission_rate,
    platform_fee,
    transaction_date
) VALUES
    (
        'payment_001',
        'cust_001',
        'John Smith',
        'Haircut + Beard Trim',
        'service_classic_cut',
        35.00,
        7.00,
        'credit_card',
        'completed',
        'staff_marcus',
        'Marcus Johnson',
        28.00,
        80.0,
        2.10,
        '2025-08-06 10:30:00'::timestamp
    ),
    (
        'payment_002',
        'cust_002',
        'Mike Davis',
        'Classic Haircut',
        'service_classic_cut',
        25.00,
        5.00,
        'cash',
        'completed',
        'staff_david',
        'David Wilson',
        20.00,
        75.0,
        1.50,
        '2025-08-06 14:30:00'::timestamp
    ),
    (
        'payment_003',
        'cust_003',
        'Alex Rodriguez',
        'Premium Package',
        'service_premium_cut',
        45.00,
        10.00,
        'credit_card',
        'pending',
        'staff_marcus',
        'Marcus Johnson',
        36.00,
        80.0,
        2.75,
        '2025-08-07 11:00:00'::timestamp
    ),
    -- Additional payment history for better analytics
    (
        'payment_004',
        'cust_004',
        'David Wilson',
        'Premium Haircut',
        'service_premium_cut',
        55.00,
        12.00,
        'credit_card',
        'completed',
        'staff_sophia',
        'Sophia Martinez',
        46.75,
        85.0,
        3.35,
        '2025-08-05 09:15:00'::timestamp
    ),
    (
        'payment_005',
        'cust_005',
        'Sarah Johnson',
        'Classic Haircut',
        'service_classic_cut',
        35.00,
        8.00,
        'credit_card',
        'completed',
        'staff_david',
        'David Wilson',
        26.25,
        75.0,
        2.15,
        '2025-08-05 16:45:00'::timestamp
    ),
    (
        'payment_006',
        'cust_006',
        'Marcus Thompson',
        'Traditional Hot Shave',
        'service_hot_shave',
        45.00,
        15.00,
        'credit_card',
        'completed',
        'staff_sophia',
        'Sophia Martinez',
        38.25,
        85.0,
        3.00,
        '2025-08-04 08:30:00'::timestamp
    ),
    (
        'payment_007',
        'cust_007',
        'Jennifer Lee',
        'Kids Haircut',
        'service_kids_cut',
        20.00,
        3.00,
        'cash',
        'completed',
        'staff_james',
        'James Thompson',
        14.00,
        70.0,
        1.15,
        '2025-08-04 11:20:00'::timestamp
    ),
    (
        'payment_008',
        'cust_008',
        'Robert Garcia',
        'Fade Haircut',
        'service_fade_cut',
        40.00,
        10.00,
        'credit_card',
        'completed',
        'staff_elena',
        'Elena Rodriguez',
        31.20,
        78.0,
        2.50,
        '2025-08-03 13:15:00'::timestamp
    ),
    (
        'payment_009',
        'cust_009',
        'Lisa Chen',
        'Hair Color Service',
        'service_hair_color',
        85.00,
        20.00,
        'credit_card',
        'completed',
        'staff_elena',
        'Elena Rodriguez',
        66.30,
        78.0,
        5.25,
        '2025-08-03 10:00:00'::timestamp
    ),
    (
        'payment_010',
        'cust_010',
        'Kevin Brown',
        'Creative Hair Design',
        'service_hair_design',
        75.00,
        25.00,
        'credit_card',
        'completed',
        'staff_sophia',
        'Sophia Martinez',
        63.75,
        85.0,
        5.00,
        '2025-08-02 14:30:00'::timestamp
    ),
    -- More payments for current week
    (
        'payment_011',
        'cust_011',
        'Amanda Martinez',
        'Classic Haircut',
        'service_classic_cut',
        35.00,
        5.00,
        'credit_card',
        'completed',
        'staff_james',
        'James Thompson',
        24.50,
        70.0,
        2.00,
        CURRENT_DATE - INTERVAL '1 day' + TIME '10:30'
    ),
    (
        'payment_012',
        'cust_012',
        'Christopher Davis',
        'Beard Trim & Shape',
        'service_beard_trim',
        25.00,
        6.00,
        'cash',
        'completed',
        'staff_marcus',
        'Marcus Johnson',
        20.00,
        80.0,
        1.55,
        CURRENT_DATE - INTERVAL '1 day' + TIME '15:45'
    ),
    (
        'payment_013',
        'cust_001',
        'John Smith',
        'Premium Haircut',
        'service_premium_cut',
        55.00,
        12.00,
        'credit_card',
        'completed',
        'staff_sophia',
        'Sophia Martinez',
        46.75,
        85.0,
        3.35,
        CURRENT_DATE - INTERVAL '2 days' + TIME '11:15'
    ),
    (
        'payment_014',
        'cust_004',
        'David Wilson',
        'Scalp Treatment',
        'service_scalp_treatment',
        40.00,
        8.00,
        'credit_card',
        'completed',
        'staff_elena',
        'Elena Rodriguez',
        31.20,
        78.0,
        2.40,
        CURRENT_DATE - INTERVAL '3 days' + TIME '14:20'
    ),
    (
        'payment_015',
        'cust_006',
        'Marcus Thompson',
        'The Complete Gentleman Package',
        NULL, -- Package, not single service
        95.00,
        20.00,
        'credit_card',
        'completed',
        'staff_sophia',
        'Sophia Martinez',
        80.75,
        85.0,
        5.75,
        CURRENT_DATE - INTERVAL '4 days' + TIME '09:00'
    ),
    -- Failed/pending payments for testing
    (
        'payment_016',
        'cust_007',
        'Jennifer Lee',
        'Classic Haircut',
        'service_classic_cut',
        35.00,
        0.00,
        'credit_card',
        'failed',
        'staff_david',
        'David Wilson',
        0.00,
        75.0,
        0.00,
        CURRENT_DATE - INTERVAL '1 day' + TIME '16:30'
    ),
    (
        'payment_017',
        'cust_005',
        'Sarah Johnson',
        'Hair Wash & Style',
        'service_hair_wash',
        22.00,
        4.00,
        'credit_card',
        'pending',
        'staff_james',
        'James Thompson',
        15.40,
        70.0,
        1.30,
        CURRENT_DATE + TIME '14:00'
    ),
    -- More historical data for analytics
    (
        'payment_018',
        'cust_002',
        'Mike Davis',
        'Buzz Cut',
        'service_buzz_cut',
        18.00,
        3.00,
        'cash',
        'completed',
        'staff_james',
        'James Thompson',
        12.60,
        70.0,
        1.05,
        CURRENT_DATE - INTERVAL '1 week' + TIME '13:30'
    ),
    (
        'payment_019',
        'cust_008',
        'Robert Garcia',
        'Mustache Trim',
        'service_mustache_trim',
        15.00,
        2.50,
        'cash',
        'completed',
        'staff_david',
        'David Wilson',
        11.25,
        75.0,
        0.88,
        CURRENT_DATE - INTERVAL '1 week' + TIME '12:15'
    ),
    (
        'payment_020',
        'cust_010',
        'Kevin Brown',
        'Senior Haircut',
        'service_senior_cut',
        25.00,
        8.00,
        'cash',
        'completed',
        'staff_marcus',
        'Marcus Johnson',
        20.00,
        80.0,
        1.65,
        CURRENT_DATE - INTERVAL '2 weeks' + TIME '10:45'
    );

-- Insert some additional payments for this month's analytics
INSERT INTO payments (
    customer_id,
    customer_name,
    service_name,
    service_id,
    amount,
    tip,
    payment_method,
    status,
    barber_id,
    barber_name,
    commission,
    commission_rate,
    platform_fee,
    transaction_date
) 
SELECT 
    customers.id,
    customers.name,
    services.name,
    services.id,
    services.price,
    ROUND((services.price * (0.1 + (RANDOM() * 0.15)))::numeric, 2), -- 10-25% tip
    CASE WHEN RANDOM() > 0.3 THEN 'credit_card' ELSE 'cash' END,
    'completed',
    staff.id,
    staff.name,
    ROUND((services.price * staff.commission_rate / 100.0)::numeric, 2),
    staff.commission_rate,
    ROUND((services.price * 0.05)::numeric, 2), -- 5% platform fee
    (CURRENT_DATE - (RANDOM() * INTERVAL '25 days'))::date + 
    (TIME '09:00' + (RANDOM() * INTERVAL '8 hours'))::time
FROM 
    customers 
    CROSS JOIN services 
    CROSS JOIN staff
WHERE 
    customers.status = 'active' 
    AND services.active = true 
    AND staff.is_active = true
    AND RANDOM() < 0.08 -- Only create 8% of possible combinations
LIMIT 50; -- Limit to reasonable number of additional payments

-- Update service performance metrics based on payments
UPDATE services 
SET 
    bookings_this_month = subq.booking_count,
    revenue_this_month = subq.total_revenue,
    bookings_total = subq.total_bookings,
    revenue_total = subq.lifetime_revenue
FROM (
    SELECT 
        p.service_id,
        COUNT(CASE WHEN DATE_TRUNC('month', p.transaction_date) = DATE_TRUNC('month', CURRENT_DATE) 
                   AND p.status = 'completed' THEN 1 END) as booking_count,
        COALESCE(SUM(CASE WHEN DATE_TRUNC('month', p.transaction_date) = DATE_TRUNC('month', CURRENT_DATE) 
                          AND p.status = 'completed' THEN p.amount END), 0) as total_revenue,
        COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as total_bookings,
        COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as lifetime_revenue
    FROM payments p
    WHERE p.service_id IS NOT NULL
    GROUP BY p.service_id
) subq
WHERE services.id = subq.service_id;

-- Update staff performance metrics based on payments  
UPDATE staff 
SET 
    total_appointments_week = subq.weekly_appointments,
    total_revenue_week = subq.weekly_revenue,
    total_appointments = subq.total_appointments,
    total_revenue = subq.total_revenue,
    total_commissions = subq.total_commissions
FROM (
    SELECT 
        p.barber_id,
        COUNT(CASE WHEN p.transaction_date >= DATE_TRUNC('week', CURRENT_DATE) 
                   AND p.status = 'completed' THEN 1 END) as weekly_appointments,
        COALESCE(SUM(CASE WHEN p.transaction_date >= DATE_TRUNC('week', CURRENT_DATE) 
                          AND p.status = 'completed' THEN p.total END), 0) as weekly_revenue,
        COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as total_appointments,
        COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.total END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.commission END), 0) as total_commissions
    FROM payments p
    GROUP BY p.barber_id
) subq
WHERE staff.id = subq.barber_id;

-- Update customer spending and visit counts
UPDATE customers 
SET 
    total_visits = subq.visit_count,
    total_spent = subq.total_spending,
    last_visit = subq.last_visit_date
FROM (
    SELECT 
        p.customer_id,
        COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as visit_count,
        COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.total END), 0) as total_spending,
        MAX(CASE WHEN p.status = 'completed' THEN p.transaction_date::date END) as last_visit_date
    FROM payments p
    GROUP BY p.customer_id
) subq
WHERE customers.id = subq.customer_id;

-- Update customer preferred barber (most frequent barber)
UPDATE customers 
SET preferred_barber_id = subq.preferred_barber
FROM (
    SELECT 
        p.customer_id,
        p.barber_id as preferred_barber,
        ROW_NUMBER() OVER (PARTITION BY p.customer_id ORDER BY COUNT(*) DESC) as rn
    FROM payments p
    WHERE p.status = 'completed'
    GROUP BY p.customer_id, p.barber_id
) subq
WHERE customers.id = subq.customer_id AND subq.rn = 1;

-- Update row count for verification
SELECT 'Payments seed data inserted successfully.' as message,
       COUNT(*) as total_payments,
       COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payments,
       COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
       COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
       ROUND(SUM(CASE WHEN status = 'completed' THEN total END), 2) as total_revenue,
       ROUND(AVG(CASE WHEN status = 'completed' THEN total END), 2) as avg_transaction
FROM payments;

-- Show today's revenue summary
SELECT 'Today''s Revenue Summary:' as summary,
       COUNT(CASE WHEN status = 'completed' THEN 1 END) as transactions_today,
       COALESCE(SUM(CASE WHEN status = 'completed' THEN total END), 0) as revenue_today,
       COALESCE(SUM(CASE WHEN status = 'completed' THEN tip END), 0) as tips_today
FROM payments
WHERE DATE(transaction_date) = CURRENT_DATE;

-- Show week's revenue summary  
SELECT 'This Week''s Revenue Summary:' as summary,
       COUNT(CASE WHEN status = 'completed' THEN 1 END) as transactions_week,
       COALESCE(SUM(CASE WHEN status = 'completed' THEN total END), 0) as revenue_week,
       COALESCE(SUM(CASE WHEN status = 'completed' THEN commission END), 0) as commissions_week
FROM payments
WHERE transaction_date >= DATE_TRUNC('week', CURRENT_DATE);
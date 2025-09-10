-- =====================================================
-- SERVICES SEED DATA FOR 6FB AI AGENT SYSTEM
-- =====================================================
-- Based on mock data from app/dashboard/services/page.js
-- Run this after creating the services table schema

-- Clear existing data (for development/testing)
-- TRUNCATE services CASCADE;

-- Insert seed service data
INSERT INTO services (
    id,
    name,
    category,
    description,
    duration,
    price,
    popular,
    active,
    includes,
    bookings_this_month,
    revenue_this_month,
    average_rating,
    cost_of_goods
) VALUES
    (
        'service_classic_cut',
        'Classic Haircut',
        'haircuts',
        'Traditional haircut with precision cutting and styling',
        30,
        35.00,
        true,
        true,
        ARRAY['Consultation', 'Shampoo', 'Cut', 'Style', 'Product finish'],
        142,
        4970.00,
        4.8,
        3.50
    ),
    (
        'service_premium_cut',
        'Premium Haircut',
        'haircuts',
        'Executive haircut with hot towel service and premium styling',
        45,
        55.00,
        true,
        true,
        ARRAY['Consultation', 'Shampoo', 'Cut', 'Style', 'Hot towel', 'Scalp massage', 'Premium products'],
        87,
        4785.00,
        4.9,
        7.50
    ),
    (
        'service_beard_trim',
        'Beard Trim & Shape',
        'beard',
        'Professional beard trimming and shaping',
        20,
        25.00,
        true,
        true,
        ARRAY['Beard consultation', 'Trim', 'Shape', 'Beard oil treatment'],
        98,
        2450.00,
        4.7,
        2.50
    ),
    (
        'service_hot_shave',
        'Traditional Hot Shave',
        'beard',
        'Classic hot towel shave with straight razor',
        40,
        45.00,
        false,
        true,
        ARRAY['Pre-shave oil', 'Hot towel', 'Straight razor shave', 'Aftershave treatment', 'Face moisturizer'],
        34,
        1530.00,
        4.95,
        5.00
    ),
    (
        'service_kids_cut',
        'Kids Haircut (Under 12)',
        'haircuts',
        'Gentle haircut service for children',
        25,
        20.00,
        false,
        true,
        ARRAY['Fun consultation', 'Cut', 'Style', 'Lollipop'],
        56,
        1120.00,
        4.6,
        1.50
    ),
    (
        'service_hair_color',
        'Hair Color Service',
        'color',
        'Professional hair coloring and highlights',
        90,
        85.00,
        false,
        true,
        ARRAY['Color consultation', 'Application', 'Processing', 'Wash', 'Style'],
        12,
        1020.00,
        4.8,
        25.00
    ),
    (
        'service_scalp_treatment',
        'Scalp Treatment',
        'treatments',
        'Rejuvenating scalp treatment for healthy hair',
        30,
        40.00,
        false,
        true,
        ARRAY['Scalp analysis', 'Deep cleansing', 'Treatment application', 'Massage', 'Conditioning'],
        23,
        920.00,
        4.85,
        8.00
    ),
    (
        'service_hair_design',
        'Creative Hair Design',
        'styling',
        'Custom hair designs and patterns',
        60,
        75.00,
        false,
        true,
        ARRAY['Design consultation', 'Custom pattern', 'Precision cutting', 'Detailing', 'Photo finish'],
        8,
        600.00,
        5.0,
        5.00
    ),
    -- Additional services for comprehensive catalog
    (
        'service_fade_cut',
        'Fade Haircut',
        'haircuts',
        'Modern fade cut with precise blending',
        35,
        40.00,
        true,
        true,
        ARRAY['Consultation', 'Fade cutting', 'Blending', 'Top styling', 'Finish'],
        95,
        3800.00,
        4.7,
        4.00
    ),
    (
        'service_buzz_cut',
        'Buzz Cut',
        'haircuts',
        'Clean and simple buzz cut',
        15,
        18.00,
        false,
        true,
        ARRAY['Length consultation', 'Clipper cut', 'Edge cleanup'],
        67,
        1206.00,
        4.4,
        1.00
    ),
    (
        'service_mustache_trim',
        'Mustache Trim',
        'beard',
        'Precision mustache trimming and shaping',
        15,
        15.00,
        false,
        true,
        ARRAY['Trim', 'Shape', 'Wax application'],
        45,
        675.00,
        4.6,
        1.50
    ),
    (
        'service_eyebrow_trim',
        'Eyebrow Trim',
        'styling',
        'Professional eyebrow trimming for men',
        10,
        12.00,
        false,
        true,
        ARRAY['Consultation', 'Trim', 'Shape'],
        28,
        336.00,
        4.3,
        0.50
    ),
    (
        'service_hair_wash',
        'Hair Wash & Style',
        'treatments',
        'Professional hair washing and styling',
        20,
        22.00,
        false,
        true,
        ARRAY['Shampoo', 'Conditioning', 'Scalp massage', 'Blow dry', 'Style'],
        39,
        858.00,
        4.5,
        3.00
    ),
    (
        'service_senior_cut',
        'Senior Haircut (65+)',
        'haircuts',
        'Discounted haircut for seniors',
        30,
        25.00,
        false,
        true,
        ARRAY['Consultation', 'Cut', 'Style', 'Senior discount applied'],
        31,
        775.00,
        4.8,
        2.50
    ),
    (
        'service_beard_oil',
        'Beard Oil Treatment',
        'treatments',
        'Premium beard oil application and massage',
        15,
        18.00,
        false,
        true,
        ARRAY['Beard assessment', 'Oil selection', 'Application', 'Massage'],
        22,
        396.00,
        4.7,
        6.00
    );

-- Insert service add-ons
INSERT INTO service_addons (
    name,
    description,
    price,
    duration,
    active
) VALUES
    (
        'Hot Towel Treatment',
        'Relaxing hot towel application',
        8.00,
        5,
        true
    ),
    (
        'Scalp Massage',
        'Therapeutic scalp massage',
        12.00,
        10,
        true
    ),
    (
        'Beard Oil Application',
        'Premium beard oil treatment',
        10.00,
        5,
        true
    ),
    (
        'Hair Styling Product',
        'Premium styling product application',
        6.00,
        3,
        true
    ),
    (
        'Eyebrow Trim',
        'Quick eyebrow cleanup',
        5.00,
        5,
        true
    ),
    (
        'Nose Hair Trim',
        'Professional nose hair trimming',
        4.00,
        3,
        true
    ),
    (
        'Face Moisturizer',
        'Hydrating face moisturizer application',
        8.00,
        3,
        true
    );

-- Insert service packages
INSERT INTO service_packages (
    name,
    description,
    package_price,
    service_ids,
    discount_percentage,
    popular,
    active
) VALUES
    (
        'The Complete Gentleman',
        'Full service package with haircut, beard trim, and hot shave',
        95.00,
        ARRAY['service_premium_cut', 'service_beard_trim', 'service_hot_shave'],
        15.0,
        true,
        true
    ),
    (
        'Quick & Clean',
        'Basic haircut and beard trim combo',
        52.00,
        ARRAY['service_classic_cut', 'service_beard_trim'],
        10.0,
        true,
        true
    ),
    (
        'The Executive',
        'Premium haircut with styling and treatments',
        85.00,
        ARRAY['service_premium_cut', 'service_scalp_treatment'],
        12.0,
        false,
        true
    ),
    (
        'Father & Son Special',
        'Adult and kids haircut combo',
        50.00,
        ARRAY['service_classic_cut', 'service_kids_cut'],
        8.0,
        false,
        true
    );

-- Insert some dynamic pricing rules
INSERT INTO service_pricing_rules (
    name,
    rule_type,
    service_id,
    conditions,
    adjustment_type,
    adjustment_value,
    priority,
    active
) VALUES
    (
        'Weekend Premium',
        'time_based',
        NULL, -- Applies to all services
        '{"days": ["saturday", "sunday"], "times": ["all_day"]}',
        'percentage',
        10.0,
        5,
        true
    ),
    (
        'Early Bird Discount',
        'time_based',
        NULL, -- Applies to all services
        '{"days": ["monday", "tuesday", "wednesday", "thursday", "friday"], "times": ["08:00-10:00"]}',
        'percentage',
        -5.0,
        3,
        true
    ),
    (
        'Happy Hour Discount',
        'time_based',
        NULL, -- Applies to all services
        '{"days": ["monday", "tuesday", "wednesday"], "times": ["14:00-16:00"]}',
        'percentage',
        -10.0,
        2,
        true
    );

-- Update row count for verification
SELECT 'Services seed data inserted successfully.' as message,
       COUNT(*) as total_services,
       COUNT(CASE WHEN active = true THEN 1 END) as active_services,
       COUNT(CASE WHEN popular = true THEN 1 END) as popular_services,
       COUNT(CASE WHEN category = 'haircuts' THEN 1 END) as haircut_services,
       COUNT(CASE WHEN category = 'beard' THEN 1 END) as beard_services,
       COUNT(CASE WHEN category = 'treatments' THEN 1 END) as treatment_services,
       ROUND(AVG(price), 2) as avg_service_price
FROM services;

SELECT 'Service add-ons inserted:' as message, COUNT(*) as addon_count FROM service_addons;
SELECT 'Service packages inserted:' as message, COUNT(*) as package_count FROM service_packages;
SELECT 'Pricing rules inserted:' as message, COUNT(*) as pricing_rules_count FROM service_pricing_rules;
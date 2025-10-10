-- =====================================================
-- INVENTORY SEED DATA FOR 6FB AI AGENT SYSTEM
-- =====================================================
-- Based on mock data from app/dashboard/inventory/page.js
-- Run this after creating the inventory table schema

-- Clear existing data (for development/testing)
-- TRUNCATE inventory CASCADE;

-- Insert seed inventory data
INSERT INTO inventory (
    id,
    name,
    sku,
    barcode,
    brand,
    category,
    current_stock,
    min_stock,
    max_stock,
    unit_cost,
    retail_price,
    supplier,
    last_ordered,
    last_received,
    usage_rate,
    location,
    is_retail,
    description
) VALUES
    (
        'inv_hair_gel_01',
        'Premium Hair Gel',
        'HG-001',
        '123456789012',
        'StylePro',
        'hair_products',
        3,
        10,
        50,
        8.50,
        15.99,
        'Beauty Supplies Co.',
        '2024-01-05',
        '2024-01-10',
        2.5,
        'Shelf A-2',
        true,
        'Strong hold hair gel for professional styling'
    ),
    (
        'inv_shampoo_02',
        'Professional Shampoo',
        'SH-002',
        '123456789013',
        'CleanCut',
        'hair_products',
        24,
        10,
        40,
        12.00,
        22.99,
        'Beauty Supplies Co.',
        '2024-01-01',
        '2024-01-07',
        4.0,
        'Shelf A-1',
        true,
        'Professional grade cleansing shampoo'
    ),
    (
        'inv_clipper_oil_03',
        'Clipper Oil',
        'CO-003',
        '123456789014',
        'BarberPro',
        'tools',
        8,
        5,
        20,
        4.50,
        9.99,
        'Equipment Plus',
        '2023-12-20',
        '2023-12-25',
        0.5,
        'Cabinet B-1',
        true,
        'Premium clipper maintenance oil'
    ),
    (
        'inv_razor_blades_04',
        'Straight Razor Blades (100pk)',
        'RB-004',
        '123456789015',
        'SharpEdge',
        'tools',
        2,
        3,
        10,
        15.00,
        NULL,
        'Equipment Plus',
        '2023-12-15',
        '2023-12-20',
        1.0,
        'Cabinet B-2',
        false,
        'Professional straight razor replacement blades'
    ),
    (
        'inv_neck_strips_05',
        'Neck Strips (500ct)',
        'NS-005',
        '123456789016',
        'SaniStrip',
        'consumables',
        350,
        200,
        1000,
        0.02,
        NULL,
        'Wholesale Barber Supply',
        '2024-01-02',
        '2024-01-08',
        50.0,
        'Storage Room',
        false,
        'Disposable sanitary neck strips'
    ),
    (
        'inv_beard_oil_06',
        'Beard Oil',
        'BO-006',
        '123456789017',
        'BeardCraft',
        'retail',
        15,
        10,
        30,
        10.00,
        24.99,
        'Beauty Supplies Co.',
        '2023-12-28',
        '2024-01-03',
        3.0,
        'Display Case',
        true,
        'Premium beard conditioning oil'
    ),
    (
        'inv_towels_07',
        'Black Towels (12pk)',
        'BT-007',
        '123456789018',
        'ProTowel',
        'supplies',
        4,
        6,
        20,
        24.00,
        NULL,
        'Wholesale Barber Supply',
        '2023-12-25',
        '2023-12-30',
        2.0,
        'Laundry Room',
        false,
        'Professional black cotton towels'
    ),
    (
        'inv_aftershave_08',
        'Aftershave Lotion',
        'AS-008',
        '123456789019',
        'CoolBreeze',
        'hair_products',
        12,
        8,
        25,
        6.50,
        14.99,
        'Beauty Supplies Co.',
        '2024-01-03',
        '2024-01-09',
        2.0,
        'Shelf A-3',
        true,
        'Soothing aftershave with aloe'
    ),
    -- Additional inventory items for comprehensive testing
    (
        'inv_scissors_09',
        'Professional Hair Scissors',
        'SC-009',
        '123456789020',
        'CutMaster',
        'tools',
        6,
        4,
        12,
        89.99,
        179.99,
        'Equipment Plus',
        '2023-11-15',
        '2023-11-20',
        0.1,
        'Tool Cabinet',
        true,
        'Professional Japanese steel hair cutting scissors'
    ),
    (
        'inv_pomade_10',
        'Hair Pomade',
        'HP-010',
        '123456789021',
        'ClassicStyle',
        'hair_products',
        18,
        12,
        35,
        9.75,
        19.99,
        'Beauty Supplies Co.',
        '2024-01-08',
        '2024-01-12',
        3.2,
        'Shelf A-4',
        true,
        'Traditional water-based pomade'
    ),
    (
        'inv_disinfectant_11',
        'Barbicide Disinfectant',
        'DS-011',
        '123456789022',
        'Barbicide',
        'supplies',
        8,
        5,
        15,
        16.50,
        NULL,
        'Wholesale Barber Supply',
        '2024-01-01',
        '2024-01-06',
        1.0,
        'Sanitation Station',
        false,
        'EPA approved disinfectant for tools'
    ),
    (
        'inv_cape_12',
        'Barber Cape (Black)',
        'BC-012',
        '123456789023',
        'ProStyle',
        'supplies',
        12,
        8,
        25,
        18.75,
        NULL,
        'Wholesale Barber Supply',
        '2023-12-10',
        '2023-12-15',
        0.8,
        'Cape Hooks',
        false,
        'Water-resistant professional barber cape'
    ),
    (
        'inv_clipper_set_13',
        'Professional Clipper Set',
        'CS-013',
        '123456789024',
        'WahlPro',
        'tools',
        3,
        2,
        8,
        125.00,
        249.99,
        'Equipment Plus',
        '2023-10-20',
        '2023-10-25',
        0.05,
        'Tool Cabinet',
        true,
        'Professional cordless clipper set with guards'
    ),
    (
        'inv_shaving_cream_14',
        'Shaving Cream',
        'SC-014',
        '123456789025',
        'LatherLux',
        'hair_products',
        22,
        15,
        40,
        7.25,
        16.50,
        'Beauty Supplies Co.',
        '2024-01-04',
        '2024-01-09',
        2.8,
        'Shelf B-1',
        true,
        'Rich lathering shaving cream'
    ),
    (
        'inv_hair_spray_15',
        'Finishing Hair Spray',
        'HS-015',
        '123456789026',
        'HoldFast',
        'hair_products',
        14,
        10,
        30,
        8.90,
        17.99,
        'Beauty Supplies Co.',
        '2024-01-06',
        '2024-01-11',
        2.2,
        'Shelf A-5',
        true,
        'Strong hold finishing spray'
    ),
    -- Low stock items for testing alerts
    (
        'inv_low_stock_16',
        'Hair Conditioner',
        'HC-016',
        '123456789027',
        'DeepCare',
        'hair_products',
        4,
        15,
        35,
        10.50,
        21.99,
        'Beauty Supplies Co.',
        '2023-12-01',
        '2023-12-05',
        3.5,
        'Shelf A-6',
        true,
        'Deep conditioning treatment'
    ),
    (
        'inv_critical_17',
        'Sharpening Oil',
        'SO-017',
        '123456789028',
        'BladeSharp',
        'tools',
        1,
        5,
        15,
        12.75,
        NULL,
        'Equipment Plus',
        '2023-11-01',
        '2023-11-05',
        0.3,
        'Tool Maintenance',
        false,
        'Specialized oil for blade sharpening'
    );

-- Insert some stock movement history
INSERT INTO stock_movements (
    inventory_id,
    movement_type,
    quantity,
    unit_cost,
    reason,
    movement_date
) VALUES
    -- Recent purchases
    ('inv_shampoo_02', 'purchase', 20, 12.00, 'Monthly restock order', '2024-01-07'::timestamp),
    ('inv_hair_gel_01', 'purchase', 25, 8.50, 'Monthly restock order', '2024-01-10'::timestamp),
    ('inv_beard_oil_06', 'purchase', 12, 10.00, 'Monthly restock order', '2024-01-03'::timestamp),
    
    -- Usage/sales
    ('inv_shampoo_02', 'usage', -3, NULL, 'Used in services', CURRENT_DATE - INTERVAL '1 day'),
    ('inv_hair_gel_01', 'usage', -5, NULL, 'Used in services', CURRENT_DATE - INTERVAL '2 days'),
    ('inv_neck_strips_05', 'usage', -75, NULL, 'Daily service usage', CURRENT_DATE - INTERVAL '1 day'),
    ('inv_clipper_oil_03', 'usage', -1, NULL, 'Tool maintenance', CURRENT_DATE - INTERVAL '3 days'),
    
    -- Retail sales
    ('inv_beard_oil_06', 'sale', -2, 10.00, 'Retail sale to customer', CURRENT_DATE - INTERVAL '1 day'),
    ('inv_scissors_09', 'sale', -1, 89.99, 'Retail sale to customer', CURRENT_DATE - INTERVAL '5 days'),
    ('inv_pomade_10', 'sale', -3, 9.75, 'Retail sales', CURRENT_DATE - INTERVAL '2 days'),
    
    -- Adjustments
    ('inv_towels_07', 'adjustment', -2, NULL, 'Worn towels discarded', CURRENT_DATE - INTERVAL '1 week'),
    ('inv_razor_blades_04', 'adjustment', -3, NULL, 'Defective blades removed', CURRENT_DATE - INTERVAL '1 week'),
    
    -- Waste/expired
    ('inv_low_stock_16', 'waste', -2, NULL, 'Expired product disposal', CURRENT_DATE - INTERVAL '3 days');

-- Generate reorder suggestions for low stock items
INSERT INTO reorder_suggestions (
    inventory_id,
    suggested_quantity,
    priority,
    estimated_stock_out_date,
    status
) VALUES
    (
        'inv_hair_gel_01',
        47, -- Bring to max stock (50 - 3)
        'high',
        CURRENT_DATE + INTERVAL '1 week', -- Based on usage rate
        'pending'
    ),
    (
        'inv_razor_blades_04',
        8, -- Bring to max stock (10 - 2)
        'urgent',
        CURRENT_DATE + INTERVAL '2 weeks',
        'pending'
    ),
    (
        'inv_towels_07',
        16, -- Bring to max stock (20 - 4)
        'medium',
        CURRENT_DATE + INTERVAL '2 weeks',
        'pending'
    ),
    (
        'inv_low_stock_16',
        31, -- Bring to max stock (35 - 4)
        'high',
        CURRENT_DATE + INTERVAL '1 week',
        'pending'
    ),
    (
        'inv_critical_17',
        14, -- Bring to max stock (15 - 1)
        'urgent',
        CURRENT_DATE + INTERVAL '3 weeks',
        'pending'
    );

-- Update inventory status based on current stock levels
UPDATE inventory 
SET status = CASE 
    WHEN current_stock <= 0 THEN 'out_of_stock'::inventory_status
    WHEN current_stock <= (min_stock * 0.5) THEN 'critical'::inventory_status
    WHEN current_stock <= min_stock THEN 'low'::inventory_status
    ELSE 'good'::inventory_status
END;

-- Update row count for verification
SELECT 'Inventory seed data inserted successfully.' as message,
       COUNT(*) as total_items,
       COUNT(CASE WHEN status = 'good' THEN 1 END) as good_stock,
       COUNT(CASE WHEN status = 'low' THEN 1 END) as low_stock,
       COUNT(CASE WHEN status = 'critical' THEN 1 END) as critical_stock,
       COUNT(CASE WHEN status = 'out_of_stock' THEN 1 END) as out_of_stock,
       COUNT(CASE WHEN is_retail = true THEN 1 END) as retail_items,
       ROUND(SUM(current_stock * unit_cost), 2) as total_inventory_value
FROM inventory;

SELECT 'Stock movements inserted:' as message, COUNT(*) as movement_count FROM stock_movements;
SELECT 'Reorder suggestions created:' as message, COUNT(*) as suggestion_count FROM reorder_suggestions;
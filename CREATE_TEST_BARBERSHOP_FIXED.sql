-- =====================================================
-- Create Test Barbershop for Dev User (Fixed)
-- =====================================================

-- First, get the user ID for dev@bookedbarber.com
DO $$
DECLARE
  v_user_id UUID;
  v_barbershop_id UUID;
BEGIN
  -- Get the user ID
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'dev@bookedbarber.com'
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User dev@bookedbarber.com not found. Please log in first.';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found user ID: %', v_user_id;
  
  -- Create a barbershop for this user (using only columns that exist)
  INSERT INTO barbershops (
    id,
    owner_id,
    name,
    address,
    phone,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    'Dev Test Barbershop',
    '123 Main Street, Los Angeles, CA 90001',
    '555-0123',
    NOW(),
    NOW()
  ) RETURNING id INTO v_barbershop_id;
  
  -- Update the user's profile to link to this barbershop
  UPDATE profiles 
  SET 
    shop_id = v_barbershop_id,
    barbershop_id = v_barbershop_id,
    role = 'SHOP_OWNER',
    updated_at = NOW()
  WHERE id = v_user_id;
  
  -- Create marketplace enrollment for testing
  INSERT INTO marketplace_enrollment (
    barbershop_id,
    enrollment_status,
    is_enrolled,
    enrolled_at,
    discount_tier,
    credit_limit,
    flat_discount_percent,
    company_name,
    account_number,
    order_notification_email,
    marketing_opt_in
  ) VALUES (
    v_barbershop_id,
    'active',
    true,
    NOW(),
    'gold',
    10000.00,
    10.00,
    'Dev Test Barbershop',
    'BB-' || SUBSTRING(v_barbershop_id::text, 1, 8),
    'dev@bookedbarber.com',
    true
  ) ON CONFLICT (barbershop_id) DO UPDATE SET
    enrollment_status = 'active',
    is_enrolled = true,
    discount_tier = 'gold',
    credit_limit = 10000.00,
    flat_discount_percent = 10.00;
  
  -- Add some sample products to local inventory for testing
  INSERT INTO barbershop_inventory (
    barbershop_id,
    product_source,
    master_product_id,
    name,
    brand,
    sku,
    category,
    quantity_on_hand,
    reorder_point,
    cost_price,
    retail_price,
    show_in_pos
  )
  SELECT 
    v_barbershop_id,
    'marketplace',
    mp.id,
    mp.name,
    mp.brand,
    mp.sku || '-LOCAL',
    mp.category,
    10, -- Starting inventory
    5,  -- Reorder when below 5
    mp.wholesale_price * 0.9, -- Gold tier discount
    mp.msrp,
    true
  FROM master_products mp
  WHERE mp.sku IN ('BB-POMADE-001', 'BB-CLIPPER-001')
  ON CONFLICT (barbershop_id, sku) DO NOTHING;
  
  RAISE NOTICE '✅ Successfully created barbershop: %', v_barbershop_id;
  RAISE NOTICE '✅ User profile updated with shop_id';
  RAISE NOTICE '✅ Marketplace enrollment activated (Gold tier, $10,000 credit)';
  RAISE NOTICE '✅ Added sample products to local inventory';
  
END $$;

-- Verify the setup
SELECT 
  b.id as barbershop_id,
  b.name,
  b.owner_id,
  p.email,
  p.role,
  me.enrollment_status,
  me.discount_tier,
  me.credit_limit
FROM barbershops b
JOIN profiles p ON b.owner_id = p.id
LEFT JOIN marketplace_enrollment me ON b.id = me.barbershop_id
WHERE p.email = 'dev@bookedbarber.com';

-- Show local inventory
SELECT 
  'Local Inventory:' as status,
  bi.name,
  bi.sku,
  bi.quantity_on_hand,
  bi.retail_price
FROM barbershop_inventory bi
JOIN barbershops b ON bi.barbershop_id = b.id
JOIN profiles p ON b.owner_id = p.id
WHERE p.email = 'dev@bookedbarber.com';
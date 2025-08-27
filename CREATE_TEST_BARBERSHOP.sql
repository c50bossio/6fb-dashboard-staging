-- =====================================================
-- Create Test Barbershop for Dev User
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
  
  -- Create a barbershop for this user
  INSERT INTO barbershops (
    id,
    owner_id,
    name,
    address,
    city,
    state,
    zip,
    phone,
    email,
    business_hours,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    'Dev Test Barbershop',
    '123 Main Street',
    'Los Angeles',
    'CA',
    '90001',
    '555-0123',
    'dev@bookedbarber.com',
    '{
      "monday": {"open": "09:00", "close": "18:00"},
      "tuesday": {"open": "09:00", "close": "18:00"},
      "wednesday": {"open": "09:00", "close": "18:00"},
      "thursday": {"open": "09:00", "close": "18:00"},
      "friday": {"open": "09:00", "close": "18:00"},
      "saturday": {"open": "10:00", "close": "16:00"},
      "sunday": {"open": "closed", "close": "closed"}
    }'::jsonb,
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
    credit_limit = 10000.00;
  
  RAISE NOTICE '✅ Successfully created barbershop: %', v_barbershop_id;
  RAISE NOTICE '✅ User profile updated with shop_id';
  RAISE NOTICE '✅ Marketplace enrollment activated (Gold tier, $10,000 credit)';
  
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
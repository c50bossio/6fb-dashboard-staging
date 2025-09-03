-- ============================================================================
-- COMPLETE PROFILE FIX FOR c50bossio@gmail.com ENTERPRISE_OWNER
-- ============================================================================

-- STEP 1: Update/Insert the profile with ALL required fields
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  subscription_tier,
  subscription_status,
  is_active,
  created_at,
  updated_at
) VALUES (
  'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5',
  'c50bossio@gmail.com',
  'Chris Bossio',
  'ENTERPRISE_OWNER',
  'enterprise',
  'active',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  subscription_tier = EXCLUDED.subscription_tier,
  subscription_status = EXCLUDED.subscription_status,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- STEP 2: Ensure there's a barbershop for this user to manage
-- First check if a barbershop exists for this owner
DO $$
BEGIN
  -- Only create if no barbershop exists for this owner
  IF NOT EXISTS (SELECT 1 FROM barbershops WHERE owner_id = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5') THEN
    INSERT INTO barbershops (
      id,
      owner_id,
      name,
      email,
      phone,
      address,
      city,
      state,
      zip_code,
      business_hours,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5',
      'Enterprise Barbershop',
      'c50bossio@gmail.com',
      '(555) 123-4567',
      '123 Enterprise Street',
      'Business City',
      'CA',
      '90210',
      '{"monday": {"open": "09:00", "close": "18:00", "is_open": true}, "tuesday": {"open": "09:00", "close": "18:00", "is_open": true}, "wednesday": {"open": "09:00", "close": "18:00", "is_open": true}, "thursday": {"open": "09:00", "close": "18:00", "is_open": true}, "friday": {"open": "09:00", "close": "18:00", "is_open": true}, "saturday": {"open": "09:00", "close": "16:00", "is_open": true}, "sunday": {"open": "10:00", "close": "15:00", "is_open": false}}'::jsonb,
      NOW(),
      NOW()
    );
  END IF;
END $$;

-- STEP 3: Associate the profile with the barbershop
UPDATE profiles 
SET barbershop_id = (
  SELECT id FROM barbershops 
  WHERE owner_id = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5' 
  LIMIT 1
)
WHERE id = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5';

-- STEP 4: Verify everything is set up correctly
SELECT 
  '✅ VERIFICATION' as step,
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.subscription_tier,
  p.subscription_status,
  p.barbershop_id,
  b.name as barbershop_name,
  b.owner_id as barbershop_owner_id,
  CASE 
    WHEN p.role IN ('ENTERPRISE_OWNER', 'SUPER_ADMIN', 'SHOP_OWNER') THEN true 
    ELSE false 
  END as should_have_staff_access
FROM profiles p
LEFT JOIN barbershops b ON p.barbershop_id = b.id
WHERE p.id = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5';

-- SUCCESS MESSAGE
SELECT '🎉 Profile setup complete! Click "Refresh Data" in the browser to see changes.' as result;
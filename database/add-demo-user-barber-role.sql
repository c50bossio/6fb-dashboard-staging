-- =============================================================================
-- Enable Demo User as Enterprise Owner + Barber (Dual Role)
-- =============================================================================
-- Purpose: Configure demo@barbershop.com to have BOTH:
--   1. ENTERPRISE_OWNER system-wide permissions (unchanged)
--   2. BARBER functionality at all organization locations (new)
--
-- Background: The 6FB system uses a two-tier role architecture:
--   - profiles.role: System-wide permission level
--   - barbershop_staff.role: Location-specific functional role
--
-- This allows an owner to also work as a barber - a common real-world scenario.
-- =============================================================================

BEGIN;

-- Known IDs (from seed data)
-- Demo User: 2951b2ff-9856-4d95-ab81-9dbc3db741e2
-- Organization: 0849549e-1d4b-40d1-b0fa-cc6fe12360a2
-- Tomb45 Channelside: c5a58548-8f23-426c-bedc-49a83d238724

-- =============================================================================
-- Step 1: Verify demo user has ENTERPRISE_OWNER role (should be unchanged)
-- =============================================================================
SELECT
  id,
  email,
  full_name,
  role,
  organization_id,
  barbershop_id
FROM profiles
WHERE email = 'demo@barbershop.com';

-- Expected: role = 'ENTERPRISE_OWNER', organization_id = '0849549e-1d4b-40d1-b0fa-cc6fe12360a2'

-- =============================================================================
-- Step 2: Get all barbershops in the organization
-- =============================================================================
DO $$
DECLARE
  demo_user_id UUID;
  shop_record RECORD;
  inserted_count INT := 0;
BEGIN
  -- Get demo user ID
  SELECT id INTO demo_user_id
  FROM profiles
  WHERE email = 'demo@barbershop.com';

  IF demo_user_id IS NULL THEN
    RAISE EXCEPTION 'Demo user not found: demo@barbershop.com';
  END IF;

  RAISE NOTICE 'Demo User ID: %', demo_user_id;

  -- Insert barbershop_staff entry for EACH location in the organization
  FOR shop_record IN (
    SELECT id, name, city, state
    FROM barbershops
    WHERE organization_id = '0849549e-1d4b-40d1-b0fa-cc6fe12360a2'
       OR id = 'c5a58548-8f23-426c-bedc-49a83d238724' -- Ensure Tomb45 Channelside is included
  )
  LOOP
    INSERT INTO barbershop_staff (
      barbershop_id,
      user_id,
      role,
      commission_rate,
      arrangement_type,
      is_active,
      started_at,
      created_at,
      updated_at
    ) VALUES (
      shop_record.id,
      demo_user_id,
      'BARBER'::user_role,
      0.75,  -- 75% commission (owner-barber arrangement)
      'commission',
      true,
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (barbershop_id, user_id)
    DO UPDATE SET
      role = 'BARBER'::user_role,
      commission_rate = 0.75,
      arrangement_type = 'commission',
      is_active = true,
      updated_at = NOW();

    inserted_count := inserted_count + 1;
    RAISE NOTICE 'Added barber role for: % (%, %)', shop_record.name, shop_record.city, shop_record.state;
  END LOOP;

  RAISE NOTICE 'Total locations configured: %', inserted_count;

END $$;

-- =============================================================================
-- Step 3: Verify the dual-role setup
-- =============================================================================

-- Show demo user's profile-level role
SELECT
  '=== PROFILE-LEVEL ROLE (System-wide permissions) ===' as section,
  email,
  role as profile_role,
  organization_id,
  barbershop_id as default_barbershop,
  subscription_tier,
  onboarding_completed
FROM profiles
WHERE email = 'demo@barbershop.com';

-- Show demo user's location-specific barber roles
SELECT
  '=== LOCATION-SPECIFIC ROLES (Barber functionality) ===' as section,
  bs.id as staff_id,
  b.name as barbershop_name,
  b.city,
  b.state,
  bs.role as staff_role,
  bs.commission_rate,
  bs.arrangement_type,
  bs.is_active,
  bs.started_at
FROM barbershop_staff bs
JOIN barbershops b ON b.id = bs.barbershop_id
WHERE bs.user_id = (SELECT id FROM profiles WHERE email = 'demo@barbershop.com')
ORDER BY b.name;

-- =============================================================================
-- Step 4: Show what this enables
-- =============================================================================
SELECT
  '=== DUAL-ROLE CAPABILITIES ===' as section,
  'Enterprise Owner View: /dashboard → Manage all locations, analytics, staff' as enterprise_capabilities,
  'Barber View: /barber/dashboard → Personal appointments, earnings (75% commission)' as barber_capabilities,
  'API Access: Appears in barber dropdowns for appointment booking' as booking_capability,
  'Financial Tracking: Owner barber earnings tracked separately at 75% rate' as financial_tracking;

COMMIT;

-- =============================================================================
-- Success Message
-- =============================================================================
SELECT
  'DUAL-ROLE SETUP COMPLETE!' as status,
  'Demo user now has BOTH enterprise owner and barber capabilities' as result,
  'Login at http://localhost:9999/barber/dashboard to see barber view' as next_step,
  'Use shop selector to switch between locations' as tip;

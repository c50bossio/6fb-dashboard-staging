-- =============================================================================
-- Fix Demo User Profile - Connect to Tomb45 Channelside Location
-- =============================================================================
-- Issue: Demo user profile missing barbershop_id, preventing dashboard from loading
-- Solution: Link demo user to the seeded Tomb45 Channelside barbershop
-- =============================================================================

BEGIN;

-- Update demo user profile with barbershop_id and ensure correct role
UPDATE profiles
SET
  barbershop_id = 'c5a58548-8f23-426c-bedc-49a83d238724',  -- Tomb45 Channelside
  role = 'ENTERPRISE_OWNER',
  updated_at = NOW()
WHERE email = 'demo@barbershop.com';

-- Verify the update
SELECT
  id,
  email,
  role,
  barbershop_id,
  full_name,
  updated_at
FROM profiles
WHERE email = 'demo@barbershop.com';

COMMIT;

-- Success message
SELECT 'Demo user profile updated successfully! Dashboard should now load with seeded data.' as status;

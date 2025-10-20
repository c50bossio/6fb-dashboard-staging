-- ============================================================================
-- FIX NULL VALUES: Assign barbershop_id and barber_id to migrated appointments
-- ============================================================================
-- Date: 2025-10-20
-- Purpose: Update 28 appointments with NULL barbershop_id and barber_id
-- Target: Assign to 6FB Barbershop and John Smith (first barber)
-- ============================================================================

DO $$
DECLARE
  updated_count INTEGER := 0;
  default_shop_id UUID := 'aa188b4a-eb7d-4655-a45a-2c7436013f01';  -- 6FB Barbershop
  default_barber_id UUID := '303bb1b9-5d25-4874-8380-4de3ad1e965c';  -- John Smith
BEGIN
  RAISE NOTICE '🔧 Fixing NULL barbershop_id and barber_id values...';
  RAISE NOTICE '';
  RAISE NOTICE 'Target Shop: 6FB Barbershop (aa188b4a-eb7d-4655-a45a-2c7436013f01)';
  RAISE NOTICE 'Default Barber: John Smith (303bb1b9-5d25-4874-8380-4de3ad1e965c)';
  RAISE NOTICE '';

  -- Update appointments with NULL barbershop_id
  UPDATE appointments
  SET
    barbershop_id = default_shop_id,
    barber_id = default_barber_id,
    updated_at = NOW()
  WHERE barbershop_id IS NULL
  AND barber_id IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RAISE NOTICE '✅ Updated % appointments', updated_count;
  RAISE NOTICE '';
END $$;

-- VERIFY THE FIX
DO $$
DECLARE
  remaining_null INTEGER;
BEGIN
  RAISE NOTICE '🔍 Verification...';

  SELECT COUNT(*) INTO remaining_null
  FROM appointments
  WHERE barbershop_id IS NULL OR barber_id IS NULL;

  IF remaining_null = 0 THEN
    RAISE NOTICE '✅ All appointments now have barbershop_id and barber_id!';
  ELSE
    RAISE NOTICE '⚠️  % appointments still have NULL values', remaining_null;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '🎉 ==========================================';
  RAISE NOTICE '🎉 FIX COMPLETED!';
  RAISE NOTICE '🎉 ==========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next: Test calendar dashboard';
  RAISE NOTICE '   All migrated appointments should now appear';
  RAISE NOTICE '';
END $$;

-- SHOW UPDATED APPOINTMENTS
SELECT
  id,
  client_name,
  scheduled_at,
  status,
  barbershop_id,
  barber_id
FROM appointments
WHERE updated_at > NOW() - INTERVAL '1 minute'
ORDER BY scheduled_at
LIMIT 10;

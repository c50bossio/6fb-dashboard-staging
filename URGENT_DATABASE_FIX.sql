-- URGENT: Fix appointments table schema mismatch
-- Run this in your Supabase SQL Editor immediately

-- Step 1: Add shop_id column if it doesn't exist
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS shop_id UUID;

-- Step 2: Populate shop_id with barbershop_id values  
UPDATE appointments SET shop_id = barbershop_id WHERE shop_id IS NULL;

-- Step 3: Add index for performance
CREATE INDEX IF NOT EXISTS idx_appointments_shop_id ON appointments(shop_id);

-- Step 4: Create trigger to keep columns in sync
CREATE OR REPLACE FUNCTION sync_appointments_shop_ids()
RETURNS TRIGGER AS $$
BEGIN
  NEW.shop_id = NEW.barbershop_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_appointments_shop_ids_trigger ON appointments;
CREATE TRIGGER sync_appointments_shop_ids_trigger
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION sync_appointments_shop_ids();

-- Verification query (run after the above)
SELECT 
  COUNT(*) as total_appointments,
  COUNT(shop_id) as appointments_with_shop_id,
  COUNT(barbershop_id) as appointments_with_barbershop_id
FROM appointments;
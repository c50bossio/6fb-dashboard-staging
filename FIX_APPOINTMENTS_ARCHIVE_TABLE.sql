-- Fix for the actual appointments table: appointments_archive_20250120
-- Add shop_id column to the real table

-- Step 1: Add shop_id column to the actual table
ALTER TABLE appointments_archive_20250120 ADD COLUMN IF NOT EXISTS shop_id UUID;

-- Step 2: Populate shop_id with barbershop_id values  
UPDATE appointments_archive_20250120 SET shop_id = barbershop_id WHERE shop_id IS NULL;

-- Step 3: Add performance index
CREATE INDEX IF NOT EXISTS idx_appointments_archive_shop_id ON appointments_archive_20250120(shop_id);

-- Step 4: Create trigger to keep columns in sync
CREATE OR REPLACE FUNCTION sync_appointments_archive_shop_ids()
RETURNS TRIGGER AS $$
BEGIN
  NEW.shop_id = NEW.barbershop_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_appointments_archive_shop_ids_trigger ON appointments_archive_20250120;
CREATE TRIGGER sync_appointments_archive_shop_ids_trigger
  BEFORE INSERT OR UPDATE ON appointments_archive_20250120
  FOR EACH ROW
  EXECUTE FUNCTION sync_appointments_archive_shop_ids();

-- Step 5: Update or recreate the appointments view to include shop_id
DROP VIEW IF EXISTS appointments CASCADE;
CREATE VIEW appointments AS
SELECT 
  id,
  barbershop_id,
  shop_id, -- Now available
  barber_id,
  customer_id,
  client_id,
  service_id,
  start_time,
  end_time,
  appointment_date,
  scheduled_at,
  duration_minutes,
  status,
  notes,
  price,
  created_at,
  updated_at
FROM appointments_archive_20250120;

-- Verification query
SELECT 
  COUNT(*) as total_appointments,
  COUNT(shop_id) as appointments_with_shop_id,
  COUNT(barbershop_id) as appointments_with_barbershop_id
FROM appointments_archive_20250120;
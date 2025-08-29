-- Fix appointments table schema inconsistencies
-- Adds shop_id column as alias to barbershop_id for backward compatibility

-- Add shop_id column if it doesn't exist
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS shop_id UUID;

-- Create a trigger to keep shop_id and barbershop_id in sync
CREATE OR REPLACE FUNCTION sync_appointments_shop_ids()
RETURNS TRIGGER AS $$
BEGIN
  -- If barbershop_id is updated, sync shop_id
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.barbershop_id != OLD.barbershop_id) THEN
    NEW.shop_id = NEW.barbershop_id;
  END IF;
  
  -- If shop_id is updated, sync barbershop_id
  IF TG_OP = 'UPDATE' AND NEW.shop_id != OLD.shop_id THEN
    NEW.barbershop_id = NEW.shop_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS sync_appointments_shop_ids_trigger ON appointments;
CREATE TRIGGER sync_appointments_shop_ids_trigger
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION sync_appointments_shop_ids();

-- Update existing records to have shop_id = barbershop_id
UPDATE appointments SET shop_id = barbershop_id WHERE shop_id IS NULL;

-- Add index for performance on shop_id queries
CREATE INDEX IF NOT EXISTS idx_appointments_shop_id ON appointments(shop_id);

-- Add comment to document the dual-column approach
COMMENT ON COLUMN appointments.shop_id IS 'Legacy column for backward compatibility, automatically synced with barbershop_id';
COMMENT ON COLUMN appointments.barbershop_id IS 'Primary shop/barbershop identifier';

-- Create a view for unified access
CREATE OR REPLACE VIEW appointments_unified AS
SELECT 
  id,
  COALESCE(barbershop_id, shop_id) as barbershop_id,
  COALESCE(shop_id, barbershop_id) as shop_id,
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
FROM appointments;
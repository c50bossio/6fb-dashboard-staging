-- Fix for appointments VIEW issue
-- First, let's find what the appointments view is built on

-- Step 1: Check what tables actually exist
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%appointment%'
ORDER BY table_name;

-- Step 2: See the view definition
SELECT definition 
FROM pg_views 
WHERE viewname = 'appointments' 
AND schemaname = 'public';

-- Step 3: Find the actual base table
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND table_name LIKE '%appointment%';

-- If no base table exists, create it:
CREATE TABLE IF NOT EXISTS appointment_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL,
    shop_id UUID, -- Add this field
    barber_id UUID,
    customer_id UUID,
    client_id UUID,
    service_id UUID,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    appointment_date DATE,
    scheduled_at TIMESTAMPTZ,
    duration_minutes INTEGER DEFAULT 30,
    status TEXT DEFAULT 'confirmed',
    notes TEXT,
    price DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add the shop_id sync
UPDATE appointment_records SET shop_id = barbershop_id WHERE shop_id IS NULL;

-- Create sync trigger for the actual table
CREATE OR REPLACE FUNCTION sync_appointment_shop_ids()
RETURNS TRIGGER AS $$
BEGIN
  NEW.shop_id = NEW.barbershop_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_appointment_shop_ids_trigger ON appointment_records;
CREATE TRIGGER sync_appointment_shop_ids_trigger
  BEFORE INSERT OR UPDATE ON appointment_records
  FOR EACH ROW
  EXECUTE FUNCTION sync_appointment_shop_ids();

-- Create index
CREATE INDEX IF NOT EXISTS idx_appointment_records_shop_id ON appointment_records(shop_id);
CREATE INDEX IF NOT EXISTS idx_appointment_records_barbershop_id ON appointment_records(barbershop_id);
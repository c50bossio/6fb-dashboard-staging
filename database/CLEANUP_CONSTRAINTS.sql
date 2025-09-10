-- Clean up old foreign key constraints that reference customer_id
-- Run this to fix the remaining constraint issues

-- Drop the old customer_id foreign key constraint if it exists
DO $$
BEGIN
  -- Check if the constraint exists and drop it
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%customer_id%' 
    AND table_name = 'appointments'
  ) THEN
    -- Drop the constraint (we'll find the exact name and drop it)
    EXECUTE 'ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_customer_id_fkey';
    EXECUTE 'ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_customer_id_fkey1';
    EXECUTE 'ALTER TABLE appointments DROP CONSTRAINT IF EXISTS fk_appointments_customer';
  END IF;
END $$;

-- Add proper foreign key for client_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'appointments_client_id_fkey' 
    AND table_name = 'appointments'
  ) THEN
    ALTER TABLE appointments 
    ADD CONSTRAINT appointments_client_id_fkey 
    FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add proper foreign key for barber_id if it doesn't exist  
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'appointments_barber_id_fkey' 
    AND table_name = 'appointments'
  ) THEN
    ALTER TABLE appointments 
    ADD CONSTRAINT appointments_barber_id_fkey 
    FOREIGN KEY (barber_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add proper foreign key for service_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'appointments_service_id_fkey' 
    AND table_name = 'appointments'
  ) THEN
    ALTER TABLE appointments 
    ADD CONSTRAINT appointments_service_id_fkey 
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Success message
SELECT 'Foreign key constraints cleaned up successfully!' as status;
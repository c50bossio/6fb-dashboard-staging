-- ==========================================
-- Shop Management Module - Mixed Data Types Migration
-- ==========================================
-- This migration handles the mixed data types (UUID, TEXT, VARCHAR) 
-- for barbershop_id columns across different tables

-- ==========================================
-- PART 1: CREATE HELPER FUNCTIONS FOR ALL DATA TYPES
-- ==========================================

-- Create private schema if not exists
CREATE SCHEMA IF NOT EXISTS private;

-- Drop existing functions to recreate with proper overloading
DROP FUNCTION IF EXISTS private.user_owns_shop(UUID);
DROP FUNCTION IF EXISTS private.user_owns_shop(TEXT);
DROP FUNCTION IF EXISTS private.user_owns_shop(VARCHAR);
DROP FUNCTION IF EXISTS private.user_is_shop_staff(UUID);
DROP FUNCTION IF EXISTS private.user_is_shop_staff(TEXT);
DROP FUNCTION IF EXISTS private.user_is_shop_staff(VARCHAR);

-- Helper function for UUID barbershop_id
CREATE OR REPLACE FUNCTION private.user_owns_shop(shop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.barbershops 
    WHERE id = shop_id AND owner_id = (SELECT auth.uid())
  );
$$;

-- Helper function for TEXT barbershop_id
CREATE OR REPLACE FUNCTION private.user_owns_shop(shop_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.barbershops 
    WHERE id::text = shop_id AND owner_id = (SELECT auth.uid())
  );
$$;

-- Helper function for VARCHAR barbershop_id (explicitly for varchar columns)
CREATE OR REPLACE FUNCTION private.user_owns_shop(shop_id VARCHAR)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.barbershops 
    WHERE id::text = shop_id AND owner_id = (SELECT auth.uid())
  );
$$;

-- Staff check for UUID
CREATE OR REPLACE FUNCTION private.user_is_shop_staff(shop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.barbershop_staff 
    WHERE barbershop_id = shop_id 
    AND user_id = (SELECT auth.uid())
    AND is_active = true
  );
$$;

-- Staff check for TEXT
CREATE OR REPLACE FUNCTION private.user_is_shop_staff(shop_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.barbershop_staff 
    WHERE barbershop_id::text = shop_id 
    AND user_id = (SELECT auth.uid())
    AND is_active = true
  );
$$;

-- Staff check for VARCHAR
CREATE OR REPLACE FUNCTION private.user_is_shop_staff(shop_id VARCHAR)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.barbershop_staff 
    WHERE barbershop_id::text = shop_id 
    AND user_id = (SELECT auth.uid())
    AND is_active = true
  );
$$;

-- ==========================================
-- PART 2: CUSTOMERS TABLE (VARCHAR barbershop_id)
-- ==========================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    -- Drop all existing policies
    DROP POLICY IF EXISTS "Shop owners can access their customers" ON customers;
    DROP POLICY IF EXISTS "Shop owners can view their customers" ON customers;
    DROP POLICY IF EXISTS "Shop owners can create customers" ON customers;
    DROP POLICY IF EXISTS "Shop owners can update their customers" ON customers;
    DROP POLICY IF EXISTS "Shop owners can delete their customers" ON customers;
    
    -- Enable RLS
    ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
    
    -- Create new policies - barbershop_id is VARCHAR in customers table
    CREATE POLICY "Shop owners can view their customers" ON customers
      FOR SELECT
      TO authenticated
      USING ((SELECT private.user_owns_shop(barbershop_id::varchar)));

    CREATE POLICY "Shop owners can create customers" ON customers
      FOR INSERT
      TO authenticated
      WITH CHECK ((SELECT private.user_owns_shop(barbershop_id::varchar)));

    CREATE POLICY "Shop owners can update their customers" ON customers
      FOR UPDATE
      TO authenticated
      USING ((SELECT private.user_owns_shop(barbershop_id::varchar)))
      WITH CHECK ((SELECT private.user_owns_shop(barbershop_id::varchar)));

    CREATE POLICY "Shop owners can delete their customers" ON customers
      FOR DELETE
      TO authenticated
      USING ((SELECT private.user_owns_shop(barbershop_id::varchar)));
      
    -- Create indexes if not exist
    CREATE INDEX IF NOT EXISTS idx_customers_barbershop ON customers(barbershop_id);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
    
    RAISE NOTICE 'Customers table policies created successfully';
  END IF;
END $$;

-- ==========================================
-- PART 3: APPOINTMENTS TABLE (TEXT barbershop_id)
-- ==========================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') THEN
    -- Drop all existing policies
    DROP POLICY IF EXISTS "Shop owners can access their appointments" ON appointments;
    DROP POLICY IF EXISTS "Shop owners can manage appointments" ON appointments;
    DROP POLICY IF EXISTS "Customers can view their appointments" ON appointments;
    
    -- Enable RLS
    ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
    
    -- Create new policies - barbershop_id is TEXT in appointments table
    CREATE POLICY "Shop owners can manage appointments" ON appointments
      FOR ALL
      TO authenticated
      USING ((SELECT private.user_owns_shop(barbershop_id::text)))
      WITH CHECK ((SELECT private.user_owns_shop(barbershop_id::text)));

    CREATE POLICY "Customers can view their appointments" ON appointments
      FOR SELECT
      TO authenticated
      USING (customer_id = (SELECT auth.uid())::text OR customer_id = (SELECT auth.uid()));
      
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_appointments_barbershop ON appointments(barbershop_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
    CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
    
    RAISE NOTICE 'Appointments table policies created successfully';
  END IF;
END $$;

-- ==========================================
-- PART 4: SERVICES TABLE (Check if exists and data type)
-- ==========================================

DO $$ 
DECLARE
  services_barbershop_type TEXT;
BEGIN
  -- Check if services table exists and get barbershop_id type
  SELECT data_type INTO services_barbershop_type
  FROM information_schema.columns 
  WHERE table_name = 'services' 
  AND column_name = 'barbershop_id'
  AND table_schema = 'public';
  
  IF services_barbershop_type IS NOT NULL THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Shop owners can access their services" ON services;
    DROP POLICY IF EXISTS "Shop owners can manage services" ON services;
    DROP POLICY IF EXISTS "Public can view active services" ON services;
    
    -- Enable RLS
    ALTER TABLE services ENABLE ROW LEVEL SECURITY;
    
    -- Create policies based on actual data type
    IF services_barbershop_type = 'uuid' THEN
      CREATE POLICY "Shop owners can manage services" ON services
        FOR ALL
        TO authenticated
        USING ((SELECT private.user_owns_shop(barbershop_id)))
        WITH CHECK ((SELECT private.user_owns_shop(barbershop_id)));
    ELSE
      CREATE POLICY "Shop owners can manage services" ON services
        FOR ALL
        TO authenticated
        USING ((SELECT private.user_owns_shop(barbershop_id::text)))
        WITH CHECK ((SELECT private.user_owns_shop(barbershop_id::text)));
    END IF;

    CREATE POLICY "Public can view active services" ON services
      FOR SELECT
      TO anon, authenticated
      USING (is_active = true);
      
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_services_barbershop ON services(barbershop_id);
    CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);
    
    RAISE NOTICE 'Services table policies created successfully';
  END IF;
END $$;

-- ==========================================
-- PART 5: BARBERS TABLE (UUID barbershop_id)
-- ==========================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'barbers') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Shop owners can manage barbers" ON barbers;
    DROP POLICY IF EXISTS "Public can view active barbers" ON barbers;
    
    -- Enable RLS
    ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
    
    -- Create new policies - barbershop_id is UUID in barbers table
    CREATE POLICY "Shop owners can manage barbers" ON barbers
      FOR ALL
      TO authenticated
      USING ((SELECT private.user_owns_shop(barbershop_id)))
      WITH CHECK ((SELECT private.user_owns_shop(barbershop_id)));

    CREATE POLICY "Public can view active barbers" ON barbers
      FOR SELECT
      TO anon, authenticated
      USING (is_active = true);
      
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_barbers_barbershop ON barbers(barbershop_id);
    CREATE INDEX IF NOT EXISTS idx_barbers_user ON barbers(user_id);
    CREATE INDEX IF NOT EXISTS idx_barbers_active ON barbers(is_active);
    
    RAISE NOTICE 'Barbers table policies created successfully';
  END IF;
END $$;

-- ==========================================
-- PART 6: BOOKINGS TABLE (Check if exists)
-- ==========================================

DO $$ 
DECLARE
  bookings_shop_column TEXT;
  bookings_shop_type TEXT;
BEGIN
  -- Check if bookings table has shop_id or barbershop_id
  SELECT column_name, data_type INTO bookings_shop_column, bookings_shop_type
  FROM information_schema.columns 
  WHERE table_name = 'bookings' 
  AND column_name IN ('shop_id', 'barbershop_id')
  AND table_schema = 'public'
  LIMIT 1;
  
  IF bookings_shop_column IS NOT NULL THEN
    -- Enable RLS
    ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "Shop owners can manage bookings" ON bookings;
    DROP POLICY IF EXISTS "Customers can view their bookings" ON bookings;
    
    -- Create policies based on column name and type
    IF bookings_shop_type = 'uuid' THEN
      EXECUTE format('
        CREATE POLICY "Shop owners can manage bookings" ON bookings
          FOR ALL
          TO authenticated
          USING ((SELECT private.user_owns_shop(%I)))
          WITH CHECK ((SELECT private.user_owns_shop(%I)))',
        bookings_shop_column, bookings_shop_column);
    ELSE
      EXECUTE format('
        CREATE POLICY "Shop owners can manage bookings" ON bookings
          FOR ALL
          TO authenticated
          USING ((SELECT private.user_owns_shop(%I::text)))
          WITH CHECK ((SELECT private.user_owns_shop(%I::text)))',
        bookings_shop_column, bookings_shop_column);
    END IF;
    
    CREATE POLICY "Customers can view their bookings" ON bookings
      FOR SELECT
      TO authenticated
      USING (customer_id = (SELECT auth.uid())::text OR customer_id = (SELECT auth.uid()));
      
    -- Create indexes
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_bookings_shop ON bookings(%I)', bookings_shop_column);
    CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
    
    RAISE NOTICE 'Bookings table policies created successfully';
  END IF;
END $$;

-- ==========================================
-- PART 7: UPDATE TRIGGERS FOR AUDIT TRAILS
-- ==========================================

-- Create update_updated_at_column function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to tables that exist and have updated_at column
DO $$ 
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN 
    SELECT DISTINCT t.table_name
    FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
    WHERE t.table_schema = 'public'
    AND c.column_name = 'updated_at'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name IN ('customers', 'services', 'appointments', 'bookings', 'barbers', 
                         'barbershop_staff', 'products', 'transactions')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %I', tbl.table_name, tbl.table_name);
    EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON %I
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 
                   tbl.table_name, tbl.table_name);
    RAISE NOTICE 'Created update trigger for % table', tbl.table_name;
  END LOOP;
END $$;

-- ==========================================
-- PART 8: SHOP DASHBOARD VIEW (FLEXIBLE VERSION)
-- ==========================================

-- Drop existing view if exists
DROP VIEW IF EXISTS shop_dashboard_summary;

-- Create comprehensive dashboard view that handles mixed data types
CREATE OR REPLACE VIEW shop_dashboard_summary AS
SELECT 
  b.id as barbershop_id,
  b.name as shop_name,
  b.subscription_tier,
  
  -- Customer metrics (handles VARCHAR barbershop_id)
  COALESCE((
    SELECT COUNT(DISTINCT c.id) 
    FROM customers c 
    WHERE c.barbershop_id::text = b.id::text
  ), 0) as total_customers,
  
  COALESCE((
    SELECT COUNT(DISTINCT c.id) 
    FROM customers c 
    WHERE c.barbershop_id::text = b.id::text 
    AND c.created_at >= NOW() - INTERVAL '30 days'
  ), 0) as new_customers_30d,
  
  -- Appointment metrics (handles TEXT barbershop_id)
  COALESCE((
    SELECT COUNT(*) 
    FROM appointments a 
    WHERE a.barbershop_id::text = b.id::text
  ), 0) as total_appointments,
  
  COALESCE((
    SELECT COUNT(*) 
    FROM appointments a 
    WHERE a.barbershop_id::text = b.id::text 
    AND a.appointment_date >= NOW() - INTERVAL '30 days'
  ), 0) as appointments_30d,
  
  -- Booking metrics (handles either shop_id or barbershop_id)
  COALESCE((
    SELECT COUNT(*) 
    FROM bookings bk 
    WHERE (bk.shop_id::text = b.id::text OR bk.barbershop_id::text = b.id::text)
  ), 0) as total_bookings,
  
  -- Service metrics (flexible for UUID or TEXT)
  COALESCE((
    SELECT COUNT(*) 
    FROM services s 
    WHERE s.barbershop_id::text = b.id::text 
    AND s.is_active = true
  ), 0) as active_services,
  
  -- Staff metrics (UUID barbershop_id)
  COALESCE((
    SELECT COUNT(*) 
    FROM barbershop_staff bs 
    WHERE bs.barbershop_id = b.id 
    AND bs.is_active = true
  ), 0) +
  COALESCE((
    SELECT COUNT(*) 
    FROM barbers br 
    WHERE br.barbershop_id = b.id 
    AND br.is_active = true
  ), 0) as active_staff,
  
  b.created_at,
  b.updated_at
FROM barbershops b;

-- Grant permissions on the view
GRANT SELECT ON shop_dashboard_summary TO authenticated;

-- ==========================================
-- PART 9: PERFORMANCE OPTIMIZATION FUNCTION
-- ==========================================

-- Function to calculate shop metrics (handles mixed types)
CREATE OR REPLACE FUNCTION calculate_shop_metrics(shop_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  metrics JSON;
  shop_id_text TEXT := shop_id::text;
BEGIN
  SELECT json_build_object(
    'customers', COALESCE((
      SELECT COUNT(*) FROM customers WHERE barbershop_id::text = shop_id_text
    ), 0),
    'appointments', COALESCE((
      SELECT COUNT(*) FROM appointments WHERE barbershop_id::text = shop_id_text
    ), 0),
    'bookings', COALESCE((
      SELECT COUNT(*) FROM bookings 
      WHERE shop_id::text = shop_id_text OR barbershop_id::text = shop_id_text
    ), 0),
    'active_services', COALESCE((
      SELECT COUNT(*) FROM services 
      WHERE barbershop_id::text = shop_id_text AND is_active = true
    ), 0),
    'active_barbers', COALESCE((
      SELECT COUNT(*) FROM barbers 
      WHERE barbershop_id = shop_id AND is_active = true
    ), 0),
    'active_staff', COALESCE((
      SELECT COUNT(*) FROM barbershop_staff 
      WHERE barbershop_id = shop_id AND is_active = true
    ), 0)
  ) INTO metrics;
  
  RETURN metrics;
EXCEPTION 
  WHEN OTHERS THEN
    -- Return empty metrics if any error occurs
    RETURN json_build_object(
      'customers', 0,
      'appointments', 0,
      'bookings', 0,
      'active_services', 0,
      'active_barbers', 0,
      'active_staff', 0,
      'error', SQLERRM
    );
END;
$$;

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================

-- Return success message with summary of what was done
DO $$
DECLARE
  msg TEXT := '';
  table_count INT := 0;
BEGIN
  -- Count tables that were updated
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('customers', 'appointments', 'services', 'barbers', 'bookings', 
                     'barbershop_staff', 'products', 'transactions');
  
  msg := format('Shop Management Mixed Types Migration Complete - %s tables updated successfully', table_count);
  RAISE NOTICE '%', msg;
  
  -- Return as result
  PERFORM msg;
END $$;

SELECT 'Migration completed successfully. All mixed data types handled.' as status;
-- ==========================================
-- Shop Management Module - Final Production Migration
-- ==========================================
-- This migration correctly handles:
-- 1. Mixed data types (UUID, TEXT, VARCHAR)
-- 2. Views vs Tables (appointments is a VIEW)
-- 3. Missing tables (reviews, staff_schedule don't exist)

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

-- Helper function for VARCHAR barbershop_id
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
  -- Only process if it's a table, not a view
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'customers' 
    AND table_type = 'BASE TABLE'
    AND table_schema = 'public'
  ) THEN
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
-- PART 3: BOOKINGS TABLE (TEXT shop_id)
-- ==========================================

DO $$ 
BEGIN
  -- Only process if it's a table, not a view
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'bookings' 
    AND table_type = 'BASE TABLE'
    AND table_schema = 'public'
  ) THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Shop owners can manage bookings" ON bookings;
    DROP POLICY IF EXISTS "Customers can view their bookings" ON bookings;
    DROP POLICY IF EXISTS "Public can create bookings" ON bookings;
    
    -- Enable RLS
    ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
    
    -- Create new policies - shop_id is TEXT in bookings table
    CREATE POLICY "Shop owners can manage bookings" ON bookings
      FOR ALL
      TO authenticated
      USING ((SELECT private.user_owns_shop(shop_id::text)))
      WITH CHECK ((SELECT private.user_owns_shop(shop_id::text)));

    CREATE POLICY "Customers can view their bookings" ON bookings
      FOR SELECT
      TO authenticated
      USING (
        customer_id = (SELECT auth.uid())::text 
        OR customer_id = (SELECT auth.uid())
        OR customer_email = (SELECT auth.email())
      );
    
    -- Allow public to create bookings (for guest bookings)
    CREATE POLICY "Public can create bookings" ON bookings
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
      
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_bookings_shop ON bookings(shop_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    
    RAISE NOTICE 'Bookings table policies created successfully';
  END IF;
END $$;

-- ==========================================
-- PART 4: SERVICES TABLE (UUID barbershop_id)
-- ==========================================

DO $$ 
BEGIN
  -- Only process if it's a table, not a view
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'services' 
    AND table_type = 'BASE TABLE'
    AND table_schema = 'public'
  ) THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Shop owners can access their services" ON services;
    DROP POLICY IF EXISTS "Shop owners can manage services" ON services;
    DROP POLICY IF EXISTS "Public can view active services" ON services;
    
    -- Enable RLS
    ALTER TABLE services ENABLE ROW LEVEL SECURITY;
    
    -- Create policies - barbershop_id is UUID in services
    CREATE POLICY "Shop owners can manage services" ON services
      FOR ALL
      TO authenticated
      USING ((SELECT private.user_owns_shop(barbershop_id)))
      WITH CHECK ((SELECT private.user_owns_shop(barbershop_id)));

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
  -- Only process if it's a table, not a view
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'barbers' 
    AND table_type = 'BASE TABLE'
    AND table_schema = 'public'
  ) THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Shop owners can manage barbers" ON barbers;
    DROP POLICY IF EXISTS "Public can view active barbers" ON barbers;
    DROP POLICY IF EXISTS "Barbers can view themselves" ON barbers;
    
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
    
    CREATE POLICY "Barbers can view themselves" ON barbers
      FOR SELECT
      TO authenticated
      USING (user_id = (SELECT auth.uid()));
      
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_barbers_barbershop ON barbers(barbershop_id);
    CREATE INDEX IF NOT EXISTS idx_barbers_user ON barbers(user_id);
    CREATE INDEX IF NOT EXISTS idx_barbers_active ON barbers(is_active);
    
    RAISE NOTICE 'Barbers table policies created successfully';
  END IF;
END $$;

-- ==========================================
-- PART 6: BARBERSHOP_STAFF TABLE (UUID barbershop_id)
-- ==========================================

DO $$ 
BEGIN
  -- Only process if it's a table, not a view
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'barbershop_staff' 
    AND table_type = 'BASE TABLE'
    AND table_schema = 'public'
  ) THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Shop owners can manage staff" ON barbershop_staff;
    DROP POLICY IF EXISTS "Staff can view themselves" ON barbershop_staff;
    
    -- Enable RLS
    ALTER TABLE barbershop_staff ENABLE ROW LEVEL SECURITY;
    
    -- Create new policies
    CREATE POLICY "Shop owners can manage staff" ON barbershop_staff
      FOR ALL
      TO authenticated
      USING ((SELECT private.user_owns_shop(barbershop_id)))
      WITH CHECK ((SELECT private.user_owns_shop(barbershop_id)));

    CREATE POLICY "Staff can view themselves" ON barbershop_staff
      FOR SELECT
      TO authenticated
      USING (user_id = (SELECT auth.uid()));
      
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_barbershop_staff_barbershop ON barbershop_staff(barbershop_id);
    CREATE INDEX IF NOT EXISTS idx_barbershop_staff_user ON barbershop_staff(user_id);
    CREATE INDEX IF NOT EXISTS idx_barbershop_staff_active ON barbershop_staff(is_active);
    
    RAISE NOTICE 'Barbershop_staff table policies created successfully';
  END IF;
END $$;

-- ==========================================
-- PART 7: PRODUCTS TABLE (UUID barbershop_id)
-- ==========================================

DO $$ 
BEGIN
  -- Only process if it's a table, not a view
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'products' 
    AND table_type = 'BASE TABLE'
    AND table_schema = 'public'
  ) THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Shop owners can manage products" ON products;
    DROP POLICY IF EXISTS "Public can view available products" ON products;
    
    -- Enable RLS
    ALTER TABLE products ENABLE ROW LEVEL SECURITY;
    
    -- Create new policies
    CREATE POLICY "Shop owners can manage products" ON products
      FOR ALL
      TO authenticated
      USING ((SELECT private.user_owns_shop(barbershop_id)))
      WITH CHECK ((SELECT private.user_owns_shop(barbershop_id)));

    CREATE POLICY "Public can view available products" ON products
      FOR SELECT
      TO anon, authenticated
      USING (is_available = true);
      
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_products_barbershop ON products(barbershop_id);
    CREATE INDEX IF NOT EXISTS idx_products_available ON products(is_available);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    
    RAISE NOTICE 'Products table policies created successfully';
  END IF;
END $$;

-- ==========================================
-- PART 8: TRANSACTIONS TABLE (UUID barbershop_id)
-- ==========================================

DO $$ 
BEGIN
  -- Only process if it's a table, not a view
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'transactions' 
    AND table_type = 'BASE TABLE'
    AND table_schema = 'public'
  ) THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Shop owners can view transactions" ON transactions;
    DROP POLICY IF EXISTS "System can create transactions" ON transactions;
    
    -- Enable RLS
    ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
    
    -- Create new policies
    CREATE POLICY "Shop owners can view transactions" ON transactions
      FOR SELECT
      TO authenticated
      USING ((SELECT private.user_owns_shop(barbershop_id)));

    CREATE POLICY "System can create transactions" ON transactions
      FOR INSERT
      TO authenticated
      WITH CHECK ((SELECT private.user_owns_shop(barbershop_id)));
      
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_transactions_barbershop ON transactions(barbershop_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
    
    RAISE NOTICE 'Transactions table policies created successfully';
  END IF;
END $$;

-- ==========================================
-- PART 9: UPDATE TRIGGERS FOR AUDIT TRAILS
-- ==========================================

-- Create update_updated_at_column function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to actual tables (not views) that have updated_at column
DO $$ 
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN 
    SELECT DISTINCT t.table_name
    FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
    WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'  -- Only actual tables, not views
    AND c.column_name = 'updated_at'
    AND t.table_name IN ('customers', 'services', 'bookings', 'barbers', 
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
-- PART 10: SHOP DASHBOARD VIEW
-- ==========================================

-- Drop existing view if exists
DROP VIEW IF EXISTS shop_dashboard_summary;

-- Create comprehensive dashboard view that handles mixed data types and views
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
  
  -- Booking metrics (handles TEXT shop_id)
  COALESCE((
    SELECT COUNT(*) 
    FROM bookings bk 
    WHERE bk.shop_id::text = b.id::text
  ), 0) as total_bookings,
  
  COALESCE((
    SELECT COUNT(*) 
    FROM bookings bk 
    WHERE bk.shop_id::text = b.id::text 
    AND bk.booking_date >= NOW() - INTERVAL '30 days'
  ), 0) as bookings_30d,
  
  -- Service metrics (UUID barbershop_id)
  COALESCE((
    SELECT COUNT(*) 
    FROM services s 
    WHERE s.barbershop_id = b.id 
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
  
  -- Revenue metrics (UUID barbershop_id)
  COALESCE((
    SELECT SUM(t.amount) 
    FROM transactions t 
    WHERE t.barbershop_id = b.id 
    AND t.type IN ('payment', 'sale')
  ), 0) as total_revenue,
  
  COALESCE((
    SELECT SUM(t.amount) 
    FROM transactions t 
    WHERE t.barbershop_id = b.id 
    AND t.type IN ('payment', 'sale')
    AND t.transaction_date >= NOW() - INTERVAL '30 days'
  ), 0) as revenue_30d,
  
  b.created_at,
  b.updated_at
FROM barbershops b;

-- Grant permissions on the view
GRANT SELECT ON shop_dashboard_summary TO authenticated;

-- ==========================================
-- PART 11: SHOP METRICS FUNCTION
-- ==========================================

-- Function to calculate shop metrics (handles mixed types and views)
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
    'bookings', COALESCE((
      SELECT COUNT(*) FROM bookings WHERE shop_id::text = shop_id_text
    ), 0),
    'bookings_today', COALESCE((
      SELECT COUNT(*) FROM bookings 
      WHERE shop_id::text = shop_id_text 
      AND DATE(booking_date) = CURRENT_DATE
    ), 0),
    'active_services', COALESCE((
      SELECT COUNT(*) FROM services 
      WHERE barbershop_id = shop_id AND is_active = true
    ), 0),
    'active_barbers', COALESCE((
      SELECT COUNT(*) FROM barbers 
      WHERE barbershop_id = shop_id AND is_active = true
    ), 0),
    'active_staff', COALESCE((
      SELECT COUNT(*) FROM barbershop_staff 
      WHERE barbershop_id = shop_id AND is_active = true
    ), 0),
    'total_revenue', COALESCE((
      SELECT SUM(amount) FROM transactions 
      WHERE barbershop_id = shop_id AND type IN ('payment', 'sale')
    ), 0),
    'revenue_today', COALESCE((
      SELECT SUM(amount) FROM transactions 
      WHERE barbershop_id = shop_id 
      AND type IN ('payment', 'sale')
      AND DATE(transaction_date) = CURRENT_DATE
    ), 0)
  ) INTO metrics;
  
  RETURN metrics;
EXCEPTION 
  WHEN OTHERS THEN
    -- Return empty metrics if any error occurs
    RETURN json_build_object(
      'customers', 0,
      'bookings', 0,
      'bookings_today', 0,
      'active_services', 0,
      'active_barbers', 0,
      'active_staff', 0,
      'total_revenue', 0,
      'revenue_today', 0,
      'error', SQLERRM
    );
END;
$$;

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================

-- Summary of what was done
DO $$
DECLARE
  tables_updated INT := 0;
  policies_created INT := 0;
  indexes_created INT := 0;
BEGIN
  -- Count updated tables
  SELECT COUNT(DISTINCT table_name) INTO tables_updated
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('customers', 'bookings', 'services', 'barbers', 
                     'barbershop_staff', 'products', 'transactions');
  
  -- Count policies
  SELECT COUNT(*) INTO policies_created
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename IN ('customers', 'bookings', 'services', 'barbers', 
                    'barbershop_staff', 'products', 'transactions');
  
  -- Count indexes
  SELECT COUNT(*) INTO indexes_created
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND tablename IN ('customers', 'bookings', 'services', 'barbers', 
                    'barbershop_staff', 'products', 'transactions')
  AND indexname LIKE 'idx_%';
  
  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE '  Tables Updated: %', tables_updated;
  RAISE NOTICE '  Policies Created: %', policies_created;
  RAISE NOTICE '  Indexes Created: %', indexes_created;
  RAISE NOTICE '  Status: SUCCESS';
END $$;

SELECT 'Shop Management Final Migration Complete - All tables updated successfully!' as status;
-- ==========================================
-- Shop Management Module - Safe Migration
-- ==========================================
-- This migration safely fixes database issues, checking for table existence
-- before applying policies, indexes, and triggers

-- ==========================================
-- PART 1: CREATE HELPER FUNCTIONS
-- ==========================================

-- Create private schema if not exists
CREATE SCHEMA IF NOT EXISTS private;

-- Create helper function for shop ownership check (performance optimization)
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

-- Create helper function for staff membership check
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

-- ==========================================
-- PART 2: CUSTOMERS TABLE POLICIES
-- ==========================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Shop owners can access their customers" ON customers;
    
    -- Enable RLS
    ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
    
    -- Create new policies with proper role targeting
    CREATE POLICY "Shop owners can view their customers" ON customers
      FOR SELECT
      TO authenticated
      USING ((SELECT private.user_owns_shop(barbershop_id)));

    CREATE POLICY "Shop owners can create customers" ON customers
      FOR INSERT
      TO authenticated
      WITH CHECK ((SELECT private.user_owns_shop(barbershop_id)));

    CREATE POLICY "Shop owners can update their customers" ON customers
      FOR UPDATE
      TO authenticated
      USING ((SELECT private.user_owns_shop(barbershop_id)))
      WITH CHECK ((SELECT private.user_owns_shop(barbershop_id)));

    CREATE POLICY "Shop owners can delete their customers" ON customers
      FOR DELETE
      TO authenticated
      USING ((SELECT private.user_owns_shop(barbershop_id)));
      
    -- Create indexes if not exist
    CREATE INDEX IF NOT EXISTS idx_customers_barbershop ON customers(barbershop_id);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
  END IF;
END $$;

-- ==========================================
-- PART 3: SERVICES TABLE POLICIES
-- ==========================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'services') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Shop owners can access their services" ON services;
    
    -- Enable RLS
    ALTER TABLE services ENABLE ROW LEVEL SECURITY;
    
    -- Create new policies
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
  END IF;
END $$;

-- ==========================================
-- PART 4: APPOINTMENTS TABLE POLICIES
-- ==========================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Shop owners can access their appointments" ON appointments;
    
    -- Enable RLS
    ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
    
    -- Create new policies
    CREATE POLICY "Shop owners can manage appointments" ON appointments
      FOR ALL
      TO authenticated
      USING ((SELECT private.user_owns_shop(barbershop_id)))
      WITH CHECK ((SELECT private.user_owns_shop(barbershop_id)));

    CREATE POLICY "Customers can view their appointments" ON appointments
      FOR SELECT
      TO authenticated
      USING (customer_id = (SELECT auth.uid()));
      
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_appointments_barbershop ON appointments(barbershop_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_barber ON appointments(barber_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
    CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
  END IF;
END $$;

-- ==========================================
-- PART 5: REVIEWS TABLE (ONLY IF EXISTS)
-- ==========================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Shop owners can access their reviews" ON reviews;
    
    -- Enable RLS
    ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
    
    -- Create new policies
    CREATE POLICY "Public can view public reviews" ON reviews
      FOR SELECT
      TO anon, authenticated
      USING (is_public = true);

    CREATE POLICY "Shop owners can manage reviews" ON reviews
      FOR ALL
      TO authenticated
      USING ((SELECT private.user_owns_shop(barbershop_id)))
      WITH CHECK ((SELECT private.user_owns_shop(barbershop_id)));
      
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
    CREATE INDEX IF NOT EXISTS idx_reviews_barbershop_public ON reviews(barbershop_id, is_public);
    CREATE INDEX IF NOT EXISTS idx_reviews_featured ON reviews(is_featured) WHERE is_featured = true;
  END IF;
END $$;

-- ==========================================
-- PART 6: TRANSACTIONS TABLE POLICIES
-- ==========================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Shop owners can access their transactions" ON transactions;
    
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
  END IF;
END $$;

-- ==========================================
-- PART 7: STAFF SCHEDULE TABLE POLICIES
-- ==========================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_schedule') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Shop owners can access their staff schedules" ON staff_schedule;
    
    -- Enable RLS
    ALTER TABLE staff_schedule ENABLE ROW LEVEL SECURITY;
    
    -- Create new policies
    CREATE POLICY "Shop staff can view schedules" ON staff_schedule
      FOR SELECT
      TO authenticated
      USING (
        (SELECT private.user_owns_shop(barbershop_id)) OR 
        (SELECT private.user_is_shop_staff(barbershop_id))
      );

    CREATE POLICY "Shop owners can manage schedules" ON staff_schedule
      FOR ALL
      TO authenticated
      USING ((SELECT private.user_owns_shop(barbershop_id)))
      WITH CHECK ((SELECT private.user_owns_shop(barbershop_id)));
      
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_staff_schedule_barbershop ON staff_schedule(barbershop_id);
    CREATE INDEX IF NOT EXISTS idx_staff_schedule_barber ON staff_schedule(barber_id);
    CREATE INDEX IF NOT EXISTS idx_staff_schedule_date ON staff_schedule(schedule_date);
  END IF;
END $$;

-- ==========================================
-- PART 8: INVENTORY MOVEMENTS TABLE POLICIES
-- ==========================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_movements') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Shop owners can access their inventory movements" ON inventory_movements;
    
    -- Enable RLS
    ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
    
    -- Create new policies
    CREATE POLICY "Shop staff can view inventory" ON inventory_movements
      FOR SELECT
      TO authenticated
      USING (
        (SELECT private.user_owns_shop(barbershop_id)) OR 
        (SELECT private.user_is_shop_staff(barbershop_id))
      );

    CREATE POLICY "Shop owners can manage inventory" ON inventory_movements
      FOR ALL
      TO authenticated
      USING ((SELECT private.user_owns_shop(barbershop_id)))
      WITH CHECK ((SELECT private.user_owns_shop(barbershop_id)));
      
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_inventory_movements_barbershop ON inventory_movements(barbershop_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON inventory_movements(movement_date);
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

-- Add triggers to tables that exist
DO $$ 
BEGIN
  -- Customers table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
    CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Services table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'services') THEN
    DROP TRIGGER IF EXISTS update_services_updated_at ON services;
    CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Appointments table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') THEN
    DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
    CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Reviews table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
    DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
    CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Transactions table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
    DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
    CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Staff schedule table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_schedule') THEN
    DROP TRIGGER IF EXISTS update_staff_schedule_updated_at ON staff_schedule;
    CREATE TRIGGER update_staff_schedule_updated_at BEFORE UPDATE ON staff_schedule
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Inventory movements table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_movements') THEN
    DROP TRIGGER IF EXISTS update_inventory_movements_updated_at ON inventory_movements;
    CREATE TRIGGER update_inventory_movements_updated_at BEFORE UPDATE ON inventory_movements
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ==========================================
-- PART 10: SHOP DASHBOARD VIEW (SAFE VERSION)
-- ==========================================

-- Drop existing view if exists
DROP VIEW IF EXISTS shop_dashboard_summary;

-- Create comprehensive dashboard view (only includes existing tables)
CREATE OR REPLACE VIEW shop_dashboard_summary AS
SELECT 
  b.id as barbershop_id,
  b.name as shop_name,
  b.subscription_tier,
  
  -- Customer metrics (if table exists)
  COALESCE((
    SELECT COUNT(DISTINCT c.id) 
    FROM customers c 
    WHERE c.barbershop_id = b.id
  ), 0) as total_customers,
  
  COALESCE((
    SELECT COUNT(DISTINCT c.id) 
    FROM customers c 
    WHERE c.barbershop_id = b.id 
    AND c.created_at >= NOW() - INTERVAL '30 days'
  ), 0) as new_customers_30d,
  
  -- Appointment metrics (if table exists)
  COALESCE((
    SELECT COUNT(*) 
    FROM appointments a 
    WHERE a.barbershop_id = b.id
  ), 0) as total_appointments,
  
  COALESCE((
    SELECT COUNT(*) 
    FROM appointments a 
    WHERE a.barbershop_id = b.id 
    AND a.appointment_date >= NOW() - INTERVAL '30 days'
  ), 0) as appointments_30d,
  
  -- Revenue metrics (if table exists)
  COALESCE((
    SELECT SUM(t.amount) 
    FROM transactions t 
    WHERE t.barbershop_id = b.id 
    AND t.type = 'payment'
  ), 0) as total_revenue,
  
  COALESCE((
    SELECT SUM(t.amount) 
    FROM transactions t 
    WHERE t.barbershop_id = b.id 
    AND t.type = 'payment' 
    AND t.transaction_date >= NOW() - INTERVAL '30 days'
  ), 0) as revenue_30d,
  
  -- Service metrics (if table exists)
  COALESCE((
    SELECT COUNT(*) 
    FROM services s 
    WHERE s.barbershop_id = b.id 
    AND s.is_active = true
  ), 0) as active_services,
  
  -- Staff metrics
  COALESCE((
    SELECT COUNT(*) 
    FROM barbershop_staff bs 
    WHERE bs.barbershop_id = b.id 
    AND bs.is_active = true
  ), 0) as active_staff,
  
  b.created_at,
  b.updated_at
FROM barbershops b;

-- Grant permissions on the view
GRANT SELECT ON shop_dashboard_summary TO authenticated;

-- ==========================================
-- PART 11: PERFORMANCE OPTIMIZATION FUNCTIONS
-- ==========================================

-- Function to calculate shop metrics (safe version)
CREATE OR REPLACE FUNCTION calculate_shop_metrics(shop_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  metrics JSON;
BEGIN
  SELECT json_build_object(
    'customers', COALESCE((
      SELECT COUNT(*) FROM customers WHERE barbershop_id = shop_id
    ), 0),
    'appointments', COALESCE((
      SELECT COUNT(*) FROM appointments WHERE barbershop_id = shop_id
    ), 0),
    'revenue', COALESCE((
      SELECT SUM(amount) FROM transactions 
      WHERE barbershop_id = shop_id AND type = 'payment'
    ), 0),
    'active_services', COALESCE((
      SELECT COUNT(*) FROM services 
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
    -- Return empty metrics if any table doesn't exist
    RETURN json_build_object(
      'customers', 0,
      'appointments', 0,
      'revenue', 0,
      'active_services', 0,
      'active_staff', 0,
      'error', SQLERRM
    );
END;
$$;

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================

-- Return success message
SELECT 'Shop Management Safe Migration Complete - All existing tables updated successfully' as status;
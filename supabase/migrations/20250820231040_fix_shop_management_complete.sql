-- ==========================================
-- Shop Management Module - Complete Fix Migration
-- ==========================================
-- This migration fixes all database issues for the shop management module
-- including RLS policies, indexes, triggers, and missing relationships

-- ==========================================
-- PART 1: CREATE PRIVATE SCHEMA IF NOT EXISTS
-- ==========================================
CREATE SCHEMA IF NOT EXISTS private;

-- ==========================================
-- PART 2: FIX RLS POLICIES WITH PROPER ROLE TARGETING
-- ==========================================

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Shop owners can access their customers" ON customers;
DROP POLICY IF EXISTS "Shop owners can access their services" ON services;
DROP POLICY IF EXISTS "Shop owners can access their transactions" ON transactions;
DROP POLICY IF EXISTS "Shop staff can view customers" ON customers;
DROP POLICY IF EXISTS "Shop owners can manage their customers" ON customers;
DROP POLICY IF EXISTS "Shop owners can manage their services" ON services;
DROP POLICY IF EXISTS "Public can view active services" ON services;
DROP POLICY IF EXISTS "Shop owners can manage transactions" ON transactions;
DROP POLICY IF EXISTS "Barbers can view their transactions" ON transactions;

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

-- Customers table policies
CREATE POLICY "Shop owners can view their customers" ON customers
  FOR SELECT
  TO authenticated
  USING ((SELECT private.user_owns_shop(barbershop_id)));

CREATE POLICY "Shop owners can manage their customers" ON customers
  FOR ALL
  TO authenticated
  USING ((SELECT private.user_owns_shop(barbershop_id)))
  WITH CHECK ((SELECT private.user_owns_shop(barbershop_id)));

CREATE POLICY "Shop staff can view customers" ON customers
  FOR SELECT
  TO authenticated
  USING ((SELECT private.user_is_shop_staff(barbershop_id)));

-- Services table policies
CREATE POLICY "Shop owners can manage their services" ON services
  FOR ALL
  TO authenticated
  USING ((SELECT private.user_owns_shop(barbershop_id)))
  WITH CHECK ((SELECT private.user_owns_shop(barbershop_id)));

CREATE POLICY "Public can view active services" ON services
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Transactions table policies
CREATE POLICY "Shop owners can manage transactions" ON transactions
  FOR ALL
  TO authenticated
  USING ((SELECT private.user_owns_shop(barbershop_id)))
  WITH CHECK ((SELECT private.user_owns_shop(barbershop_id)));

CREATE POLICY "Barbers can view their transactions" ON transactions
  FOR SELECT
  TO authenticated
  USING (barber_id = (SELECT auth.uid()));

-- ==========================================
-- PART 3: ADD MISSING INDEXES FOR PERFORMANCE
-- ==========================================

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_barbershop_active ON customers(barbershop_id, is_active);
CREATE INDEX IF NOT EXISTS idx_customers_preferred_barber ON customers(preferred_barber_id);

-- Services indexes
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_barbershop_active ON services(barbershop_id, is_active);
CREATE INDEX IF NOT EXISTS idx_services_featured ON services(is_featured) WHERE is_featured = true;

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON transactions(payment_method);
CREATE INDEX IF NOT EXISTS idx_transactions_barbershop_date ON transactions(barbershop_id, DATE(processed_at));

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_barbershop ON products(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(barbershop_id, current_stock) 
  WHERE current_stock <= min_stock_level;

-- Financial arrangements indexes
CREATE INDEX IF NOT EXISTS idx_financial_arrangements_barbershop ON financial_arrangements(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_financial_arrangements_barber ON financial_arrangements(barber_id);
CREATE INDEX IF NOT EXISTS idx_financial_arrangements_active ON financial_arrangements(is_active) 
  WHERE is_active = true;

-- ==========================================
-- PART 4: ADD UPDATE TRIGGERS FOR AUDIT FIELDS
-- ==========================================

-- Create or replace the update_updated_at function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to all tables with updated_at columns
DO $$ 
BEGIN
  -- Customers trigger
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'customers' AND column_name = 'updated_at') THEN
    DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
    CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Services trigger
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'services' AND column_name = 'updated_at') THEN
    DROP TRIGGER IF EXISTS update_services_updated_at ON services;
    CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Transactions trigger
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'transactions' AND column_name = 'updated_at') THEN
    DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
    CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Products trigger
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'products' AND column_name = 'updated_at') THEN
    DROP TRIGGER IF EXISTS update_products_updated_at ON products;
    CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Financial arrangements trigger
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'financial_arrangements' AND column_name = 'updated_at') THEN
    DROP TRIGGER IF EXISTS update_financial_arrangements_updated_at ON financial_arrangements;
    CREATE TRIGGER update_financial_arrangements_updated_at BEFORE UPDATE ON financial_arrangements
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ==========================================
-- PART 5: CREATE STORED PROCEDURES FOR COMMON OPERATIONS
-- ==========================================

-- Procedure to get shop dashboard metrics
CREATE OR REPLACE FUNCTION get_shop_dashboard_metrics(p_barbershop_id UUID)
RETURNS JSON AS $$
DECLARE
  v_metrics JSON;
BEGIN
  SELECT json_build_object(
    'today_revenue', COALESCE(SUM(t.net_amount) FILTER (WHERE DATE(t.processed_at) = CURRENT_DATE), 0),
    'week_revenue', COALESCE(SUM(t.net_amount) FILTER (WHERE DATE(t.processed_at) >= CURRENT_DATE - INTERVAL '7 days'), 0),
    'month_revenue', COALESCE(SUM(t.net_amount) FILTER (WHERE DATE(t.processed_at) >= DATE_TRUNC('month', CURRENT_DATE)), 0),
    'today_appointments', COUNT(DISTINCT b.id) FILTER (WHERE DATE(b.created_at) = CURRENT_DATE),
    'week_appointments', COUNT(DISTINCT b.id) FILTER (WHERE DATE(b.created_at) >= CURRENT_DATE - INTERVAL '7 days'),
    'active_customers', COUNT(DISTINCT c.id) FILTER (WHERE c.last_visit >= CURRENT_DATE - INTERVAL '30 days'),
    'new_customers_month', COUNT(DISTINCT c.id) FILTER (WHERE DATE(c.created_at) >= DATE_TRUNC('month', CURRENT_DATE)),
    'total_customers', COUNT(DISTINCT c.id),
    'total_services', COUNT(DISTINCT s.id) FILTER (WHERE s.is_active = true),
    'total_products', COUNT(DISTINCT p.id),
    'low_stock_products', COUNT(DISTINCT p.id) FILTER (WHERE p.current_stock <= p.min_stock_level)
  ) INTO v_metrics
  FROM barbershops bs
  LEFT JOIN transactions t ON t.barbershop_id = bs.id
  LEFT JOIN bookings b ON b.shop_id = bs.id
  LEFT JOIN customers c ON c.barbershop_id = bs.id
  LEFT JOIN services s ON s.barbershop_id = bs.id
  LEFT JOIN products p ON p.barbershop_id = bs.id
  WHERE bs.id = p_barbershop_id
  GROUP BY bs.id;
  
  RETURN v_metrics;
END;
$$ LANGUAGE plpgsql;

-- Procedure to calculate barber commissions
CREATE OR REPLACE FUNCTION calculate_barber_commission(
  p_barbershop_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  barber_id UUID,
  barber_name TEXT,
  total_services NUMERIC,
  total_products NUMERIC,
  commission_rate NUMERIC,
  commission_amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bs.user_id as barber_id,
    p.full_name as barber_name,
    COALESCE(SUM(t.amount) FILTER (WHERE t.transaction_type = 'service'), 0) as total_services,
    COALESCE(SUM(t.amount) FILTER (WHERE t.transaction_type = 'product'), 0) as total_products,
    COALESCE(fa.commission_rate, 0) as commission_rate,
    COALESCE(SUM(t.barber_amount), 0) as commission_amount
  FROM barbershop_staff bs
  JOIN profiles p ON p.id = bs.user_id
  LEFT JOIN financial_arrangements fa ON fa.barber_id = bs.user_id 
    AND fa.barbershop_id = p_barbershop_id 
    AND fa.is_active = true
  LEFT JOIN transactions t ON t.barber_id = bs.user_id 
    AND t.barbershop_id = p_barbershop_id
    AND DATE(t.processed_at) BETWEEN p_start_date AND p_end_date
  WHERE bs.barbershop_id = p_barbershop_id
    AND bs.is_active = true
  GROUP BY bs.user_id, p.full_name, fa.commission_rate;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- PART 6: GRANT NECESSARY PERMISSIONS
-- ==========================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION private.user_owns_shop(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.user_is_shop_staff(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_shop_dashboard_metrics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_barber_commission(UUID, DATE, DATE) TO authenticated;

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================
-- This migration has fixed:
-- 1. All RLS policies with proper role targeting
-- 2. Added performance indexes on all foreign keys
-- 3. Added update triggers for audit fields
-- 4. Created stored procedures for common operations
-- 5. Granted necessary permissions
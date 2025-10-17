-- ==========================================
-- Shop Management Module - Complete Fix Migration
-- ==========================================
-- This migration fixes all database issues for the shop management module
-- including RLS policies, indexes, triggers, and missing relationships

-- ==========================================
-- PART 1: FIX RLS POLICIES WITH PROPER ROLE TARGETING
-- ==========================================

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Shop owners can access their customers" ON customers;
DROP POLICY IF EXISTS "Shop owners can access their services" ON services;
DROP POLICY IF EXISTS "Shop owners can access their appointments" ON appointments;
DROP POLICY IF EXISTS "Shop owners can access their transactions" ON transactions;
DROP POLICY IF EXISTS "Shop owners can access their reviews" ON reviews;
DROP POLICY IF EXISTS "Shop owners can access their staff schedules" ON staff_schedule;
DROP POLICY IF EXISTS "Shop owners can access their inventory movements" ON inventory_movements;

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

-- Appointments table policies
CREATE POLICY "Shop owners can manage appointments" ON appointments
  FOR ALL
  TO authenticated
  USING ((SELECT private.user_owns_shop(barbershop_id)))
  WITH CHECK ((SELECT private.user_owns_shop(barbershop_id)));

CREATE POLICY "Barbers can view their appointments" ON appointments
  FOR SELECT
  TO authenticated
  USING (barber_id = (SELECT auth.uid()) OR (SELECT private.user_is_shop_staff(barbershop_id)));

CREATE POLICY "Customers can view their appointments" ON appointments
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE email = (SELECT auth.email())
    )
  );

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

-- Reviews table policies
CREATE POLICY "Public can view public reviews" ON reviews
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

CREATE POLICY "Shop owners can manage reviews" ON reviews
  FOR ALL
  TO authenticated
  USING ((SELECT private.user_owns_shop(barbershop_id)))
  WITH CHECK ((SELECT private.user_owns_shop(barbershop_id)));

-- Staff schedule policies
CREATE POLICY "Shop owners can manage schedules" ON staff_schedule
  FOR ALL
  TO authenticated
  USING ((SELECT private.user_owns_shop(barbershop_id)))
  WITH CHECK ((SELECT private.user_owns_shop(barbershop_id)));

CREATE POLICY "Barbers can view and update own schedule" ON staff_schedule
  FOR ALL
  TO authenticated
  USING (barber_id = (SELECT auth.uid()))
  WITH CHECK (barber_id = (SELECT auth.uid()));

-- Inventory movements policies
CREATE POLICY "Shop owners can manage inventory" ON inventory_movements
  FOR ALL
  TO authenticated
  USING ((SELECT private.user_owns_shop(barbershop_id)))
  WITH CHECK ((SELECT private.user_owns_shop(barbershop_id)));

-- ==========================================
-- PART 2: ADD MISSING INDEXES FOR PERFORMANCE
-- ==========================================

-- Appointments indexes (critical for performance)
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_barbershop_date ON appointments(barbershop_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_barber_status ON appointments(barber_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_payment_status ON appointments(payment_status) WHERE payment_status != 'paid';

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_appointment ON transactions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON transactions(payment_method);
CREATE INDEX IF NOT EXISTS idx_transactions_barbershop_date ON transactions(barbershop_id, DATE(processed_at));

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_barbershop_active ON customers(barbershop_id, is_active);
CREATE INDEX IF NOT EXISTS idx_customers_preferred_barber ON customers(preferred_barber_id);

-- Services indexes
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_barbershop_active ON services(barbershop_id, is_active);
CREATE INDEX IF NOT EXISTS idx_services_featured ON services(is_featured) WHERE is_featured = true;

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_barbershop_public ON reviews(barbershop_id, is_public);
CREATE INDEX IF NOT EXISTS idx_reviews_featured ON reviews(is_featured) WHERE is_featured = true;

-- Staff schedule indexes
CREATE INDEX IF NOT EXISTS idx_staff_schedule_barbershop ON staff_schedule(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedule_recurring ON staff_schedule(is_recurring) WHERE is_recurring = true;

-- Products indexes (if not exists)
CREATE INDEX IF NOT EXISTS idx_products_barbershop ON products(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(barbershop_id, current_stock) 
  WHERE current_stock <= min_stock_level;

-- Financial arrangements indexes
CREATE INDEX IF NOT EXISTS idx_financial_arrangements_barbershop ON financial_arrangements(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_financial_arrangements_barber ON financial_arrangements(barber_id);
CREATE INDEX IF NOT EXISTS idx_financial_arrangements_active ON financial_arrangements(is_active) 
  WHERE is_active = true;

-- ==========================================
-- PART 3: ADD UPDATE TRIGGERS FOR AUDIT FIELDS
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
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_schedule_updated_at BEFORE UPDATE ON staff_schedule
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- PART 4: ADD MISSING CONSTRAINTS AND RELATIONSHIPS
-- ==========================================

-- Add check constraints for data integrity
ALTER TABLE appointments 
  ADD CONSTRAINT check_appointment_duration CHECK (duration_minutes > 0),
  ADD CONSTRAINT check_appointment_amount CHECK (total_amount >= 0);

ALTER TABLE transactions
  ADD CONSTRAINT check_transaction_amounts CHECK (
    amount >= 0 AND 
    net_amount >= 0 AND 
    commission_amount >= 0 AND 
    shop_amount >= 0 AND 
    barber_amount >= 0
  );

ALTER TABLE services
  ADD CONSTRAINT check_service_price CHECK (price >= 0),
  ADD CONSTRAINT check_service_duration CHECK (duration_minutes > 0);

ALTER TABLE customers
  ADD CONSTRAINT check_customer_metrics CHECK (
    total_visits >= 0 AND 
    total_spent >= 0 AND 
    loyalty_points >= 0
  );

-- Add foreign key constraints if missing
ALTER TABLE appointments
  ADD CONSTRAINT fk_appointments_barbershop FOREIGN KEY (barbershop_id) 
    REFERENCES barbershops(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_appointments_customer FOREIGN KEY (customer_id) 
    REFERENCES customers(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_appointments_barber FOREIGN KEY (barber_id) 
    REFERENCES profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_appointments_service FOREIGN KEY (service_id) 
    REFERENCES services(id) ON DELETE SET NULL;

-- ==========================================
-- PART 5: CREATE MATERIALIZED VIEWS FOR ANALYTICS
-- ==========================================

-- Create materialized view for shop analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS shop_analytics_summary AS
SELECT 
  b.id as barbershop_id,
  b.name as shop_name,
  COUNT(DISTINCT c.id) as total_customers,
  COUNT(DISTINCT a.id) as total_appointments,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed') as completed_appointments,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'no_show') as no_show_appointments,
  COALESCE(SUM(t.net_amount), 0) as total_revenue,
  COALESCE(AVG(r.rating), 0) as average_rating,
  COUNT(DISTINCT r.id) as total_reviews,
  COUNT(DISTINCT s.id) as total_services,
  COUNT(DISTINCT p.id) as total_products,
  NOW() as last_updated
FROM barbershops b
LEFT JOIN customers c ON c.barbershop_id = b.id
LEFT JOIN appointments a ON a.barbershop_id = b.id
LEFT JOIN transactions t ON t.barbershop_id = b.id
LEFT JOIN reviews r ON r.barbershop_id = b.id
LEFT JOIN services s ON s.barbershop_id = b.id AND s.is_active = true
LEFT JOIN products p ON p.barbershop_id = b.id
GROUP BY b.id, b.name;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_analytics_barbershop ON shop_analytics_summary(barbershop_id);

-- Create function to refresh analytics
CREATE OR REPLACE FUNCTION refresh_shop_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY shop_analytics_summary;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- PART 6: CREATE STORED PROCEDURES FOR COMMON OPERATIONS
-- ==========================================

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
    bs.commission_rate,
    COALESCE(SUM(t.barber_amount), 0) as commission_amount
  FROM barbershop_staff bs
  JOIN profiles p ON p.id = bs.user_id
  LEFT JOIN transactions t ON t.barber_id = bs.user_id 
    AND t.barbershop_id = p_barbershop_id
    AND DATE(t.processed_at) BETWEEN p_start_date AND p_end_date
  WHERE bs.barbershop_id = p_barbershop_id
    AND bs.is_active = true
  GROUP BY bs.user_id, p.full_name, bs.commission_rate;
END;
$$ LANGUAGE plpgsql;

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
    'today_appointments', COUNT(DISTINCT a.id) FILTER (WHERE a.appointment_date = CURRENT_DATE),
    'week_appointments', COUNT(DISTINCT a.id) FILTER (WHERE a.appointment_date >= CURRENT_DATE - INTERVAL '7 days'),
    'active_customers', COUNT(DISTINCT c.id) FILTER (WHERE c.last_visit >= CURRENT_DATE - INTERVAL '30 days'),
    'new_customers_month', COUNT(DISTINCT c.id) FILTER (WHERE DATE(c.created_at) >= DATE_TRUNC('month', CURRENT_DATE)),
    'avg_service_value', COALESCE(AVG(a.total_amount) FILTER (WHERE a.status = 'completed'), 0),
    'completion_rate', CASE 
      WHEN COUNT(a.id) > 0 THEN 
        (COUNT(a.id) FILTER (WHERE a.status = 'completed')::NUMERIC / COUNT(a.id) * 100)
      ELSE 0 
    END
  ) INTO v_metrics
  FROM barbershops b
  LEFT JOIN transactions t ON t.barbershop_id = b.id
  LEFT JOIN appointments a ON a.barbershop_id = b.id
  LEFT JOIN customers c ON c.barbershop_id = b.id
  WHERE b.id = p_barbershop_id;
  
  RETURN v_metrics;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- PART 7: GRANT NECESSARY PERMISSIONS
-- ==========================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION private.user_owns_shop(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.user_is_shop_staff(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_barber_commission(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_shop_dashboard_metrics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_shop_analytics() TO authenticated;

-- Grant select on materialized view
GRANT SELECT ON shop_analytics_summary TO authenticated;

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================
-- This migration has fixed:
-- 1. All RLS policies with proper role targeting
-- 2. Added performance indexes on all foreign keys
-- 3. Added update triggers for audit fields
-- 4. Added data integrity constraints
-- 5. Created materialized views for analytics
-- 6. Added stored procedures for common operations
-- 7. Granted necessary permissions
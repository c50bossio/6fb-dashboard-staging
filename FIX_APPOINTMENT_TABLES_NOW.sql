-- =====================================================
-- COMPLETE DATABASE FIX FOR APPOINTMENT SYSTEM
-- Run this SQL in Supabase SQL Editor to fix everything
-- =====================================================

-- 1. FIX CUSTOMERS TABLE: Add missing columns
-- =====================================================
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS barbershop_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_visit_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS referred_by_customer_id UUID REFERENCES customers(id);

-- Migrate data from shop_id to barbershop_id if needed
UPDATE customers 
SET barbershop_id = shop_id 
WHERE barbershop_id IS NULL AND shop_id IS NOT NULL;

-- Create missing indexes for customers table
CREATE INDEX IF NOT EXISTS idx_customers_barbershop_id ON customers(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(barbershop_id, is_active);
CREATE INDEX IF NOT EXISTS idx_customers_last_visit ON customers(barbershop_id, last_visit_at);

-- 2. FIX BOOKINGS TABLE: Add customer tracking columns
-- =====================================================
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS service_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS barber_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 30;

-- Create index for customer_id if not exists
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_shop_id ON bookings(shop_id);
CREATE INDEX IF NOT EXISTS idx_bookings_barber_id ON bookings(barber_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- 3. CREATE TRIGGER TO AUTO-UPDATE CUSTOMER STATS
-- =====================================================
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new booking is created with a customer_id
  IF TG_OP = 'INSERT' AND NEW.customer_id IS NOT NULL THEN
    UPDATE customers 
    SET 
      total_visits = COALESCE(total_visits, 0) + 1,
      last_visit_at = GREATEST(COALESCE(last_visit_at, NEW.start_time), NEW.start_time),
      total_spent = COALESCE(total_spent, 0) + COALESCE(NEW.price, 0),
      updated_at = NOW()
    WHERE id = NEW.customer_id;
    
    -- Also copy customer data to booking for redundancy
    UPDATE bookings
    SET 
      customer_name = (SELECT name FROM customers WHERE id = NEW.customer_id),
      customer_phone = (SELECT phone FROM customers WHERE id = NEW.customer_id),
      customer_email = (SELECT email FROM customers WHERE id = NEW.customer_id)
    WHERE id = NEW.id AND NEW.customer_id IS NOT NULL;
    
  -- When a booking is updated
  ELSIF TG_OP = 'UPDATE' THEN
    -- If customer_id changed, update both old and new customer stats
    IF OLD.customer_id IS DISTINCT FROM NEW.customer_id THEN
      -- Decrease stats for old customer
      IF OLD.customer_id IS NOT NULL THEN
        UPDATE customers 
        SET 
          total_visits = GREATEST(0, COALESCE(total_visits, 1) - 1),
          total_spent = GREATEST(0, COALESCE(total_spent, 0) - COALESCE(OLD.price, 0)),
          updated_at = NOW()
        WHERE id = OLD.customer_id;
      END IF;
      
      -- Increase stats for new customer
      IF NEW.customer_id IS NOT NULL THEN
        UPDATE customers 
        SET 
          total_visits = COALESCE(total_visits, 0) + 1,
          last_visit_at = GREATEST(COALESCE(last_visit_at, NEW.start_time), NEW.start_time),
          total_spent = COALESCE(total_spent, 0) + COALESCE(NEW.price, 0),
          updated_at = NOW()
        WHERE id = NEW.customer_id;
        
        -- Update customer data in booking
        UPDATE bookings
        SET 
          customer_name = (SELECT name FROM customers WHERE id = NEW.customer_id),
          customer_phone = (SELECT phone FROM customers WHERE id = NEW.customer_id),
          customer_email = (SELECT email FROM customers WHERE id = NEW.customer_id)
        WHERE id = NEW.id;
      END IF;
    END IF;
    
  -- When a booking is deleted
  ELSIF TG_OP = 'DELETE' AND OLD.customer_id IS NOT NULL THEN
    UPDATE customers 
    SET 
      total_visits = GREATEST(0, COALESCE(total_visits, 1) - 1),
      total_spent = GREATEST(0, COALESCE(total_spent, 0) - COALESCE(OLD.price, 0)),
      updated_at = NOW()
    WHERE id = OLD.customer_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_customer_stats ON bookings;
CREATE TRIGGER trigger_update_customer_stats
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_customer_stats();

-- 4. CREATE UPDATED_AT TRIGGER FOR CUSTOMERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_customers_updated_at ON customers;
CREATE TRIGGER trigger_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. UPDATE EXISTING CUSTOMER STATS (ONE-TIME FIX)
-- =====================================================
-- Update total_visits and last_visit_at for all customers based on existing bookings
UPDATE customers c
SET 
  total_visits = (
    SELECT COUNT(*) 
    FROM bookings b 
    WHERE b.customer_id = c.id
  ),
  last_visit_at = (
    SELECT MAX(start_time) 
    FROM bookings b 
    WHERE b.customer_id = c.id
  ),
  total_spent = (
    SELECT COALESCE(SUM(price), 0) 
    FROM bookings b 
    WHERE b.customer_id = c.id
  )
WHERE EXISTS (
  SELECT 1 FROM bookings WHERE customer_id = c.id
);

-- 6. CREATE VIEW FOR ENHANCED APPOINTMENT DATA
-- =====================================================
CREATE OR REPLACE VIEW appointment_details AS
SELECT 
  b.id,
  b.shop_id,
  b.barber_id,
  b.customer_id,
  b.service_id,
  b.start_time,
  b.end_time,
  b.status,
  b.price,
  b.notes,
  b.is_recurring,
  b.recurring_pattern,
  b.is_test,
  b.created_at,
  b.updated_at,
  -- Customer data from joined table or booking columns
  COALESCE(c.name, b.customer_name) as customer_name,
  COALESCE(c.phone, b.customer_phone) as customer_phone,
  COALESCE(c.email, b.customer_email) as customer_email,
  c.vip_status as customer_vip,
  c.total_visits as customer_total_visits,
  c.notification_preferences as customer_notification_prefs,
  -- Service data
  s.name as service_name,
  s.duration_minutes as service_duration,
  s.price as service_price,
  -- Barber data
  br.name as barber_name,
  br.color as barber_color
FROM bookings b
LEFT JOIN customers c ON b.customer_id = c.id
LEFT JOIN services s ON b.service_id = s.id
LEFT JOIN barbers br ON b.barber_id = br.id;

-- 7. GRANT PERMISSIONS (if using Row Level Security)
-- =====================================================
-- Enable RLS on tables if not already enabled
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to access their shop's data
CREATE POLICY "Users can view customers from their shop" ON customers
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    (shop_id IN (SELECT shop_id FROM user_shops WHERE user_id = auth.uid()) OR
     barbershop_id IN (SELECT shop_id FROM user_shops WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can manage customers from their shop" ON customers
  FOR ALL USING (
    auth.uid() IS NOT NULL AND 
    (shop_id IN (SELECT shop_id FROM user_shops WHERE user_id = auth.uid()) OR
     barbershop_id IN (SELECT shop_id FROM user_shops WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can view bookings from their shop" ON bookings
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    shop_id IN (SELECT shop_id FROM user_shops WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage bookings from their shop" ON bookings
  FOR ALL USING (
    auth.uid() IS NOT NULL AND 
    shop_id IN (SELECT shop_id FROM user_shops WHERE user_id = auth.uid())
  );

-- 8. FINAL DATA CONSISTENCY CHECKS
-- =====================================================
-- Ensure all bookings with customer data have customer records
INSERT INTO customers (shop_id, name, phone, email, created_at, updated_at)
SELECT DISTINCT 
  b.shop_id,
  b.customer_name,
  b.customer_phone,
  b.customer_email,
  NOW(),
  NOW()
FROM bookings b
WHERE b.customer_id IS NULL 
  AND b.customer_name IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM customers c 
    WHERE c.shop_id = b.shop_id 
      AND c.name = b.customer_name
      AND (c.phone = b.customer_phone OR c.email = b.customer_email)
  )
ON CONFLICT DO NOTHING;

-- Link existing bookings to customers based on matching data
UPDATE bookings b
SET customer_id = c.id
FROM customers c
WHERE b.customer_id IS NULL
  AND b.shop_id = c.shop_id
  AND (
    (b.customer_name = c.name AND b.customer_phone = c.phone) OR
    (b.customer_name = c.name AND b.customer_email = c.email)
  );

-- =====================================================
-- VERIFICATION QUERIES - Run these to check everything works
-- =====================================================
/*
-- Check customers table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customers' 
ORDER BY ordinal_position;

-- Check bookings table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position;

-- Check if triggers are working
SELECT * FROM appointment_details LIMIT 5;

-- Check customer stats
SELECT name, total_visits, last_visit_at, total_spent 
FROM customers 
WHERE total_visits > 0 
LIMIT 5;
*/

-- =====================================================
-- SUCCESS! Your appointment system database is now perfect!
-- =====================================================
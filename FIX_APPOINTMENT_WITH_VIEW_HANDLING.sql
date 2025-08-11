-- =====================================================
-- COMPLETE FIX - HANDLES VIEWS AND DEPENDENCIES
-- Run this SQL in Supabase SQL Editor
-- =====================================================

-- 1. DROP DEPENDENT VIEWS FIRST
-- =====================================================
DROP VIEW IF EXISTS production_customers CASCADE;
DROP VIEW IF EXISTS appointment_details CASCADE;

-- 2. ADD/ALTER COLUMNS IN CUSTOMERS TABLE
-- =====================================================
-- Add missing columns first (these won't conflict with views)
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS barbershop_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_visit_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS referred_by_customer_id TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS total_visits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_spent DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS vip_status BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"sms": true, "email": true, "reminders": true, "confirmations": true}';

-- Now alter the phone column (view is dropped so this is safe)
DO $$
BEGIN
  -- Only alter if column exists and is wrong type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' 
    AND column_name = 'phone'
    AND character_maximum_length < 50
  ) THEN
    ALTER TABLE customers ALTER COLUMN phone TYPE VARCHAR(50);
  END IF;
END $$;

-- Ensure created_at and updated_at exist
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. ADD COLUMNS TO BOOKINGS TABLE
-- =====================================================
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS service_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS barber_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 30;

-- 4. DATA MIGRATION
-- =====================================================
-- Migrate shop_id to barbershop_id
UPDATE customers 
SET barbershop_id = shop_id 
WHERE barbershop_id IS NULL AND shop_id IS NOT NULL;

-- Set all existing customers as active
UPDATE customers 
SET is_active = TRUE 
WHERE is_active IS NULL;

-- 5. CREATE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_customers_barbershop_id ON customers(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_active_barber ON customers(barbershop_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_customers_active_shop ON customers(shop_id) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_shop_id ON bookings(shop_id);
CREATE INDEX IF NOT EXISTS idx_bookings_barber_id ON bookings(barber_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- 6. CREATE UPDATE FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.customer_id IS NOT NULL THEN
    UPDATE customers 
    SET 
      total_visits = COALESCE(total_visits, 0) + 1,
      last_visit_at = GREATEST(COALESCE(last_visit_at, NEW.start_time), NEW.start_time),
      total_spent = COALESCE(total_spent, 0) + COALESCE(NEW.price, 0),
      updated_at = NOW()
    WHERE id = NEW.customer_id;
    
    UPDATE bookings b
    SET 
      customer_name = c.name,
      customer_phone = c.phone,
      customer_email = c.email
    FROM customers c
    WHERE b.id = NEW.id 
      AND c.id = NEW.customer_id;
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.customer_id IS DISTINCT FROM NEW.customer_id THEN
      IF OLD.customer_id IS NOT NULL THEN
        UPDATE customers 
        SET 
          total_visits = GREATEST(0, COALESCE(total_visits, 1) - 1),
          total_spent = GREATEST(0, COALESCE(total_spent, 0) - COALESCE(OLD.price, 0)),
          updated_at = NOW()
        WHERE id = OLD.customer_id;
      END IF;
      
      IF NEW.customer_id IS NOT NULL THEN
        UPDATE customers 
        SET 
          total_visits = COALESCE(total_visits, 0) + 1,
          last_visit_at = GREATEST(COALESCE(last_visit_at, NEW.start_time), NEW.start_time),
          total_spent = COALESCE(total_spent, 0) + COALESCE(NEW.price, 0),
          updated_at = NOW()
        WHERE id = NEW.customer_id;
        
        UPDATE bookings b
        SET 
          customer_name = c.name,
          customer_phone = c.phone,
          customer_email = c.email
        FROM customers c
        WHERE b.id = NEW.id 
          AND c.id = NEW.customer_id;
      END IF;
    END IF;
    
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

DROP TRIGGER IF EXISTS trigger_update_customer_stats ON bookings;
CREATE TRIGGER trigger_update_customer_stats
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_customer_stats();

-- 7. CREATE UPDATED_AT TRIGGER
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

-- 8. UPDATE CUSTOMER STATS
-- =====================================================
UPDATE customers c
SET 
  total_visits = (SELECT COUNT(*) FROM bookings WHERE customer_id = c.id),
  last_visit_at = (SELECT MAX(start_time) FROM bookings WHERE customer_id = c.id),
  total_spent = (SELECT COALESCE(SUM(price), 0) FROM bookings WHERE customer_id = c.id)
WHERE EXISTS (SELECT 1 FROM bookings WHERE customer_id = c.id);

-- Copy customer data to bookings
UPDATE bookings b
SET 
  customer_name = c.name,
  customer_phone = c.phone,
  customer_email = c.email
FROM customers c
WHERE b.customer_id = c.id
  AND b.customer_id IS NOT NULL
  AND (b.customer_name IS NULL OR b.customer_phone IS NULL OR b.customer_email IS NULL);

-- 9. RECREATE VIEWS
-- =====================================================
-- Recreate appointment_details view
CREATE OR REPLACE VIEW appointment_details AS
SELECT 
  b.*,
  COALESCE(c.name, b.customer_name) as display_customer_name,
  COALESCE(c.phone, b.customer_phone) as display_customer_phone,
  COALESCE(c.email, b.customer_email) as display_customer_email,
  c.vip_status as customer_vip,
  c.total_visits as customer_total_visits,
  c.notification_preferences as customer_notification_prefs,
  s.name as service_name_lookup,
  s.duration_minutes as service_duration,
  br.name as barber_name_lookup,
  br.color as barber_color
FROM bookings b
LEFT JOIN customers c ON b.customer_id = c.id
LEFT JOIN services s ON b.service_id = s.id
LEFT JOIN barbers br ON b.barber_id = br.id;

-- Recreate production_customers view if it existed
-- (This is a simple view of customers, you may need to adjust based on your needs)
CREATE OR REPLACE VIEW production_customers AS
SELECT 
  id,
  shop_id,
  barbershop_id,
  name,
  phone,
  email,
  is_active,
  vip_status,
  total_visits,
  last_visit_at,
  created_at,
  updated_at
FROM customers
WHERE is_active = TRUE;

-- 10. FINAL VERIFICATION
-- =====================================================
SELECT 
  'Success!' as status,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = 'customers' AND table_schema = 'public') as customer_columns,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = 'bookings' AND table_schema = 'public') as booking_columns,
  (SELECT COUNT(*) FROM customers WHERE is_active = TRUE) as active_customers,
  (SELECT COUNT(*) FROM bookings WHERE customer_id IS NOT NULL) as linked_bookings;

-- =====================================================
-- ✅ COMPLETE! Database is now fixed
-- Views have been recreated with proper column types
-- =====================================================
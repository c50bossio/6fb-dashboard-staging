-- =====================================================
-- COMPLETE FIX - ADDS ALL MISSING COLUMNS FIRST
-- Run this SQL in Supabase SQL Editor
-- =====================================================

-- 1. ADD ALL MISSING COLUMNS TO CUSTOMERS TABLE
-- =====================================================
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS barbershop_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_visit_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS referred_by_customer_id TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS total_visits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_spent DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS vip_status BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"sms": true, "email": true, "reminders": true, "confirmations": true}';

-- Ensure created_at and updated_at exist
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Migrate data from shop_id to barbershop_id if needed
UPDATE customers 
SET barbershop_id = shop_id 
WHERE barbershop_id IS NULL AND shop_id IS NOT NULL;

-- Set all existing customers as active
UPDATE customers 
SET is_active = TRUE 
WHERE is_active IS NULL;

-- 2. ADD MISSING COLUMNS TO BOOKINGS TABLE
-- =====================================================
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS service_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS barber_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 30;

-- 3. CREATE INDEXES FOR PERFORMANCE
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

-- 4. CREATE CUSTOMER STATS UPDATE FUNCTION
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
    
    -- Copy customer data to booking
    UPDATE bookings b
    SET 
      customer_name = c.name,
      customer_phone = c.phone,
      customer_email = c.email
    FROM customers c
    WHERE b.id = NEW.id 
      AND c.id = NEW.customer_id;
    
  -- When a booking is updated
  ELSIF TG_OP = 'UPDATE' THEN
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

-- Create or replace the trigger
DROP TRIGGER IF EXISTS trigger_update_customer_stats ON bookings;
CREATE TRIGGER trigger_update_customer_stats
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_customer_stats();

-- 5. CREATE UPDATED_AT TRIGGER
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

-- 6. UPDATE EXISTING CUSTOMER STATS
-- =====================================================
-- Calculate stats for existing customers
WITH booking_stats AS (
  SELECT 
    customer_id,
    COUNT(*) as visit_count,
    MAX(start_time) as last_visit,
    COALESCE(SUM(price), 0) as total_price
  FROM bookings
  WHERE customer_id IS NOT NULL
  GROUP BY customer_id
)
UPDATE customers c
SET 
  total_visits = bs.visit_count,
  last_visit_at = bs.last_visit,
  total_spent = bs.total_price
FROM booking_stats bs
WHERE c.id = bs.customer_id;

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

-- 7. CREATE APPOINTMENT DETAILS VIEW
-- =====================================================
CREATE OR REPLACE VIEW appointment_details AS
SELECT 
  b.*,
  -- Customer data
  COALESCE(c.name, b.customer_name) as display_customer_name,
  COALESCE(c.phone, b.customer_phone) as display_customer_phone,
  COALESCE(c.email, b.customer_email) as display_customer_email,
  c.vip_status as customer_vip,
  c.total_visits as customer_total_visits,
  c.notification_preferences as customer_notification_prefs,
  -- Service data
  s.name as service_name_lookup,
  s.duration_minutes as service_duration,
  -- Barber data
  br.name as barber_name_lookup,
  br.color as barber_color
FROM bookings b
LEFT JOIN customers c ON b.customer_id = c.id
LEFT JOIN services s ON b.service_id = s.id
LEFT JOIN barbers br ON b.barber_id = br.id;

-- 8. VERIFICATION
-- =====================================================
-- Check what we've accomplished
DO $$
DECLARE
  customer_cols INTEGER;
  booking_cols INTEGER;
  active_customers INTEGER;
  linked_bookings INTEGER;
BEGIN
  SELECT COUNT(*) INTO customer_cols
  FROM information_schema.columns 
  WHERE table_name = 'customers' AND table_schema = 'public';
  
  SELECT COUNT(*) INTO booking_cols
  FROM information_schema.columns 
  WHERE table_name = 'bookings' AND table_schema = 'public';
  
  SELECT COUNT(*) INTO active_customers
  FROM customers WHERE is_active = TRUE;
  
  SELECT COUNT(*) INTO linked_bookings
  FROM bookings WHERE customer_id IS NOT NULL;
  
  RAISE NOTICE '✅ SUCCESS SUMMARY:';
  RAISE NOTICE '- Customers table: % columns', customer_cols;
  RAISE NOTICE '- Bookings table: % columns', booking_cols;
  RAISE NOTICE '- Active customers: %', active_customers;
  RAISE NOTICE '- Linked bookings: %', linked_bookings;
END $$;

-- =====================================================
-- ✅ DATABASE FIX COMPLETE!
-- Your appointment system is now fully functional
-- =====================================================
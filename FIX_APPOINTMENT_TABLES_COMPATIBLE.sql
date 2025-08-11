-- =====================================================
-- FIXED DATABASE MIGRATION - COMPATIBLE WITH TEXT IDs
-- Run this SQL in Supabase SQL Editor
-- =====================================================

-- 1. FIX CUSTOMERS TABLE: Add missing columns (without UUID foreign key)
-- =====================================================
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS barbershop_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_visit_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS referred_by_customer_id TEXT; -- Changed to TEXT to match id type

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
    UPDATE bookings b
    SET 
      customer_name = c.name,
      customer_phone = c.phone,
      customer_email = c.email
    FROM customers c
    WHERE b.id = NEW.id 
      AND c.id = NEW.customer_id 
      AND NEW.customer_id IS NOT NULL;
    
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
  total_visits = subq.visit_count,
  last_visit_at = subq.last_visit,
  total_spent = subq.total_price
FROM (
  SELECT 
    customer_id,
    COUNT(*) as visit_count,
    MAX(start_time) as last_visit,
    COALESCE(SUM(price), 0) as total_price
  FROM bookings
  WHERE customer_id IS NOT NULL
  GROUP BY customer_id
) subq
WHERE c.id = subq.customer_id;

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
  s.name as service_name_lookup,
  s.duration_minutes as service_duration,
  s.price as service_price,
  -- Barber data
  br.name as barber_name_lookup,
  br.color as barber_color
FROM bookings b
LEFT JOIN customers c ON b.customer_id = c.id
LEFT JOIN services s ON b.service_id = s.id
LEFT JOIN barbers br ON b.barber_id = br.id;

-- 7. ENSURE DATA CONSISTENCY
-- =====================================================
-- Copy customer data to bookings where customer_id exists but fields are empty
UPDATE bookings b
SET 
  customer_name = c.name,
  customer_phone = c.phone,
  customer_email = c.email
FROM customers c
WHERE b.customer_id = c.id
  AND b.customer_id IS NOT NULL
  AND (b.customer_name IS NULL OR b.customer_phone IS NULL OR b.customer_email IS NULL);

-- 8. Add foreign key constraint if both tables use same ID type
-- =====================================================
-- Only add if not exists and types match
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'customers_referred_by_fkey'
  ) THEN
    -- Check if we can add the constraint (both columns must be same type)
    BEGIN
      ALTER TABLE customers 
      ADD CONSTRAINT customers_referred_by_fkey 
      FOREIGN KEY (referred_by_customer_id) 
      REFERENCES customers(id);
    EXCEPTION
      WHEN OTHERS THEN
        -- If constraint fails, just continue without it
        RAISE NOTICE 'Could not add referral foreign key: %', SQLERRM;
    END;
  END IF;
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify everything worked:

-- Check customers table columns
SELECT 
  'Customers table has ' || COUNT(*) || ' columns' as status
FROM information_schema.columns 
WHERE table_name = 'customers' AND table_schema = 'public';

-- Check bookings table columns  
SELECT 
  'Bookings table has ' || COUNT(*) || ' columns' as status
FROM information_schema.columns 
WHERE table_name = 'bookings' AND table_schema = 'public';

-- Check if triggers exist
SELECT 
  'Trigger ' || trigger_name || ' exists on ' || event_object_table as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN ('trigger_update_customer_stats', 'trigger_customers_updated_at');

-- Check customer stats
SELECT 
  'Found ' || COUNT(*) || ' customers with visit history' as status
FROM customers 
WHERE total_visits > 0;

-- =====================================================
-- SUCCESS! Your appointment system database is now fixed!
-- =====================================================
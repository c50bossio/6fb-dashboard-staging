-- Shop Dashboard Complete Tables
-- Creates all missing tables for fully functional barbershop management

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- CORE BUSINESS TABLES
-- ==========================================

-- Customers table for customer management
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Personal Information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  date_of_birth DATE,
  
  -- Business Metrics
  first_visit TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_visit TIMESTAMP WITH TIME ZONE,
  total_visits INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0.00,
  average_service_value DECIMAL(8,2) DEFAULT 0.00,
  
  -- Preferences & Notes
  preferred_barber_id UUID REFERENCES profiles(id),
  service_preferences JSONB DEFAULT '[]',
  allergies_notes TEXT,
  special_requests TEXT,
  
  -- Loyalty & Marketing
  loyalty_points INTEGER DEFAULT 0,
  marketing_consent BOOLEAN DEFAULT false,
  referral_source VARCHAR(100),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT customers_email_barbershop_unique UNIQUE(email, barbershop_id)
);

-- Services table for service catalog
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Service Details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL, -- 'haircut', 'beard', 'styling', 'treatment', 'combo'
  
  -- Pricing & Duration
  price DECIMAL(8,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  
  -- Booking Settings
  online_booking_enabled BOOLEAN DEFAULT true,
  requires_consultation BOOLEAN DEFAULT false,
  max_daily_bookings INTEGER,
  buffer_time_minutes INTEGER DEFAULT 15,
  
  -- Display Settings
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  image_url TEXT,
  
  -- Add-ons & Variants
  allows_addons BOOLEAN DEFAULT false,
  addon_options JSONB DEFAULT '[]', -- [{"name": "Beard trim", "price": 10.00}]
  service_variants JSONB DEFAULT '[]', -- [{"name": "Senior", "price_modifier": -5.00}]
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Appointments table for booking management
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  
  -- Appointment Details
  appointment_date DATE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  
  -- Status Management
  status VARCHAR(50) DEFAULT 'confirmed', -- 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show'
  created_by VARCHAR(50) DEFAULT 'customer', -- 'customer', 'staff', 'walk_in'
  
  -- Service & Pricing
  service_name VARCHAR(255) NOT NULL, -- Snapshot at booking time
  base_price DECIMAL(8,2) NOT NULL,
  addons_price DECIMAL(8,2) DEFAULT 0.00,
  discount_amount DECIMAL(8,2) DEFAULT 0.00,
  total_amount DECIMAL(8,2) NOT NULL,
  
  -- Payment
  payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'partial', 'refunded'
  payment_method VARCHAR(50), -- 'cash', 'card', 'online', 'gift_card'
  tip_amount DECIMAL(8,2) DEFAULT 0.00,
  
  -- Additional Info
  customer_notes TEXT,
  staff_notes TEXT,
  cancellation_reason TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  
  -- Timestamps
  checked_in_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_appointment_times CHECK (start_time < end_time),
  CONSTRAINT valid_total_amount CHECK (total_amount >= 0)
);

-- Transactions table for financial tracking
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  barber_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Transaction Details
  transaction_type VARCHAR(50) NOT NULL, -- 'service', 'product', 'tip', 'refund', 'booth_rent'
  amount DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(8,2) DEFAULT 0.00,
  discount_amount DECIMAL(8,2) DEFAULT 0.00,
  net_amount DECIMAL(10,2) NOT NULL,
  
  -- Commission & Splits
  commission_rate DECIMAL(5,2), -- Percentage
  commission_amount DECIMAL(8,2) DEFAULT 0.00,
  shop_amount DECIMAL(8,2) DEFAULT 0.00,
  barber_amount DECIMAL(8,2) DEFAULT 0.00,
  
  -- Payment Details
  payment_method VARCHAR(50) NOT NULL, -- 'cash', 'card', 'online', 'gift_card', 'check'
  payment_reference VARCHAR(255), -- External payment ID
  payment_status VARCHAR(50) DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'refunded'
  
  -- Processing Info
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processor_fee DECIMAL(6,2) DEFAULT 0.00,
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Status
  is_refunded BOOLEAN DEFAULT false,
  refunded_at TIMESTAMP WITH TIME ZONE,
  refund_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_amounts CHECK (amount >= 0 AND net_amount >= 0)
);

-- Reviews table for customer feedback
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  barber_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Review Content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  comment TEXT,
  
  -- Service Specific Ratings
  service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
  cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
  
  -- Review Management
  is_featured BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  
  -- Response
  owner_response TEXT,
  response_date TIMESTAMP WITH TIME ZONE,
  
  -- Source
  review_source VARCHAR(50) DEFAULT 'internal', -- 'internal', 'google', 'yelp', 'facebook'
  external_review_id VARCHAR(255),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Staff Schedule table for barber availability
CREATE TABLE IF NOT EXISTS staff_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Schedule Details
  date DATE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Break Times
  break_start TIME,
  break_end TIME,
  
  -- Status
  is_available BOOLEAN DEFAULT true,
  status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'called_out', 'vacation', 'training'
  notes TEXT,
  
  -- Recurring Schedule
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern VARCHAR(50), -- 'weekly', 'biweekly', 'monthly'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_schedule_times CHECK (start_time < end_time),
  CONSTRAINT unique_barber_date UNIQUE(barber_id, date)
);

-- Inventory Movements table for product tracking
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Movement Details
  movement_type VARCHAR(50) NOT NULL, -- 'purchase', 'sale', 'adjustment', 'transfer', 'waste'
  quantity INTEGER NOT NULL,
  cost_per_unit DECIMAL(8,2),
  total_cost DECIMAL(10,2),
  
  -- Reference Information
  reference_type VARCHAR(50), -- 'appointment', 'manual', 'supplier_order'
  reference_id UUID,
  notes TEXT,
  
  -- Staff Information
  recorded_by UUID REFERENCES profiles(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Appointments indexes
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_barber_date ON appointments(barber_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_barbershop ON appointments(barbershop_id);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(DATE(processed_at));
CREATE INDEX IF NOT EXISTS idx_transactions_barbershop ON transactions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_transactions_barber ON transactions(barber_id);

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_barbershop ON customers(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_customers_last_visit ON customers(last_visit);

-- Services indexes
CREATE INDEX IF NOT EXISTS idx_services_barbershop ON services(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_barbershop ON reviews(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_reviews_barber ON reviews(barber_id);

-- Staff schedule indexes
CREATE INDEX IF NOT EXISTS idx_staff_schedule_barber_date ON staff_schedule(barber_id, date);
CREATE INDEX IF NOT EXISTS idx_staff_schedule_date ON staff_schedule(date);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (shop owners can access their shop's data)
CREATE POLICY "Shop owners can access their customers" ON customers
  FOR ALL USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Shop owners can access their services" ON services
  FOR ALL USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Shop owners can access their appointments" ON appointments
  FOR ALL USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Shop owners can access their transactions" ON transactions
  FOR ALL USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Shop owners can access their reviews" ON reviews
  FOR ALL USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Shop owners can access their staff schedules" ON staff_schedule
  FOR ALL USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Shop owners can access their inventory movements" ON inventory_movements
  FOR ALL USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

-- ==========================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- ==========================================

-- Function to update customer stats after appointment
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Update customer visit count and total spent
    UPDATE customers SET
      total_visits = (
        SELECT COUNT(*) FROM appointments 
        WHERE customer_id = NEW.customer_id AND status = 'completed'
      ),
      total_spent = (
        SELECT COALESCE(SUM(total_amount), 0) FROM appointments 
        WHERE customer_id = NEW.customer_id AND status = 'completed'
      ),
      last_visit = (
        SELECT MAX(appointment_date) FROM appointments 
        WHERE customer_id = NEW.customer_id AND status = 'completed'
      ),
      updated_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update customer stats
CREATE TRIGGER update_customer_stats_trigger
  AFTER INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_stats();

-- Function to calculate average service value
CREATE OR REPLACE FUNCTION update_customer_avg_service_value()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE customers SET
    average_service_value = (
      SELECT COALESCE(AVG(total_amount), 0) FROM appointments 
      WHERE customer_id = NEW.customer_id AND status = 'completed'
    )
  WHERE id = NEW.customer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for average service value
CREATE TRIGGER update_customer_avg_trigger
  AFTER INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_avg_service_value();
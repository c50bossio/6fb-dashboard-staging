-- Calendar Schema with Test Data Support
-- This schema includes is_test flag for separating test data from production data

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  price DECIMAL(10, 2) NOT NULL,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  is_test BOOLEAN DEFAULT false,  -- Flag for test data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Barbers table  
CREATE TABLE IF NOT EXISTS barbers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  color VARCHAR(7) DEFAULT '#3b82f6',
  avatar_url TEXT,
  bio TEXT,
  specialties JSONB DEFAULT '[]'::jsonb,
  rating DECIMAL(3, 2),
  is_active BOOLEAN DEFAULT true,
  is_test BOOLEAN DEFAULT false,  -- Flag for test data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  notes TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  is_vip BOOLEAN DEFAULT false,
  is_test BOOLEAN DEFAULT false,  -- Flag for test data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL,
  barber_id TEXT REFERENCES barbers(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
  service_id TEXT REFERENCES services(id) ON DELETE SET NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'confirmed',
  price DECIMAL(10, 2),
  notes TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_pattern JSONB,
  is_test BOOLEAN DEFAULT false,  -- Flag for test data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT booking_time_check CHECK (end_time > start_time)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_shop_id ON bookings(shop_id);
CREATE INDEX IF NOT EXISTS idx_bookings_barber_id ON bookings(barber_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_is_test ON bookings(is_test);  -- Index for test data filtering

CREATE INDEX IF NOT EXISTS idx_services_shop_id ON services(shop_id);
CREATE INDEX IF NOT EXISTS idx_services_is_test ON services(is_test);  -- Index for test data filtering

CREATE INDEX IF NOT EXISTS idx_barbers_shop_id ON barbers(shop_id);
CREATE INDEX IF NOT EXISTS idx_barbers_is_test ON barbers(is_test);  -- Index for test data filtering

CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_is_test ON customers(is_test);  -- Index for test data filtering

-- Enable Row Level Security (RLS)
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust based on your authentication strategy)
-- For now, allowing all operations for authenticated users
-- In production, make these more restrictive

-- Services policies
CREATE POLICY "Services are viewable by everyone" 
  ON services FOR SELECT 
  USING (true);

CREATE POLICY "Services are editable by authenticated users" 
  ON services FOR ALL 
  USING (auth.role() = 'authenticated');

-- Barbers policies
CREATE POLICY "Barbers are viewable by everyone" 
  ON barbers FOR SELECT 
  USING (true);

CREATE POLICY "Barbers are editable by authenticated users" 
  ON barbers FOR ALL 
  USING (auth.role() = 'authenticated');

-- Customers policies
CREATE POLICY "Customers are viewable by authenticated users" 
  ON customers FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Customers are editable by authenticated users" 
  ON customers FOR ALL 
  USING (auth.role() = 'authenticated');

-- Bookings policies
CREATE POLICY "Bookings are viewable by authenticated users" 
  ON bookings FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Bookings are editable by authenticated users" 
  ON bookings FOR ALL 
  USING (auth.role() = 'authenticated');

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_barbers_updated_at BEFORE UPDATE ON barbers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View to exclude test data by default
CREATE OR REPLACE VIEW production_bookings AS
SELECT * FROM bookings WHERE is_test = false;

CREATE OR REPLACE VIEW production_barbers AS
SELECT * FROM barbers WHERE is_test = false;

CREATE OR REPLACE VIEW production_services AS
SELECT * FROM services WHERE is_test = false;

CREATE OR REPLACE VIEW production_customers AS
SELECT * FROM customers WHERE is_test = false;

-- Grant permissions on views
GRANT SELECT ON production_bookings TO authenticated;
GRANT SELECT ON production_barbers TO authenticated;
GRANT SELECT ON production_services TO authenticated;
GRANT SELECT ON production_customers TO authenticated;
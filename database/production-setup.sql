-- 6FB AI Agent System - Production Database Setup
-- This script sets up the complete production database schema with proper security
-- Run this on your production Supabase instance

-- ==========================================
-- EXTENSIONS AND SECURITY
-- ==========================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector"; -- For AI embeddings
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- For query monitoring

-- ==========================================
-- ENUMS AND TYPES
-- ==========================================

-- User Roles
CREATE TYPE user_role AS ENUM (
  'CLIENT',
  'BARBER', 
  'SHOP_OWNER',
  'ENTERPRISE_OWNER',
  'SUPER_ADMIN'
);

-- Booking Status
CREATE TYPE booking_status AS ENUM (
  'PENDING',
  'CONFIRMED',
  'COMPLETED', 
  'CANCELLED',
  'NO_SHOW',
  'PAID'
);

-- Payment Status
CREATE TYPE payment_status AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'REFUNDED',
  'CANCELLED'
);

-- Subscription Tiers
CREATE TYPE subscription_tier AS ENUM (
  'FREE',
  'BASIC',
  'PRO',
  'ENTERPRISE'
);

-- ==========================================
-- CORE TABLES
-- ==========================================

-- Users (Supabase Auth integration)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role user_role DEFAULT 'CLIENT',
  avatar_url TEXT,
  
  -- Business associations
  shop_id UUID, -- Direct ownership (individual barbers)
  barbershop_id UUID, -- Alternative field name for compatibility
  
  -- Subscription and trial
  subscription_tier subscription_tier DEFAULT 'FREE',
  trial_started_at TIMESTAMP WITH TIME ZONE,
  trial_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Settings
  timezone VARCHAR(50) DEFAULT 'UTC',
  notification_preferences JSONB DEFAULT '{"email": true, "sms": true}',
  
  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_step VARCHAR(50),
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Barbershops (Core business entity)
CREATE TABLE barbershops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Contact information
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(10),
  country VARCHAR(50) DEFAULT 'US',
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  
  -- Business configuration
  business_hours JSONB DEFAULT '{}',
  booking_settings JSONB DEFAULT '{"requireAuth": false, "advanceBookingDays": 30}',
  
  -- Owner relationship
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Features
  features JSONB DEFAULT '{"onlineBooking": true, "payments": true, "calendar": true}',
  
  -- Analytics
  total_revenue DECIMAL(12,2) DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Services offered by barbershops
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Service details
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  price DECIMAL(8,2) NOT NULL CHECK (price >= 0),
  category VARCHAR(100),
  
  -- Display
  image_url TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Staff relationships (for multi-barber shops)
CREATE TABLE barbershop_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Role and permissions
  role user_role NOT NULL,
  permissions JSONB DEFAULT '{}',
  
  -- Compensation
  commission_rate DECIMAL(5,4) DEFAULT 0.20,
  hourly_rate DECIMAL(8,2),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(barbershop_id, user_id)
);

-- ==========================================
-- BOOKING SYSTEM
-- ==========================================

-- Bookings (main appointment table)
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Core relationships
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE RESTRICT,
  client_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  barber_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  end_time TIMESTAMP WITH TIME ZONE GENERATED ALWAYS AS (scheduled_at + INTERVAL '1 minute' * duration_minutes) STORED,
  
  -- Status
  status booking_status DEFAULT 'PENDING',
  
  -- Client information (for guests/walk-ins)
  client_name VARCHAR(255),
  client_phone VARCHAR(20),
  client_email VARCHAR(255),
  
  -- Pricing
  service_price DECIMAL(8,2) NOT NULL CHECK (service_price >= 0),
  tip_amount DECIMAL(8,2) DEFAULT 0 CHECK (tip_amount >= 0),
  total_amount DECIMAL(8,2) GENERATED ALWAYS AS (service_price + tip_amount) STORED,
  
  -- Payment
  payment_status payment_status DEFAULT 'PENDING',
  payment_method VARCHAR(50),
  stripe_payment_intent_id VARCHAR(255),
  
  -- Notes
  client_notes TEXT,
  internal_notes TEXT,
  
  -- Integration IDs
  google_event_id VARCHAR(255),
  external_booking_id VARCHAR(255),
  
  -- Metadata
  source VARCHAR(50) DEFAULT 'web', -- web, mobile, phone, walk-in
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_pattern_id UUID,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_client_info CHECK (
    client_id IS NOT NULL OR 
    (client_name IS NOT NULL AND client_phone IS NOT NULL)
  ),
  
  -- Prevent overlapping bookings for the same barber
  EXCLUDE USING gist (
    barber_id WITH =,
    tstzrange(scheduled_at, end_time) WITH &&
  ) WHERE (status IN ('CONFIRMED', 'COMPLETED'))
);

-- Payments tracking
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Payment details
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50),
  status payment_status DEFAULT 'PENDING',
  
  -- Stripe integration
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  stripe_charge_id VARCHAR(255),
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Profiles indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_shop_id ON profiles(shop_id);
CREATE INDEX idx_profiles_barbershop_id ON profiles(barbershop_id);
CREATE INDEX idx_profiles_role ON profiles(role);

-- Barbershops indexes
CREATE INDEX idx_barbershops_owner_id ON barbershops(owner_id);
CREATE INDEX idx_barbershops_active ON barbershops(is_active);

-- Services indexes
CREATE INDEX idx_services_barbershop_id ON services(barbershop_id);
CREATE INDEX idx_services_active ON services(is_active);
CREATE INDEX idx_services_category ON services(category);

-- Bookings indexes (critical for performance)
CREATE INDEX idx_bookings_barbershop_id ON bookings(barbershop_id);
CREATE INDEX idx_bookings_client_id ON bookings(client_id);
CREATE INDEX idx_bookings_barber_id ON bookings(barber_id);
CREATE INDEX idx_bookings_service_id ON bookings(service_id);
CREATE INDEX idx_bookings_scheduled_at ON bookings(scheduled_at);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_bookings_shop_date ON bookings(barbershop_id, scheduled_at);
CREATE INDEX idx_bookings_barber_date ON bookings(barber_id, scheduled_at);
CREATE INDEX idx_bookings_client_date ON bookings(client_id, scheduled_at);

-- Payments indexes
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_barbershop_id ON payments(barbershop_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_stripe_intent ON payments(stripe_payment_intent_id);

-- Staff indexes
CREATE INDEX idx_staff_barbershop_id ON barbershop_staff(barbershop_id);
CREATE INDEX idx_staff_user_id ON barbershop_staff(user_id);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbershop_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public profiles viewable by barbershop members" ON profiles
  FOR SELECT USING (
    role IN ('BARBER', 'SHOP_OWNER') AND
    EXISTS (
      SELECT 1 FROM barbershop_staff bs 
      WHERE bs.user_id = auth.uid() 
      AND bs.barbershop_id IN (
        SELECT shop_id FROM profiles WHERE id = profiles.id
        UNION
        SELECT barbershop_id FROM profiles WHERE id = profiles.id
      )
    )
  );

-- Barbershops policies
CREATE POLICY "Owners can manage their barbershops" ON barbershops
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Staff can view their barbershop" ON barbershops
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM barbershop_staff bs 
      WHERE bs.barbershop_id = id 
      AND bs.user_id = auth.uid()
      AND bs.is_active = true
    )
  );

CREATE POLICY "Public can view active barbershops for booking" ON barbershops
  FOR SELECT USING (is_active = true);

-- Services policies
CREATE POLICY "Barbershop owners and staff can manage services" ON services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM barbershops b 
      WHERE b.id = barbershop_id 
      AND (
        b.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM barbershop_staff bs 
          WHERE bs.barbershop_id = b.id 
          AND bs.user_id = auth.uid()
          AND bs.is_active = true
        )
      )
    )
  );

CREATE POLICY "Public can view active services" ON services
  FOR SELECT USING (is_active = true);

-- Bookings policies
CREATE POLICY "Clients can view their own bookings" ON bookings
  FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Barbershop staff can view all shop bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM barbershops b 
      WHERE b.id = barbershop_id 
      AND (
        b.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM barbershop_staff bs 
          WHERE bs.barbershop_id = b.id 
          AND bs.user_id = auth.uid()
          AND bs.is_active = true
        )
      )
    )
  );

CREATE POLICY "Barbershop staff can manage bookings" ON bookings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM barbershops b 
      WHERE b.id = barbershop_id 
      AND (
        b.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM barbershop_staff bs 
          WHERE bs.barbershop_id = b.id 
          AND bs.user_id = auth.uid()
          AND bs.is_active = true
        )
      )
    )
  );

-- Staff policies
CREATE POLICY "Barbershop owners can manage staff" ON barbershop_staff
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM barbershops b 
      WHERE b.id = barbershop_id 
      AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view their own record" ON barbershop_staff
  FOR SELECT USING (user_id = auth.uid());

-- Payments policies
CREATE POLICY "Barbershop staff can view payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM barbershops b 
      WHERE b.id = barbershop_id 
      AND (
        b.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM barbershop_staff bs 
          WHERE bs.barbershop_id = b.id 
          AND bs.user_id = auth.uid()
          AND bs.is_active = true
        )
      )
    )
  );

-- ==========================================
-- FUNCTIONS AND TRIGGERS
-- ==========================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update timestamp to relevant tables
CREATE TRIGGER update_profiles_timestamp 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_barbershops_timestamp 
  BEFORE UPDATE ON barbershops 
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_services_timestamp 
  BEFORE UPDATE ON services 
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_bookings_timestamp 
  BEFORE UPDATE ON bookings 
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_payments_timestamp 
  BEFORE UPDATE ON payments 
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Function to get user's barbershop ID (handles both ownership models)
CREATE OR REPLACE FUNCTION get_user_barbershop_id(user_id UUID)
RETURNS UUID AS $$
DECLARE
  shop_id UUID;
BEGIN
  -- First, check if user directly owns a barbershop
  SELECT shop_id INTO shop_id 
  FROM profiles 
  WHERE id = user_id AND shop_id IS NOT NULL;
  
  IF shop_id IS NOT NULL THEN
    RETURN shop_id;
  END IF;
  
  -- Check alternative field name
  SELECT barbershop_id INTO shop_id 
  FROM profiles 
  WHERE id = user_id AND barbershop_id IS NOT NULL;
  
  IF shop_id IS NOT NULL THEN
    RETURN shop_id;
  END IF;
  
  -- Check if user is staff at a barbershop
  SELECT barbershop_id INTO shop_id 
  FROM barbershop_staff 
  WHERE user_id = user_id AND is_active = true 
  LIMIT 1;
  
  RETURN shop_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- INITIAL DATA
-- ==========================================

-- Insert system admin user (optional)
-- INSERT INTO profiles (id, email, name, role) VALUES 
-- ('00000000-0000-0000-0000-000000000000', 'admin@6fb.com', 'System Admin', 'SUPER_ADMIN');

-- ==========================================
-- GRANTS AND PERMISSIONS
-- ==========================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant read access to anonymous users (for public booking)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON barbershops TO anon;
GRANT SELECT ON services TO anon;

-- ==========================================
-- COMMENTS
-- ==========================================

COMMENT ON TABLE profiles IS 'User profiles integrated with Supabase Auth';
COMMENT ON TABLE barbershops IS 'Barbershop business entities';
COMMENT ON TABLE services IS 'Services offered by barbershops';
COMMENT ON TABLE barbershop_staff IS 'Staff relationships for multi-barber shops';
COMMENT ON TABLE bookings IS 'Customer appointments and bookings';
COMMENT ON TABLE payments IS 'Payment transactions and tracking';

COMMENT ON COLUMN bookings.end_time IS 'Computed end time based on scheduled_at + duration';
COMMENT ON COLUMN bookings.total_amount IS 'Computed total of service_price + tip_amount';
COMMENT ON FUNCTION get_user_barbershop_id(UUID) IS 'Returns barbershop ID for user (handles both ownership models)';

-- ==========================================
-- SECURITY NOTES
-- ==========================================

/*
IMPORTANT SECURITY CONSIDERATIONS:

1. RLS Policies: All tables have Row Level Security enabled with appropriate policies
2. Public Access: Only barbershops and services allow anonymous SELECT for booking
3. Authentication: All data access requires valid Supabase auth except public booking
4. Service Role: Use SUPABASE_SERVICE_ROLE_KEY for admin operations only
5. Indexes: Optimized for common query patterns to prevent slow queries
6. Constraints: Data integrity enforced at database level
7. Exclusion Constraints: Prevent booking conflicts automatically

DEPLOYMENT CHECKLIST:

□ Run this script on production Supabase instance
□ Verify all tables created successfully
□ Test RLS policies with different user roles
□ Confirm indexes are created (check EXPLAIN ANALYZE)
□ Set up monitoring for query performance
□ Configure backups and point-in-time recovery
□ Test public booking endpoints work with anon access
□ Verify authenticated user access works correctly
*/
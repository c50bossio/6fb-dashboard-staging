-- Supabase Database Setup for Booking Hub
-- Run this SQL in your Supabase SQL Editor
-- This creates all necessary tables for the unified Booking Hub functionality

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Roles Enum
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'CLIENT',
    'BARBER', 
    'SHOP_OWNER',
    'ENTERPRISE_OWNER',
    'SUPER_ADMIN'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================
-- CORE TABLES
-- ==========================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'CLIENT',
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Barbershops table
CREATE TABLE IF NOT EXISTS barbershops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL, -- minutes
  price DECIMAL(10,2) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings table (replaces appointments)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  
  -- Booking details
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration INTEGER NOT NULL, -- minutes
  price DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'PENDING',
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- BOOKING LINKS SYSTEM
-- ==========================================

-- Booking Links table - stores custom booking links created by barbers
CREATE TABLE IF NOT EXISTS booking_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  
  -- Service configuration
  services JSONB NOT NULL DEFAULT '[]', -- Array of selected services with IDs and names
  time_slots TEXT[] NOT NULL DEFAULT '{}', -- Array of time slot preferences
  duration INTEGER NOT NULL DEFAULT 45, -- Duration in minutes
  custom_price DECIMAL(10,2), -- Override price if set
  discount INTEGER DEFAULT 0 CHECK (discount >= 0 AND discount <= 100), -- Discount percentage
  
  -- Link configuration
  expires_at TIMESTAMP WITH TIME ZONE,
  description TEXT,
  require_phone BOOLEAN DEFAULT true,
  require_email BOOLEAN DEFAULT true,
  allow_reschedule BOOLEAN DEFAULT true,
  send_reminders BOOLEAN DEFAULT true,
  
  -- Status and tracking
  active BOOLEAN DEFAULT true,
  qr_generated BOOLEAN DEFAULT false,
  qr_code_url TEXT, -- URL to stored QR code image
  
  -- Analytics counters (denormalized for performance)
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0.00,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Link Analytics table - tracks individual interactions with booking links
CREATE TABLE IF NOT EXISTS link_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES booking_links(id) ON DELETE CASCADE,
  
  -- Event tracking
  event_type VARCHAR(50) NOT NULL, -- 'click', 'view', 'conversion', 'share'
  session_id VARCHAR(255), -- User session identifier
  user_agent TEXT,
  ip_address INET,
  referrer TEXT,
  
  -- Conversion tracking
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  conversion_value DECIMAL(10,2),
  
  -- Geographic data
  country VARCHAR(2),
  region VARCHAR(100),
  city VARCHAR(100),
  
  -- Temporal data
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  hour_of_day INTEGER GENERATED ALWAYS AS (EXTRACT(hour FROM timestamp)) STORED,
  day_of_week INTEGER GENERATED ALWAYS AS (EXTRACT(dow FROM timestamp)) STORED,
  
  -- Device information
  device_type VARCHAR(20), -- 'mobile', 'tablet', 'desktop'
  browser VARCHAR(50),
  os VARCHAR(50)
);

-- QR Codes table - stores generated QR codes with customization options
CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES booking_links(id) ON DELETE CASCADE,
  
  -- QR Code configuration
  size INTEGER DEFAULT 200,
  margin INTEGER DEFAULT 4,
  foreground_color VARCHAR(7) DEFAULT '#000000',
  background_color VARCHAR(7) DEFAULT '#FFFFFF',
  error_correction_level VARCHAR(1) DEFAULT 'M', -- L, M, Q, H
  include_text BOOLEAN DEFAULT true,
  custom_text TEXT,
  
  -- Storage
  image_url TEXT NOT NULL, -- URL to stored QR code image
  download_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_barber_id ON bookings(barber_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(appointment_date);

CREATE INDEX IF NOT EXISTS idx_booking_links_barber_id ON booking_links(barber_id);
CREATE INDEX IF NOT EXISTS idx_booking_links_active ON booking_links(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_booking_links_created_at ON booking_links(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_link_analytics_link_id ON link_analytics(link_id);
CREATE INDEX IF NOT EXISTS idx_link_analytics_event_type ON link_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_link_analytics_timestamp ON link_analytics(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_qr_codes_link_id ON qr_codes(link_id);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Profiles RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and update own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

-- Booking Links RLS
ALTER TABLE booking_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own booking links" ON booking_links
  FOR ALL USING (barber_id = auth.uid());

CREATE POLICY "Public read access to active booking links" ON booking_links
  FOR SELECT USING (active = true);

-- Link Analytics RLS  
ALTER TABLE link_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view analytics for their links" ON link_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM booking_links bl 
      WHERE bl.id = link_analytics.link_id 
      AND bl.barber_id = auth.uid()
    )
  );

CREATE POLICY "System can insert analytics" ON link_analytics
  FOR INSERT WITH CHECK (true); -- Allow system to track analytics

-- QR Codes RLS
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage QR codes for their links" ON qr_codes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM booking_links bl 
      WHERE bl.id = qr_codes.link_id 
      AND bl.barber_id = auth.uid()
    )
  );

-- Bookings RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bookings" ON bookings
  FOR SELECT USING (customer_id = auth.uid() OR barber_id = auth.uid());

CREATE POLICY "Users can create bookings for themselves" ON bookings
  FOR INSERT WITH CHECK (customer_id = auth.uid());

-- ==========================================
-- FUNCTIONS AND TRIGGERS
-- ==========================================

-- Function to update link analytics counters
CREATE OR REPLACE FUNCTION update_link_analytics_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type = 'click' THEN
    UPDATE booking_links 
    SET clicks = clicks + 1 
    WHERE id = NEW.link_id;
  ELSIF NEW.event_type = 'conversion' AND NEW.conversion_value IS NOT NULL THEN
    UPDATE booking_links 
    SET conversions = conversions + 1,
        revenue = revenue + NEW.conversion_value
    WHERE id = NEW.link_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update counters
CREATE TRIGGER trigger_update_link_analytics_counters
  AFTER INSERT ON link_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_link_analytics_counters();

-- Function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER set_timestamp_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_timestamp_booking_links
  BEFORE UPDATE ON booking_links
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ==========================================
-- INITIAL DATA FOR DEVELOPMENT
-- ==========================================

-- Create demo profile if not exists
INSERT INTO profiles (id, email, full_name, role)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'demo@barbershop.com',
  'Demo User',
  'BARBER'
) ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- PERMISSIONS
-- ==========================================

-- Grant appropriate permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Allow anon users to view active booking links and submit analytics
GRANT SELECT ON booking_links TO anon;
GRANT INSERT ON link_analytics TO anon;

-- Final message
DO $$
BEGIN
  RAISE NOTICE 'Booking Hub database setup completed successfully!';
  RAISE NOTICE 'Tables created: profiles, barbershops, services, bookings, booking_links, link_analytics, qr_codes';
  RAISE NOTICE 'RLS policies applied for security';
  RAISE NOTICE 'Demo user created with ID: 11111111-1111-1111-1111-111111111111';
END $$;
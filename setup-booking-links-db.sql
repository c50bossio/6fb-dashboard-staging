-- Create only the missing Booking Hub tables
-- This script creates booking_links, link_analytics, and qr_codes tables

-- ==========================================
-- BOOKING LINKS SYSTEM TABLES
-- ==========================================

-- Booking Links table - stores custom booking links created by barbers
CREATE TABLE IF NOT EXISTS booking_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  
  -- Service configuration
  services JSONB NOT NULL DEFAULT '[]',
  time_slots TEXT[] NOT NULL DEFAULT '{}',
  duration INTEGER NOT NULL DEFAULT 45,
  custom_price DECIMAL(10,2),
  discount INTEGER DEFAULT 0 CHECK (discount >= 0 AND discount <= 100),
  
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
  qr_code_url TEXT,
  
  -- Analytics counters
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0.00,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Link Analytics table
CREATE TABLE IF NOT EXISTS link_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES booking_links(id) ON DELETE CASCADE,
  
  event_type VARCHAR(50) NOT NULL,
  session_id VARCHAR(255),
  user_agent TEXT,
  ip_address INET,
  referrer TEXT,
  
  booking_id UUID,
  conversion_value DECIMAL(10,2),
  
  country VARCHAR(2),
  region VARCHAR(100),
  city VARCHAR(100),
  
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  hour_of_day INTEGER GENERATED ALWAYS AS (EXTRACT(hour FROM timestamp)) STORED,
  day_of_week INTEGER GENERATED ALWAYS AS (EXTRACT(dow FROM timestamp)) STORED,
  
  device_type VARCHAR(20),
  browser VARCHAR(50),
  os VARCHAR(50)
);

-- QR Codes table
CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES booking_links(id) ON DELETE CASCADE,
  
  size INTEGER DEFAULT 200,
  margin INTEGER DEFAULT 4,
  foreground_color VARCHAR(7) DEFAULT '#000000',
  background_color VARCHAR(7) DEFAULT '#FFFFFF',
  error_correction_level VARCHAR(1) DEFAULT 'M',
  include_text BOOLEAN DEFAULT true,
  custom_text TEXT,
  
  image_url TEXT NOT NULL,
  download_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_links_barber_id ON booking_links(barber_id);
CREATE INDEX IF NOT EXISTS idx_booking_links_active ON booking_links(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_link_analytics_link_id ON link_analytics(link_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_link_id ON qr_codes(link_id);

-- Enable Row Level Security
ALTER TABLE booking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own booking links" ON booking_links
  FOR ALL USING (true);

CREATE POLICY "Public read access to active booking links" ON booking_links
  FOR SELECT USING (active = true);

CREATE POLICY "Anyone can insert analytics" ON link_analytics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view analytics for their links" ON link_analytics
  FOR SELECT USING (true);

CREATE POLICY "Users can manage QR codes" ON qr_codes
  FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON booking_links TO authenticated, anon;
GRANT ALL ON link_analytics TO authenticated, anon;
GRANT ALL ON qr_codes TO authenticated, anon;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Booking Hub tables created successfully!';
END $$;
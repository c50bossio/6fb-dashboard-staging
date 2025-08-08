-- Booking Links Management System Database Schema
-- Supports barber booking link management, QR codes, and analytics tracking

-- Booking Links table - stores custom booking links created by barbers
CREATE TABLE IF NOT EXISTS booking_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Link Shares table - tracks sharing activities
CREATE TABLE IF NOT EXISTS link_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES booking_links(id) ON DELETE CASCADE,
  shared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Share details
  share_method VARCHAR(50) NOT NULL, -- 'email', 'sms', 'social', 'copy', 'qr', 'print'
  recipient_info JSONB, -- Email, phone, platform details
  message TEXT,
  
  -- Tracking
  share_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  clicks_from_share INTEGER DEFAULT 0,
  conversions_from_share INTEGER DEFAULT 0
);

-- Booking Source Attribution table - tracks booking origins
CREATE TABLE IF NOT EXISTS booking_attributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  link_id UUID REFERENCES booking_links(id) ON DELETE SET NULL,
  
  -- Attribution data
  source VARCHAR(100) NOT NULL, -- 'booking_link', 'direct', 'referral', 'social'
  medium VARCHAR(100), -- 'qr_code', 'shared_link', 'organic'
  campaign VARCHAR(200), -- Link name or campaign identifier
  
  -- UTM tracking
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_term VARCHAR(255),
  utm_content VARCHAR(255),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_booking_links_barber_id ON booking_links(barber_id);
CREATE INDEX IF NOT EXISTS idx_booking_links_active ON booking_links(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_booking_links_created_at ON booking_links(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_link_analytics_link_id ON link_analytics(link_id);
CREATE INDEX IF NOT EXISTS idx_link_analytics_event_type ON link_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_link_analytics_timestamp ON link_analytics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_link_analytics_session_id ON link_analytics(session_id);

CREATE INDEX IF NOT EXISTS idx_qr_codes_link_id ON qr_codes(link_id);
CREATE INDEX IF NOT EXISTS idx_link_shares_link_id ON link_shares(link_id);
CREATE INDEX IF NOT EXISTS idx_booking_attributions_booking_id ON booking_attributions(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_attributions_link_id ON booking_attributions(link_id);

-- Row Level Security (RLS) Policies

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

-- Link Shares RLS
ALTER TABLE link_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage shares for their links" ON link_shares
  FOR ALL USING (
    shared_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM booking_links bl 
      WHERE bl.id = link_shares.link_id 
      AND bl.barber_id = auth.uid()
    )
  );

-- Booking Attributions RLS
ALTER TABLE booking_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attributions for their bookings" ON booking_attributions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN booking_links bl ON bl.id = booking_attributions.link_id
      WHERE b.id = booking_attributions.booking_id 
      AND (bl.barber_id = auth.uid() OR b.barber_id = auth.uid())
    )
  );

-- Functions for analytics aggregation

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

-- Function to clean up old analytics data (optional, for data retention)
CREATE OR REPLACE FUNCTION cleanup_old_analytics(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM link_analytics 
  WHERE timestamp < NOW() - INTERVAL '1 day' * retention_days;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- View for link performance summary
CREATE VIEW link_performance_summary AS
SELECT 
  bl.id,
  bl.name,
  bl.barber_id,
  bl.active,
  bl.created_at,
  bl.clicks,
  bl.conversions,
  bl.revenue,
  CASE 
    WHEN bl.clicks > 0 THEN ROUND((bl.conversions::DECIMAL / bl.clicks) * 100, 2)
    ELSE 0 
  END as conversion_rate,
  CASE 
    WHEN bl.conversions > 0 THEN ROUND(bl.revenue / bl.conversions, 2)
    ELSE 0 
  END as avg_order_value,
  (
    SELECT COUNT(*) FROM link_analytics la 
    WHERE la.link_id = bl.id 
    AND la.event_type = 'click' 
    AND la.timestamp >= NOW() - INTERVAL '7 days'
  ) as clicks_last_7_days,
  (
    SELECT COUNT(*) FROM link_analytics la 
    WHERE la.link_id = bl.id 
    AND la.event_type = 'conversion'
    AND la.timestamp >= NOW() - INTERVAL '7 days'
  ) as conversions_last_7_days
FROM booking_links bl;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON booking_links TO authenticated;
GRANT SELECT, INSERT ON link_analytics TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON qr_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON link_shares TO authenticated;
GRANT SELECT, INSERT ON booking_attributions TO authenticated, anon;
GRANT SELECT ON link_performance_summary TO authenticated;
-- Essential Booking Links Tables for 6FB AI Agent System

-- Main booking links table
CREATE TABLE IF NOT EXISTS booking_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  services JSONB NOT NULL DEFAULT '[]',
  time_slots TEXT[] NOT NULL DEFAULT '{}',
  duration INTEGER NOT NULL DEFAULT 45,
  custom_price DECIMAL(10,2),
  discount INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  description TEXT,
  require_phone BOOLEAN DEFAULT true,
  require_email BOOLEAN DEFAULT true,
  allow_reschedule BOOLEAN DEFAULT true,
  send_reminders BOOLEAN DEFAULT true,
  active BOOLEAN DEFAULT true,
  qr_generated BOOLEAN DEFAULT false,
  qr_code_url TEXT,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics tracking table
CREATE TABLE IF NOT EXISTS link_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES booking_links(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  session_id VARCHAR(255),
  user_agent TEXT,
  ip_address INET,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE booking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_analytics ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON booking_links TO authenticated, anon;
GRANT ALL ON link_analytics TO authenticated, anon;

-- Basic RLS policies (allow all for development - tighten for production)
DROP POLICY IF EXISTS "booking_links_all" ON booking_links;
CREATE POLICY "booking_links_all" ON booking_links FOR ALL USING (true);

DROP POLICY IF EXISTS "link_analytics_all" ON link_analytics;
CREATE POLICY "link_analytics_all" ON link_analytics FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_links_barber_id ON booking_links(barber_id);
CREATE INDEX IF NOT EXISTS idx_booking_links_active ON booking_links(active);
CREATE INDEX IF NOT EXISTS idx_link_analytics_link_id ON link_analytics(link_id);
CREATE INDEX IF NOT EXISTS idx_link_analytics_timestamp ON link_analytics(timestamp DESC);

-- Insert sample data for testing (optional)
INSERT INTO booking_links (
  barber_id,
  name,
  url,
  services,
  time_slots,
  duration,
  description,
  active
) VALUES (
  gen_random_uuid(),
  'Quick Cuts Special',
  'quick-cuts-promo',
  '["Haircut", "Beard Trim"]',
  ARRAY['9:00', '10:00', '11:00', '2:00', '3:00', '4:00'],
  45,
  'Special promotional link for quick haircuts and beard trims',
  true
) ON CONFLICT DO NOTHING;
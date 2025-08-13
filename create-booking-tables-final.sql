-- Create booking_links table
CREATE TABLE IF NOT EXISTS booking_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  services JSONB DEFAULT '[]'::jsonb,
  time_slots TEXT[] DEFAULT ARRAY[]::TEXT[],
  duration INTEGER DEFAULT 45,
  custom_price NUMERIC(10,2),
  discount INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
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
  revenue NUMERIC(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create link_analytics table
CREATE TABLE IF NOT EXISTS link_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID REFERENCES booking_links(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  session_id TEXT,
  user_agent TEXT,
  ip_address INET,
  referrer TEXT,
  booking_id UUID,
  conversion_value NUMERIC(10,2),
  country VARCHAR(2),
  region TEXT,
  city TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  device_type TEXT,
  browser TEXT,
  os TEXT
);

-- Create qr_codes table
CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID REFERENCES booking_links(id) ON DELETE CASCADE,
  size INTEGER DEFAULT 200,
  margin INTEGER DEFAULT 4,
  foreground_color VARCHAR(7) DEFAULT '#000000',
  background_color VARCHAR(7) DEFAULT '#FFFFFF',
  error_correction_level VARCHAR(1) DEFAULT 'M',
  include_text BOOLEAN DEFAULT true,
  custom_text TEXT,
  image_url TEXT NOT NULL,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_booking_links_barber ON booking_links(barber_id);
CREATE INDEX IF NOT EXISTS idx_link_analytics_link ON link_analytics(link_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_link ON qr_codes(link_id);

-- Grant permissions
GRANT ALL ON booking_links TO authenticated, anon;
GRANT ALL ON link_analytics TO authenticated, anon;
GRANT ALL ON qr_codes TO authenticated, anon;

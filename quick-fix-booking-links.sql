-- Quick Fix: Create Essential Booking Links Tables
-- Copy and paste this entire script into Supabase SQL Editor and run it

-- 1. Create booking_links table
CREATE TABLE IF NOT EXISTS booking_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  
  -- Service configuration
  services JSONB NOT NULL DEFAULT '[]',
  time_slots TEXT[] NOT NULL DEFAULT '{}',
  duration INTEGER NOT NULL DEFAULT 45,
  custom_price DECIMAL(10,2),
  discount INTEGER DEFAULT 0,
  
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

-- 2. Create link_analytics table
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
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_booking_links_barber_id ON booking_links(barber_id);
CREATE INDEX IF NOT EXISTS idx_booking_links_active ON booking_links(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_link_analytics_link_id ON link_analytics(link_id);

-- 4. Enable Row Level Security
ALTER TABLE booking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_analytics ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
CREATE POLICY "Users can manage their own booking links" ON booking_links
  FOR ALL USING (barber_id = auth.uid());

CREATE POLICY "Public read access to active booking links" ON booking_links
  FOR SELECT USING (active = true);

CREATE POLICY "Users can view analytics for their links" ON link_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM booking_links bl 
      WHERE bl.id = link_analytics.link_id 
      AND bl.barber_id = auth.uid()
    )
  );

CREATE POLICY "System can insert analytics" ON link_analytics
  FOR INSERT WITH CHECK (true);

-- 6. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON booking_links TO authenticated;
GRANT SELECT, INSERT ON link_analytics TO authenticated, anon;
-- Embed Tracking Schema Extension
-- Adds embed functionality to the existing booking system

-- ==========================================
-- EXTEND BOOKING LINKS TABLE
-- ==========================================

-- Add embed-related columns to existing booking_links table
ALTER TABLE booking_links 
ADD COLUMN IF NOT EXISTS embed_settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS embed_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_embedded_at TIMESTAMP WITH TIME ZONE;

-- Add index for better performance on embed queries
CREATE INDEX IF NOT EXISTS idx_booking_links_embed_count ON booking_links (embed_count);
CREATE INDEX IF NOT EXISTS idx_booking_links_last_embedded ON booking_links (last_embedded_at);

-- ==========================================
-- EMBED ANALYTICS TABLE
-- ==========================================

-- Create table for detailed embed analytics tracking
CREATE TABLE IF NOT EXISTS embed_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  link_id UUID REFERENCES booking_links(id) ON DELETE CASCADE,
  
  -- Event Information
  event_type VARCHAR(50) NOT NULL, -- 'view', 'widget-init', 'booking-complete', etc.
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Source Information
  referrer TEXT,
  embed_domain VARCHAR(255),
  user_agent TEXT,
  ip_address INET,
  
  -- Widget Configuration (snapshot of settings when event occurred)
  widget_config JSONB,
  
  -- Session Information
  session_id VARCHAR(255),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Booking Information (for conversion tracking)
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  conversion_value DECIMAL(10,2),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_embed_analytics_link_id ON embed_analytics (link_id);
CREATE INDEX IF NOT EXISTS idx_embed_analytics_event_type ON embed_analytics (event_type);
CREATE INDEX IF NOT EXISTS idx_embed_analytics_timestamp ON embed_analytics (timestamp);
CREATE INDEX IF NOT EXISTS idx_embed_analytics_referrer ON embed_analytics (referrer);
CREATE INDEX IF NOT EXISTS idx_embed_analytics_domain ON embed_analytics (embed_domain);
CREATE INDEX IF NOT EXISTS idx_embed_analytics_session ON embed_analytics (session_id);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_embed_analytics_link_event_time ON embed_analytics (link_id, event_type, timestamp);

-- ==========================================
-- EMBED DOMAINS TABLE (Optional)
-- ==========================================

-- Track which domains are embedding each widget
CREATE TABLE IF NOT EXISTS embed_domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  link_id UUID REFERENCES booking_links(id) ON DELETE CASCADE,
  
  -- Domain Information
  domain VARCHAR(255) NOT NULL,
  subdomain VARCHAR(255),
  is_allowed BOOLEAN DEFAULT true,
  is_blocked BOOLEAN DEFAULT false,
  
  -- Statistics
  total_views INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Configuration
  custom_settings JSONB DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique domain per link
  UNIQUE(link_id, domain)
);

-- Add indexes for domain queries
CREATE INDEX IF NOT EXISTS idx_embed_domains_link_id ON embed_domains (link_id);
CREATE INDEX IF NOT EXISTS idx_embed_domains_domain ON embed_domains (domain);
CREATE INDEX IF NOT EXISTS idx_embed_domains_activity ON embed_domains (last_activity);
CREATE INDEX IF NOT EXISTS idx_embed_domains_allowed ON embed_domains (is_allowed);

-- ==========================================
-- UPDATE EXISTING BOOKINGS TABLE
-- ==========================================

-- Add embed tracking to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS embed_referrer TEXT,
ADD COLUMN IF NOT EXISTS embed_session_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS widget_config JSONB;

-- Add index for embed referrer queries
CREATE INDEX IF NOT EXISTS idx_bookings_embed_referrer ON bookings (embed_referrer);

-- ==========================================
-- USEFUL VIEWS FOR ANALYTICS
-- ==========================================

-- View for embed performance summary
CREATE OR REPLACE VIEW embed_performance_summary AS
SELECT 
  bl.id as link_id,
  bl.name as link_name,
  bl.url as link_url,
  bl.embed_count,
  bl.last_embedded_at,
  
  -- Analytics from embed_analytics table
  COUNT(ea.id) as total_events,
  COUNT(CASE WHEN ea.event_type = 'view' THEN 1 END) as total_views,
  COUNT(CASE WHEN ea.event_type = 'widget-init' THEN 1 END) as widget_loads,
  COUNT(CASE WHEN ea.event_type = 'booking-complete' THEN 1 END) as conversions,
  
  -- Conversion rate
  CASE 
    WHEN COUNT(CASE WHEN ea.event_type = 'view' THEN 1 END) > 0 
    THEN ROUND(
      (COUNT(CASE WHEN ea.event_type = 'booking-complete' THEN 1 END)::DECIMAL / 
       COUNT(CASE WHEN ea.event_type = 'view' THEN 1 END)) * 100, 2
    )
    ELSE 0 
  END as conversion_rate,
  
  -- Unique domains
  COUNT(DISTINCT ea.embed_domain) as unique_domains,
  
  -- Date ranges
  MIN(ea.timestamp) as first_embed,
  MAX(ea.timestamp) as last_activity
  
FROM booking_links bl
LEFT JOIN embed_analytics ea ON bl.id = ea.link_id
GROUP BY bl.id, bl.name, bl.url, bl.embed_count, bl.last_embedded_at;

-- View for top performing domains
CREATE OR REPLACE VIEW embed_top_domains AS
SELECT 
  ea.embed_domain,
  COUNT(*) as total_events,
  COUNT(CASE WHEN ea.event_type = 'view' THEN 1 END) as views,
  COUNT(CASE WHEN ea.event_type = 'booking-complete' THEN 1 END) as bookings,
  COUNT(DISTINCT ea.link_id) as unique_links,
  AVG(CASE WHEN ea.event_type = 'booking-complete' AND ea.conversion_value IS NOT NULL 
          THEN ea.conversion_value END) as avg_booking_value,
  MAX(ea.timestamp) as last_activity
FROM embed_analytics ea
WHERE ea.embed_domain IS NOT NULL
GROUP BY ea.embed_domain
ORDER BY total_events DESC;

-- ==========================================
-- FUNCTIONS FOR EMBED TRACKING
-- ==========================================

-- Function to increment embed view count
CREATE OR REPLACE FUNCTION increment_embed_view(link_uuid UUID, domain_name TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  -- Update booking_links table
  UPDATE booking_links 
  SET embed_count = embed_count + 1,
      last_embedded_at = NOW()
  WHERE id = link_uuid;
  
  -- Update or insert domain tracking
  IF domain_name IS NOT NULL THEN
    INSERT INTO embed_domains (link_id, domain, total_views, last_activity)
    VALUES (link_uuid, domain_name, 1, NOW())
    ON CONFLICT (link_id, domain)
    DO UPDATE SET 
      total_views = embed_domains.total_views + 1,
      last_activity = NOW(),
      updated_at = NOW();
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to track embed conversion
CREATE OR REPLACE FUNCTION track_embed_conversion(
  link_uuid UUID, 
  booking_uuid UUID, 
  domain_name TEXT DEFAULT NULL,
  conversion_amount DECIMAL DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Update domain conversion count
  IF domain_name IS NOT NULL THEN
    UPDATE embed_domains 
    SET total_bookings = total_bookings + 1,
        last_activity = NOW(),
        updated_at = NOW()
    WHERE link_id = link_uuid AND domain = domain_name;
  END IF;
  
  -- Insert analytics record
  INSERT INTO embed_analytics (
    link_id, 
    event_type, 
    embed_domain, 
    booking_id, 
    conversion_value,
    timestamp
  ) VALUES (
    link_uuid, 
    'conversion', 
    domain_name, 
    booking_uuid, 
    conversion_amount,
    NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- SAMPLE DATA FOR TESTING (Optional)
-- ==========================================

-- Uncomment the following to add sample embed settings to existing booking links

/*
-- Update existing booking links with sample embed settings
UPDATE booking_links 
SET embed_settings = '{
  "theme": "light",
  "primaryColor": "#3B82F6",
  "hideHeader": false,
  "hideFooter": false,
  "autoResize": true,
  "allowedDomains": [],
  "trackingEnabled": true
}'::jsonb
WHERE embed_settings = '{}'::jsonb OR embed_settings IS NULL;

-- Add sample analytics data
INSERT INTO embed_analytics (link_id, event_type, embed_domain, referrer, metadata)
SELECT 
  id as link_id,
  'view' as event_type,
  'example.com' as embed_domain,
  'https://example.com/services' as referrer,
  '{"widget_version": "1.0.0"}'::jsonb as metadata
FROM booking_links 
LIMIT 3;
*/

-- ==========================================
-- SECURITY POLICIES (if using RLS)
-- ==========================================

-- Enable RLS on new tables
ALTER TABLE embed_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE embed_domains ENABLE ROW LEVEL SECURITY;

-- Policy for embed_analytics - users can only see analytics for their own links
CREATE POLICY embed_analytics_policy ON embed_analytics
  FOR ALL TO authenticated
  USING (
    link_id IN (
      SELECT id FROM booking_links 
      WHERE barber_id = auth.uid()
    )
  );

-- Policy for embed_domains - users can only see domains for their own links
CREATE POLICY embed_domains_policy ON embed_domains
  FOR ALL TO authenticated
  USING (
    link_id IN (
      SELECT id FROM booking_links 
      WHERE barber_id = auth.uid()
    )
  );

-- ==========================================
-- COMMENTS FOR DOCUMENTATION
-- ==========================================

COMMENT ON TABLE embed_analytics IS 'Tracks detailed analytics for embedded booking widgets including views, interactions, and conversions';
COMMENT ON TABLE embed_domains IS 'Tracks which domains are embedding booking widgets and their performance metrics';
COMMENT ON COLUMN booking_links.embed_settings IS 'JSON configuration for embed widget appearance and behavior';
COMMENT ON COLUMN booking_links.embed_count IS 'Total number of times this booking link has been embedded or viewed via embed';
COMMENT ON COLUMN booking_links.last_embedded_at IS 'Timestamp of the last embed view or interaction';

COMMENT ON FUNCTION increment_embed_view(UUID, TEXT) IS 'Increments view count for a booking link and updates domain tracking';
COMMENT ON FUNCTION track_embed_conversion(UUID, UUID, TEXT, DECIMAL) IS 'Records a booking conversion from an embedded widget';

COMMENT ON VIEW embed_performance_summary IS 'Provides aggregated performance metrics for embedded booking links';
COMMENT ON VIEW embed_top_domains IS 'Shows top performing domains by embed activity and conversions';
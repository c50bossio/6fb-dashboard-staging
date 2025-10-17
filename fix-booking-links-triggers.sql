-- Fix booking_links analytics triggers and views
-- This ensures counters update automatically when analytics events are tracked

-- First, drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_link_analytics_counters ON link_analytics;
DROP FUNCTION IF EXISTS update_link_analytics_counters();

-- Recreate the function with better error handling
CREATE OR REPLACE FUNCTION update_link_analytics_counters()
RETURNS TRIGGER AS $$
BEGIN
  -- Update counters based on event type
  IF NEW.event_type = 'click' THEN
    UPDATE booking_links
    SET
      clicks = COALESCE(clicks, 0) + 1,
      updated_at = NOW()
    WHERE id = NEW.link_id;

  ELSIF NEW.event_type = 'conversion' THEN
    UPDATE booking_links
    SET
      conversions = COALESCE(conversions, 0) + 1,
      revenue = COALESCE(revenue, 0) + COALESCE(NEW.conversion_value, 0),
      updated_at = NOW()
    WHERE id = NEW.link_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER trigger_update_link_analytics_counters
  AFTER INSERT ON link_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_link_analytics_counters();

-- Drop and recreate the performance summary view
DROP VIEW IF EXISTS link_performance_summary;

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

-- Grant permissions
GRANT SELECT ON link_performance_summary TO authenticated, anon;

-- Test the trigger with a comment
COMMENT ON FUNCTION update_link_analytics_counters() IS 'Automatically updates booking_links counters when analytics events are inserted';
COMMENT ON VIEW link_performance_summary IS 'Provides aggregated performance metrics for booking links';

-- Display confirmation
SELECT 'Booking links triggers and views updated successfully!' as status;

-- Migration: Add fields for improved recurring appointments system
-- This migration adds support for parent-child relationships and better occurrence tracking

-- Add parent_id for series tracking (links occurrences to parent series)
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES bookings(id) ON DELETE CASCADE;

-- Add occurrence_date for tracking specific occurrence dates
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS occurrence_date DATE;

-- Add modification_type to track how appointments were modified
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS modification_type VARCHAR(20) 
CHECK (modification_type IN ('original', 'exception', 'rescheduled', 'future_split'));

-- Add cancelled_at for soft delete tracking
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_parent_id ON bookings(parent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_occurrence_date ON bookings(occurrence_date);
CREATE INDEX IF NOT EXISTS idx_bookings_modification_type ON bookings(modification_type);
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_at ON bookings(cancelled_at);

-- Create composite index for efficient querying of exceptions
CREATE INDEX IF NOT EXISTS idx_bookings_parent_occurrence 
ON bookings(parent_id, occurrence_date);

-- Update recurring_pattern JSONB structure documentation
COMMENT ON COLUMN bookings.recurring_pattern IS 
'JSONB structure for recurring appointments:
{
  "rrule": "DTSTART:20250815T140000Z\nFREQ=WEEKLY;BYDAY=MO,WE,FR",
  "duration": "PT1H",
  "timezone": "America/New_York",
  "frequency": "WEEKLY",
  "interval": 1,
  "count": 10,
  "until": null,
  "exceptions": ["2025-08-20", "2025-08-27"],
  "deletions": { "2025-08-20": { "deleted_at": "...", "soft_delete": true } },
  "modifications": { "2025-08-27": { "new_time": "15:00", "modified_at": "..." } },
  "created_at": "2025-08-10T12:00:00Z",
  "created_by": "recurring_api",
  "original_start": "2025-08-15T14:00:00",
  "original_end": "2025-08-15T15:00:00"
}';

-- Create view for active appointments (excludes soft-deleted)
CREATE OR REPLACE VIEW active_bookings AS
SELECT * FROM bookings 
WHERE cancelled_at IS NULL 
  AND is_test = false;

-- Create view for recurring series (parent appointments only)
CREATE OR REPLACE VIEW recurring_series AS
SELECT * FROM bookings 
WHERE is_recurring = true 
  AND parent_id IS NULL
  AND is_test = false;

-- Create view for exception appointments
CREATE OR REPLACE VIEW exception_appointments AS
SELECT 
  e.*,
  p.recurring_pattern as parent_pattern,
  p.id as series_id
FROM bookings e
JOIN bookings p ON e.parent_id = p.id
WHERE e.modification_type IN ('exception', 'rescheduled')
  AND e.is_test = false;

-- Grant permissions on new views
GRANT SELECT ON active_bookings TO authenticated;
GRANT SELECT ON recurring_series TO authenticated;
GRANT SELECT ON exception_appointments TO authenticated;

-- Function to clean up old cancelled appointments (optional)
CREATE OR REPLACE FUNCTION cleanup_old_cancellations()
RETURNS void AS $$
BEGIN
  -- Delete soft-deleted appointments older than 90 days
  DELETE FROM bookings 
  WHERE cancelled_at IS NOT NULL 
    AND cancelled_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup weekly (if pg_cron is available)
-- Uncomment if using pg_cron extension:
-- SELECT cron.schedule('cleanup-old-cancellations', '0 2 * * 0', 'SELECT cleanup_old_cancellations();');

-- Add helper function to get all occurrences of a series
CREATE OR REPLACE FUNCTION get_series_occurrences(series_id TEXT)
RETURNS TABLE (
  appointment_id TEXT,
  occurrence_type VARCHAR(20),
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50),
  is_exception BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id as appointment_id,
    COALESCE(modification_type, 'original') as occurrence_type,
    bookings.start_time,
    bookings.end_time,
    bookings.status,
    (parent_id IS NOT NULL) as is_exception
  FROM bookings
  WHERE id = series_id OR parent_id = series_id
  ORDER BY start_time;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to validate recurring appointments
CREATE OR REPLACE FUNCTION validate_recurring_appointment()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a recurring appointment, ensure it has a valid RRule
  IF NEW.is_recurring = true AND NEW.recurring_pattern IS NULL THEN
    RAISE EXCEPTION 'Recurring appointment must have a recurring_pattern';
  END IF;
  
  -- If this has a parent_id, ensure the parent exists and is recurring
  IF NEW.parent_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM bookings 
      WHERE id = NEW.parent_id AND is_recurring = true
    ) THEN
      RAISE EXCEPTION 'Parent appointment must exist and be recurring';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_recurring_appointment_trigger
BEFORE INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION validate_recurring_appointment();

-- Migration completion message
DO $$
BEGIN
  RAISE NOTICE 'Migration 002-add-recurring-improvements completed successfully';
  RAISE NOTICE 'New fields added: parent_id, occurrence_date, modification_type, cancelled_at';
  RAISE NOTICE 'New views created: active_bookings, recurring_series, exception_appointments';
  RAISE NOTICE 'New function created: get_series_occurrences';
  RAISE NOTICE 'Validation trigger added for recurring appointments';
END $$;
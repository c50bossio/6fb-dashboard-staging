-- Migration to add recurring appointment support to existing bookings table
-- Based on calendar-schema-with-test-flag.sql structure

-- Add recurring appointment fields to existing bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS recurring_pattern JSONB DEFAULT null;

-- Add index for recurring fields for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_is_recurring ON bookings(is_recurring);
CREATE INDEX IF NOT EXISTS idx_bookings_recurring_pattern ON bookings USING GIN (recurring_pattern);

-- Add customer_id field if it doesn't exist (some schemas have it, others don't)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_id TEXT DEFAULT null;

-- Add service_id field if it doesn't exist 
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_id TEXT DEFAULT null;

-- Update existing appointments to have proper structure
-- Clean up any existing recurring notes that were stored as workarounds
UPDATE bookings 
SET notes = REGEXP_REPLACE(notes, '\[RECURRING:.*?\]\s*', '', 'g')
WHERE notes ~ '\[RECURRING:.*?\]';

-- Add comment to document the migration
COMMENT ON COLUMN bookings.is_recurring IS 'Indicates if this booking is a recurring appointment series';
COMMENT ON COLUMN bookings.recurring_pattern IS 'JSONB field storing RRule pattern and recurring configuration';

-- Migration validation query (optional - for testing)
-- SELECT 
--   table_name, 
--   column_name, 
--   data_type, 
--   is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'bookings' 
--   AND column_name IN ('is_recurring', 'recurring_pattern', 'customer_id', 'service_id')
-- ORDER BY column_name;
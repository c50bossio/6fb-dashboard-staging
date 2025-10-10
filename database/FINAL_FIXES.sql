-- Final fixes for appointments table constraints
-- Run this to remove legacy constraints that are blocking the APIs

-- Make the old date/time columns nullable since we're using scheduled_at now
ALTER TABLE appointments ALTER COLUMN date DROP NOT NULL;
ALTER TABLE appointments ALTER COLUMN time DROP NOT NULL;

-- Update any remaining NULL scheduled_at values
UPDATE appointments 
SET scheduled_at = NOW() + INTERVAL '2 hours'
WHERE scheduled_at IS NULL;

-- Success message
SELECT 'Final database fixes applied successfully!' as status;
-- Migration: Add queue_priority column to appointments table
-- Purpose: Support queue positioning for check-in and walk-in customers
-- Date: 2025-09-02
-- Author: Claude (Check-in Queue Fix)

-- Add queue_priority column to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS queue_priority INTEGER;

-- Add index for queue ordering performance
CREATE INDEX IF NOT EXISTS idx_appointments_queue_priority 
ON appointments (barbershop_id, date, queue_priority) 
WHERE queue_priority IS NOT NULL;

-- Add index for status-based queue filtering
CREATE INDEX IF NOT EXISTS idx_appointments_queue_status 
ON appointments (barbershop_id, date, status) 
WHERE status IN ('confirmed', 'checked_in', 'WALK_IN_WAITING', 'WALK_IN_BEING_SERVED');

-- Comment for documentation
COMMENT ON COLUMN appointments.queue_priority IS 'Queue position for checked-in customers and walk-ins. Lower numbers = higher priority.';

-- Verify the migration
DO $$
BEGIN
    -- Check if column was added successfully
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'appointments' AND column_name = 'queue_priority') THEN
        RAISE NOTICE 'Migration successful: queue_priority column added to appointments table';
    ELSE
        RAISE EXCEPTION 'Migration failed: queue_priority column not found';
    END IF;
END $$;
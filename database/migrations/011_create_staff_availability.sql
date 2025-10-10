-- Migration: Create staff_availability table
-- Feature: 011-holistic-staff-management
-- Description: Weekly recurring schedule for each barber (used to calculate available booking slots)

-- Create staff_availability table
CREATE TABLE IF NOT EXISTS staff_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Weekly recurring schedule
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT unique_barber_day_time UNIQUE (barber_id, day_of_week, start_time, end_time)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_availability_barber_id
ON staff_availability(barber_id);

CREATE INDEX IF NOT EXISTS idx_staff_availability_day_of_week
ON staff_availability(day_of_week);

CREATE INDEX IF NOT EXISTS idx_staff_availability_barber_day
ON staff_availability(barber_id, day_of_week);

-- Create composite index for availability queries
CREATE INDEX IF NOT EXISTS idx_staff_availability_lookup
ON staff_availability(barber_id, day_of_week, is_available)
WHERE is_available = true;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_staff_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_staff_availability_updated_at ON staff_availability;
CREATE TRIGGER trigger_staff_availability_updated_at
  BEFORE UPDATE ON staff_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_availability_updated_at();

-- Add comments
COMMENT ON TABLE staff_availability IS 'Weekly recurring availability schedule for barbers';
COMMENT ON COLUMN staff_availability.day_of_week IS '0 = Sunday, 1 = Monday, ... 6 = Saturday';
COMMENT ON COLUMN staff_availability.start_time IS 'Start time for this availability block (e.g., 09:00)';
COMMENT ON COLUMN staff_availability.end_time IS 'End time for this availability block (e.g., 17:00)';
COMMENT ON COLUMN staff_availability.is_available IS 'Whether barber is available during this time block';

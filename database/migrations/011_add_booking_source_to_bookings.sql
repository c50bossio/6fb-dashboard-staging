-- Migration: Add booking source tracking to bookings table
-- Feature: 011-holistic-staff-management
-- Description: Tracks whether booking came from staff link, admin, or walk-in

-- Add booking source field
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_source VARCHAR(20) DEFAULT 'admin';

-- Add check constraint for valid values
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS valid_booking_source;
ALTER TABLE bookings ADD CONSTRAINT valid_booking_source
CHECK (booking_source IN ('staff_link', 'admin', 'walk_in'));

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_bookings_booking_source
ON bookings(booking_source, created_at);

-- Create composite index for staff + source analytics
CREATE INDEX IF NOT EXISTS idx_bookings_barber_source
ON bookings(barber_id, booking_source, created_at);

-- Add comment for documentation
COMMENT ON COLUMN bookings.booking_source IS 'Source of booking: staff_link (public page), admin (dashboard), or walk_in';

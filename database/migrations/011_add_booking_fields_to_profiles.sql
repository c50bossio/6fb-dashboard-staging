-- Migration: Add staff booking fields to profiles table
-- Feature: 011-holistic-staff-management
-- Description: Extends profiles table with booking_slug, bio, and specialties for public booking pages

-- Add public booking fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS booking_slug VARCHAR(100) UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialties TEXT[];

-- Add role field if it doesn't exist (for RBAC)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE profiles ADD COLUMN role VARCHAR(20) DEFAULT 'BARBER';
  END IF;
END $$;

-- Add role check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'valid_role' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT valid_role
    CHECK (role IN ('ADMIN', 'MANAGER', 'BARBER', 'RECEPTIONIST'));
  END IF;
END $$;

-- Create unique index for booking URL lookups (performance optimization)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_booking_slug
ON profiles(booking_slug) WHERE booking_slug IS NOT NULL;

-- Create GIN index for specialty searches (enables fast array queries)
CREATE INDEX IF NOT EXISTS idx_profiles_specialties
ON profiles USING GIN(specialties);

-- Create index for role-based filtering
CREATE INDEX IF NOT EXISTS idx_profiles_role
ON profiles(role) WHERE role IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN profiles.booking_slug IS 'Unique URL slug for public booking page (e.g., john-smith)';
COMMENT ON COLUMN profiles.bio IS 'Staff member bio/description shown on public booking page';
COMMENT ON COLUMN profiles.specialties IS 'Array of specialties/skills (e.g., {Fades, Beard Trim, Hot Towel})';
COMMENT ON COLUMN profiles.role IS 'User role: ADMIN, MANAGER, BARBER, or RECEPTIONIST';

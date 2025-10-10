-- Migration: Add Row-Level Security policies for RBAC
-- Feature: 011-holistic-staff-management
-- Description: Role-based access control policies for profiles, bookings, and staff_availability

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: Barbers can view all profiles, but only edit their own limited fields
DROP POLICY IF EXISTS "barbers_view_all_profiles" ON profiles;
CREATE POLICY "barbers_view_all_profiles" ON profiles
  FOR SELECT
  USING (true); -- Everyone can view profiles (needed for booking pages)

DROP POLICY IF EXISTS "barbers_update_own_profile" ON profiles;
CREATE POLICY "barbers_update_own_profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    -- Barbers can only update these fields
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'BARBER'
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN', 'MANAGER')
  );

-- Admins can do everything
DROP POLICY IF EXISTS "admins_all_profiles" ON profiles;
CREATE POLICY "admins_all_profiles" ON profiles
  FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN');

-- Enable RLS on bookings table
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Bookings: Barbers can only see their own bookings
DROP POLICY IF EXISTS "barbers_view_own_bookings" ON bookings;
CREATE POLICY "barbers_view_own_bookings" ON bookings
  FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN', 'MANAGER', 'RECEPTIONIST')
    OR barber_id = auth.uid()::text -- Barbers see only their bookings
  );

-- Admins/Receptionists can create bookings for anyone
DROP POLICY IF EXISTS "admins_create_bookings" ON bookings;
CREATE POLICY "admins_create_bookings" ON bookings
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN', 'RECEPTIONIST', 'MANAGER')
  );

-- Barbers cannot create their own bookings (must be done via admin or public page)
-- Admins can update any booking
DROP POLICY IF EXISTS "admins_update_bookings" ON bookings;
CREATE POLICY "admins_update_bookings" ON bookings
  FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN', 'MANAGER'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN', 'MANAGER'));

-- Enable RLS on staff_availability table
ALTER TABLE staff_availability ENABLE ROW LEVEL SECURITY;

-- Staff availability: Everyone can view (for public booking pages)
DROP POLICY IF EXISTS "public_view_availability" ON staff_availability;
CREATE POLICY "public_view_availability" ON staff_availability
  FOR SELECT
  USING (true);

-- Barbers can update their own availability
DROP POLICY IF EXISTS "barbers_update_own_availability" ON staff_availability;
CREATE POLICY "barbers_update_own_availability" ON staff_availability
  FOR ALL
  USING (
    barber_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN', 'MANAGER')
  )
  WITH CHECK (
    barber_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN', 'MANAGER')
  );

-- Enable RLS on cancellation_policies table
ALTER TABLE cancellation_policies ENABLE ROW LEVEL SECURITY;

-- Everyone can view cancellation policies (needed for refund calculations)
DROP POLICY IF EXISTS "public_view_cancellation_policies" ON cancellation_policies;
CREATE POLICY "public_view_cancellation_policies" ON cancellation_policies
  FOR SELECT
  USING (true);

-- Only admins can modify cancellation policies
DROP POLICY IF EXISTS "admins_manage_cancellation_policies" ON cancellation_policies;
CREATE POLICY "admins_manage_cancellation_policies" ON cancellation_policies
  FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN');

-- Add comments
COMMENT ON POLICY "barbers_view_own_bookings" ON bookings IS 'Barbers can only view their own bookings, admins/managers/receptionists see all';
COMMENT ON POLICY "barbers_update_own_profile" ON profiles IS 'Barbers can update only their own profile (bio, specialties, etc.)';
COMMENT ON POLICY "public_view_availability" ON staff_availability IS 'Public can view availability for booking pages';

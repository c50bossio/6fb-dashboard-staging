-- Migration: Fix Missing Columns in Production
-- Description: Adds missing columns that are causing 400 errors
-- Date: 2025-08-25
-- Issue: Production database is missing columns that exist in the code

-- ============================================
-- 1. Add missing columns to barbershops table
-- ============================================

-- Add is_active column if it doesn't exist
ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add brand_color column if it doesn't exist
ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS brand_color VARCHAR(50);

-- Add other potentially missing columns that might be referenced
ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{}';

ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS cancellation_policy TEXT;

ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS booking_buffer_time INTEGER DEFAULT 15;

ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS max_advance_booking_days INTEGER DEFAULT 30;

ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS min_advance_booking_hours INTEGER DEFAULT 2;

-- ============================================
-- 2. Update existing NULL values
-- ============================================

-- Set default values for existing records
UPDATE barbershops 
SET is_active = true 
WHERE is_active IS NULL;

UPDATE barbershops 
SET brand_color = '#000000' 
WHERE brand_color IS NULL;

UPDATE barbershops 
SET business_hours = '{
  "monday": {"open": "09:00", "close": "18:00", "closed": false},
  "tuesday": {"open": "09:00", "close": "18:00", "closed": false},
  "wednesday": {"open": "09:00", "close": "18:00", "closed": false},
  "thursday": {"open": "09:00", "close": "18:00", "closed": false},
  "friday": {"open": "09:00", "close": "18:00", "closed": false},
  "saturday": {"open": "09:00", "close": "17:00", "closed": false},
  "sunday": {"closed": true}
}'::jsonb
WHERE business_hours IS NULL OR business_hours = '{}'::jsonb;

-- ============================================
-- 3. Fix RLS Policies
-- ============================================

-- Drop overly restrictive policies
DROP POLICY IF EXISTS "Public read access" ON barbershops;
DROP POLICY IF EXISTS "Authenticated users can read" ON barbershops;
DROP POLICY IF EXISTS "Users can update own barbershops" ON barbershops;
DROP POLICY IF EXISTS "Owners can update their barbershops" ON barbershops;

-- Create new, more permissive policies
CREATE POLICY "Anyone can read barbershops" 
  ON barbershops FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can update their own barbershops" 
  ON barbershops FOR UPDATE 
  USING (
    auth.uid() = owner_id 
    OR 
    auth.uid() IN (
      SELECT user_id FROM barbershop_staff 
      WHERE barbershop_id = barbershops.id 
      AND role IN ('OWNER', 'MANAGER')
      AND is_active = true
    )
  );

CREATE POLICY "Owners can soft delete their barbershops" 
  ON barbershops FOR UPDATE 
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Fix appointments table policies
DROP POLICY IF EXISTS "Users can view appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated users can view appointments" ON appointments;

CREATE POLICY "Authenticated users can view relevant appointments" 
  ON appointments FOR SELECT 
  USING (
    auth.uid() IS NOT NULL 
    AND (
      -- User owns the barbershop
      barbershop_id IN (
        SELECT id FROM barbershops WHERE owner_id = auth.uid()
      )
      OR
      -- User is staff at the barbershop
      barbershop_id IN (
        SELECT barbershop_id FROM barbershop_staff 
        WHERE user_id = auth.uid() AND is_active = true
      )
      OR
      -- User is the customer
      customer_id IN (
        SELECT id FROM customers WHERE user_id = auth.uid()
      )
    )
  );

-- Fix services table policies
DROP POLICY IF EXISTS "Public can view active services" ON services;
DROP POLICY IF EXISTS "Anyone can view services" ON services;

CREATE POLICY "Public can view all services" 
  ON services FOR SELECT 
  USING (true);

-- ============================================
-- 4. Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_barbershops_is_active 
  ON barbershops(is_active);

CREATE INDEX IF NOT EXISTS idx_barbershops_owner_id_active 
  ON barbershops(owner_id, is_active);

CREATE INDEX IF NOT EXISTS idx_appointments_barbershop_date 
  ON appointments(barbershop_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_services_barbershop_active 
  ON services(barbershop_id, is_active);

-- ============================================
-- 5. Refresh schema cache
-- ============================================

-- This forces Supabase to reload the schema
NOTIFY pgrst, 'reload schema';

-- Add comment to track migration
COMMENT ON COLUMN barbershops.is_active IS 'Soft delete flag - set to false to hide barbershop';
COMMENT ON COLUMN barbershops.brand_color IS 'Primary brand color for theming';
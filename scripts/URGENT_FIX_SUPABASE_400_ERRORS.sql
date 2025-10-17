-- ============================================
-- URGENT FIX FOR SUPABASE 400 ERRORS
-- Run this script in your Supabase SQL Editor
-- Date: 2025-08-25
-- ============================================

-- Step 1: Add missing columns to barbershops table
-- These columns are referenced in the code but missing from production

ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS brand_color VARCHAR(50) DEFAULT '#000000';

ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{
  "monday": {"open": "09:00", "close": "18:00", "closed": false},
  "tuesday": {"open": "09:00", "close": "18:00", "closed": false},
  "wednesday": {"open": "09:00", "close": "18:00", "closed": false},
  "thursday": {"open": "09:00", "close": "18:00", "closed": false},
  "friday": {"open": "09:00", "close": "18:00", "closed": false},
  "saturday": {"open": "09:00", "close": "17:00", "closed": false},
  "sunday": {"closed": true}
}'::jsonb;

ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS cancellation_policy TEXT;

ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS booking_buffer_time INTEGER DEFAULT 15;

ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS max_advance_booking_days INTEGER DEFAULT 30;

ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS min_advance_booking_hours INTEGER DEFAULT 2;

-- Step 2: Update any NULL values with defaults
UPDATE barbershops 
SET is_active = true 
WHERE is_active IS NULL;

UPDATE barbershops 
SET brand_color = '#000000' 
WHERE brand_color IS NULL;

-- Step 3: Fix RLS Policies (CRITICAL for 400 errors)
-- Drop old restrictive policies
DROP POLICY IF EXISTS "Public read access" ON barbershops;
DROP POLICY IF EXISTS "Authenticated users can read" ON barbershops;
DROP POLICY IF EXISTS "Users can update own barbershops" ON barbershops;
DROP POLICY IF EXISTS "Owners can update their barbershops" ON barbershops;

-- Create new permissive policies for barbershops
CREATE POLICY "barbershops_select_all" 
  ON barbershops FOR SELECT 
  USING (true);

CREATE POLICY "barbershops_update_owner" 
  ON barbershops FOR UPDATE 
  USING (
    auth.uid() = owner_id 
    OR 
    EXISTS (
      SELECT 1 FROM barbershop_staff 
      WHERE barbershop_staff.barbershop_id = barbershops.id 
      AND barbershop_staff.user_id = auth.uid()
      AND barbershop_staff.role IN ('OWNER', 'MANAGER')
    )
  );

CREATE POLICY "barbershops_insert_authenticated" 
  ON barbershops FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "barbershops_delete_owner" 
  ON barbershops FOR DELETE 
  USING (auth.uid() = owner_id);

-- Fix appointments table policies
DROP POLICY IF EXISTS "Users can view appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated users can view appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated users can view relevant appointments" ON appointments;

CREATE POLICY "appointments_select_authenticated" 
  ON appointments FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "appointments_insert_authenticated" 
  ON appointments FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "appointments_update_authenticated" 
  ON appointments FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

-- Fix services table policies
DROP POLICY IF EXISTS "Public can view active services" ON services;
DROP POLICY IF EXISTS "Anyone can view services" ON services;
DROP POLICY IF EXISTS "Public can view all services" ON services;

CREATE POLICY "services_select_all" 
  ON services FOR SELECT 
  USING (true);

CREATE POLICY "services_insert_shop_staff" 
  ON services FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM barbershops 
      WHERE barbershops.id = services.barbershop_id 
      AND (
        barbershops.owner_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM barbershop_staff 
          WHERE barbershop_staff.barbershop_id = services.barbershop_id 
          AND barbershop_staff.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "services_update_shop_staff" 
  ON services FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM barbershops 
      WHERE barbershops.id = services.barbershop_id 
      AND (
        barbershops.owner_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM barbershop_staff 
          WHERE barbershop_staff.barbershop_id = services.barbershop_id 
          AND barbershop_staff.user_id = auth.uid()
        )
      )
    )
  );

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_barbershops_is_active 
  ON barbershops(is_active);

CREATE INDEX IF NOT EXISTS idx_barbershops_owner_id 
  ON barbershops(owner_id);

CREATE INDEX IF NOT EXISTS idx_appointments_barbershop_date 
  ON appointments(barbershop_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_services_barbershop_active 
  ON services(barbershop_id, is_active);

-- Step 5: Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Step 6: Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'barbershops' 
  AND column_name IN ('is_active', 'brand_color', 'business_hours')
ORDER BY ordinal_position;

-- You should see all three columns listed after running this script
-- If successful, the 400 errors should be resolved immediately
-- =====================================================
-- FIX SCHEMA INCONSISTENCIES FOR LOCATION EDITING
-- Run this SQL in Supabase SQL Editor to fix access control issues
-- =====================================================

-- 1. FIX BOOKINGS TABLE - ADD MISSING CUSTOMER COLUMNS
-- This fixes the "column bookings.customer_email does not exist" error
-- =====================================================
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20), 
ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS service_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS barber_name VARCHAR(255);

-- Copy customer data to bookings table to populate the new columns
UPDATE bookings b
SET 
  customer_name = c.name,
  customer_phone = c.phone,
  customer_email = c.email
FROM customers c
WHERE b.customer_id = c.id
  AND b.customer_id IS NOT NULL
  AND (b.customer_name IS NULL OR b.customer_phone IS NULL OR b.customer_email IS NULL);

-- 2. FIX BARBERSHOPS TABLE - ADD ORGANIZATION_ID FOR ENTERPRISE SUPPORT
-- This enables full enterprise access control functionality
-- =====================================================
ALTER TABLE barbershops
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Create organizations table if it doesn't exist
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add organization_id to profiles if missing
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- 3. CREATE BARBERSHOP_STAFF TABLE IF MISSING
-- This enables staff access control for location editing
-- =====================================================
CREATE TABLE IF NOT EXISTS barbershop_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'staff',
  is_active BOOLEAN DEFAULT TRUE,
  hired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure user can only be staff at one barbershop (if desired)
  UNIQUE(user_id, barbershop_id)
);

-- 4. ADD HELPFUL INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_barbershops_organization_id ON barbershops(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_barbershop_staff_user_id ON barbershop_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_barbershop_staff_barbershop_id ON barbershop_staff(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_email ON bookings(customer_email);

-- 5. ADD HELPFUL COMMENTS
-- =====================================================
COMMENT ON COLUMN barbershops.organization_id IS 'Reference to parent organization for enterprise multi-location management';
COMMENT ON COLUMN profiles.organization_id IS 'Reference to organization for enterprise users';
COMMENT ON TABLE barbershop_staff IS 'Links users to barbershops they can manage (staff access control)';
COMMENT ON COLUMN bookings.customer_email IS 'Denormalized customer email for faster queries';

-- =====================================================
-- SUMMARY:
-- - Fixes "column bookings.customer_email does not exist" errors
-- - Enables enterprise location access control with organization_id
-- - Adds staff access control through barbershop_staff table
-- - Improves query performance with indexes
-- =====================================================
-- ===============================================
-- ADD APPOINTMENT CAPABILITIES TO PROFILES TABLE
-- ===============================================
-- Migration: Add capability columns for single-table appointment booking architecture
-- Date: 2025-09-02
-- Author: Claude Code Database Administrator
-- 
-- This migration adds appointment-taking capabilities to the profiles table
-- to support a single-table architecture instead of dual-table (profiles + barbershop_staff)

-- ===============================================
-- ADD NEW COLUMNS
-- ===============================================

-- Add the three new capability columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_take_appointments BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_visible_for_booking BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS service_provider_since TIMESTAMPTZ;

-- ===============================================
-- SET DEFAULTS BASED ON EXISTING ROLES
-- ===============================================

-- Update existing users based on their current roles
-- BARBER role: can_take_appointments = true (they are service providers)
UPDATE public.profiles 
SET can_take_appointments = true,
    service_provider_since = COALESCE(created_at, NOW())
WHERE role = 'BARBER';

-- ENTERPRISE_OWNER and SHOP_OWNER: can_take_appointments = true 
-- (owners often cut hair too, following industry patterns)
UPDATE public.profiles 
SET can_take_appointments = true,
    service_provider_since = COALESCE(created_at, NOW())
WHERE role IN ('ENTERPRISE_OWNER', 'SHOP_OWNER');

-- MANAGER role: can_take_appointments = false (can be toggled later via UI)
-- CLIENT role: can_take_appointments = false (default)
-- SUPER_ADMIN role: can_take_appointments = false (admin function only)
-- These remain with the default false value

-- ===============================================
-- UPDATE CHRIS BOSSIO SPECIFICALLY
-- ===============================================

-- Ensure Chris Bossio (ENTERPRISE_OWNER) can take appointments for booking dropdowns
UPDATE public.profiles 
SET can_take_appointments = true,
    is_visible_for_booking = true,
    service_provider_since = COALESCE(created_at, NOW())
WHERE id = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5'
  AND role = 'ENTERPRISE_OWNER';

-- ===============================================
-- ADD INDEXES FOR PERFORMANCE
-- ===============================================

-- Index for appointment booking queries (find available service providers)
CREATE INDEX IF NOT EXISTS idx_profiles_appointment_booking 
ON public.profiles(can_take_appointments, is_visible_for_booking) 
WHERE can_take_appointments = true AND is_visible_for_booking = true;

-- Index for service provider queries
CREATE INDEX IF NOT EXISTS idx_profiles_service_providers 
ON public.profiles(can_take_appointments, service_provider_since) 
WHERE can_take_appointments = true;

-- ===============================================
-- UPDATE COMMENTS AND DOCUMENTATION
-- ===============================================

COMMENT ON COLUMN public.profiles.can_take_appointments IS 'Whether this user can accept appointments as a service provider';
COMMENT ON COLUMN public.profiles.is_visible_for_booking IS 'Whether this service provider appears in booking dropdowns (default: true)';
COMMENT ON COLUMN public.profiles.service_provider_since IS 'When this user first became a service provider (for experience tracking)';

-- ===============================================
-- VALIDATION QUERIES
-- ===============================================

-- Verify the migration worked correctly
DO $$
DECLARE
    barber_count INTEGER;
    owner_count INTEGER;
    chris_status BOOLEAN;
BEGIN
    -- Count BARBERs with appointment capabilities
    SELECT COUNT(*) INTO barber_count 
    FROM public.profiles 
    WHERE role = 'BARBER' AND can_take_appointments = true;
    
    -- Count owners with appointment capabilities
    SELECT COUNT(*) INTO owner_count 
    FROM public.profiles 
    WHERE role IN ('ENTERPRISE_OWNER', 'SHOP_OWNER') AND can_take_appointments = true;
    
    -- Check Chris Bossio specifically
    SELECT can_take_appointments INTO chris_status 
    FROM public.profiles 
    WHERE id = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5';
    
    RAISE NOTICE 'Migration Results:';
    RAISE NOTICE '- BARBERs with appointment capabilities: %', barber_count;
    RAISE NOTICE '- Owners with appointment capabilities: %', owner_count;
    RAISE NOTICE '- Chris Bossio appointment capability: %', COALESCE(chris_status::text, 'USER_NOT_FOUND');
END
$$;

-- ===============================================
-- ROLLBACK INFORMATION
-- ===============================================

-- To rollback this migration, run:
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS can_take_appointments;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_visible_for_booking;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS service_provider_since;
-- DROP INDEX IF EXISTS idx_profiles_appointment_booking;
-- DROP INDEX IF EXISTS idx_profiles_service_providers;

-- ===============================================
-- END OF MIGRATION
-- ===============================================
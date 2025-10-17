-- ============================================================================
-- STAFF TABLE CONSOLIDATION MIGRATION
-- ============================================================================
-- Purpose: Consolidate profiles, barbershop_staff, and barbers tables into
--          a single unified "staff" table to eliminate confusion and
--          establish a single source of truth for all staff/barber data
--
-- Date: 2025-10-11
-- Database: Supabase PostgreSQL
--
-- IMPORTANT: This migration is designed for ZERO DOWNTIME with careful
--            ordering of operations to maintain referential integrity
-- ============================================================================

-- ============================================================================
-- PHASE 1: PRE-MIGRATION VALIDATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== PHASE 1: PRE-MIGRATION VALIDATION ===';
    RAISE NOTICE 'Starting staff table consolidation migration...';
    RAISE NOTICE 'Timestamp: %', NOW();
END $$;

-- Store current counts for validation
CREATE TEMP TABLE migration_validation AS
SELECT
    (SELECT COUNT(*) FROM profiles WHERE role IN ('BARBER', 'SHOP_OWNER', 'MANAGER')) as profiles_staff_count,
    (SELECT COUNT(*) FROM barbershop_staff) as barbershop_staff_count,
    (SELECT COUNT(*) FROM barbers) as barbers_count,
    (SELECT COUNT(*) FROM appointments WHERE barber_id IS NOT NULL) as appointments_with_barber_count;

-- Display pre-migration counts
DO $$
DECLARE
    v_profiles_count INT;
    v_staff_count INT;
    v_barbers_count INT;
    v_appointments_count INT;
BEGIN
    SELECT profiles_staff_count, barbershop_staff_count, barbers_count, appointments_with_barber_count
    INTO v_profiles_count, v_staff_count, v_barbers_count, v_appointments_count
    FROM migration_validation;

    RAISE NOTICE 'Pre-migration counts:';
    RAISE NOTICE '  - Profiles (staff roles): %', v_profiles_count;
    RAISE NOTICE '  - Barbershop_staff: %', v_staff_count;
    RAISE NOTICE '  - Barbers: %', v_barbers_count;
    RAISE NOTICE '  - Appointments with barber_id: %', v_appointments_count;
END $$;

-- ============================================================================
-- PHASE 2: CREATE NEW STAFF TABLE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== PHASE 2: CREATE NEW STAFF TABLE ===';
END $$;

-- Create the unified staff table
CREATE TABLE IF NOT EXISTS public.staff (
    -- Primary identifiers
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    -- user_id is NULL for non-authenticated staff (demo data, future hires, etc.)
    -- user_id is NOT NULL for authenticated staff with login accounts

    -- Personal information
    email TEXT NULL,
    full_name TEXT NOT NULL,
    first_name TEXT NULL,
    last_name TEXT NULL,
    phone TEXT NULL,
    avatar_url TEXT NULL,
    bio TEXT NULL,

    -- Professional details
    role TEXT NOT NULL DEFAULT 'BARBER' CHECK (role IN ('BARBER', 'MANAGER', 'SHOP_OWNER', 'ENTERPRISE_OWNER')),
    specialties TEXT[] NULL,
    experience_years INTEGER NULL DEFAULT 0,
    chair_number TEXT NULL,
    instagram_handle TEXT NULL,
    languages TEXT[] NULL DEFAULT ARRAY['English'],
    booking_slug TEXT NULL UNIQUE,

    -- Employment details
    hire_date DATE NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_test BOOLEAN NOT NULL DEFAULT false,

    -- Financial arrangements
    commission_rate NUMERIC(5,2) NULL DEFAULT 50.00,
    booth_rent_amount NUMERIC(10,2) NULL,

    -- Additional metadata
    permissions JSONB NULL DEFAULT '{}'::jsonb,
    color TEXT NULL DEFAULT '#3b82f6',
    rating NUMERIC(3,2) NULL,
    availability TEXT NULL DEFAULT 'full_time',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT staff_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR email IS NULL),
    CONSTRAINT staff_commission_rate_check CHECK (commission_rate >= 0 AND commission_rate <= 100),
    CONSTRAINT staff_rating_check CHECK (rating >= 0 AND rating <= 5),
    CONSTRAINT staff_unique_user_shop UNIQUE (barbershop_id, user_id)
);

DO $$
BEGIN
    RAISE NOTICE 'Created staff table with comprehensive schema';
END $$;

-- ============================================================================
-- PHASE 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== PHASE 3: CREATE INDEXES ===';
END $$;

-- Core indexes for common queries
CREATE INDEX IF NOT EXISTS idx_staff_barbershop_id ON public.staff(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON public.staff(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_is_active ON public.staff(is_active);
CREATE INDEX IF NOT EXISTS idx_staff_role ON public.staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_email ON public.staff(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_booking_slug ON public.staff(booking_slug) WHERE booking_slug IS NOT NULL;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_staff_shop_active ON public.staff(barbershop_id, is_active, role) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_staff_shop_role ON public.staff(barbershop_id, role);

-- GIN indexes for array columns
CREATE INDEX IF NOT EXISTS idx_staff_specialties ON public.staff USING GIN(specialties) WHERE specialties IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_languages ON public.staff USING GIN(languages) WHERE languages IS NOT NULL;

DO $$
BEGIN
    RAISE NOTICE 'Created performance indexes on staff table';
END $$;

-- ============================================================================
-- PHASE 4: MIGRATE DATA FROM SOURCE TABLES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== PHASE 4: MIGRATE DATA ===';
END $$;

-- STEP 4.1: Migrate authenticated staff from profiles table
-- Priority: HIGHEST (these have user accounts and are source of truth)
INSERT INTO public.staff (
    id,
    barbershop_id,
    user_id,
    email,
    full_name,
    first_name,
    last_name,
    phone,
    avatar_url,
    bio,
    role,
    specialties,
    booking_slug,
    is_active,
    created_at,
    updated_at
)
SELECT
    p.id,
    COALESCE(p.barbershop_id, p.last_selected_shop_id) as barbershop_id,
    p.id as user_id, -- profiles.id references auth.users.id
    p.email,
    p.full_name,
    p.first_name,
    p.last_name,
    p.phone,
    p.avatar_url,
    p.bio,
    CASE
        WHEN p.role = 'SHOP_OWNER' THEN 'SHOP_OWNER'
        WHEN p.role = 'MANAGER' THEN 'MANAGER'
        WHEN p.role = 'ENTERPRISE_OWNER' THEN 'ENTERPRISE_OWNER'
        ELSE 'BARBER'
    END as role,
    p.specialties,
    p.booking_slug,
    p.is_active,
    p.created_at,
    p.updated_at
FROM profiles p
WHERE
    p.role IN ('BARBER', 'SHOP_OWNER', 'MANAGER', 'ENTERPRISE_OWNER')
    AND (p.barbershop_id IS NOT NULL OR p.last_selected_shop_id IS NOT NULL)
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
    v_count INT;
BEGIN
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Migrated % staff records from profiles table', v_count;
END $$;

-- STEP 4.2: Migrate from barbershop_staff table (link to profiles via user_id)
-- These records link authenticated users to shops with additional metadata
INSERT INTO public.staff (
    id,
    barbershop_id,
    user_id,
    email,
    full_name,
    first_name,
    last_name,
    phone,
    avatar_url,
    role,
    commission_rate,
    is_active,
    permissions,
    created_at,
    updated_at
)
SELECT
    bs.id,
    bs.barbershop_id,
    bs.user_id,
    p.email,
    p.full_name,
    p.first_name,
    p.last_name,
    p.phone,
    p.avatar_url,
    bs.role,
    bs.commission_rate,
    bs.is_active,
    bs.permissions,
    bs.created_at,
    bs.updated_at
FROM barbershop_staff bs
INNER JOIN profiles p ON p.id = bs.user_id
WHERE NOT EXISTS (
    -- Avoid duplicates from step 4.1
    SELECT 1 FROM public.staff s WHERE s.user_id = bs.user_id AND s.barbershop_id = bs.barbershop_id
)
ON CONFLICT (barbershop_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    commission_rate = EXCLUDED.commission_rate,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

DO $$
DECLARE
    v_count INT;
BEGIN
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Migrated % staff records from barbershop_staff table', v_count;
END $$;

-- STEP 4.3: Migrate demo/seed data from barbers table
-- Priority: LOWEST (these are non-authenticated barbers, demo data)
INSERT INTO public.staff (
    id,
    barbershop_id,
    user_id,
    email,
    full_name,
    first_name,
    last_name,
    phone,
    avatar_url,
    bio,
    role,
    specialties,
    experience_years,
    chair_number,
    instagram_handle,
    languages,
    is_active,
    is_test,
    rating,
    color,
    availability,
    created_at,
    updated_at
)
SELECT
    b.id::uuid,
    b.barbershop_id,
    NULL as user_id, -- barbers table has no auth accounts
    b.email,
    b.name as full_name,
    SPLIT_PART(b.name, ' ', 1) as first_name,
    CASE
        WHEN ARRAY_LENGTH(STRING_TO_ARRAY(b.name, ' '), 1) > 1
        THEN SUBSTRING(b.name FROM POSITION(' ' IN b.name) + 1)
        ELSE NULL
    END as last_name,
    b.phone,
    b.avatar_url,
    b.bio,
    'BARBER' as role,
    CASE
        WHEN jsonb_typeof(b.specialties) = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(b.specialties))
        ELSE NULL
    END as specialties,
    b.experience_years,
    b.chair_number,
    b.instagram_handle,
    b.languages,
    b.is_active,
    b.is_test,
    b.rating,
    b.color,
    b.availability,
    b.created_at,
    b.updated_at
FROM barbers b
WHERE
    b.barbershop_id IS NOT NULL
    AND NOT EXISTS (
        -- Avoid duplicates from profiles (matched by email)
        SELECT 1 FROM public.staff s
        WHERE s.email = b.email
        AND s.barbershop_id = b.barbershop_id
    )
    AND NOT EXISTS (
        -- Avoid duplicates if ID already exists
        SELECT 1 FROM public.staff s WHERE s.id = b.id::uuid
    )
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
    v_count INT;
BEGIN
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Migrated % barber records from barbers table', v_count;
END $$;

-- ============================================================================
-- PHASE 5: UPDATE APPOINTMENTS FOREIGN KEY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== PHASE 5: UPDATE APPOINTMENTS FOREIGN KEY ===';
END $$;

-- STEP 5.1: Drop existing foreign key constraint
ALTER TABLE public.appointments
DROP CONSTRAINT IF EXISTS appointments_barber_id_fkey;

DO $$
BEGIN
    RAISE NOTICE 'Dropped old appointments_barber_id_fkey constraint';
END $$;

-- STEP 5.2: Verify all barber_id values exist in new staff table
DO $$
DECLARE
    v_orphaned_count INT;
BEGIN
    SELECT COUNT(*)
    INTO v_orphaned_count
    FROM appointments a
    WHERE a.barber_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM staff s WHERE s.id = a.barber_id);

    IF v_orphaned_count > 0 THEN
        RAISE WARNING 'Found % appointments with barber_id not in staff table', v_orphaned_count;
        RAISE NOTICE 'These appointments will have barber_id set to NULL to maintain referential integrity';

        -- Set orphaned barber_id to NULL
        UPDATE appointments
        SET barber_id = NULL
        WHERE barber_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM staff s WHERE s.id = barber_id);
    ELSE
        RAISE NOTICE 'All appointment barber_id values exist in staff table';
    END IF;
END $$;

-- STEP 5.3: Add new foreign key constraint to staff table
ALTER TABLE public.appointments
ADD CONSTRAINT appointments_barber_id_fkey
FOREIGN KEY (barber_id)
REFERENCES public.staff(id)
ON DELETE SET NULL;

DO $$
BEGIN
    RAISE NOTICE 'Created new appointments_barber_id_fkey constraint pointing to staff table';
END $$;

-- ============================================================================
-- PHASE 6: ADD ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== PHASE 6: CONFIGURE ROW LEVEL SECURITY ===';
END $$;

-- Enable RLS on staff table
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Policy 1: Public can view active staff
CREATE POLICY "public_view_active_staff"
ON public.staff
FOR SELECT
TO public
USING (is_active = true AND is_test = false);

-- Policy 2: Authenticated users can view staff at their shop
CREATE POLICY "users_view_own_shop_staff"
ON public.staff
FOR SELECT
TO authenticated
USING (
    barbershop_id IN (
        SELECT p.barbershop_id
        FROM profiles p
        WHERE p.id = auth.uid()
    )
);

-- Policy 3: Staff can view their own record
CREATE POLICY "staff_view_own_record"
ON public.staff
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy 4: Shop owners can manage their staff
CREATE POLICY "shop_owners_manage_staff"
ON public.staff
FOR ALL
TO authenticated
USING (
    barbershop_id IN (
        SELECT b.id
        FROM barbershops b
        WHERE b.owner_id = auth.uid()
    )
)
WITH CHECK (
    barbershop_id IN (
        SELECT b.id
        FROM barbershops b
        WHERE b.owner_id = auth.uid()
    )
);

-- Policy 5: Enterprise owners can manage all staff
CREATE POLICY "enterprise_owners_manage_all_staff"
ON public.staff
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'ENTERPRISE_OWNER'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'ENTERPRISE_OWNER'
    )
);

-- Policy 6: Staff can update their own profile
CREATE POLICY "staff_update_own_profile"
ON public.staff
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy 7: Service role has full access
CREATE POLICY "service_role_full_access"
ON public.staff
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DO $$
BEGIN
    RAISE NOTICE 'Created 7 RLS policies for multi-tenant security';
END $$;

-- ============================================================================
-- PHASE 7: CREATE TRIGGERS FOR AUTO-UPDATE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== PHASE 7: CREATE TRIGGERS ===';
END $$;

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to staff table
DROP TRIGGER IF EXISTS update_staff_updated_at_trigger ON public.staff;
CREATE TRIGGER update_staff_updated_at_trigger
    BEFORE UPDATE ON public.staff
    FOR EACH ROW
    EXECUTE FUNCTION update_staff_updated_at();

DO $$
BEGIN
    RAISE NOTICE 'Created updated_at trigger for staff table';
END $$;

-- ============================================================================
-- PHASE 8: POST-MIGRATION VALIDATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== PHASE 8: POST-MIGRATION VALIDATION ===';
END $$;

-- Validate data migration
DO $$
DECLARE
    v_staff_count INT;
    v_appointments_count INT;
    v_orphaned_count INT;
BEGIN
    -- Count staff records
    SELECT COUNT(*) INTO v_staff_count FROM staff;
    RAISE NOTICE 'Total staff records created: %', v_staff_count;

    -- Count appointments still referencing staff
    SELECT COUNT(*) INTO v_appointments_count
    FROM appointments WHERE barber_id IS NOT NULL;
    RAISE NOTICE 'Appointments with valid barber_id: %', v_appointments_count;

    -- Check for orphaned appointments
    SELECT COUNT(*) INTO v_orphaned_count
    FROM appointments a
    WHERE a.barber_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM staff s WHERE s.id = a.barber_id);

    IF v_orphaned_count > 0 THEN
        RAISE WARNING 'Found % orphaned appointments - THIS SHOULD BE ZERO!', v_orphaned_count;
    ELSE
        RAISE NOTICE 'No orphaned appointments - referential integrity maintained';
    END IF;
END $$;

-- Display staff distribution by role
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Staff distribution by role:';
END $$;

SELECT
    role,
    COUNT(*) as count,
    COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as authenticated,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as non_authenticated
FROM staff
GROUP BY role
ORDER BY count DESC;

-- Display staff distribution by shop
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Staff distribution by shop:';
END $$;

SELECT
    b.name as shop_name,
    COUNT(s.id) as staff_count,
    COUNT(CASE WHEN s.is_active THEN 1 END) as active_count
FROM staff s
JOIN barbershops b ON b.id = s.barbershop_id
GROUP BY b.id, b.name
ORDER BY staff_count DESC;

-- ============================================================================
-- PHASE 9: CREATE VIEWS FOR BACKWARD COMPATIBILITY (OPTIONAL)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== PHASE 9: CREATE COMPATIBILITY VIEWS (OPTIONAL) ===';
END $$;

-- Create view that mimics old barbershop_staff table structure
CREATE OR REPLACE VIEW barbershop_staff_legacy AS
SELECT
    id,
    barbershop_id,
    user_id,
    role,
    permissions,
    commission_rate,
    is_active,
    created_at,
    updated_at
FROM staff
WHERE user_id IS NOT NULL;

-- Create view that mimics old barbers table structure
CREATE OR REPLACE VIEW barbers_legacy AS
SELECT
    id::text as id,
    full_name as name,
    email,
    phone,
    color,
    avatar_url,
    bio,
    specialties::jsonb as specialties,
    rating,
    is_active,
    is_test,
    created_at,
    updated_at,
    experience_years,
    chair_number,
    instagram_handle,
    languages,
    availability,
    barbershop_id
FROM staff;

DO $$
BEGIN
    RAISE NOTICE 'Created legacy views for backward compatibility';
    RAISE NOTICE 'Views: barbershop_staff_legacy, barbers_legacy';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=============================================================';
    RAISE NOTICE 'MIGRATION COMPLETE: Staff table consolidation successful';
    RAISE NOTICE 'Timestamp: %', NOW();
    RAISE NOTICE '=============================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Test all staff-related API endpoints';
    RAISE NOTICE '2. Update frontend code to use new staff table';
    RAISE NOTICE '3. Monitor application logs for any issues';
    RAISE NOTICE '4. After 7 days of stable operation, run cleanup script to drop old tables';
    RAISE NOTICE '';
    RAISE NOTICE 'OLD TABLES PRESERVED (do not drop yet):';
    RAISE NOTICE '  - profiles (still used for all users including clients)';
    RAISE NOTICE '  - barbershop_staff (can be dropped after validation)';
    RAISE NOTICE '  - barbers (can be dropped after validation)';
    RAISE NOTICE '';
END $$;

-- Drop temporary validation table
DROP TABLE IF EXISTS migration_validation;

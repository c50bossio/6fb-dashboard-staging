-- ===============================================
-- RESTORE DATA AFTER MASTER SCHEMA APPLICATION
-- ===============================================
-- This script restores data after MASTER_SCHEMA.sql has been applied

DO $$
DECLARE
    backup_count INTEGER;
BEGIN
    -- Restore profiles data if backup exists
    SELECT COUNT(*) INTO backup_count FROM information_schema.tables WHERE table_name = 'profiles_backup';
    IF backup_count > 0 THEN
        -- Merge backup data into new profiles structure
        INSERT INTO public.profiles (
            id, email, full_name, phone, role, avatar_url,
            subscription_tier, stripe_customer_id, 
            onboarding_completed, created_at, updated_at
        )
        SELECT 
            id, 
            email, 
            COALESCE(full_name, name, email) as full_name,
            phone,
            COALESCE(role::text, 'CLIENT')::user_role as role,
            avatar_url,
            COALESCE(subscription_tier::text, 'free')::subscription_tier,
            stripe_customer_id,
            COALESCE(onboarding_completed, false),
            COALESCE(created_at, NOW()),
            COALESCE(updated_at, NOW())
        FROM profiles_backup
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            phone = EXCLUDED.phone,
            updated_at = NOW();
        
        RAISE NOTICE 'Restored profiles data';
    END IF;
    
    -- Restore barbershops if backup exists  
    SELECT COUNT(*) INTO backup_count FROM information_schema.tables WHERE table_name = 'barbershops_backup';
    IF backup_count > 0 THEN
        INSERT INTO public.barbershops (
            id, name, description, address, city, state, owner_id,
            business_hours, booking_enabled, created_at, updated_at
        )
        SELECT 
            id, name, description, address, city, state, owner_id,
            COALESCE(business_hours, '{}'::jsonb),
            COALESCE(booking_enabled, true),
            COALESCE(created_at, NOW()),
            COALESCE(updated_at, NOW())
        FROM barbershops_backup
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            updated_at = NOW();
        
        RAISE NOTICE 'Restored barbershops data';
    END IF;
    
    -- Clean up backup tables
    DROP TABLE IF EXISTS profiles_backup;
    DROP TABLE IF EXISTS barbershops_backup; 
    DROP TABLE IF EXISTS appointments_backup;
    
    RAISE NOTICE 'Data restoration completed and backup tables cleaned up';
END $$;
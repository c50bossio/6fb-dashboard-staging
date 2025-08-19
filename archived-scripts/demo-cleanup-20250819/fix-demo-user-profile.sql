-- Fix demo user profile and ensure all required columns exist
-- This resolves the 406 errors when querying profiles

-- First, ensure shop_name column exists (might be missing)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS shop_name VARCHAR(255);

-- Check if demo user exists and create if not
DO $$
BEGIN
    -- Check if the demo user profile exists
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = 'befcd3e1-8722-449b-8dd3-cdf7e1f59483'
    ) THEN
        -- First ensure the user exists in auth.users
        IF NOT EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = 'befcd3e1-8722-449b-8dd3-cdf7e1f59483'
        ) THEN
            -- Create the auth user first
            INSERT INTO auth.users (
                id,
                email,
                encrypted_password,
                email_confirmed_at,
                created_at,
                updated_at,
                raw_app_meta_data,
                raw_user_meta_data,
                aud,
                role
            ) VALUES (
                'befcd3e1-8722-449b-8dd3-cdf7e1f59483',
                'demo@bookedbarber.com',
                crypt('demo123456', gen_salt('bf')),
                NOW(),
                NOW(),
                NOW(),
                '{"provider": "email", "providers": ["email"]}',
                '{"full_name": "Demo User", "role": "SHOP_OWNER"}',
                'authenticated',
                'authenticated'
            );
        END IF;
        
        -- Now create the profile
        INSERT INTO profiles (
            id,
            email,
            full_name,
            role,
            shop_id,
            shop_name,
            onboarding_completed,
            onboarding_step,
            onboarding_data,
            created_at,
            updated_at
        ) VALUES (
            'befcd3e1-8722-449b-8dd3-cdf7e1f59483',
            'demo@bookedbarber.com',
            'Demo User',
            'SHOP_OWNER',
            '550e8400-e29b-41d4-a716-446655440000',
            'Demo Barbershop',
            false,
            0,
            '{}',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Demo user profile created successfully';
    ELSE
        -- Update existing profile to ensure it has all required fields
        UPDATE profiles 
        SET 
            shop_name = COALESCE(shop_name, 'Demo Barbershop'),
            shop_id = COALESCE(shop_id, '550e8400-e29b-41d4-a716-446655440000'),
            role = COALESCE(role, 'SHOP_OWNER'),
            onboarding_data = COALESCE(onboarding_data, '{}'),
            updated_at = NOW()
        WHERE id = 'befcd3e1-8722-449b-8dd3-cdf7e1f59483';
        
        RAISE NOTICE 'Demo user profile updated successfully';
    END IF;
END $$;

-- Verify the profile exists and has all columns
SELECT 
    id,
    email,
    full_name,
    role,
    shop_id,
    shop_name,
    onboarding_completed,
    onboarding_step,
    onboarding_data::text as onboarding_data,
    created_at,
    updated_at
FROM profiles 
WHERE id = 'befcd3e1-8722-449b-8dd3-cdf7e1f59483';

-- Also create the demo barbershop if it doesn't exist
INSERT INTO barbershops (
    id,
    name,
    slug,
    owner_id,
    address,
    phone,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Demo Barbershop',
    'demo-barbershop',
    'befcd3e1-8722-449b-8dd3-cdf7e1f59483',
    '123 Demo Street, Demo City, DC 12345',
    '(555) 123-4567',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE
SET 
    name = EXCLUDED.name,
    updated_at = NOW();

-- Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON barbershops TO authenticated;
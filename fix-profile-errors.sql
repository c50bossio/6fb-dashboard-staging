-- ===============================================
-- FIX PROFILE ERRORS - SIMPLE VERSION
-- ===============================================
-- This creates the missing profile for your authenticated user

-- Get the current user and create their profile
DO $$
DECLARE
    user_id UUID;
    user_email TEXT;
    shop_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID; -- Default shop ID
BEGIN
    -- Get the most recent authenticated user
    SELECT id, email INTO user_id, user_email
    FROM auth.users
    WHERE email IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF user_id IS NULL THEN
        RAISE NOTICE 'No user found in auth.users';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Creating profile for user: % (%)', user_email, user_id;
    
    -- Create or update the profile
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        phone,
        role,
        shop_id,
        barbershop_id,
        subscription_tier,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        user_email,
        COALESCE(
            (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = user_id),
            'Shop Owner'
        ),
        '555-0100',
        'SHOP_OWNER',
        shop_id,
        shop_id,
        'professional',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        shop_id = EXCLUDED.shop_id,
        barbershop_id = EXCLUDED.barbershop_id,
        role = EXCLUDED.role,
        subscription_tier = EXCLUDED.subscription_tier,
        updated_at = NOW();
    
    RAISE NOTICE '✅ Profile created/updated successfully';
    
    -- Also ensure the barbershop exists
    INSERT INTO public.barbershops (
        id,
        name,
        owner_id,
        address,
        phone,
        email,
        created_at,
        updated_at
    ) VALUES (
        shop_id,
        'Default Barbershop',
        user_id,
        '123 Main St',
        '555-0100',
        user_email,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        owner_id = user_id,
        updated_at = NOW();
    
    RAISE NOTICE '✅ Barbershop linked to profile';
    
    -- Add more bookings for testing
    INSERT INTO public.bookings (
        booking_date,
        booking_time,
        customer_name,
        service_name,
        barber_name,
        price,
        duration_minutes,
        status,
        notes
    ) VALUES 
    (CURRENT_DATE + 1, '09:00:00', 'John Smith', 'Classic Haircut', 'Main Barber', 35.00, 30, 'CONFIRMED', 'Regular client'),
    (CURRENT_DATE + 1, '10:00:00', 'Mike Johnson', 'Fade Cut', 'Main Barber', 40.00, 45, 'CONFIRMED', 'New client'),
    (CURRENT_DATE + 1, '11:00:00', 'David Brown', 'Hair & Beard', 'Main Barber', 55.00, 60, 'PENDING', 'Needs confirmation'),
    (CURRENT_DATE + 2, '14:00:00', 'James Wilson', 'Beard Trim', 'Main Barber', 25.00, 20, 'CONFIRMED', 'VIP'),
    (CURRENT_DATE + 2, '15:00:00', 'Robert Davis', 'Classic Haircut', 'Main Barber', 35.00, 30, 'CONFIRMED', 'Monthly')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✅ Sample bookings added';
    
END $$;

-- Verify the fix
SELECT 'Your Profile:' as info;
SELECT id, email, full_name, role, shop_id 
FROM public.profiles 
WHERE id IN (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1);

SELECT '' as spacer;
SELECT 'Calendar Bookings:' as info;
SELECT booking_date, booking_time, customer_name, service_name, status 
FROM public.bookings 
WHERE booking_date >= CURRENT_DATE
ORDER BY booking_date, booking_time;
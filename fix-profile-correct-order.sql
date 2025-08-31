-- ===============================================
-- FIX PROFILE ERRORS - CORRECT ORDER
-- ===============================================
-- Creates barbershop first, then profile

DO $$
DECLARE
    user_id UUID;
    user_email TEXT;
    shop_id UUID;
BEGIN
    -- Get the current authenticated user
    SELECT id, email INTO user_id, user_email
    FROM auth.users
    WHERE email IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF user_id IS NULL THEN
        RAISE NOTICE 'No user found in auth.users';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Setting up data for user: % (%)', user_email, user_id;
    
    -- Generate a new shop ID
    shop_id := gen_random_uuid();
    
    -- FIRST: Create the barbershop
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
        'My Barbershop',
        user_id,
        '123 Main Street, City, State',
        '555-0100',
        user_email,
        NOW(),
        NOW()
    )
    ON CONFLICT (owner_id) DO UPDATE
    SET 
        name = EXCLUDED.name,
        updated_at = NOW()
    RETURNING id INTO shop_id;
    
    RAISE NOTICE '✅ Barbershop created with ID: %', shop_id;
    
    -- SECOND: Create or update the profile
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
            (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = user_id),
            split_part(user_email, '@', 1)
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
        shop_id = shop_id,
        barbershop_id = shop_id,
        role = 'SHOP_OWNER',
        subscription_tier = 'professional',
        updated_at = NOW();
    
    RAISE NOTICE '✅ Profile created/updated successfully';
    
    -- THIRD: Add to barbershop_staff table
    INSERT INTO public.barbershop_staff (
        id,
        barbershop_id,
        user_id,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        shop_id,
        user_id,
        'owner',
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (barbershop_id, user_id) DO UPDATE
    SET 
        role = 'owner',
        is_active = true,
        updated_at = NOW();
    
    RAISE NOTICE '✅ Added to barbershop_staff';
    
    -- FOURTH: Create some services for the shop
    INSERT INTO public.services (
        id,
        shop_id,
        name,
        description,
        price,
        duration_minutes,
        is_active,
        created_at,
        updated_at
    ) VALUES 
    (gen_random_uuid(), shop_id, 'Classic Haircut', 'Traditional haircut', 35.00, 30, true, NOW(), NOW()),
    (gen_random_uuid(), shop_id, 'Fade Cut', 'Modern fade', 40.00, 45, true, NOW(), NOW()),
    (gen_random_uuid(), shop_id, 'Beard Trim', 'Beard shaping', 25.00, 20, true, NOW(), NOW())
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✅ Services created';
    
    -- FIFTH: Add more bookings for the calendar
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
    (CURRENT_DATE + 1, '09:00:00', 'John Smith', 'Classic Haircut', 'Shop Owner', 35.00, 30, 'CONFIRMED', 'Regular client'),
    (CURRENT_DATE + 1, '10:00:00', 'Mike Johnson', 'Fade Cut', 'Shop Owner', 40.00, 45, 'CONFIRMED', 'New client'),
    (CURRENT_DATE + 1, '11:30:00', 'David Brown', 'Beard Trim', 'Shop Owner', 25.00, 20, 'CONFIRMED', 'Walk-in'),
    (CURRENT_DATE + 1, '14:00:00', 'James Wilson', 'Classic Haircut', 'Shop Owner', 35.00, 30, 'PENDING', 'Needs confirmation'),
    (CURRENT_DATE + 2, '09:30:00', 'Robert Davis', 'Fade Cut', 'Shop Owner', 40.00, 45, 'CONFIRMED', 'Weekly regular'),
    (CURRENT_DATE + 2, '11:00:00', 'Steve Miller', 'Classic Haircut', 'Shop Owner', 35.00, 30, 'CONFIRMED', 'First visit'),
    (CURRENT_DATE + 2, '15:00:00', 'Tom Anderson', 'Beard Trim', 'Shop Owner', 25.00, 20, 'CONFIRMED', 'Quick trim'),
    (CURRENT_DATE + 3, '10:00:00', 'Alex Turner', 'Fade Cut', 'Shop Owner', 40.00, 45, 'CONFIRMED', 'Premium service'),
    (CURRENT_DATE + 3, '14:30:00', 'Chris Evans', 'Classic Haircut', 'Shop Owner', 35.00, 30, 'PENDING', 'Tentative'),
    (CURRENT_DATE + 7, '16:00:00', 'Mark Johnson', 'Classic Haircut', 'Shop Owner', 35.00, 30, 'CONFIRMED', 'Monthly appointment')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✅ Calendar bookings added';
    
    RAISE NOTICE '';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '✅ SETUP COMPLETE!';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '👤 User: %', user_email;
    RAISE NOTICE '🏪 Barbershop: My Barbershop';
    RAISE NOTICE '💈 Services: 3 services created';
    RAISE NOTICE '📅 Bookings: 10 bookings added to calendar';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your system is ready to use!';
    RAISE NOTICE '===============================================';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error: %', SQLERRM;
        RAISE NOTICE 'Error detail: %', SQLSTATE;
END $$;

-- Verify the setup
SELECT 'Your Profile:' as section;
SELECT id, email, full_name, role, shop_id 
FROM public.profiles 
WHERE id IN (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1);

SELECT '' as spacer1;
SELECT 'Your Barbershop:' as section;
SELECT id, name, address, phone 
FROM public.barbershops 
WHERE owner_id IN (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1);

SELECT '' as spacer2;
SELECT 'Your Services:' as section;
SELECT name, price, duration_minutes 
FROM public.services 
WHERE shop_id IN (
    SELECT id FROM public.barbershops 
    WHERE owner_id IN (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1)
);

SELECT '' as spacer3;
SELECT 'Calendar Bookings (Next 7 Days):' as section;
SELECT booking_date, booking_time, customer_name, service_name, status 
FROM public.bookings 
WHERE booking_date >= CURRENT_DATE 
  AND booking_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY booking_date, booking_time;
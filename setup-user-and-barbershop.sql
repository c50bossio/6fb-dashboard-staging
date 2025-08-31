-- ===============================================
-- SETUP USER PROFILE AND BARBERSHOP DATA
-- ===============================================
-- This script sets up all necessary data for a complete working system

-- Step 1: Get the current authenticated user's ID (you need to be logged in)
-- This will be your actual user ID from Google OAuth or email login
DO $$
DECLARE
    current_user_id UUID;
    current_user_email TEXT;
    barbershop_id UUID;
    service_id UUID;
BEGIN
    -- Get current user from auth.users
    SELECT id, email INTO current_user_id, current_user_email
    FROM auth.users
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF current_user_id IS NULL THEN
        RAISE NOTICE 'No authenticated user found. Please login first.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Setting up data for user: % (%)', current_user_email, current_user_id;
    
    -- Step 2: Create or update barbershop
    INSERT INTO public.barbershops (
        id,
        name,
        owner_id,
        address,
        phone,
        email,
        business_hours,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        'Premium Cuts Barbershop',
        current_user_id,
        '123 Main Street, City, State 12345',
        '555-0100',
        current_user_email,
        jsonb_build_object(
            'monday', jsonb_build_object('open', '09:00', 'close', '18:00'),
            'tuesday', jsonb_build_object('open', '09:00', 'close', '18:00'),
            'wednesday', jsonb_build_object('open', '09:00', 'close', '18:00'),
            'thursday', jsonb_build_object('open', '09:00', 'close', '20:00'),
            'friday', jsonb_build_object('open', '09:00', 'close', '20:00'),
            'saturday', jsonb_build_object('open', '10:00', 'close', '16:00'),
            'sunday', jsonb_build_object('open', 'closed', 'close', 'closed')
        ),
        NOW(),
        NOW()
    )
    ON CONFLICT (owner_id) DO UPDATE
    SET 
        name = EXCLUDED.name,
        updated_at = NOW()
    RETURNING id INTO barbershop_id;
    
    RAISE NOTICE 'Barbershop created/updated with ID: %', barbershop_id;
    
    -- Step 3: Create or update user profile
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
        current_user_id,
        current_user_email,
        COALESCE(
            (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = current_user_id),
            'Shop Owner'
        ),
        '555-0100',
        'SHOP_OWNER',
        barbershop_id,
        barbershop_id,
        'professional',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        shop_id = barbershop_id,
        barbershop_id = barbershop_id,
        role = 'SHOP_OWNER',
        subscription_tier = 'professional',
        updated_at = NOW();
    
    RAISE NOTICE 'Profile created/updated for user';
    
    -- Step 4: Add user to barbershop_staff
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
        barbershop_id,
        current_user_id,
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
    
    RAISE NOTICE 'Added user to barbershop_staff as owner';
    
    -- Step 5: Create sample services
    INSERT INTO public.services (
        id,
        shop_id,
        name,
        description,
        price,
        duration_minutes,
        category,
        is_active,
        created_at,
        updated_at
    ) VALUES 
    (gen_random_uuid(), barbershop_id, 'Classic Haircut', 'Traditional barbershop haircut with hot towel finish', 35.00, 30, 'haircuts', true, NOW(), NOW()),
    (gen_random_uuid(), barbershop_id, 'Fade Cut', 'Modern fade haircut with precise blending', 40.00, 45, 'haircuts', true, NOW(), NOW()),
    (gen_random_uuid(), barbershop_id, 'Beard Trim', 'Professional beard shaping and trimming', 25.00, 20, 'beard', true, NOW(), NOW()),
    (gen_random_uuid(), barbershop_id, 'Hair & Beard Combo', 'Complete haircut and beard service', 55.00, 60, 'packages', true, NOW(), NOW()),
    (gen_random_uuid(), barbershop_id, 'Kids Cut', 'Haircut for children 12 and under', 25.00, 20, 'haircuts', true, NOW(), NOW())
    ON CONFLICT DO NOTHING
    RETURNING id INTO service_id;
    
    RAISE NOTICE 'Sample services created';
    
    -- Step 6: Create sample customers
    INSERT INTO public.customers (
        id,
        barbershop_id,
        name,
        email,
        phone,
        created_at,
        updated_at
    ) VALUES 
    (gen_random_uuid(), barbershop_id, 'John Smith', 'john.smith@example.com', '555-0201', NOW(), NOW()),
    (gen_random_uuid(), barbershop_id, 'Mike Johnson', 'mike.j@example.com', '555-0202', NOW(), NOW()),
    (gen_random_uuid(), barbershop_id, 'David Brown', 'david.b@example.com', '555-0203', NOW(), NOW()),
    (gen_random_uuid(), barbershop_id, 'James Wilson', 'james.w@example.com', '555-0204', NOW(), NOW()),
    (gen_random_uuid(), barbershop_id, 'Robert Davis', 'robert.d@example.com', '555-0205', NOW(), NOW())
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Sample customers created';
    
    -- Step 7: Create sample appointments
    INSERT INTO public.appointments (
        id,
        barbershop_id,
        customer_id,
        service_id,
        barber_id,
        date,
        start_time,
        end_time,
        status,
        notes,
        created_at,
        updated_at
    )
    SELECT 
        gen_random_uuid(),
        barbershop_id,
        c.id,
        s.id,
        current_user_id,
        CURRENT_DATE + (random() * 7)::int,
        (TIME '09:00:00' + (random() * INTERVAL '8 hours'))::time,
        (TIME '09:00:00' + (random() * INTERVAL '8 hours') + INTERVAL '30 minutes')::time,
        CASE WHEN random() > 0.5 THEN 'confirmed' ELSE 'pending' END,
        'Appointment created during setup',
        NOW(),
        NOW()
    FROM 
        (SELECT id FROM public.customers WHERE barbershop_id = barbershop_id LIMIT 3) c,
        (SELECT id FROM public.services WHERE shop_id = barbershop_id LIMIT 1) s
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Sample appointments created';
    
    -- Step 8: Create sample bookings (for calendar)
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
    (CURRENT_DATE + 1, '10:00:00', 'Mike Johnson', 'Fade Cut', 'Shop Owner', 40.00, 45, 'CONFIRMED', 'First time discount applied'),
    (CURRENT_DATE + 1, '11:00:00', 'David Brown', 'Hair & Beard Combo', 'Shop Owner', 55.00, 60, 'PENDING', 'Needs confirmation'),
    (CURRENT_DATE + 2, '14:00:00', 'James Wilson', 'Beard Trim', 'Shop Owner', 25.00, 20, 'CONFIRMED', 'VIP client'),
    (CURRENT_DATE + 2, '15:00:00', 'Robert Davis', 'Classic Haircut', 'Shop Owner', 35.00, 30, 'CONFIRMED', 'Monthly regular'),
    (CURRENT_DATE + 3, '10:30:00', 'John Smith', 'Kids Cut', 'Shop Owner', 25.00, 20, 'PENDING', 'For his son'),
    (CURRENT_DATE + 7, '16:00:00', 'Mike Johnson', 'Classic Haircut', 'Shop Owner', 35.00, 30, 'CONFIRMED', 'Weekly appointment')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Sample bookings created for calendar';
    
    -- Step 9: Success message
    RAISE NOTICE '';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '✅ SETUP COMPLETE!';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '🏪 Barbershop: Premium Cuts Barbershop';
    RAISE NOTICE '👤 Owner: %', current_user_email;
    RAISE NOTICE '💈 Services: 5 services created';
    RAISE NOTICE '👥 Customers: 5 sample customers';
    RAISE NOTICE '📅 Appointments: Sample appointments created';
    RAISE NOTICE '📆 Bookings: 7 bookings for the next week';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your 6FB AI Agent System is ready to use!';
    RAISE NOTICE '===============================================';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during setup: %', SQLERRM;
        RAISE NOTICE 'Some data may have been partially created';
END $$;

-- Step 10: Verify the setup
SELECT 'Current User Profile:' as info;
SELECT id, email, full_name, role, subscription_tier 
FROM public.profiles 
WHERE id = (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1);

SELECT '' as spacer1;
SELECT 'Your Barbershop:' as info;
SELECT id, name, address, phone 
FROM public.barbershops 
WHERE owner_id = (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1);

SELECT '' as spacer2;
SELECT 'Services Available:' as info;
SELECT name, price, duration_minutes 
FROM public.services 
WHERE shop_id IN (
    SELECT id FROM public.barbershops 
    WHERE owner_id = (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1)
);

SELECT '' as spacer3;
SELECT 'Upcoming Bookings:' as info;
SELECT booking_date, booking_time, customer_name, service_name, status 
FROM public.bookings 
WHERE booking_date >= CURRENT_DATE
ORDER BY booking_date, booking_time
LIMIT 10;
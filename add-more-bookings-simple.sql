-- ===============================================
-- ADD MORE BOOKINGS - SIMPLE VERSION
-- ===============================================
-- Just adds bookings without any complex dependencies

-- Clear old test bookings first (optional)
DELETE FROM public.bookings WHERE customer_name = 'Test Customer';

-- Add a variety of bookings for the next 2 weeks
INSERT INTO public.bookings (
    id,
    booking_date,
    booking_time,
    customer_name,
    service_name,
    barber_name,
    price,
    duration_minutes,
    status,
    notes,
    created_at,
    updated_at
) VALUES 
-- Tomorrow's bookings
(gen_random_uuid(), CURRENT_DATE + 1, '09:00:00', 'John Smith', 'Classic Haircut', 'Main Barber', 35.00, 30, 'CONFIRMED', 'Regular client - prefers short on sides', NOW(), NOW()),
(gen_random_uuid(), CURRENT_DATE + 1, '09:30:00', 'Mike Johnson', 'Fade Cut', 'Main Barber', 40.00, 45, 'CONFIRMED', 'New client referred by John', NOW(), NOW()),
(gen_random_uuid(), CURRENT_DATE + 1, '10:30:00', 'David Brown', 'Beard Trim', 'Main Barber', 25.00, 20, 'CONFIRMED', 'Just beard, no haircut', NOW(), NOW()),
(gen_random_uuid(), CURRENT_DATE + 1, '11:00:00', 'James Wilson', 'Hair & Beard Combo', 'Main Barber', 55.00, 60, 'PENDING', 'Needs to confirm time', NOW(), NOW()),
(gen_random_uuid(), CURRENT_DATE + 1, '14:00:00', 'Robert Davis', 'Classic Haircut', 'Main Barber', 35.00, 30, 'CONFIRMED', 'Monthly regular', NOW(), NOW()),
(gen_random_uuid(), CURRENT_DATE + 1, '14:30:00', 'Steve Miller', 'Kids Cut', 'Main Barber', 25.00, 20, 'CONFIRMED', 'For his son Tommy', NOW(), NOW()),
(gen_random_uuid(), CURRENT_DATE + 1, '15:00:00', 'Tom Anderson', 'Fade Cut', 'Main Barber', 40.00, 45, 'CONFIRMED', 'Wants high fade', NOW(), NOW()),
(gen_random_uuid(), CURRENT_DATE + 1, '16:00:00', 'Alex Turner', 'Classic Haircut', 'Main Barber', 35.00, 30, 'CONFIRMED', 'Last appointment of the day', NOW(), NOW()),

-- Day after tomorrow
(gen_random_uuid(), CURRENT_DATE + 2, '09:00:00', 'Chris Evans', 'Premium Cut', 'Senior Barber', 50.00, 45, 'CONFIRMED', 'VIP client', NOW(), NOW()),
(gen_random_uuid(), CURRENT_DATE + 2, '10:00:00', 'Mark Johnson', 'Classic Haircut', 'Main Barber', 35.00, 30, 'CONFIRMED', 'Bi-weekly regular', NOW(), NOW()),
(gen_random_uuid(), CURRENT_DATE + 2, '10:30:00', 'Paul White', 'Beard Trim', 'Main Barber', 25.00, 20, 'PENDING', 'Walk-in converted to appointment', NOW(), NOW()),
(gen_random_uuid(), CURRENT_DATE + 2, '11:00:00', 'Gary Brown', 'Fade Cut', 'Main Barber', 40.00, 45, 'CONFIRMED', 'Student discount applied', NOW(), NOW()),
(gen_random_uuid(), CURRENT_DATE + 2, '14:00:00', 'Frank Thomas', 'Hair & Beard', 'Senior Barber', 55.00, 60, 'CONFIRMED', 'Wedding prep', NOW(), NOW()),
(gen_random_uuid(), CURRENT_DATE + 2, '15:30:00', 'Nick Jones', 'Classic Haircut', 'Main Barber', 35.00, 30, 'CONFIRMED', 'First time customer', NOW(), NOW()),

-- 3 days from now
(gen_random_uuid(), CURRENT_DATE + 3, '10:00:00', 'Oliver Smith', 'Executive Package', 'Senior Barber', 75.00, 90, 'CONFIRMED', 'Full service package', NOW(), NOW()),
(gen_random_uuid(), CURRENT_DATE + 3, '11:30:00', 'Jake Wilson', 'Classic Haircut', 'Main Barber', 35.00, 30, 'CONFIRMED', 'Regular', NOW(), NOW()),
(gen_random_uuid(), CURRENT_DATE + 3, '14:00:00', 'Ryan Adams', 'Fade Cut', 'Main Barber', 40.00, 45, 'PENDING', 'Tentative - may reschedule', NOW(), NOW()),
(gen_random_uuid(), CURRENT_DATE + 3, '15:00:00', 'Sam Parker', 'Beard Trim', 'Main Barber', 25.00, 20, 'CONFIRMED', 'Quick trim before event', NOW(), NOW()),

-- Weekend bookings (4 days from now)
(gen_random_uuid(), CURRENT_DATE + 4, '09:00:00', 'Weekend Rush 1', 'Classic Haircut', 'Main Barber', 35.00, 30, 'CONFIRMED', 'Saturday morning', NOW(), NOW()),
(gen_random_uuid(), CURRENT_DATE + 4, '09:30:00', 'Weekend Rush 2', 'Fade Cut', 'Main Barber', 40.00, 45, 'CONFIRMED', 'Saturday morning', NOW(), NOW()),
(gen_random_uuid(), CURRENT_DATE + 4, '10:30:00', 'Weekend Rush 3', 'Kids Cut', 'Main Barber', 25.00, 20, 'CONFIRMED', 'Father and son', NOW(), NOW()),
(gen_random_uuid(), CURRENT_DATE + 4, '11:00:00', 'Weekend Rush 4', 'Classic Haircut', 'Main Barber', 35.00, 30, 'CONFIRMED', 'Walk-in slot', NOW(), NOW()),

-- Next week samples
(gen_random_uuid(), CURRENT_DATE + 7, '10:00:00', 'John Smith', 'Classic Haircut', 'Main Barber', 35.00, 30, 'CONFIRMED', 'Weekly regular back again', NOW(), NOW()),
(gen_random_uuid(), CURRENT_DATE + 7, '14:00:00', 'Mike Johnson', 'Fade Cut', 'Main Barber', 40.00, 45, 'CONFIRMED', 'Follow-up appointment', NOW(), NOW()),
(gen_random_uuid(), CURRENT_DATE + 8, '11:00:00', 'David Brown', 'Hair & Beard', 'Senior Barber', 55.00, 60, 'PENDING', 'Needs to confirm', NOW(), NOW()),
(gen_random_uuid(), CURRENT_DATE + 9, '15:00:00', 'James Wilson', 'Classic Haircut', 'Main Barber', 35.00, 30, 'CONFIRMED', 'After work appointment', NOW(), NOW()),
(gen_random_uuid(), CURRENT_DATE + 10, '09:30:00', 'Robert Davis', 'Beard Trim', 'Main Barber', 25.00, 20, 'CONFIRMED', 'Quick morning trim', NOW(), NOW()),
(gen_random_uuid(), CURRENT_DATE + 14, '16:00:00', 'Monthly Review', 'Classic Haircut', 'Senior Barber', 35.00, 30, 'PENDING', 'End of month booking', NOW(), NOW());

-- Show summary of what was added
SELECT 'Bookings Summary:' as info;
SELECT 
    COUNT(*) as total_bookings,
    COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END) as confirmed,
    COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
    MIN(booking_date) as earliest_booking,
    MAX(booking_date) as latest_booking
FROM public.bookings;

-- Show bookings for the next 7 days
SELECT '' as spacer;
SELECT 'Next 7 Days Schedule:' as info;
SELECT 
    booking_date,
    booking_time,
    customer_name,
    service_name,
    barber_name,
    status
FROM public.bookings 
WHERE booking_date >= CURRENT_DATE 
  AND booking_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY booking_date, booking_time;
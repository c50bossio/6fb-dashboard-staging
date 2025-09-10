-- =====================================================
-- STAFF SEED DATA FOR 6FB AI AGENT SYSTEM
-- =====================================================
-- Based on mock data from app/dashboard/staff/page.js
-- Run this after creating the staff table schema

-- Clear existing data (for development/testing)
-- TRUNCATE staff CASCADE;

-- Insert seed staff data
INSERT INTO staff (
    id,
    name,
    email,
    phone,
    role,
    hire_date,
    commission_rate,
    hourly_rate,
    is_active,
    specialties,
    weekly_hours,
    total_appointments_week,
    total_revenue_week,
    average_rating,
    total_reviews,
    default_schedule,
    profile_image
) VALUES
    (
        'staff_marcus',
        'Marcus Johnson',
        'marcus.johnson@barbershop.com',
        '(555) 123-4567',
        'senior_barber',
        '2023-01-15',
        80.00,
        25.00,
        true,
        ARRAY['Haircuts', 'Beard Trims', 'Hot Shaves'],
        40.00,
        32,
        1280.00,
        4.9,
        87,
        '{
            "monday": {"start": "09:00", "end": "17:00", "available": true},
            "tuesday": {"start": "09:00", "end": "17:00", "available": true},
            "wednesday": {"start": "09:00", "end": "17:00", "available": true},
            "thursday": {"start": "09:00", "end": "17:00", "available": true},
            "friday": {"start": "09:00", "end": "18:00", "available": true},
            "saturday": {"start": "08:00", "end": "16:00", "available": true},
            "sunday": {"start": "", "end": "", "available": false}
        }',
        null
    ),
    (
        'staff_david',
        'David Wilson',
        'david.wilson@barbershop.com',
        '(555) 987-6543',
        'barber',
        '2023-06-20',
        75.00,
        22.00,
        true,
        ARRAY['Haircuts', 'Styling', 'Color'],
        35.00,
        28,
        980.00,
        4.7,
        56,
        '{
            "monday": {"start": "10:00", "end": "18:00", "available": true},
            "tuesday": {"start": "10:00", "end": "18:00", "available": true},
            "wednesday": {"start": "", "end": "", "available": false},
            "thursday": {"start": "10:00", "end": "18:00", "available": true},
            "friday": {"start": "10:00", "end": "18:00", "available": true},
            "saturday": {"start": "09:00", "end": "17:00", "available": true},
            "sunday": {"start": "10:00", "end": "15:00", "available": true}
        }',
        null
    ),
    (
        'staff_sophia',
        'Sophia Martinez',
        'sophia.martinez@barbershop.com',
        '(555) 456-7890',
        'master_barber',
        '2022-03-10',
        85.00,
        28.00,
        true,
        ARRAY['Premium Cuts', 'Beard Design', 'Traditional Shaves'],
        38.00,
        25,
        1375.00,
        4.95,
        134,
        '{
            "monday": {"start": "09:00", "end": "17:00", "available": true},
            "tuesday": {"start": "09:00", "end": "17:00", "available": true},
            "wednesday": {"start": "09:00", "end": "17:00", "available": true},
            "thursday": {"start": "09:00", "end": "17:00", "available": true},
            "friday": {"start": "09:00", "end": "17:00", "available": true},
            "saturday": {"start": "08:00", "end": "14:00", "available": true},
            "sunday": {"start": "", "end": "", "available": false}
        }',
        null
    ),
    -- Additional staff for more comprehensive testing
    (
        'staff_james',
        'James Thompson',
        'james.thompson@barbershop.com',
        '(555) 345-6789',
        'barber',
        '2023-09-12',
        70.00,
        20.00,
        true,
        ARRAY['Haircuts', 'Fade Cuts', 'Kids Cuts'],
        36.00,
        30,
        900.00,
        4.6,
        42,
        '{
            "monday": {"start": "08:00", "end": "16:00", "available": true},
            "tuesday": {"start": "08:00", "end": "16:00", "available": true},
            "wednesday": {"start": "08:00", "end": "16:00", "available": true},
            "thursday": {"start": "08:00", "end": "16:00", "available": true},
            "friday": {"start": "08:00", "end": "16:00", "available": true},
            "saturday": {"start": "", "end": "", "available": false},
            "sunday": {"start": "", "end": "", "available": false}
        }',
        null
    ),
    (
        'staff_elena',
        'Elena Rodriguez',
        'elena.rodriguez@barbershop.com',
        '(555) 567-8901',
        'senior_barber',
        '2022-11-08',
        78.00,
        24.00,
        true,
        ARRAY['Haircuts', 'Color Services', 'Hair Treatments'],
        42.00,
        35,
        1225.00,
        4.8,
        91,
        '{
            "monday": {"start": "09:00", "end": "18:00", "available": true},
            "tuesday": {"start": "09:00", "end": "18:00", "available": true},
            "wednesday": {"start": "09:00", "end": "18:00", "available": true},
            "thursday": {"start": "09:00", "end": "18:00", "available": true},
            "friday": {"start": "09:00", "end": "18:00", "available": true},
            "saturday": {"start": "08:00", "end": "15:00", "available": true},
            "sunday": {"start": "", "end": "", "available": false}
        }',
        null
    ),
    (
        'staff_manager',
        'Michael Chen',
        'michael.chen@barbershop.com',
        '(555) 678-9012',
        'manager',
        '2021-05-15',
        90.00,
        35.00,
        true,
        ARRAY['All Services', 'Business Operations', 'Staff Training'],
        45.00,
        20,
        1500.00,
        4.9,
        156,
        '{
            "monday": {"start": "08:00", "end": "18:00", "available": true},
            "tuesday": {"start": "08:00", "end": "18:00", "available": true},
            "wednesday": {"start": "08:00", "end": "18:00", "available": true},
            "thursday": {"start": "08:00", "end": "18:00", "available": true},
            "friday": {"start": "08:00", "end": "18:00", "available": true},
            "saturday": {"start": "09:00", "end": "16:00", "available": true},
            "sunday": {"start": "", "end": "", "available": false}
        }',
        null
    ),
    (
        'staff_apprentice',
        'Tyler Jackson',
        'tyler.jackson@barbershop.com',
        '(555) 789-0123',
        'apprentice',
        '2024-01-15',
        60.00,
        15.00,
        true,
        ARRAY['Basic Haircuts', 'Shampooing'],
        30.00,
        20,
        400.00,
        4.3,
        15,
        '{
            "monday": {"start": "10:00", "end": "17:00", "available": true},
            "tuesday": {"start": "10:00", "end": "17:00", "available": true},
            "wednesday": {"start": "10:00", "end": "17:00", "available": true},
            "thursday": {"start": "10:00", "end": "17:00", "available": true},
            "friday": {"start": "10:00", "end": "17:00", "available": true},
            "saturday": {"start": "", "end": "", "available": false},
            "sunday": {"start": "", "end": "", "available": false}
        }',
        null
    );

-- Insert detailed schedules for each staff member
INSERT INTO staff_schedules (
    staff_id,
    day_of_week,
    start_time,
    end_time,
    is_available
) VALUES
    -- Marcus Johnson schedule
    ('staff_marcus', 'monday', '09:00', '17:00', true),
    ('staff_marcus', 'tuesday', '09:00', '17:00', true),
    ('staff_marcus', 'wednesday', '09:00', '17:00', true),
    ('staff_marcus', 'thursday', '09:00', '17:00', true),
    ('staff_marcus', 'friday', '09:00', '18:00', true),
    ('staff_marcus', 'saturday', '08:00', '16:00', true),
    ('staff_marcus', 'sunday', '09:00', '17:00', false),
    
    -- David Wilson schedule
    ('staff_david', 'monday', '10:00', '18:00', true),
    ('staff_david', 'tuesday', '10:00', '18:00', true),
    ('staff_david', 'wednesday', '10:00', '18:00', false),
    ('staff_david', 'thursday', '10:00', '18:00', true),
    ('staff_david', 'friday', '10:00', '18:00', true),
    ('staff_david', 'saturday', '09:00', '17:00', true),
    ('staff_david', 'sunday', '10:00', '15:00', true),
    
    -- Sophia Martinez schedule
    ('staff_sophia', 'monday', '09:00', '17:00', true),
    ('staff_sophia', 'tuesday', '09:00', '17:00', true),
    ('staff_sophia', 'wednesday', '09:00', '17:00', true),
    ('staff_sophia', 'thursday', '09:00', '17:00', true),
    ('staff_sophia', 'friday', '09:00', '17:00', true),
    ('staff_sophia', 'saturday', '08:00', '14:00', true),
    ('staff_sophia', 'sunday', '09:00', '17:00', false),
    
    -- James Thompson schedule
    ('staff_james', 'monday', '08:00', '16:00', true),
    ('staff_james', 'tuesday', '08:00', '16:00', true),
    ('staff_james', 'wednesday', '08:00', '16:00', true),
    ('staff_james', 'thursday', '08:00', '16:00', true),
    ('staff_james', 'friday', '08:00', '16:00', true),
    ('staff_james', 'saturday', '08:00', '16:00', false),
    ('staff_james', 'sunday', '08:00', '16:00', false),
    
    -- Elena Rodriguez schedule
    ('staff_elena', 'monday', '09:00', '18:00', true),
    ('staff_elena', 'tuesday', '09:00', '18:00', true),
    ('staff_elena', 'wednesday', '09:00', '18:00', true),
    ('staff_elena', 'thursday', '09:00', '18:00', true),
    ('staff_elena', 'friday', '09:00', '18:00', true),
    ('staff_elena', 'saturday', '08:00', '15:00', true),
    ('staff_elena', 'sunday', '09:00', '18:00', false),
    
    -- Michael Chen (Manager) schedule
    ('staff_manager', 'monday', '08:00', '18:00', true),
    ('staff_manager', 'tuesday', '08:00', '18:00', true),
    ('staff_manager', 'wednesday', '08:00', '18:00', true),
    ('staff_manager', 'thursday', '08:00', '18:00', true),
    ('staff_manager', 'friday', '08:00', '18:00', true),
    ('staff_manager', 'saturday', '09:00', '16:00', true),
    ('staff_manager', 'sunday', '08:00', '18:00', false),
    
    -- Tyler Jackson (Apprentice) schedule
    ('staff_apprentice', 'monday', '10:00', '17:00', true),
    ('staff_apprentice', 'tuesday', '10:00', '17:00', true),
    ('staff_apprentice', 'wednesday', '10:00', '17:00', true),
    ('staff_apprentice', 'thursday', '10:00', '17:00', true),
    ('staff_apprentice', 'friday', '10:00', '17:00', true),
    ('staff_apprentice', 'saturday', '10:00', '17:00', false),
    ('staff_apprentice', 'sunday', '10:00', '17:00', false);

-- Insert some sample time off requests
INSERT INTO staff_time_off (
    staff_id,
    start_date,
    end_date,
    time_off_type,
    status,
    reason
) VALUES
    (
        'staff_david',
        CURRENT_DATE + INTERVAL '2 weeks',
        CURRENT_DATE + INTERVAL '2 weeks' + INTERVAL '2 days',
        'vacation',
        'approved',
        'Family vacation planned in advance'
    ),
    (
        'staff_sophia',
        CURRENT_DATE + INTERVAL '1 month',
        CURRENT_DATE + INTERVAL '1 month',
        'training',
        'approved',
        'Advanced cutting techniques workshop'
    ),
    (
        'staff_apprentice',
        CURRENT_DATE + INTERVAL '3 days',
        CURRENT_DATE + INTERVAL '3 days',
        'sick_leave',
        'pending',
        'Not feeling well, need recovery day'
    );

-- Update row count for verification
SELECT 'Staff seed data inserted successfully.' as message,
       COUNT(*) as total_staff,
       COUNT(CASE WHEN is_active = true THEN 1 END) as active_staff,
       COUNT(CASE WHEN role = 'master_barber' THEN 1 END) as master_barbers,
       COUNT(CASE WHEN role = 'senior_barber' THEN 1 END) as senior_barbers,
       COUNT(CASE WHEN role = 'barber' THEN 1 END) as barbers,
       COUNT(CASE WHEN role = 'apprentice' THEN 1 END) as apprentices,
       COUNT(CASE WHEN role = 'manager' THEN 1 END) as managers
FROM staff;
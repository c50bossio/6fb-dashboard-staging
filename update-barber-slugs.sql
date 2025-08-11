-- Update barber customizations with proper slugs for routing
-- This ensures barber profiles can be accessed via barbershop.com/barbershop-slug/barber-slug

-- Add slug column to barber_customizations if not exists
ALTER TABLE barber_customizations ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;

-- Update barber customizations with slugs based on user profiles
UPDATE barber_customizations 
SET slug = LOWER(REPLACE(
    COALESCE(
        (SELECT full_name FROM profiles WHERE profiles.id = barber_customizations.barber_id),
        (SELECT SPLIT_PART(email, '@', 1) FROM auth.users WHERE auth.users.id = barber_customizations.barber_id)
    ), 
    ' ', '-'
))
WHERE slug IS NULL;

-- Insert missing barber customizations for existing barbers
INSERT INTO barber_customizations (barbershop_id, barber_id, slug, display_name, specialty, bio)
SELECT 
    bs.barbershop_id,
    bs.user_id,
    LOWER(REPLACE(COALESCE(p.full_name, SPLIT_PART(u.email, '@', 1)), ' ', '-')) as slug,
    COALESCE(p.full_name, SPLIT_PART(u.email, '@', 1)) as display_name,
    'Hair Styling & Cuts' as specialty,
    'Professional barber with years of experience providing quality cuts and styling.' as bio
FROM barbershop_staff bs
LEFT JOIN profiles p ON p.id = bs.user_id
LEFT JOIN auth.users u ON u.id = bs.user_id
LEFT JOIN barber_customizations bc ON bc.barber_id = bs.user_id
WHERE bc.id IS NULL
AND bs.role = 'BARBER'
AND bs.is_active = true;

-- Update existing barber customizations with better data
UPDATE barber_customizations 
SET 
    display_name = COALESCE(
        (SELECT full_name FROM profiles WHERE profiles.id = barber_customizations.barber_id),
        display_name
    ),
    specialty = COALESCE(specialty, 'Professional Hair Styling'),
    bio = COALESCE(bio, 'Experienced barber dedicated to providing excellent service and quality cuts.'),
    available_days = COALESCE(available_days, ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']),
    start_time = COALESCE(start_time, '09:00'),
    end_time = COALESCE(end_time, '18:00')
WHERE barber_id IN (
    SELECT user_id FROM barbershop_staff WHERE role = 'BARBER' AND is_active = true
);

-- Verify the updates
SELECT 
    b.name as barbershop_name,
    b.slug as barbershop_slug,
    bc.display_name as barber_name,
    bc.slug as barber_slug,
    bc.specialty,
    p.email
FROM barber_customizations bc
JOIN barbershops b ON b.id = bc.barbershop_id
JOIN profiles p ON p.id = bc.barber_id
ORDER BY b.name, bc.display_name;
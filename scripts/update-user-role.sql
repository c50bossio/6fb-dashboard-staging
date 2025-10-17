-- Fix ENTERPRISE_OWNER Role Assignment
-- Run this in Supabase SQL Editor to grant proper access

-- First, check what the current role is
SELECT email, role, full_name, id 
FROM profiles 
WHERE email LIKE '%bossio%' OR email LIKE '%chris%'
ORDER BY email;

-- Update the role to ENTERPRISE_OWNER
-- Replace 'your-email@example.com' with your actual email address
UPDATE profiles 
SET role = 'ENTERPRISE_OWNER'
WHERE email = 'your-email@example.com';

-- Alternative: Update by partial email match (if you're not sure of the exact email)
-- UPDATE profiles 
-- SET role = 'ENTERPRISE_OWNER'
-- WHERE email LIKE '%bossio%';

-- Verify the update worked
SELECT email, role, full_name, barbershop_id, shop_id
FROM profiles 
WHERE role = 'ENTERPRISE_OWNER'
ORDER BY email;

-- Also ensure the user has a shop association (if needed)
-- Check current barbershop/shop associations:
SELECT 
  p.email, 
  p.role, 
  p.barbershop_id,
  p.shop_id,
  b.name as barbershop_name
FROM profiles p
LEFT JOIN barbershops b ON (p.barbershop_id = b.id OR p.shop_id = b.id)
WHERE p.email = 'your-email@example.com';

-- If no shop association exists, you may need to assign one:
-- UPDATE profiles 
-- SET barbershop_id = (SELECT id FROM barbershops LIMIT 1)
-- WHERE email = 'your-email@example.com' AND (barbershop_id IS NULL AND shop_id IS NULL);
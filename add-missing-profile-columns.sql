-- Add missing columns to profiles table to fix frontend errors
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/sql

-- Add shop_id column (reference to barbershop)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES barbershops(id);

-- Add barbershop_name column (denormalized for quick access)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS barbershop_name TEXT;

-- Update existing dev user profile with barbershop data
UPDATE profiles 
SET 
  shop_id = (
    SELECT id 
    FROM barbershops 
    WHERE owner_id = profiles.id 
    LIMIT 1
  ),
  barbershop_name = (
    SELECT name 
    FROM barbershops 
    WHERE owner_id = profiles.id 
    LIMIT 1
  )
WHERE id = 'bbb243c4-cc7d-4458-af03-3bfff742aee5';

-- Verify the update
SELECT 
  id, 
  email, 
  role, 
  shop_id, 
  barbershop_name,
  shop_name
FROM profiles 
WHERE id = 'bbb243c4-cc7d-4458-af03-3bfff742aee5';
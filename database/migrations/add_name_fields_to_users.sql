-- Migration: Add first_name and last_name fields to users table
-- Purpose: Simplify staff name management by storing names in separate fields
-- Date: 2025-08-27

-- Add first_name and last_name columns if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Populate the new fields from existing full_name data
UPDATE users 
SET 
  first_name = CASE 
    WHEN full_name IS NOT NULL AND full_name != '' THEN
      TRIM(SUBSTRING(full_name FROM '^[^ ]+'))
    ELSE NULL
  END,
  last_name = CASE
    WHEN full_name IS NOT NULL AND full_name != '' AND POSITION(' ' IN full_name) > 0 THEN
      TRIM(SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1))
    ELSE NULL
  END
WHERE (first_name IS NULL OR last_name IS NULL) 
  AND full_name IS NOT NULL 
  AND full_name != '';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_first_name ON users(first_name);
CREATE INDEX IF NOT EXISTS idx_users_last_name ON users(last_name);

-- Update Chris Bossio specifically (if exists)
UPDATE users 
SET 
  first_name = 'Chris',
  last_name = 'Bossio',
  full_name = 'Chris Bossio'
WHERE email = 'c50bossio@gmail.com';
-- Fix all remaining onboarding issues
-- 1. Add missing column
-- 2. Fix invalid JSON data
-- 3. Ensure profile is properly configured

-- Add missing onboarding_last_step column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_last_step VARCHAR(100);

-- Fix the invalid JSON in onboarding_data
-- If it contains '[object Object]' or other invalid JSON, reset it to empty object
UPDATE profiles 
SET onboarding_data = '{}'::jsonb
WHERE id = 'befcd3e1-8722-449b-8dd3-cdf7e1f59483'
AND (
    onboarding_data IS NULL 
    OR onboarding_data::text = '[object Object]'
    OR onboarding_data::text = '"[object Object]"'
    OR onboarding_data::text LIKE '%[object Object]%'
);

-- Ensure the profile has all necessary fields
UPDATE profiles 
SET 
    onboarding_completed = COALESCE(onboarding_completed, false),
    onboarding_step = COALESCE(onboarding_step, 0),
    onboarding_data = COALESCE(onboarding_data, '{}'::jsonb),
    onboarding_last_step = COALESCE(onboarding_last_step, ''),
    updated_at = NOW()
WHERE id = 'befcd3e1-8722-449b-8dd3-cdf7e1f59483';

-- Verify the fix
SELECT 
    id,
    email,
    onboarding_completed,
    onboarding_step,
    onboarding_last_step,
    CASE 
        WHEN onboarding_data::text LIKE '%[object Object]%' THEN '❌ Still has invalid JSON'
        WHEN onboarding_data IS NULL THEN '❌ NULL data'
        ELSE '✅ Valid JSON'
    END as data_status,
    LENGTH(onboarding_data::text) as data_length
FROM profiles
WHERE id = 'befcd3e1-8722-449b-8dd3-cdf7e1f59483';
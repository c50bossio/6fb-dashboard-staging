-- Populate empty first_name and last_name fields from full_name
-- This migration fixes the issue where profiles have full_name but empty first_name/last_name

-- Update first_name and last_name where they are empty but full_name exists
UPDATE public.profiles 
SET 
  first_name = CASE 
    WHEN full_name IS NOT NULL AND trim(full_name) != '' THEN 
      trim(split_part(full_name, ' ', 1))
    ELSE first_name 
  END,
  last_name = CASE 
    WHEN full_name IS NOT NULL AND trim(full_name) != '' THEN 
      trim(substring(full_name from position(' ' in full_name) + 1))
    ELSE last_name 
  END,
  updated_at = NOW()
WHERE 
  (first_name IS NULL OR trim(first_name) = '') 
  OR (last_name IS NULL OR trim(last_name) = '')
  AND full_name IS NOT NULL 
  AND trim(full_name) != '';

-- Also ensure that if we have first_name and last_name but empty full_name, 
-- we populate full_name
UPDATE public.profiles 
SET 
  full_name = trim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')),
  updated_at = NOW()
WHERE 
  (full_name IS NULL OR trim(full_name) = '') 
  AND (first_name IS NOT NULL AND trim(first_name) != '' 
       OR last_name IS NOT NULL AND trim(last_name) != '');

-- Log the changes
DO $$ 
BEGIN
  RAISE NOTICE 'Name population migration completed at %', NOW();
  RAISE NOTICE 'Updated profiles with missing first_name/last_name from full_name';
  RAISE NOTICE 'Updated profiles with missing full_name from first_name/last_name';
END $$;
-- Add first_name and last_name columns to profiles table, then populate them
-- This handles the case where these columns don't exist yet

-- Step 1: Add the columns if they don't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Step 2: Populate first_name and last_name from full_name where they are empty
UPDATE public.profiles 
SET 
  first_name = CASE 
    WHEN full_name IS NOT NULL AND trim(full_name) != '' THEN 
      trim(split_part(full_name, ' ', 1))
    ELSE first_name 
  END,
  last_name = CASE 
    WHEN full_name IS NOT NULL AND trim(full_name) != '' AND position(' ' in full_name) > 0 THEN 
      trim(substring(full_name from position(' ' in full_name) + 1))
    ELSE last_name 
  END,
  updated_at = NOW()
WHERE 
  full_name IS NOT NULL 
  AND trim(full_name) != ''
  AND (
    first_name IS NULL OR trim(first_name) = '' OR 
    last_name IS NULL OR trim(last_name) = ''
  );

-- Step 3: Also populate full_name from first_name/last_name if full_name is empty
UPDATE public.profiles 
SET 
  full_name = trim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')),
  updated_at = NOW()
WHERE 
  (full_name IS NULL OR trim(full_name) = '') 
  AND (
    (first_name IS NOT NULL AND trim(first_name) != '') OR 
    (last_name IS NOT NULL AND trim(last_name) != '')
  );

-- Step 4: Log the changes
DO $$ 
DECLARE
  updated_count INTEGER;
BEGIN
  -- Count profiles that now have names
  SELECT COUNT(*) INTO updated_count 
  FROM public.profiles 
  WHERE first_name IS NOT NULL OR last_name IS NOT NULL OR full_name IS NOT NULL;
  
  RAISE NOTICE 'Name migration completed at %', NOW();
  RAISE NOTICE 'Total profiles with name data: %', updated_count;
  RAISE NOTICE 'Added first_name and last_name columns to profiles table';
  RAISE NOTICE 'Populated missing name fields from existing data';
END $$;

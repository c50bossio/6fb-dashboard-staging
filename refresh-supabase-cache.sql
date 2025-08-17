-- Force Supabase to refresh its schema cache
-- This will make PostgREST recognize the new columns we added

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Alternative method: Call the reload function if available
-- SELECT pg_notify('pgrst', 'reload schema');

-- Verify the columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'profiles'
    AND column_name IN ('onboarding_data', 'onboarding_last_step', 'onboarding_progress_percentage')
ORDER BY 
    ordinal_position;

-- Check if the columns are properly visible
SELECT 
    onboarding_data,
    onboarding_last_step,
    onboarding_progress_percentage
FROM profiles 
LIMIT 1;
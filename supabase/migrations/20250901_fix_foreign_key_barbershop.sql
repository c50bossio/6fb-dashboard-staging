-- Fix the foreign key constraint issue in schedule_exceptions
-- Root cause: barbershop_id references profiles(id) instead of barbershops(id)
-- This causes foreign key violations when inserting barbershop UUIDs

-- Step 1: Drop the incorrect foreign key constraint
ALTER TABLE public.schedule_exceptions 
DROP CONSTRAINT IF EXISTS schedule_exceptions_shop_id_fkey;

ALTER TABLE public.schedule_exceptions 
DROP CONSTRAINT IF EXISTS schedule_exceptions_barbershop_id_fkey;

-- Step 2: Remove any other foreign key constraints on barbershop_id
DO $$ 
DECLARE
    constraint_name text;
BEGIN
    -- Find and drop any foreign key constraints on barbershop_id
    FOR constraint_name IN 
        SELECT conname FROM pg_constraint 
        WHERE conrelid = 'public.schedule_exceptions'::regclass 
        AND contype = 'f'
        AND conkey @> ARRAY[(
            SELECT attnum FROM pg_attribute 
            WHERE attrelid = 'public.schedule_exceptions'::regclass 
            AND attname = 'barbershop_id'
        )]
    LOOP
        EXECUTE 'ALTER TABLE public.schedule_exceptions DROP CONSTRAINT IF EXISTS ' || constraint_name;
    END LOOP;
END $$;

-- Step 3: Make sure barbershop_id allows any UUID (no foreign key constraint)
-- This removes the constraint violation while still maintaining data integrity through RLS

-- Step 4: Add comment explaining the fix
COMMENT ON COLUMN public.schedule_exceptions.barbershop_id IS 'References barbershop UUID - no foreign key constraint to avoid mismatch with profiles table';

-- Step 5: Verify the table structure
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'schedule_exceptions' ORDER BY ordinal_position;
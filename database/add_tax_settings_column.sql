-- Add tax_settings column to business_settings table if it doesn't exist
DO $$ 
BEGIN
  -- Check if the column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'business_settings' 
    AND column_name = 'tax_settings'
  ) THEN
    ALTER TABLE public.business_settings 
    ADD COLUMN tax_settings JSONB DEFAULT '{}';
    
    RAISE NOTICE 'Added tax_settings column to business_settings table';
  ELSE
    RAISE NOTICE 'tax_settings column already exists in business_settings table';
  END IF;
END $$;

-- Ensure RLS policies allow access to the new column
-- (The existing RLS policies should cover this automatically)
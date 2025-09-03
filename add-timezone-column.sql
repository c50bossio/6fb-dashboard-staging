-- Add missing timezone column to barbershops table
-- This field is required for the location settings page to function properly

-- Add timezone column for storing location-specific time zones
ALTER TABLE public.barbershops 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

-- Add index for performance on timezone queries
CREATE INDEX IF NOT EXISTS idx_barbershops_timezone 
ON public.barbershops(timezone);

-- Add a comment explaining this field
COMMENT ON COLUMN public.barbershops.timezone IS 'IANA timezone identifier for the barbershop location (e.g., America/New_York, America/Los_Angeles)';

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'barbershops' 
  AND table_schema = 'public'
  AND column_name = 'timezone';
-- Add missing latitude and longitude columns to barbershops table
-- These fields are required for the location settings page to function properly

-- Add latitude and longitude columns for geocoding functionality
ALTER TABLE public.barbershops 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add indexes for performance on geographic queries
CREATE INDEX IF NOT EXISTS idx_barbershops_coordinates 
ON public.barbershops(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add a comment explaining these fields
COMMENT ON COLUMN public.barbershops.latitude IS 'Decimal latitude for geocoding and maps (-90.0000000 to 90.0000000)';
COMMENT ON COLUMN public.barbershops.longitude IS 'Decimal longitude for geocoding and maps (-180.00000000 to 180.00000000)';

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'barbershops' 
  AND table_schema = 'public'
  AND column_name IN ('latitude', 'longitude');
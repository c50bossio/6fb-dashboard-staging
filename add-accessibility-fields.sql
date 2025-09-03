-- Add missing service area and accessibility fields to barbershops table
-- These fields are required for the location settings page Service Area and Accessibility sections

-- Add service area fields
ALTER TABLE public.barbershops 
ADD COLUMN IF NOT EXISTS mobile_services BOOLEAN DEFAULT false;

-- Add accessibility and amenity fields
ALTER TABLE public.barbershops 
ADD COLUMN IF NOT EXISTS parking_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS wheelchair_accessible BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS public_transit_nearby BOOLEAN DEFAULT false;

-- Add landmark/directions field
ALTER TABLE public.barbershops 
ADD COLUMN IF NOT EXISTS landmark_description TEXT;

-- Add indexes for performance on boolean queries
CREATE INDEX IF NOT EXISTS idx_barbershops_mobile_services 
ON public.barbershops(mobile_services) 
WHERE mobile_services = true;

CREATE INDEX IF NOT EXISTS idx_barbershops_accessibility 
ON public.barbershops(wheelchair_accessible, parking_available, public_transit_nearby) 
WHERE wheelchair_accessible = true OR parking_available = true OR public_transit_nearby = true;

-- Add comments explaining these fields
COMMENT ON COLUMN public.barbershops.mobile_services IS 'Whether the barbershop offers mobile or on-location services';
COMMENT ON COLUMN public.barbershops.parking_available IS 'Whether parking is available at or near the location';
COMMENT ON COLUMN public.barbershops.wheelchair_accessible IS 'Whether the location is wheelchair accessible';
COMMENT ON COLUMN public.barbershops.public_transit_nearby IS 'Whether public transportation is nearby';
COMMENT ON COLUMN public.barbershops.landmark_description IS 'Additional directions or landmark information for finding the location';

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'barbershops' 
  AND table_schema = 'public'
  AND column_name IN ('mobile_services', 'parking_available', 'wheelchair_accessible', 'public_transit_nearby', 'landmark_description')
ORDER BY column_name;
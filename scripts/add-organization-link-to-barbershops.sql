-- Add organization_id column to barbershops table
-- This allows barbershops to be linked to organizations for enterprise management

ALTER TABLE public.barbershops 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_barbershops_organization_id ON public.barbershops(organization_id);

-- Update Tomb45 Channelside to link to 6FB Enterprise
UPDATE public.barbershops 
SET organization_id = (
  SELECT id FROM public.organizations 
  WHERE name = '6FB Enterprise' 
  LIMIT 1
)
WHERE name = 'Tomb45 Channelside';

-- Verify the update
SELECT 
  b.name as barbershop_name,
  o.name as organization_name,
  b.organization_id
FROM public.barbershops b
LEFT JOIN public.organizations o ON b.organization_id = o.id
WHERE b.name = 'Tomb45 Channelside';
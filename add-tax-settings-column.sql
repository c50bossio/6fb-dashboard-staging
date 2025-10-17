-- Add missing tax_settings column to business_settings table
-- This field is required for the tax & compliance settings page to function properly

-- Add tax_settings column for storing tax configuration
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS tax_settings JSONB DEFAULT '{}'::jsonb;

-- Add index for performance on tax_settings queries
CREATE INDEX IF NOT EXISTS idx_business_settings_tax_settings 
ON public.business_settings USING gin(tax_settings);

-- Add a comment explaining this field
COMMENT ON COLUMN public.business_settings.tax_settings IS 'JSON configuration for tax settings including Stripe Tax integration, business information, and display preferences';

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'business_settings' 
  AND table_schema = 'public'
  AND column_name = 'tax_settings';
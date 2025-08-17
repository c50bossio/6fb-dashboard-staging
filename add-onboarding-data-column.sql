-- Add missing onboarding_data column to profiles table
-- This fixes the 400 and 406 errors in the onboarding modal

-- Add onboarding_data column to store JSON data for onboarding progress
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}';

-- Ensure all other required onboarding columns exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;

-- Create index for faster queries if not exists
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_step ON profiles(onboarding_step);

-- Add comment to document the structure of onboarding_data
COMMENT ON COLUMN profiles.onboarding_data IS 'JSON object storing onboarding progress data including role, business info, services, and completed steps';

-- Example structure of onboarding_data:
-- {
--   "role": "SHOP_OWNER",
--   "businessName": "Premium Cuts Studio",
--   "businessAddress": "123 Main St",
--   "businessPhone": "(555) 123-4567",
--   "businessType": "barbershop",
--   "businessHours": {...},
--   "services": [...],
--   "staff": [...],
--   "paymentMethods": [...],
--   "bookingRules": {...},
--   "branding": {...},
--   "completedSteps": ["role", "business_info", ...]
-- }
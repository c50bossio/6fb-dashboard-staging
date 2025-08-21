-- Migration: Add onboarding_status column to profiles table
-- Purpose: Replace localStorage with database-stored onboarding state for consistency across devices

-- Add onboarding_status column to track modal state
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_status TEXT 
DEFAULT 'active'
CHECK (onboarding_status IN ('active', 'skipped', 'minimized', 'completed'));

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_status 
ON profiles(onboarding_status) 
WHERE onboarding_status IS NOT NULL;

-- Update existing records based on current state
UPDATE profiles 
SET onboarding_status = CASE 
  WHEN onboarding_completed = true THEN 'completed'
  WHEN onboarding_step > 0 AND onboarding_completed = false THEN 'skipped'
  ELSE 'active'
END
WHERE onboarding_status IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.onboarding_status IS 'Tracks onboarding modal state: active (in progress), skipped (dismissed), minimized (temporary hide), completed (finished)';
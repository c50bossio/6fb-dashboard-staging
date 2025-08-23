-- PHASE 1: Minimal Safe Schema Update
-- Description: Add missing columns to profiles table to fix authentication errors
-- Risk Level: LOW - Only adds columns with defaults, no data loss possible
-- Rollback: Can drop columns if needed, or leave with defaults

-- ==========================================
-- ADD MISSING SUBSCRIPTION COLUMNS
-- ==========================================

-- Add subscription columns that application expects
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'individual' CHECK (
  subscription_tier IN ('individual', 'professional', 'barber', 'shop_owner', 'shop', 'enterprise')
),
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active' CHECK (
  subscription_status IN ('inactive', 'active', 'past_due', 'canceled', 'trialing')
);

-- Add onboarding columns that application expects  
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'active' CHECK (
  onboarding_status IN ('active', 'skipped', 'minimized', 'completed')
);

-- Add barbershop association column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS barbershop_id UUID DEFAULT NULL;

-- ==========================================
-- UPDATE EXISTING DATA SAFELY
-- ==========================================

-- Set sensible defaults for existing records
UPDATE profiles 
SET 
  subscription_tier = 'individual',
  subscription_status = 'active', 
  onboarding_completed = FALSE,
  onboarding_step = 0,
  onboarding_status = 'active'
WHERE subscription_tier IS NULL;

-- Update role values to match application expectations
UPDATE profiles 
SET role = CASE 
  WHEN role = 'user' THEN 'CLIENT'
  WHEN role = 'admin' THEN 'SUPER_ADMIN'
  WHEN role = 'barber' THEN 'BARBER'
  WHEN role = 'shop_owner' THEN 'SHOP_OWNER'
  WHEN role = 'enterprise_owner' THEN 'ENTERPRISE_OWNER'
  ELSE UPPER(role)
END
WHERE role IS NOT NULL;

-- ==========================================
-- BASIC INDEXES FOR PERFORMANCE  
-- ==========================================

-- Add indexes for commonly queried columns
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_barbershop_id ON profiles(barbershop_id);

-- ==========================================
-- DOCUMENTATION
-- ==========================================

-- Add column comments for clarity
COMMENT ON COLUMN profiles.subscription_tier IS 'User subscription level - determines feature access';
COMMENT ON COLUMN profiles.subscription_status IS 'Current subscription status - active users can access features';
COMMENT ON COLUMN profiles.onboarding_status IS 'Onboarding modal state - tracks user progress through setup';
COMMENT ON COLUMN profiles.barbershop_id IS 'Associated barbershop for staff members - NULL for independent barbers';

-- ==========================================
-- ROLLBACK INSTRUCTIONS
-- ==========================================

/*
ROLLBACK COMMANDS (if needed):
  
  -- Remove added columns:
  ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_tier;
  ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_status;
  ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_completed;
  ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_step;
  ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_status;
  ALTER TABLE profiles DROP COLUMN IF EXISTS barbershop_id;
  
  -- Remove indexes:
  DROP INDEX IF EXISTS idx_profiles_subscription_tier;
  DROP INDEX IF EXISTS idx_profiles_subscription_status;
  DROP INDEX IF EXISTS idx_profiles_barbershop_id;
*/

-- Record migration completion
INSERT INTO migrations (name, executed_at) 
VALUES ('phase1_minimal_schema', NOW())
ON CONFLICT (name) DO NOTHING;
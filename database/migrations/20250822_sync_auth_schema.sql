-- Migration: Synchronize Authentication Schema
-- Description: Sync profiles and users tables with application expectations
-- Date: 2025-08-22
-- Fixes: PGRST204 errors and authentication failures

-- ==========================================
-- STEP 1: UPDATE PROFILES TABLE
-- ==========================================

-- Add missing subscription columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'individual' CHECK (
  subscription_tier IN ('individual', 'professional', 'shop_owner', 'shop', 'enterprise')
),
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active' CHECK (
  subscription_status IN ('inactive', 'active', 'past_due', 'canceled', 'trialing')
),
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS barbershop_id UUID DEFAULT NULL;

-- Add onboarding_status column (from recent migration)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_status TEXT 
DEFAULT 'active'
CHECK (onboarding_status IN ('active', 'skipped', 'minimized', 'completed'));

-- Update role column to use proper enum values
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

-- Add role constraint with proper values
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check CHECK (
  role IN ('CLIENT', 'BARBER', 'SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN')
);

-- ==========================================
-- STEP 2: CREATE/UPDATE USERS TABLE
-- ==========================================

-- Create users table if it doesn't exist (for subscription management)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Stripe customer info
  stripe_customer_id VARCHAR(255) UNIQUE,
  
  -- Basic user info
  phone VARCHAR(20),
  timezone VARCHAR(50) DEFAULT 'UTC',
  locale VARCHAR(10) DEFAULT 'en',
  
  -- User preferences
  email_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT TRUE,
  
  -- Account status
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  
  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT FALSE,
  
  -- Role-based access (matching profiles table)
  role VARCHAR(20) DEFAULT 'CLIENT' CHECK (
    role IN ('CLIENT', 'BARBER', 'SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN')
  ),
  
  -- Subscription management columns
  subscription_tier VARCHAR(20) DEFAULT 'individual' CHECK (
    subscription_tier IN ('individual', 'professional', 'barber', 'shop_owner', 'shop', 'enterprise')
  ),
  subscription_status VARCHAR(20) DEFAULT 'active' CHECK (
    subscription_status IN ('inactive', 'active', 'past_due', 'canceled', 'trialing')
  ),
  stripe_subscription_id VARCHAR(255),
  subscription_current_period_start TIMESTAMPTZ,
  subscription_current_period_end TIMESTAMPTZ,
  subscription_cancel_at_period_end BOOLEAN DEFAULT FALSE,
  subscription_canceled_at TIMESTAMPTZ,
  stripe_price_id VARCHAR(255),
  payment_method_last4 VARCHAR(4),
  payment_method_brand VARCHAR(20),
  
  -- Usage tracking columns
  sms_credits_included INTEGER DEFAULT 0,
  sms_credits_used INTEGER DEFAULT 0,
  email_credits_included INTEGER DEFAULT 0,
  email_credits_used INTEGER DEFAULT 0,
  ai_tokens_included INTEGER DEFAULT 0,
  ai_tokens_used INTEGER DEFAULT 0,
  staff_limit INTEGER DEFAULT 1,
  current_staff_count INTEGER DEFAULT 0,
  
  -- Business info (for barbers/shop owners)
  business_name VARCHAR(255),
  business_type VARCHAR(50),
  shop_name VARCHAR(255)
);

-- ==========================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- ==========================================

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_status ON profiles(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_profiles_barbershop_id ON profiles(barbershop_id);

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id ON users(stripe_subscription_id);

-- ==========================================
-- STEP 4: UPDATE ROW LEVEL SECURITY
-- ==========================================

-- Enable RLS on users table if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Service role can manage all users" ON users;

-- Recreate RLS policies for users table
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role can manage all users" ON users
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Allow authenticated users to insert (for registration)
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Update profiles table policies to include service role access for subscription queries
DROP POLICY IF EXISTS "Service role has full access" ON profiles;
CREATE POLICY "Service role has full access" ON profiles
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ==========================================
-- STEP 5: DATA MIGRATION AND CLEANUP
-- ==========================================

-- Update existing profiles onboarding_status based on current state
UPDATE profiles 
SET onboarding_status = CASE 
  WHEN onboarding_completed = true THEN 'completed'
  WHEN onboarding_step > 0 AND onboarding_completed = false THEN 'skipped'
  ELSE 'active'
END
WHERE onboarding_status IS NULL OR onboarding_status = 'active';

-- Set default subscription tier for existing users
UPDATE profiles 
SET subscription_tier = 'individual'
WHERE subscription_tier IS NULL;

-- Create trigger for updated_at on users table
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_users_updated_at();

-- ==========================================
-- STEP 6: HELPER FUNCTIONS
-- ==========================================

-- Function to sync profile data with users table
CREATE OR REPLACE FUNCTION sync_profile_with_users()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update corresponding users record
  INSERT INTO users (
    id, email, full_name, avatar_url, role, 
    subscription_tier, subscription_status, onboarding_completed
  )
  VALUES (
    NEW.id, NEW.email, NEW.full_name, NEW.avatar_url, NEW.role,
    NEW.subscription_tier, NEW.subscription_status, NEW.onboarding_completed
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    role = EXCLUDED.role,
    subscription_tier = EXCLUDED.subscription_tier,
    subscription_status = EXCLUDED.subscription_status,
    onboarding_completed = EXCLUDED.onboarding_completed,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to keep profiles and users in sync
DROP TRIGGER IF EXISTS sync_profile_to_users ON profiles;
CREATE TRIGGER sync_profile_to_users
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION sync_profile_with_users();

-- ==========================================
-- COMMENTS FOR DOCUMENTATION
-- ==========================================

COMMENT ON COLUMN profiles.subscription_tier IS 'User subscription level: individual, professional, shop_owner, enterprise';
COMMENT ON COLUMN profiles.subscription_status IS 'Current subscription status: active, inactive, past_due, canceled, trialing';
COMMENT ON COLUMN profiles.onboarding_status IS 'Onboarding modal state: active, skipped, minimized, completed';
COMMENT ON COLUMN profiles.barbershop_id IS 'Associated barbershop for staff members';

COMMENT ON TABLE users IS 'Extended user data with subscription and usage tracking';
COMMENT ON COLUMN users.subscription_tier IS 'Subscription plan level with billing implications';
COMMENT ON COLUMN users.stripe_customer_id IS 'Stripe customer ID for payment processing';

-- Record this migration
INSERT INTO migrations (name, executed_at) 
VALUES ('sync_auth_schema_20250822', NOW())
ON CONFLICT (name) DO NOTHING;
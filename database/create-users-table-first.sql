-- Create Users Table First (if it doesn't exist)
-- Run this BEFORE the main subscription migration

-- ==========================================
-- CREATE USERS TABLE
-- ==========================================

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  
  -- Role-based access
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'barber', 'shop_owner', 'enterprise_owner')),
  
  -- Business info (for barbers/shop owners)
  business_name VARCHAR(255),
  business_type VARCHAR(50),
  shop_name VARCHAR(255)
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for users
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role can manage all users" ON users
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ==========================================
-- CREATE MIGRATIONS TABLE (for tracking)
-- ==========================================

CREATE TABLE IF NOT EXISTS migrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Record this migration
INSERT INTO migrations (name, executed_at) 
VALUES ('create_users_table', NOW())
ON CONFLICT (name) DO NOTHING;
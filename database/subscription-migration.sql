-- Subscription System Migration for 6FB AI Agent System
-- This migration adds subscription management capabilities to the existing schema
-- Run this in Supabase SQL Editor

-- ==========================================
-- ADD SUBSCRIPTION COLUMNS TO USERS TABLE
-- ==========================================

-- Add subscription management columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT NULL CHECK (
  subscription_tier IN ('barber', 'shop', 'enterprise') OR subscription_tier IS NULL
),
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'inactive' CHECK (
  subscription_status IN ('inactive', 'active', 'past_due', 'canceled', 'trialing')
),
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS subscription_current_period_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subscription_canceled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_method_last4 VARCHAR(4),
ADD COLUMN IF NOT EXISTS payment_method_brand VARCHAR(20);

-- Add usage tracking columns
ALTER TABLE users
ADD COLUMN IF NOT EXISTS sms_credits_included INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sms_credits_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS email_credits_included INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS email_credits_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_tokens_included INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_tokens_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS staff_limit INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_staff_count INTEGER DEFAULT 0;

-- Create index for faster subscription queries
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id ON users(stripe_subscription_id);

-- ==========================================
-- SUBSCRIPTION HISTORY TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subscription_tier VARCHAR(20) NOT NULL,
  stripe_subscription_id VARCHAR(255),
  stripe_invoice_id VARCHAR(255),
  amount INTEGER NOT NULL, -- Amount in cents
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) NOT NULL,
  billing_period VARCHAR(20) NOT NULL CHECK (billing_period IN ('monthly', 'yearly')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON subscription_history(created_at DESC);

-- ==========================================
-- USAGE TRACKING TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  usage_type VARCHAR(20) NOT NULL CHECK (usage_type IN ('sms', 'email', 'ai_token', 'booking')),
  usage_count INTEGER NOT NULL DEFAULT 1,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_date ON usage_tracking(user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_type ON usage_tracking(usage_type);

-- ==========================================
-- OVERAGE CHARGES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS overage_charges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  charge_type VARCHAR(20) NOT NULL CHECK (charge_type IN ('sms', 'email', 'ai_token')),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 4) NOT NULL, -- Price per unit in dollars
  total_amount DECIMAL(10, 2) NOT NULL, -- Total charge in dollars
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  stripe_invoice_item_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'billed', 'paid', 'waived')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_overage_charges_user_id ON overage_charges(user_id);
CREATE INDEX IF NOT EXISTS idx_overage_charges_status ON overage_charges(status);

-- ==========================================
-- SUBSCRIPTION FEATURES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS subscription_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier VARCHAR(20) NOT NULL UNIQUE CHECK (tier IN ('barber', 'shop', 'enterprise')),
  monthly_price INTEGER NOT NULL, -- Price in cents
  yearly_price INTEGER NOT NULL, -- Price in cents
  staff_limit INTEGER NOT NULL,
  sms_credits INTEGER NOT NULL,
  email_credits INTEGER NOT NULL,
  ai_tokens INTEGER NOT NULL,
  features JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert subscription tier features
INSERT INTO subscription_features (tier, monthly_price, yearly_price, staff_limit, sms_credits, email_credits, ai_tokens, features)
VALUES 
  ('barber', 3500, 33600, 1, 500, 1000, 5000, 
   '{"bookings": "unlimited", "custom_domain": true, "analytics": "full", "support": "email", "api_access": false}'::jsonb),
  ('shop', 9900, 95040, 15, 2000, 5000, 20000,
   '{"bookings": "unlimited", "custom_domain": true, "analytics": "full", "support": "priority", "api_access": true, "team_management": true}'::jsonb),
  ('enterprise', 24900, 239040, 999999, 10000, 25000, 100000,
   '{"bookings": "unlimited", "custom_domain": true, "analytics": "advanced", "support": "dedicated", "api_access": true, "team_management": true, "multi_location": true, "white_label": true}'::jsonb)
ON CONFLICT (tier) DO UPDATE SET
  monthly_price = EXCLUDED.monthly_price,
  yearly_price = EXCLUDED.yearly_price,
  staff_limit = EXCLUDED.staff_limit,
  sms_credits = EXCLUDED.sms_credits,
  email_credits = EXCLUDED.email_credits,
  ai_tokens = EXCLUDED.ai_tokens,
  features = EXCLUDED.features,
  updated_at = NOW();

-- ==========================================
-- PAYMENT METHODS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL,
  brand VARCHAR(20),
  last4 VARCHAR(4),
  exp_month INTEGER,
  exp_year INTEGER,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON payment_methods(user_id, is_default);

-- ==========================================
-- INVOICES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR(255) UNIQUE,
  invoice_number VARCHAR(50),
  amount_paid INTEGER, -- Amount in cents
  amount_due INTEGER, -- Amount in cents
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20),
  invoice_pdf TEXT,
  hosted_invoice_url TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);

-- ==========================================
-- ROW LEVEL SECURITY POLICIES
-- ==========================================

-- Enable RLS on all new tables
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE overage_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Subscription history policies
CREATE POLICY "Users can view own subscription history" ON subscription_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscription history" ON subscription_history
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Usage tracking policies
CREATE POLICY "Users can view own usage" ON usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage usage tracking" ON usage_tracking
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Overage charges policies
CREATE POLICY "Users can view own overage charges" ON overage_charges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage overage charges" ON overage_charges
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Subscription features policies (public read)
CREATE POLICY "Anyone can view subscription features" ON subscription_features
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage subscription features" ON subscription_features
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Payment methods policies
CREATE POLICY "Users can view own payment methods" ON payment_methods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own payment methods" ON payment_methods
  FOR ALL USING (auth.uid() = user_id);

-- Invoices policies
CREATE POLICY "Users can view own invoices" ON invoices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage invoices" ON invoices
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = user_uuid 
    AND subscription_status = 'active'
    AND (subscription_current_period_end IS NULL OR subscription_current_period_end > NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get user's subscription tier
CREATE OR REPLACE FUNCTION get_user_subscription_tier(user_uuid UUID)
RETURNS VARCHAR AS $$
DECLARE
  tier VARCHAR;
BEGIN
  SELECT subscription_tier INTO tier 
  FROM users 
  WHERE id = user_uuid 
  AND subscription_status = 'active';
  
  RETURN COALESCE(tier, 'none');
END;
$$ LANGUAGE plpgsql;

-- Function to track usage
CREATE OR REPLACE FUNCTION track_usage(
  p_user_id UUID,
  p_usage_type VARCHAR,
  p_count INTEGER DEFAULT 1,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  -- Insert usage record
  INSERT INTO usage_tracking (user_id, usage_type, usage_count, metadata)
  VALUES (p_user_id, p_usage_type, p_count, p_metadata);
  
  -- Update user's usage counter
  IF p_usage_type = 'sms' THEN
    UPDATE users 
    SET sms_credits_used = sms_credits_used + p_count
    WHERE id = p_user_id;
  ELSIF p_usage_type = 'email' THEN
    UPDATE users 
    SET email_credits_used = email_credits_used + p_count
    WHERE id = p_user_id;
  ELSIF p_usage_type = 'ai_token' THEN
    UPDATE users 
    SET ai_tokens_used = ai_tokens_used + p_count
    WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- MIGRATION COMPLETION
-- ==========================================

-- Create a migration record (optional, for tracking)
INSERT INTO migrations (name, executed_at) 
VALUES ('subscription_system_migration', NOW())
ON CONFLICT DO NOTHING;

COMMENT ON COLUMN users.subscription_tier IS 'User subscription tier: barber ($35), shop ($99), or enterprise ($249)';
COMMENT ON COLUMN users.subscription_status IS 'Current subscription status from Stripe';
COMMENT ON TABLE subscription_history IS 'Historical record of all subscription changes and payments';
COMMENT ON TABLE usage_tracking IS 'Tracks usage of credits and resources for billing purposes';
COMMENT ON TABLE overage_charges IS 'Tracks overage charges for resources that exceed plan limits';
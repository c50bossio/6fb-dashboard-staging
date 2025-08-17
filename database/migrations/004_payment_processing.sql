-- ==========================================
-- PAYMENT PROCESSING MIGRATION
-- ==========================================
-- This migration adds complete payment processing capabilities
-- including Stripe Connect integration for marketplace payments

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- STRIPE CONNECTED ACCOUNTS TABLE
-- ==========================================
-- Stores Stripe Connect account information for shops/barbers
CREATE TABLE IF NOT EXISTS public.stripe_connected_accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  
  -- Stripe Connect Details
  stripe_account_id VARCHAR(255) UNIQUE NOT NULL,
  account_type VARCHAR(50) DEFAULT 'express', -- express, standard, custom
  
  -- Onboarding Status
  onboarding_completed BOOLEAN DEFAULT false,
  details_submitted BOOLEAN DEFAULT false,
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  
  -- Business Information
  business_type VARCHAR(50), -- individual, company, non_profit
  business_name VARCHAR(255),
  business_tax_id VARCHAR(50), -- Encrypted EIN/Tax ID
  business_url VARCHAR(255),
  
  -- Verification Status
  verification_status VARCHAR(50), -- pending, verified, requires_action
  verification_fields_needed JSONB, -- Fields still needed for verification
  current_deadline TIMESTAMP WITH TIME ZONE, -- Deadline for required actions
  
  -- Account Capabilities
  capabilities JSONB DEFAULT '{}', -- card_payments, transfers, etc.
  requirements JSONB DEFAULT '{}', -- Current requirements from Stripe
  
  -- Settings
  payout_schedule JSONB DEFAULT '{"interval": "daily", "delay_days": 2}',
  statement_descriptor VARCHAR(22), -- What appears on customer statements
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- BANK ACCOUNTS TABLE
-- ==========================================
-- Stores bank account information for payouts (encrypted)
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_connected_account_id UUID REFERENCES public.stripe_connected_accounts(id) ON DELETE CASCADE,
  
  -- Bank Account Details (Encrypted)
  stripe_bank_account_id VARCHAR(255) UNIQUE,
  account_holder_name VARCHAR(255),
  account_holder_type VARCHAR(20), -- individual, company
  bank_name VARCHAR(255),
  last4 VARCHAR(4), -- Last 4 digits for display
  routing_number_last4 VARCHAR(4), -- Last 4 of routing number
  currency VARCHAR(3) DEFAULT 'USD',
  country VARCHAR(2) DEFAULT 'US',
  
  -- Status
  status VARCHAR(50) DEFAULT 'new', -- new, validated, verified, verification_failed
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Verification
  verification_status VARCHAR(50),
  verification_attempts INTEGER DEFAULT 0,
  verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- PAYOUT SETTINGS TABLE
-- ==========================================
-- Stores payout preferences and history
CREATE TABLE IF NOT EXISTS public.payout_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  stripe_connected_account_id UUID REFERENCES public.stripe_connected_accounts(id) ON DELETE CASCADE,
  
  -- Payout Configuration
  payout_method VARCHAR(50) DEFAULT 'standard', -- standard, instant
  payout_schedule VARCHAR(50) DEFAULT 'daily', -- daily, weekly, monthly, manual
  payout_day_of_week INTEGER, -- 1-7 for weekly payouts
  payout_day_of_month INTEGER, -- 1-31 for monthly payouts
  minimum_payout_amount DECIMAL(10,2) DEFAULT 0.00,
  
  -- Instant Payout Settings
  instant_payouts_enabled BOOLEAN DEFAULT false,
  instant_payout_fee_percentage DECIMAL(5,2) DEFAULT 1.00,
  
  -- Hold Settings
  payout_hold BOOLEAN DEFAULT false,
  payout_hold_reason TEXT,
  payout_hold_until TIMESTAMP WITH TIME ZONE,
  
  -- Statistics
  total_payouts_count INTEGER DEFAULT 0,
  total_payouts_amount DECIMAL(12,2) DEFAULT 0.00,
  last_payout_date TIMESTAMP WITH TIME ZONE,
  last_payout_amount DECIMAL(10,2),
  
  -- Settings
  auto_payout BOOLEAN DEFAULT true,
  notification_email VARCHAR(255),
  notification_phone VARCHAR(20),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- BUSINESS PAYMENT METHODS TABLE
-- ==========================================
-- Stores payment methods for platform billing (subscriptions, fees)
CREATE TABLE IF NOT EXISTS public.business_payment_methods (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  
  -- Stripe Payment Method Details
  stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255),
  
  -- Card Details (for display)
  type VARCHAR(20) NOT NULL, -- card, bank_account
  brand VARCHAR(20), -- visa, mastercard, amex, etc.
  last4 VARCHAR(4),
  exp_month INTEGER,
  exp_year INTEGER,
  
  -- Bank Account Details (if applicable)
  bank_name VARCHAR(255),
  account_holder_name VARCHAR(255),
  
  -- Status
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  status VARCHAR(50) DEFAULT 'active',
  
  -- Billing Address
  billing_name VARCHAR(255),
  billing_email VARCHAR(255),
  billing_phone VARCHAR(20),
  billing_address JSONB,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- ==========================================
-- PAYOUT TRANSACTIONS TABLE
-- ==========================================
-- Records all payout transactions
CREATE TABLE IF NOT EXISTS public.payout_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  stripe_connected_account_id UUID REFERENCES public.stripe_connected_accounts(id),
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  
  -- Transaction Details
  stripe_payout_id VARCHAR(255) UNIQUE,
  stripe_transfer_id VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Type and Status
  type VARCHAR(50), -- standard, instant
  status VARCHAR(50), -- pending, in_transit, paid, failed, canceled
  failure_code VARCHAR(50),
  failure_message TEXT,
  
  -- Timing
  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expected_arrival_date DATE,
  arrived_at TIMESTAMP WITH TIME ZONE,
  
  -- Fees
  fee_amount DECIMAL(10,2) DEFAULT 0.00,
  fee_currency VARCHAR(3) DEFAULT 'USD',
  
  -- Description
  description TEXT,
  statement_descriptor VARCHAR(22),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- Add columns to existing tables
-- ==========================================

-- Add Stripe Connect status to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_connect_onboarded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_connect_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_setup_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_setup_completed_at TIMESTAMP WITH TIME ZONE;

-- Add payment fields to barbershops
ALTER TABLE public.barbershops
ADD COLUMN IF NOT EXISTS stripe_connected_account_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS accepts_online_payments BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_processing_fee_percentage DECIMAL(5,2) DEFAULT 2.9,
ADD COLUMN IF NOT EXISTS payment_processing_fee_fixed DECIMAL(5,2) DEFAULT 0.30;

-- ==========================================
-- INDEXES
-- ==========================================

-- Stripe Connected Accounts
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_user_id ON stripe_connected_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_barbershop_id ON stripe_connected_accounts(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_stripe_id ON stripe_connected_accounts(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_status ON stripe_connected_accounts(onboarding_completed, charges_enabled, payouts_enabled);

-- Bank Accounts
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_connected_account ON bank_accounts(stripe_connected_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_default ON bank_accounts(is_default, is_active);

-- Payout Settings
CREATE INDEX IF NOT EXISTS idx_payout_settings_user_id ON payout_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_settings_barbershop ON payout_settings(barbershop_id);

-- Business Payment Methods
CREATE INDEX IF NOT EXISTS idx_business_payment_methods_user ON business_payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_business_payment_methods_shop ON business_payment_methods(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_business_payment_methods_default ON business_payment_methods(is_default, is_active);

-- Payout Transactions
CREATE INDEX IF NOT EXISTS idx_payout_transactions_account ON payout_transactions(stripe_connected_account_id);
CREATE INDEX IF NOT EXISTS idx_payout_transactions_status ON payout_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payout_transactions_date ON payout_transactions(initiated_at DESC);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

-- Enable RLS on all payment tables
ALTER TABLE stripe_connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_transactions ENABLE ROW LEVEL SECURITY;

-- Stripe Connected Accounts Policies
CREATE POLICY "Users can view own Stripe accounts" ON stripe_connected_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own Stripe accounts" ON stripe_connected_accounts
  FOR ALL USING (auth.uid() = user_id);

-- Bank Accounts Policies
CREATE POLICY "Users can view own bank accounts" ON bank_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own bank accounts" ON bank_accounts
  FOR ALL USING (auth.uid() = user_id);

-- Payout Settings Policies
CREATE POLICY "Users can view own payout settings" ON payout_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own payout settings" ON payout_settings
  FOR ALL USING (auth.uid() = user_id);

-- Business Payment Methods Policies
CREATE POLICY "Users can view own payment methods" ON business_payment_methods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own payment methods" ON business_payment_methods
  FOR ALL USING (auth.uid() = user_id);

-- Payout Transactions Policies (Read-only for users)
CREATE POLICY "Users can view own payout transactions" ON payout_transactions
  FOR SELECT USING (
    stripe_connected_account_id IN (
      SELECT id FROM stripe_connected_accounts WHERE user_id = auth.uid()
    )
  );

-- ==========================================
-- FUNCTIONS
-- ==========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_stripe_accounts_updated_at
  BEFORE UPDATE ON stripe_connected_accounts
  FOR EACH ROW EXECUTE FUNCTION update_payment_updated_at();

CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_payment_updated_at();

CREATE TRIGGER update_payout_settings_updated_at
  BEFORE UPDATE ON payout_settings
  FOR EACH ROW EXECUTE FUNCTION update_payment_updated_at();

CREATE TRIGGER update_business_payment_methods_updated_at
  BEFORE UPDATE ON business_payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_payment_updated_at();

-- ==========================================
-- MIGRATION COMPLETION
-- ==========================================
-- Log migration completion
INSERT INTO public.migrations_log (migration_name, executed_at, status)
VALUES ('004_payment_processing', NOW(), 'completed')
ON CONFLICT (migration_name) DO NOTHING;
-- ==========================================
-- SIMPLIFIED PAYMENT PROCESSING MIGRATION
-- Run this in Supabase SQL Editor
-- ==========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create migrations_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.migrations_log (
  migration_name VARCHAR(255) PRIMARY KEY,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'completed'
);

-- ==========================================
-- STRIPE CONNECTED ACCOUNTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.stripe_connected_accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  stripe_account_id VARCHAR(255) UNIQUE NOT NULL,
  account_type VARCHAR(50) DEFAULT 'express',
  onboarding_completed BOOLEAN DEFAULT false,
  details_submitted BOOLEAN DEFAULT false,
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  business_type VARCHAR(50),
  business_name VARCHAR(255),
  verification_status VARCHAR(50),
  capabilities JSONB DEFAULT '{}',
  requirements JSONB DEFAULT '{}',
  payout_schedule JSONB DEFAULT '{"interval": "daily", "delay_days": 2}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- BANK ACCOUNTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_connected_account_id UUID REFERENCES public.stripe_connected_accounts(id) ON DELETE CASCADE,
  stripe_bank_account_id VARCHAR(255) UNIQUE,
  account_holder_name VARCHAR(255),
  account_holder_type VARCHAR(20),
  bank_name VARCHAR(255),
  last4 VARCHAR(4),
  routing_number_last4 VARCHAR(4),
  currency VARCHAR(3) DEFAULT 'USD',
  country VARCHAR(2) DEFAULT 'US',
  status VARCHAR(50) DEFAULT 'new',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- PAYOUT SETTINGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.payout_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  stripe_connected_account_id UUID REFERENCES public.stripe_connected_accounts(id) ON DELETE CASCADE,
  payout_method VARCHAR(50) DEFAULT 'standard',
  payout_schedule VARCHAR(50) DEFAULT 'daily',
  minimum_payout_amount DECIMAL(10,2) DEFAULT 0.00,
  instant_payouts_enabled BOOLEAN DEFAULT false,
  auto_payout BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- BUSINESS PAYMENT METHODS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.business_payment_methods (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255),
  type VARCHAR(20) NOT NULL,
  brand VARCHAR(20),
  last4 VARCHAR(4),
  exp_month INTEGER,
  exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- PAYOUT TRANSACTIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.payout_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  stripe_connected_account_id UUID REFERENCES public.stripe_connected_accounts(id),
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  stripe_payout_id VARCHAR(255) UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  type VARCHAR(50),
  status VARCHAR(50),
  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- Add columns to existing tables
-- ==========================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_connect_onboarded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_connect_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_setup_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_setup_completed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.barbershops
ADD COLUMN IF NOT EXISTS stripe_connected_account_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS accepts_online_payments BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_processing_fee_percentage DECIMAL(5,2) DEFAULT 2.9,
ADD COLUMN IF NOT EXISTS payment_processing_fee_fixed DECIMAL(5,2) DEFAULT 0.30;

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_user_id ON stripe_connected_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_barbershop_id ON stripe_connected_accounts(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_settings_user_id ON payout_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_business_payment_methods_user ON business_payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_transactions_account ON payout_transactions(stripe_connected_account_id);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE stripe_connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own Stripe accounts" ON stripe_connected_accounts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own Stripe accounts" ON stripe_connected_accounts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own bank accounts" ON bank_accounts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own bank accounts" ON bank_accounts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own payout settings" ON payout_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own payout settings" ON payout_settings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own payment methods" ON business_payment_methods
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own payment methods" ON business_payment_methods
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own payout transactions" ON payout_transactions
  FOR SELECT USING (
    stripe_connected_account_id IN (
      SELECT id FROM stripe_connected_accounts WHERE user_id = auth.uid()
    )
  );

-- ==========================================
-- LOG MIGRATION
-- ==========================================
INSERT INTO public.migrations_log (migration_name, executed_at, status)
VALUES ('004_payment_processing', NOW(), 'completed')
ON CONFLICT (migration_name) DO NOTHING;

-- ==========================================
-- SUCCESS MESSAGE
-- ==========================================
-- Migration completed successfully!
-- Payment processing tables have been created.
-- You can now test the payment onboarding flow.
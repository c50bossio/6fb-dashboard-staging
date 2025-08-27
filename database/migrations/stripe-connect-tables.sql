-- Stripe Connect Database Tables Migration
-- Created: 2025-08-27
-- Purpose: Support complete Stripe Connect integration

-- ============================================================================
-- PAYOUT HISTORY TABLE
-- ============================================================================
-- Track all payouts made to barbers through Stripe Connect
CREATE TABLE IF NOT EXISTS payout_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_payout_id TEXT UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL, -- 'pending', 'in_transit', 'paid', 'failed', 'canceled'
  description TEXT,
  failure_message TEXT,
  arrival_date TIMESTAMP,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_payout_history_barbershop ON payout_history(barbershop_id);
CREATE INDEX idx_payout_history_barber ON payout_history(barber_id);
CREATE INDEX idx_payout_history_status ON payout_history(status);
CREATE INDEX idx_payout_history_created_at ON payout_history(created_at DESC);

-- ============================================================================
-- INVOICE HISTORY TABLE
-- ============================================================================
-- Track all invoices created through the platform
CREATE TABLE IF NOT EXISTS invoice_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_invoice_id TEXT UNIQUE,
  customer_id TEXT, -- Stripe customer ID
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES profiles(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL, -- 'draft', 'open', 'paid', 'void', 'uncollectible'
  description TEXT,
  invoice_number TEXT,
  invoice_pdf_url TEXT,
  hosted_invoice_url TEXT,
  due_date TIMESTAMP,
  paid_at TIMESTAMP,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for invoice queries
CREATE INDEX idx_invoice_history_barbershop ON invoice_history(barbershop_id);
CREATE INDEX idx_invoice_history_barber ON invoice_history(barber_id);
CREATE INDEX idx_invoice_history_status ON invoice_history(status);
CREATE INDEX idx_invoice_history_customer ON invoice_history(customer_id);
CREATE INDEX idx_invoice_history_created_at ON invoice_history(created_at DESC);

-- ============================================================================
-- UPDATE FINANCIAL ARRANGEMENTS TABLE
-- ============================================================================
-- Add missing columns if they don't exist
ALTER TABLE financial_arrangements 
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE financial_arrangements 
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE financial_arrangements 
ADD COLUMN IF NOT EXISTS stripe_account_type TEXT DEFAULT 'express';

ALTER TABLE financial_arrangements 
ADD COLUMN IF NOT EXISTS stripe_account_country TEXT DEFAULT 'US';

ALTER TABLE financial_arrangements 
ADD COLUMN IF NOT EXISTS last_payout_date TIMESTAMP;

ALTER TABLE financial_arrangements 
ADD COLUMN IF NOT EXISTS total_payouts_amount DECIMAL(10,2) DEFAULT 0;

-- ============================================================================
-- STRIPE WEBHOOK EVENTS TABLE
-- ============================================================================
-- Track webhook events for debugging and audit
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE,
  event_type TEXT NOT NULL,
  account_id TEXT, -- Connected account ID if applicable
  data JSONB,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

CREATE INDEX idx_webhook_events_type ON stripe_webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed ON stripe_webhook_events(processed);
CREATE INDEX idx_webhook_events_created ON stripe_webhook_events(created_at DESC);

-- ============================================================================
-- SUBSCRIPTION HISTORY TABLE
-- ============================================================================
-- Track subscription changes and history
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  plan_type TEXT NOT NULL, -- 'starter', 'professional', 'enterprise'
  billing_interval TEXT NOT NULL, -- 'month', 'year'
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL, -- 'active', 'past_due', 'canceled', 'unpaid'
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP,
  trial_start TIMESTAMP,
  trial_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscription_history_user ON subscription_history(user_id);
CREATE INDEX idx_subscription_history_barbershop ON subscription_history(barbershop_id);
CREATE INDEX idx_subscription_history_status ON subscription_history(status);
CREATE INDEX idx_subscription_history_stripe_id ON subscription_history(stripe_subscription_id);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Payout History RLS
ALTER TABLE payout_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payouts" ON payout_history
  FOR SELECT USING (auth.uid() = barber_id);

CREATE POLICY "Shop owners can view shop payouts" ON payout_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM barbershops 
      WHERE id = payout_history.barbershop_id 
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Shop owners can create payouts" ON payout_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM barbershops 
      WHERE id = barbershop_id 
      AND owner_id = auth.uid()
    )
  );

-- Invoice History RLS
ALTER TABLE invoice_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invoices" ON invoice_history
  FOR SELECT USING (
    auth.uid() = barber_id OR 
    auth.uid() = created_by
  );

CREATE POLICY "Shop owners can manage shop invoices" ON invoice_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM barbershops 
      WHERE id = invoice_history.barbershop_id 
      AND owner_id = auth.uid()
    )
  );

-- Subscription History RLS
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions" ON subscription_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Shop owners can view shop subscriptions" ON subscription_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM barbershops 
      WHERE id = subscription_history.barbershop_id 
      AND owner_id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTIONS FOR AUTOMATED UPDATES
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_payout_history_updated_at 
  BEFORE UPDATE ON payout_history 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_history_updated_at 
  BEFORE UPDATE ON invoice_history 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_history_updated_at 
  BEFORE UPDATE ON subscription_history 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA / MIGRATION NOTES
-- ============================================================================
-- Run this migration with:
-- psql -U your_user -d your_database -f stripe-connect-tables.sql
-- Or in Supabase SQL Editor, run this entire script

-- After migration, update any existing financial_arrangements records:
-- UPDATE financial_arrangements 
-- SET stripe_charges_enabled = barber_stripe_onboarded,
--     stripe_payouts_enabled = barber_stripe_onboarded
-- WHERE barber_stripe_account_id IS NOT NULL;
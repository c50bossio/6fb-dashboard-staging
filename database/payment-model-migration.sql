-- ==========================================
-- PAYMENT MODEL MIGRATION
-- Adds support for three barbershop payment models:
-- 1. Commission (centralized processing)
-- 2. Booth Rental (independent processing) 
-- 3. Hybrid (mixed processing)
-- ==========================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- STEP 1: Add payment model to barbershops
-- ==========================================

-- Add payment_model column to barbershops table
ALTER TABLE public.barbershops 
ADD COLUMN IF NOT EXISTS payment_model VARCHAR(20) DEFAULT 'commission'
CHECK (payment_model IN ('commission', 'booth_rental', 'hybrid'));

-- Add column to track if shop allows independent payment processing
ALTER TABLE public.barbershops
ADD COLUMN IF NOT EXISTS allows_independent_payments BOOLEAN DEFAULT FALSE;

-- Add booth rental configuration
ALTER TABLE public.barbershops
ADD COLUMN IF NOT EXISTS booth_rental_config JSONB DEFAULT '{
  "rent_collection_method": "manual",
  "allows_direct_client_payments": false,
  "requires_shop_booking_system": true
}';

COMMENT ON COLUMN public.barbershops.payment_model IS 'Payment processing model: commission (centralized), booth_rental (independent), or hybrid';
COMMENT ON COLUMN public.barbershops.allows_independent_payments IS 'Whether barbers can set up their own payment processing';
COMMENT ON COLUMN public.barbershops.booth_rental_config IS 'Configuration for booth rental payment processing';

-- ==========================================
-- STEP 2: Extend stripe_connected_accounts
-- ==========================================

-- Add account owner type to distinguish shop vs barber accounts
ALTER TABLE public.stripe_connected_accounts
ADD COLUMN IF NOT EXISTS account_owner_type VARCHAR(20) DEFAULT 'shop'
CHECK (account_owner_type IN ('shop', 'barber', 'organization'));

-- Add parent account for hierarchical relationships
ALTER TABLE public.stripe_connected_accounts
ADD COLUMN IF NOT EXISTS parent_account_id UUID REFERENCES public.stripe_connected_accounts(id);

-- Add charge type for Stripe Connect configuration
ALTER TABLE public.stripe_connected_accounts
ADD COLUMN IF NOT EXISTS charge_type VARCHAR(20) DEFAULT 'destination'
CHECK (charge_type IN ('destination', 'direct', 'separate'));

-- Add column to track if this is a platform-managed account
ALTER TABLE public.stripe_connected_accounts
ADD COLUMN IF NOT EXISTS is_platform_managed BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN public.stripe_connected_accounts.account_owner_type IS 'Type of entity that owns this Stripe account';
COMMENT ON COLUMN public.stripe_connected_accounts.parent_account_id IS 'Parent account for booth renters under a shop';
COMMENT ON COLUMN public.stripe_connected_accounts.charge_type IS 'Stripe Connect charge type: destination (commission), direct (booth rental), or separate';
COMMENT ON COLUMN public.stripe_connected_accounts.is_platform_managed IS 'Whether BookedBarber platform manages this account';

-- ==========================================
-- STEP 3: Update profiles for barber payment processing
-- ==========================================

-- Add fields to track barber's own payment processing
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_own_payment_processing BOOLEAN DEFAULT FALSE;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_connected_account_id UUID REFERENCES public.stripe_connected_accounts(id);

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS payment_processing_status VARCHAR(50) DEFAULT 'not_configured'
CHECK (payment_processing_status IN ('not_configured', 'pending', 'active', 'suspended', 'disabled'));

COMMENT ON COLUMN public.profiles.has_own_payment_processing IS 'Whether this barber processes their own payments (booth rental model)';
COMMENT ON COLUMN public.profiles.stripe_connected_account_id IS 'Reference to barber''s own Stripe Connected Account';
COMMENT ON COLUMN public.profiles.payment_processing_status IS 'Status of barber''s payment processing capability';

-- ==========================================
-- STEP 4: Create barber payment settings table
-- ==========================================

CREATE TABLE IF NOT EXISTS public.barber_payment_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barber_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  
  -- Payment processing preferences
  processes_own_payments BOOLEAN DEFAULT FALSE,
  accepts_cash BOOLEAN DEFAULT TRUE,
  accepts_cards BOOLEAN DEFAULT TRUE,
  accepts_digital_wallets BOOLEAN DEFAULT FALSE,
  
  -- Fee structure (if processing own payments)
  transaction_fee_model VARCHAR(50) DEFAULT 'self_pay'
  CHECK (transaction_fee_model IN ('self_pay', 'shop_covers', 'split')),
  
  -- Client payment routing
  payment_routing VARCHAR(50) DEFAULT 'shop_account'
  CHECK (payment_routing IN ('shop_account', 'barber_account', 'client_choice')),
  
  -- Payout preferences (for commission model)
  preferred_payout_method VARCHAR(50) DEFAULT 'bank_transfer',
  preferred_payout_frequency VARCHAR(20) DEFAULT 'weekly',
  
  -- Stripe account details (if applicable)
  stripe_account_id VARCHAR(255),
  stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(barber_id, barbershop_id)
);

CREATE INDEX idx_barber_payment_settings_barber ON public.barber_payment_settings(barber_id);
CREATE INDEX idx_barber_payment_settings_shop ON public.barber_payment_settings(barbershop_id);
CREATE INDEX idx_barber_payment_settings_active ON public.barber_payment_settings(is_active);

-- ==========================================
-- STEP 5: Update financial_arrangements for new models
-- ==========================================

-- Add payment processing arrangement to financial_arrangements
ALTER TABLE public.financial_arrangements
ADD COLUMN IF NOT EXISTS payment_processing_arrangement VARCHAR(50) DEFAULT 'shop_processes'
CHECK (payment_processing_arrangement IN (
  'shop_processes',      -- Shop processes all payments (commission)
  'barber_processes',    -- Barber processes all payments (booth rental)
  'split_processing',    -- Some through shop, some through barber (hybrid)
  'client_choice'        -- Client chooses at checkout
));

-- Add Stripe account reference for barber's account
ALTER TABLE public.financial_arrangements
ADD COLUMN IF NOT EXISTS barber_stripe_account_id VARCHAR(255);

-- Add platform fee configuration (BookedBarber's cut)
ALTER TABLE public.financial_arrangements
ADD COLUMN IF NOT EXISTS platform_fee_rate DECIMAL(5,4) DEFAULT 0.0250; -- 2.5% platform fee

COMMENT ON COLUMN public.financial_arrangements.payment_processing_arrangement IS 'Who processes payments for this barber';
COMMENT ON COLUMN public.financial_arrangements.barber_stripe_account_id IS 'Barber''s Stripe account for direct processing';
COMMENT ON COLUMN public.financial_arrangements.platform_fee_rate IS 'BookedBarber platform fee rate';

-- ==========================================
-- STEP 6: Create payment routing rules table
-- ==========================================

CREATE TABLE IF NOT EXISTS public.payment_routing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  
  -- Rule configuration
  rule_name VARCHAR(255) NOT NULL,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN (
    'service_type',     -- Route based on service
    'client_type',      -- Route based on client
    'barber_choice',    -- Barber decides per appointment
    'time_based',       -- Different routing by time/day
    'amount_based'      -- Route based on transaction amount
  )),
  
  -- Rule conditions (JSONB for flexibility)
  conditions JSONB NOT NULL DEFAULT '{}',
  -- Example conditions:
  -- {"service_ids": ["uuid1", "uuid2"], "route_to": "barber"}
  -- {"client_tags": ["vip", "regular"], "route_to": "shop"}
  -- {"day_of_week": [1,2,3], "route_to": "barber"}
  -- {"min_amount": 100, "route_to": "shop"}
  
  -- Routing destination
  route_to VARCHAR(20) NOT NULL CHECK (route_to IN ('shop', 'barber', 'ask')),
  
  -- Priority for rule evaluation
  priority INTEGER DEFAULT 100,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_routing_shop ON public.payment_routing_rules(barbershop_id);
CREATE INDEX idx_payment_routing_active ON public.payment_routing_rules(is_active, priority);

-- ==========================================
-- STEP 7: Create audit table for payment routing decisions
-- ==========================================

CREATE TABLE IF NOT EXISTS public.payment_routing_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES public.appointments(id),
  barbershop_id UUID REFERENCES public.barbershops(id),
  barber_id UUID REFERENCES public.profiles(id),
  
  -- Routing decision
  routed_to VARCHAR(20) NOT NULL CHECK (routed_to IN ('shop', 'barber')),
  routing_rule_id UUID REFERENCES public.payment_routing_rules(id),
  routing_reason TEXT,
  
  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  stripe_charge_id VARCHAR(255),
  stripe_account_used VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_routing_audit_appointment ON public.payment_routing_audit(appointment_id);
CREATE INDEX idx_payment_routing_audit_date ON public.payment_routing_audit(created_at DESC);

-- ==========================================
-- STEP 8: Add helpful views
-- ==========================================

-- View to see payment setup status for all barbers in a shop
CREATE OR REPLACE VIEW barber_payment_status AS
SELECT 
  p.id as barber_id,
  p.full_name as barber_name,
  b.id as barbershop_id,
  b.name as barbershop_name,
  b.payment_model,
  p.has_own_payment_processing,
  p.payment_processing_status,
  sca.stripe_account_id,
  sca.charges_enabled,
  sca.payouts_enabled,
  fa.arrangement_type,
  fa.payment_processing_arrangement,
  CASE 
    WHEN b.payment_model = 'commission' THEN 'Shop processes all payments'
    WHEN b.payment_model = 'booth_rental' AND p.has_own_payment_processing THEN 'Barber processes payments'
    WHEN b.payment_model = 'hybrid' THEN 'Mixed processing'
    ELSE 'Not configured'
  END as payment_setup_status
FROM public.profiles p
LEFT JOIN public.barbershops b ON (p.shop_id = b.id OR p.barbershop_id = b.id)
LEFT JOIN public.stripe_connected_accounts sca ON p.stripe_connected_account_id = sca.id
LEFT JOIN public.financial_arrangements fa ON fa.barber_id = p.id AND fa.barbershop_id = b.id AND fa.is_active = true
WHERE p.role IN ('BARBER', 'SHOP_OWNER');

-- ==========================================
-- STEP 9: Add RLS policies
-- ==========================================

-- Barbers can view and update their own payment settings
CREATE POLICY "Barbers can view own payment settings"
  ON public.barber_payment_settings
  FOR SELECT
  USING (barber_id = auth.uid());

CREATE POLICY "Barbers can update own payment settings"
  ON public.barber_payment_settings
  FOR UPDATE
  USING (barber_id = auth.uid());

-- Shop owners can view all barber payment settings for their shop
CREATE POLICY "Shop owners can view barber payment settings"
  ON public.barber_payment_settings
  FOR SELECT
  USING (
    barbershop_id IN (
      SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
    )
  );

-- ==========================================
-- STEP 10: Insert migration log
-- ==========================================

INSERT INTO public.migrations_log (migration_name, status)
VALUES ('payment_model_migration', 'completed')
ON CONFLICT (migration_name) DO NOTHING;

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================
-- This migration adds support for three payment models:
-- 1. Commission: Shop processes all payments, pays barbers commission
-- 2. Booth Rental: Barbers process their own payments, pay shop rent
-- 3. Hybrid: Mix of both models
--
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Update UI components to support model selection
-- 3. Implement Stripe Connect for booth rental model
-- 4. Test all three payment flows
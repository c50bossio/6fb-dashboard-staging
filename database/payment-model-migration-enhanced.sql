-- ==========================================
-- ENHANCED PAYMENT MODEL MIGRATION
-- Adds support for three barbershop payment models with mobile & accessibility features:
-- 1. Commission (centralized processing)
-- 2. Booth Rental (independent processing) 
-- 3. Hybrid (mixed processing)
-- Plus: Mobile services, accessibility, and location-based payment features
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

-- Add mobile payment configuration
ALTER TABLE public.barbershops
ADD COLUMN IF NOT EXISTS mobile_payment_config JSONB DEFAULT '{
  "enabled": false,
  "accepted_methods": ["card", "cash", "digital_wallet"],
  "mobile_surcharge": 0,
  "requires_prepayment": false,
  "mobile_radius_miles": 25
}';

-- Add accessibility payment configuration
ALTER TABLE public.barbershops
ADD COLUMN IF NOT EXISTS accessibility_payment_config JSONB DEFAULT '{
  "offers_payment_assistance": false,
  "accepts_disability_vouchers": false,
  "has_accessible_payment_terminal": false,
  "offers_invoice_billing": false
}';

COMMENT ON COLUMN public.barbershops.payment_model IS 'Payment processing model: commission (centralized), booth_rental (independent), or hybrid';
COMMENT ON COLUMN public.barbershops.allows_independent_payments IS 'Whether barbers can set up their own payment processing';
COMMENT ON COLUMN public.barbershops.booth_rental_config IS 'Configuration for booth rental payment processing';
COMMENT ON COLUMN public.barbershops.mobile_payment_config IS 'Configuration for mobile service payment processing';
COMMENT ON COLUMN public.barbershops.accessibility_payment_config IS 'Payment accommodations for accessibility needs';

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

-- Add mobile payment capabilities
ALTER TABLE public.stripe_connected_accounts
ADD COLUMN IF NOT EXISTS mobile_payments_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE public.stripe_connected_accounts
ADD COLUMN IF NOT EXISTS mobile_reader_id VARCHAR(255);

COMMENT ON COLUMN public.stripe_connected_accounts.account_owner_type IS 'Type of entity that owns this Stripe account';
COMMENT ON COLUMN public.stripe_connected_accounts.parent_account_id IS 'Parent account for booth renters under a shop';
COMMENT ON COLUMN public.stripe_connected_accounts.charge_type IS 'Stripe Connect charge type: destination (commission), direct (booth rental), or separate';
COMMENT ON COLUMN public.stripe_connected_accounts.is_platform_managed IS 'Whether BookedBarber platform manages this account';
COMMENT ON COLUMN public.stripe_connected_accounts.mobile_payments_enabled IS 'Whether account can process mobile payments';
COMMENT ON COLUMN public.stripe_connected_accounts.mobile_reader_id IS 'Stripe Terminal reader ID for mobile payments';

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

-- Add mobile service capabilities
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS offers_mobile_services BOOLEAN DEFAULT FALSE;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS mobile_service_radius_miles INTEGER DEFAULT 10;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS mobile_payment_methods JSONB DEFAULT '["card", "cash"]';

COMMENT ON COLUMN public.profiles.has_own_payment_processing IS 'Whether this barber processes their own payments (booth rental model)';
COMMENT ON COLUMN public.profiles.stripe_connected_account_id IS 'Reference to barber''s own Stripe Connected Account';
COMMENT ON COLUMN public.profiles.payment_processing_status IS 'Status of barber''s payment processing capability';
COMMENT ON COLUMN public.profiles.offers_mobile_services IS 'Whether barber offers mobile/on-location services';
COMMENT ON COLUMN public.profiles.mobile_service_radius_miles IS 'Service radius for mobile appointments';
COMMENT ON COLUMN public.profiles.mobile_payment_methods IS 'Accepted payment methods for mobile services';

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
  accepts_checks BOOLEAN DEFAULT FALSE,
  accepts_crypto BOOLEAN DEFAULT FALSE,
  
  -- Mobile payment settings
  mobile_payment_enabled BOOLEAN DEFAULT FALSE,
  mobile_prepayment_required BOOLEAN DEFAULT FALSE,
  mobile_service_fee DECIMAL(10,2) DEFAULT 0,
  mobile_payment_methods JSONB DEFAULT '["card", "cash"]',
  
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
  stripe_mobile_reader_id VARCHAR(255),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(barber_id, barbershop_id)
);

CREATE INDEX idx_barber_payment_settings_barber ON public.barber_payment_settings(barber_id);
CREATE INDEX idx_barber_payment_settings_shop ON public.barber_payment_settings(barbershop_id);
CREATE INDEX idx_barber_payment_settings_active ON public.barber_payment_settings(is_active);
CREATE INDEX idx_barber_payment_mobile ON public.barber_payment_settings(mobile_payment_enabled);

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

-- Add mobile service financial arrangements
ALTER TABLE public.financial_arrangements
ADD COLUMN IF NOT EXISTS mobile_service_fee DECIMAL(10,2) DEFAULT 0;

ALTER TABLE public.financial_arrangements
ADD COLUMN IF NOT EXISTS mobile_service_fee_type VARCHAR(20) DEFAULT 'flat'
CHECK (mobile_service_fee_type IN ('flat', 'percentage'));

COMMENT ON COLUMN public.financial_arrangements.payment_processing_arrangement IS 'Who processes payments for this barber';
COMMENT ON COLUMN public.financial_arrangements.barber_stripe_account_id IS 'Barber''s Stripe account for direct processing';
COMMENT ON COLUMN public.financial_arrangements.platform_fee_rate IS 'BookedBarber platform fee rate';
COMMENT ON COLUMN public.financial_arrangements.mobile_service_fee IS 'Additional fee for mobile services';
COMMENT ON COLUMN public.financial_arrangements.mobile_service_fee_type IS 'How mobile service fee is calculated';

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
    'amount_based',     -- Route based on transaction amount
    'location_based',   -- Route based on service location (mobile vs in-shop)
    'accessibility'     -- Special routing for accessibility needs
  )),
  
  -- Rule conditions (JSONB for flexibility)
  conditions JSONB NOT NULL DEFAULT '{}',
  -- Example conditions:
  -- {"service_ids": ["uuid1", "uuid2"], "route_to": "barber"}
  -- {"client_tags": ["vip", "regular"], "route_to": "shop"}
  -- {"day_of_week": [1,2,3], "route_to": "barber"}
  -- {"min_amount": 100, "route_to": "shop"}
  -- {"is_mobile": true, "route_to": "barber"}
  -- {"requires_accessibility": true, "route_to": "shop"}
  
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
CREATE INDEX idx_payment_routing_type ON public.payment_routing_rules(rule_type);

-- ==========================================
-- STEP 7: Create mobile payment sessions table
-- ==========================================

CREATE TABLE IF NOT EXISTS public.mobile_payment_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES public.appointments(id),
  barber_id UUID REFERENCES public.profiles(id),
  client_id UUID REFERENCES public.profiles(id),
  
  -- Location details
  service_location_type VARCHAR(50) CHECK (service_location_type IN ('client_home', 'office', 'event', 'other')),
  service_address TEXT,
  service_coordinates POINT, -- PostGIS point for lat/long
  distance_from_shop_miles DECIMAL(5,2),
  
  -- Payment details
  base_amount DECIMAL(10,2) NOT NULL,
  mobile_service_fee DECIMAL(10,2) DEFAULT 0,
  travel_fee DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  
  -- Payment processing
  payment_method VARCHAR(50),
  payment_processor VARCHAR(50) CHECK (payment_processor IN ('stripe', 'square', 'cash', 'other')),
  processor_transaction_id VARCHAR(255),
  
  -- Session status
  session_status VARCHAR(50) DEFAULT 'pending'
  CHECK (session_status IN ('pending', 'en_route', 'arrived', 'service_complete', 'paid', 'cancelled')),
  
  -- Timestamps
  scheduled_at TIMESTAMPTZ NOT NULL,
  arrived_at TIMESTAMPTZ,
  service_started_at TIMESTAMPTZ,
  service_completed_at TIMESTAMPTZ,
  payment_collected_at TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mobile_payment_appointment ON public.mobile_payment_sessions(appointment_id);
CREATE INDEX idx_mobile_payment_barber ON public.mobile_payment_sessions(barber_id);
CREATE INDEX idx_mobile_payment_status ON public.mobile_payment_sessions(session_status);
CREATE INDEX idx_mobile_payment_date ON public.mobile_payment_sessions(scheduled_at);

-- ==========================================
-- STEP 8: Create payment routing audit table
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
  
  -- Service details
  is_mobile_service BOOLEAN DEFAULT FALSE,
  service_location VARCHAR(255),
  accessibility_accommodation BOOLEAN DEFAULT FALSE,
  
  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  mobile_fee DECIMAL(10,2) DEFAULT 0,
  platform_fee DECIMAL(10,2) DEFAULT 0,
  stripe_charge_id VARCHAR(255),
  stripe_account_used VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_routing_audit_appointment ON public.payment_routing_audit(appointment_id);
CREATE INDEX idx_payment_routing_audit_date ON public.payment_routing_audit(created_at DESC);
CREATE INDEX idx_payment_routing_audit_mobile ON public.payment_routing_audit(is_mobile_service);

-- ==========================================
-- STEP 9: Add helpful views
-- ==========================================

-- View to see payment setup status for all barbers in a shop
CREATE OR REPLACE VIEW barber_payment_status AS
SELECT 
  p.id as barber_id,
  p.full_name as barber_name,
  b.id as barbershop_id,
  b.name as barbershop_name,
  b.payment_model,
  b.mobile_services,
  b.wheelchair_accessible,
  p.has_own_payment_processing,
  p.payment_processing_status,
  p.offers_mobile_services,
  sca.stripe_account_id,
  sca.charges_enabled,
  sca.payouts_enabled,
  sca.mobile_payments_enabled,
  fa.payment_processing_arrangement,
  fa.mobile_service_fee,
  CASE 
    WHEN b.payment_model = 'commission' THEN 'Shop processes all payments'
    WHEN b.payment_model = 'booth_rental' AND p.has_own_payment_processing THEN 'Barber processes payments'
    WHEN b.payment_model = 'hybrid' THEN 'Mixed processing'
    ELSE 'Not configured'
  END as payment_setup_status,
  CASE
    WHEN p.offers_mobile_services AND sca.mobile_payments_enabled THEN 'Mobile ready'
    WHEN p.offers_mobile_services THEN 'Mobile cash only'
    ELSE 'In-shop only'
  END as mobile_payment_status
FROM public.profiles p
LEFT JOIN public.barbershops b ON (p.shop_id = b.id OR p.barbershop_id = b.id)
LEFT JOIN public.stripe_connected_accounts sca ON p.stripe_connected_account_id = sca.id
LEFT JOIN public.financial_arrangements fa ON fa.barber_id = p.id AND fa.barbershop_id = b.id AND fa.is_active = true
WHERE p.role IN ('BARBER', 'SHOP_OWNER');

-- View for mobile payment analytics
CREATE OR REPLACE VIEW mobile_payment_analytics AS
SELECT 
  DATE_TRUNC('month', mps.scheduled_at) as month,
  b.id as barbershop_id,
  b.name as barbershop_name,
  COUNT(DISTINCT mps.id) as mobile_appointments,
  COUNT(DISTINCT mps.barber_id) as mobile_barbers,
  AVG(mps.distance_from_shop_miles) as avg_distance_miles,
  SUM(mps.base_amount) as total_service_revenue,
  SUM(mps.mobile_service_fee) as total_mobile_fees,
  SUM(mps.travel_fee) as total_travel_fees,
  AVG(EXTRACT(EPOCH FROM (mps.payment_collected_at - mps.service_completed_at))/60) as avg_payment_collection_minutes
FROM public.mobile_payment_sessions mps
JOIN public.barbershops b ON b.id = (
  SELECT barbershop_id FROM public.profiles WHERE id = mps.barber_id
)
WHERE mps.session_status = 'paid'
GROUP BY DATE_TRUNC('month', mps.scheduled_at), b.id, b.name;

-- ==========================================
-- STEP 10: Add RLS policies
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

-- Mobile payment session policies
CREATE POLICY "Barbers can manage own mobile sessions"
  ON public.mobile_payment_sessions
  FOR ALL
  USING (barber_id = auth.uid());

CREATE POLICY "Clients can view own mobile sessions"
  ON public.mobile_payment_sessions
  FOR SELECT
  USING (client_id = auth.uid());

-- ==========================================
-- STEP 11: Add functions for payment routing
-- ==========================================

-- Function to determine payment routing for an appointment
CREATE OR REPLACE FUNCTION determine_payment_routing(
  p_appointment_id UUID,
  p_is_mobile BOOLEAN DEFAULT FALSE,
  p_requires_accessibility BOOLEAN DEFAULT FALSE
) RETURNS TABLE (
  route_to VARCHAR(20),
  routing_reason TEXT,
  stripe_account_id VARCHAR(255),
  mobile_fee DECIMAL(10,2)
) AS $$
DECLARE
  v_barbershop_id UUID;
  v_barber_id UUID;
  v_payment_model VARCHAR(20);
  v_route_to VARCHAR(20);
  v_reason TEXT;
  v_stripe_account VARCHAR(255);
  v_mobile_fee DECIMAL(10,2) DEFAULT 0;
BEGIN
  -- Get appointment details
  SELECT barbershop_id, barber_id INTO v_barbershop_id, v_barber_id
  FROM appointments WHERE id = p_appointment_id;
  
  -- Get barbershop payment model
  SELECT payment_model INTO v_payment_model
  FROM barbershops WHERE id = v_barbershop_id;
  
  -- Determine base routing
  IF v_payment_model = 'commission' THEN
    v_route_to := 'shop';
    v_reason := 'Commission model - all payments through shop';
  ELSIF v_payment_model = 'booth_rental' THEN
    v_route_to := 'barber';
    v_reason := 'Booth rental model - payments to barber';
  ELSE
    -- Hybrid model - check rules
    -- Check mobile service rule
    IF p_is_mobile THEN
      SELECT route_to, 'Mobile service routing' INTO v_route_to, v_reason
      FROM payment_routing_rules
      WHERE barbershop_id = v_barbershop_id
        AND rule_type = 'location_based'
        AND conditions->>'is_mobile' = 'true'
        AND is_active = TRUE
      ORDER BY priority DESC
      LIMIT 1;
    END IF;
    
    -- Default to shop if no rule found
    IF v_route_to IS NULL THEN
      v_route_to := 'shop';
      v_reason := 'Default routing - no specific rule matched';
    END IF;
  END IF;
  
  -- Get Stripe account
  IF v_route_to = 'barber' THEN
    SELECT stripe_account_id INTO v_stripe_account
    FROM barber_payment_settings
    WHERE barber_id = v_barber_id AND barbershop_id = v_barbershop_id;
  ELSE
    SELECT stripe_account_id INTO v_stripe_account
    FROM stripe_connected_accounts
    WHERE barbershop_id = v_barbershop_id AND account_owner_type = 'shop';
  END IF;
  
  -- Calculate mobile fee if applicable
  IF p_is_mobile THEN
    SELECT mobile_service_fee INTO v_mobile_fee
    FROM financial_arrangements
    WHERE barber_id = v_barber_id AND barbershop_id = v_barbershop_id
      AND is_active = TRUE;
  END IF;
  
  RETURN QUERY SELECT v_route_to, v_reason, v_stripe_account, v_mobile_fee;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- STEP 12: Insert migration log
-- ==========================================

INSERT INTO public.migrations_log (migration_name, status)
VALUES (
  'payment_model_migration_enhanced', 
  'completed'
)
ON CONFLICT (migration_name) DO UPDATE
SET status = 'completed';

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================
-- This enhanced migration adds support for:
-- 1. Three payment models (Commission, Booth Rental, Hybrid)
-- 2. Mobile service payment processing
-- 3. Accessibility payment accommodations
-- 4. Location-based payment routing
-- 5. Mobile payment session tracking
-- 6. Enhanced analytics and reporting
--
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Update UI components to support model selection
-- 3. Implement Stripe Connect for booth rental model
-- 4. Configure Stripe Terminal for mobile payments
-- 5. Test all payment flows including mobile services
-- 6. Set up webhooks for payment status updates
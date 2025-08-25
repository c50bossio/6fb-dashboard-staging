-- ==========================================
-- MULTI-TENANT PAYMENT ARCHITECTURE MIGRATION
-- ==========================================
-- This migration adds comprehensive support for:
-- 1. Platform subscriptions (BookedBarber fees)
-- 2. Client payments (customer to barbershop/barber)
-- 3. Usage billing (AI tokens, SMS, email)
-- 4. Barber compensation (commission, booth rent, hybrid)

-- ==========================================
-- PAYMENT CONFIGURATIONS TABLE
-- ==========================================
-- Single source of truth for all payment settings
CREATE TABLE IF NOT EXISTS public.payment_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE UNIQUE,
  
  -- Platform Subscription (Flow 1: Barbershop → BookedBarber)
  subscription_tier VARCHAR(20) DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'professional', 'enterprise')),
  stripe_subscription_id VARCHAR(255),
  subscription_status VARCHAR(20) DEFAULT 'trialing' CHECK (subscription_status IN ('trialing', 'active', 'canceled', 'past_due', 'unpaid')),
  subscription_current_period_end TIMESTAMP WITH TIME ZONE,
  
  -- Client Payment Settings (Flow 2: Client → Barbershop/Barber)
  client_payment_mode VARCHAR(30) DEFAULT 'shop_only' CHECK (client_payment_mode IN ('shop_only', 'individual_optional', 'individual_required')),
  allow_barber_accounts BOOLEAN DEFAULT false,
  require_barber_accounts BOOLEAN DEFAULT false,
  customer_pays_processing_fee BOOLEAN DEFAULT true,
  
  -- Usage Billing (Flow 3: Barbershop → BookedBarber for usage)
  usage_billing_enabled BOOLEAN DEFAULT true,
  billing_threshold DECIMAL(10,2) DEFAULT 100.00, -- Auto-charge threshold
  usage_payment_method_id VARCHAR(255), -- Stripe payment method for usage charges
  
  -- Default Compensation Model (Flow 4: Barbershop → Barber)
  default_compensation_model VARCHAR(20) DEFAULT 'commission' CHECK (default_compensation_model IN ('commission', 'booth_rent', 'hybrid')),
  default_commission_rate DECIMAL(5,2) DEFAULT 60.00,
  default_booth_rent DECIMAL(10,2) DEFAULT 1500.00,
  default_hybrid_base_rent DECIMAL(10,2) DEFAULT 800.00,
  default_hybrid_commission_rate DECIMAL(5,2) DEFAULT 20.00,
  default_hybrid_revenue_threshold DECIMAL(10,2) DEFAULT 4000.00,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- FINANCIAL ARRANGEMENTS TABLE
-- ==========================================
-- Individual barber compensation agreements
CREATE TABLE IF NOT EXISTS public.financial_arrangements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Model Selection
  arrangement_type VARCHAR(20) NOT NULL CHECK (arrangement_type IN ('commission', 'booth_rent', 'hybrid')),
  
  -- Commission Settings (for COMMISSION and HYBRID models)
  commission_percentage DECIMAL(5,2), -- e.g., 60.00 for 60%
  commission_threshold DECIMAL(10,2) DEFAULT 0, -- For HYBRID: commission starts above this
  
  -- Booth Rent Settings (for BOOTH_RENT and HYBRID models)
  booth_rent_amount DECIMAL(10,2), -- Monthly rent amount
  rent_due_day INTEGER DEFAULT 1 CHECK (rent_due_day BETWEEN 1 AND 28),
  grace_period_days INTEGER DEFAULT 3,
  late_fee_amount DECIMAL(10,2) DEFAULT 50.00,
  late_fee_type VARCHAR(20) DEFAULT 'fixed' CHECK (late_fee_type IN ('fixed', 'percentage')),
  
  -- Hybrid Specific Settings
  hybrid_base_rent DECIMAL(10,2), -- Lower rent amount for hybrid model
  hybrid_commission_rate DECIMAL(5,2), -- Commission rate above threshold
  hybrid_revenue_threshold DECIMAL(10,2), -- Revenue threshold to start commission
  
  -- Payment Collection Configuration
  payment_method_priority TEXT[] DEFAULT ARRAY['balance', 'ach', 'card'],
  auto_collect_enabled BOOLEAN DEFAULT true,
  allow_partial_payments BOOLEAN DEFAULT true,
  minimum_payment_amount DECIMAL(10,2) DEFAULT 100.00,
  
  -- Barber's Stripe Account (if individual accounts enabled)
  barber_stripe_account_id VARCHAR(255),
  barber_stripe_onboarded BOOLEAN DEFAULT false,
  
  -- Agreement Terms
  is_active BOOLEAN DEFAULT true,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE, -- For term agreements
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one active arrangement per barber per shop
  UNIQUE(barbershop_id, barber_id, is_active)
);

-- ==========================================
-- RENT LEDGER TABLE
-- ==========================================
-- Tracks booth rent charges and payments
CREATE TABLE IF NOT EXISTS public.rent_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  arrangement_id UUID REFERENCES public.financial_arrangements(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  
  -- Billing Period
  billing_month DATE NOT NULL, -- First day of the month
  rent_amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  
  -- Payment Tracking
  amount_paid DECIMAL(10,2) DEFAULT 0,
  balance_remaining DECIMAL(10,2) GENERATED ALWAYS AS (rent_amount - amount_paid) STORED,
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue', 'waived')),
  
  -- Late Fees
  late_fee_assessed DECIMAL(10,2) DEFAULT 0,
  late_fee_paid DECIMAL(10,2) DEFAULT 0,
  late_fee_waived BOOLEAN DEFAULT false,
  
  -- Payment Details
  last_payment_date TIMESTAMP WITH TIME ZONE,
  last_payment_amount DECIMAL(10,2),
  last_payment_method VARCHAR(20), -- 'balance', 'ach', 'card', 'cash'
  
  -- Status Timestamps
  paid_at TIMESTAMP WITH TIME ZONE,
  marked_overdue_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one entry per barber per month
  UNIQUE(barber_id, barbershop_id, billing_month)
);

-- ==========================================
-- PAYMENT ALLOCATIONS TABLE
-- ==========================================
-- Records how each customer payment is split
CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Source Payment Information
  source_payment_id VARCHAR(255), -- Stripe payment intent ID
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  customer_id UUID REFERENCES public.customers(id),
  service_id UUID REFERENCES public.services(id),
  
  -- Amounts
  total_amount DECIMAL(10,2) NOT NULL,
  tip_amount DECIMAL(10,2) DEFAULT 0,
  processing_fee DECIMAL(10,2) DEFAULT 0,
  
  -- Allocation Breakdown
  barbershop_amount DECIMAL(10,2) DEFAULT 0,
  barber_amount DECIMAL(10,2) DEFAULT 0,
  rent_allocation DECIMAL(10,2) DEFAULT 0,
  commission_amount DECIMAL(10,2) DEFAULT 0,
  platform_fee DECIMAL(10,2) DEFAULT 0,
  
  -- References
  barber_id UUID REFERENCES auth.users(id),
  barbershop_id UUID REFERENCES public.barbershops(id),
  arrangement_id UUID REFERENCES public.financial_arrangements(id),
  rent_ledger_id UUID REFERENCES public.rent_ledger(id),
  
  -- Allocation Details
  allocation_type VARCHAR(30) NOT NULL CHECK (allocation_type IN ('commission', 'booth_rent', 'hybrid', 'shop_only')),
  allocation_formula JSONB, -- Store the calculation details
  
  -- Transfer Information
  barber_transfer_id VARCHAR(255), -- Stripe transfer ID to barber
  barber_transfer_status VARCHAR(20),
  barber_transfer_date TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- ==========================================
-- USAGE CHARGES TABLE
-- ==========================================
-- Tracks platform usage (AI, SMS, Email)
CREATE TABLE IF NOT EXISTS public.usage_charges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  
  -- Usage Type
  usage_type VARCHAR(20) NOT NULL CHECK (usage_type IN ('ai_tokens', 'sms', 'email', 'storage', 'api_calls')),
  usage_category VARCHAR(50), -- 'customer_insights', 'marketing_campaign', etc.
  
  -- Quantity and Cost
  quantity DECIMAL(20,2) NOT NULL, -- tokens, messages, emails, GB, calls
  unit_cost DECIMAL(10,6) NOT NULL, -- cost per unit
  total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  
  -- Billing
  billing_period DATE NOT NULL, -- Month of usage
  billed BOOLEAN DEFAULT false,
  billed_at TIMESTAMP WITH TIME ZONE,
  stripe_invoice_id VARCHAR(255),
  
  -- Context
  context_type VARCHAR(30), -- 'manual', 'campaign', 'automation'
  context_id VARCHAR(255), -- Reference to campaign, automation, etc.
  initiated_by UUID REFERENCES auth.users(id),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- ==========================================
-- PLATFORM SUBSCRIPTIONS TABLE
-- ==========================================
-- Tracks BookedBarber platform subscriptions
CREATE TABLE IF NOT EXISTS public.platform_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE UNIQUE,
  
  -- Stripe Subscription
  stripe_customer_id VARCHAR(255) NOT NULL,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_price_id VARCHAR(255),
  
  -- Subscription Details
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('starter', 'professional', 'enterprise')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('trialing', 'active', 'canceled', 'past_due', 'unpaid', 'incomplete')),
  
  -- Billing
  monthly_price DECIMAL(10,2) NOT NULL,
  billing_interval VARCHAR(10) DEFAULT 'month' CHECK (billing_interval IN ('month', 'year')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  
  -- Trial
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  
  -- Payment Method
  default_payment_method_id VARCHAR(255),
  
  -- Features (based on tier)
  features JSONB DEFAULT '{}',
  usage_limits JSONB DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  canceled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT
);

-- ==========================================
-- COMMISSION TRANSACTIONS TABLE
-- ==========================================
-- Records individual commission/rent transactions
CREATE TABLE IF NOT EXISTS public.commission_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_intent_id VARCHAR(255) NOT NULL,
  arrangement_id UUID REFERENCES public.financial_arrangements(id),
  barber_id UUID REFERENCES auth.users(id),
  barbershop_id UUID REFERENCES public.barbershops(id),
  
  -- Transaction Details
  payment_amount DECIMAL(10,2) NOT NULL, -- Original payment amount
  commission_amount DECIMAL(10,2) NOT NULL, -- Amount for barber
  shop_amount DECIMAL(10,2) NOT NULL, -- Amount for shop
  commission_percentage DECIMAL(5,2), -- Percentage used
  
  -- Type
  arrangement_type VARCHAR(20) NOT NULL CHECK (arrangement_type IN ('commission', 'booth_rent', 'hybrid')),
  transaction_type VARCHAR(20) CHECK (transaction_type IN ('service_commission', 'rent_payment', 'hybrid_commission', 'tip')),
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending_payout' CHECK (status IN ('pending_payout', 'paid_out', 'cancelled', 'refunded')),
  
  -- Payout Information
  payout_method VARCHAR(20), -- 'stripe_transfer', 'manual', 'cash'
  stripe_transfer_id VARCHAR(255),
  paid_out_at TIMESTAMP WITH TIME ZONE,
  payout_transaction_id UUID,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- BARBER COMMISSION BALANCES VIEW
-- ==========================================
-- Real-time view of barber earnings and balances
CREATE OR REPLACE VIEW public.barber_commission_balances AS
SELECT 
  ct.barber_id,
  ct.barbershop_id,
  COUNT(*) as total_transactions,
  SUM(CASE WHEN ct.status = 'pending_payout' THEN ct.commission_amount ELSE 0 END) as pending_amount,
  SUM(CASE WHEN ct.status = 'paid_out' THEN ct.commission_amount ELSE 0 END) as paid_amount,
  SUM(ct.commission_amount) as total_earned,
  MAX(ct.created_at) as last_transaction_at,
  MAX(ct.paid_out_at) as last_payout_at
FROM public.commission_transactions ct
GROUP BY ct.barber_id, ct.barbershop_id;

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX idx_financial_arrangements_barbershop ON public.financial_arrangements(barbershop_id);
CREATE INDEX idx_financial_arrangements_barber ON public.financial_arrangements(barber_id);
CREATE INDEX idx_rent_ledger_barber ON public.rent_ledger(barber_id);
CREATE INDEX idx_rent_ledger_status ON public.rent_ledger(payment_status);
CREATE INDEX idx_rent_ledger_due_date ON public.rent_ledger(due_date);
CREATE INDEX idx_payment_allocations_barber ON public.payment_allocations(barber_id);
CREATE INDEX idx_payment_allocations_date ON public.payment_allocations(payment_date);
CREATE INDEX idx_usage_charges_barbershop ON public.usage_charges(barbershop_id);
CREATE INDEX idx_usage_charges_period ON public.usage_charges(billing_period);
CREATE INDEX idx_commission_transactions_barber ON public.commission_transactions(barber_id);
CREATE INDEX idx_commission_transactions_status ON public.commission_transactions(status);

-- ==========================================
-- ROW LEVEL SECURITY POLICIES
-- ==========================================

-- Payment Configurations
ALTER TABLE public.payment_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Barbershop owners can view and edit their payment config"
  ON public.payment_configurations
  FOR ALL
  USING (barbershop_id IN (
    SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
  ));

-- Financial Arrangements
ALTER TABLE public.financial_arrangements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Barbershop owners can manage arrangements"
  ON public.financial_arrangements
  FOR ALL
  USING (barbershop_id IN (
    SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Barbers can view their own arrangements"
  ON public.financial_arrangements
  FOR SELECT
  USING (barber_id = auth.uid());

-- Rent Ledger
ALTER TABLE public.rent_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Barbershop owners can view all rent records"
  ON public.rent_ledger
  FOR SELECT
  USING (barbershop_id IN (
    SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Barbers can view their own rent records"
  ON public.rent_ledger
  FOR SELECT
  USING (barber_id = auth.uid());

-- Payment Allocations
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their related payment allocations"
  ON public.payment_allocations
  FOR SELECT
  USING (
    barber_id = auth.uid() OR
    barbershop_id IN (
      SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
    )
  );

-- Usage Charges
ALTER TABLE public.usage_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Barbershop owners can view their usage charges"
  ON public.usage_charges
  FOR SELECT
  USING (barbershop_id IN (
    SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
  ));

-- Commission Transactions
ALTER TABLE public.commission_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their related commission transactions"
  ON public.commission_transactions
  FOR SELECT
  USING (
    barber_id = auth.uid() OR
    barbershop_id IN (
      SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
    )
  );

-- ==========================================
-- FUNCTIONS FOR PAYMENT CALCULATIONS
-- ==========================================

-- Function to calculate payment split based on arrangement
CREATE OR REPLACE FUNCTION public.calculate_payment_split(
  p_payment_amount DECIMAL,
  p_arrangement_id UUID
)
RETURNS TABLE (
  barber_amount DECIMAL,
  shop_amount DECIMAL,
  rent_deduction DECIMAL,
  commission_amount DECIMAL
) AS $$
DECLARE
  v_arrangement RECORD;
  v_rent_owed DECIMAL;
  v_current_month_revenue DECIMAL;
BEGIN
  -- Get arrangement details
  SELECT * INTO v_arrangement
  FROM public.financial_arrangements
  WHERE id = p_arrangement_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active arrangement not found';
  END IF;
  
  -- Initialize return values
  barber_amount := 0;
  shop_amount := 0;
  rent_deduction := 0;
  commission_amount := 0;
  
  CASE v_arrangement.arrangement_type
    WHEN 'commission' THEN
      -- Simple commission split
      commission_amount := p_payment_amount * (v_arrangement.commission_percentage / 100);
      barber_amount := commission_amount;
      shop_amount := p_payment_amount - commission_amount;
      
    WHEN 'booth_rent' THEN
      -- Barber keeps all, but check for rent owed
      barber_amount := p_payment_amount;
      
      -- Check outstanding rent if auto-collect enabled
      IF v_arrangement.auto_collect_enabled THEN
        SELECT COALESCE(balance_remaining, 0) INTO v_rent_owed
        FROM public.rent_ledger
        WHERE barber_id = v_arrangement.barber_id
          AND barbershop_id = v_arrangement.barbershop_id
          AND payment_status IN ('pending', 'partial', 'overdue')
        ORDER BY due_date
        LIMIT 1;
        
        IF v_rent_owed > 0 THEN
          -- Deduct up to 20% of payment for rent
          rent_deduction := LEAST(v_rent_owed, p_payment_amount * 0.2);
          barber_amount := barber_amount - rent_deduction;
          shop_amount := rent_deduction;
        END IF;
      END IF;
      
    WHEN 'hybrid' THEN
      -- Get current month revenue for threshold calculation
      SELECT COALESCE(SUM(total_amount), 0) INTO v_current_month_revenue
      FROM public.payment_allocations
      WHERE barber_id = v_arrangement.barber_id
        AND barbershop_id = v_arrangement.barbershop_id
        AND DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE);
      
      -- Check for rent owed
      IF v_arrangement.auto_collect_enabled THEN
        SELECT COALESCE(balance_remaining, 0) INTO v_rent_owed
        FROM public.rent_ledger
        WHERE barber_id = v_arrangement.barber_id
          AND barbershop_id = v_arrangement.barbershop_id
          AND payment_status IN ('pending', 'partial', 'overdue')
        ORDER BY due_date
        LIMIT 1;
        
        IF v_rent_owed > 0 THEN
          rent_deduction := LEAST(v_rent_owed, p_payment_amount * 0.15);
        END IF;
      END IF;
      
      -- Calculate commission if above threshold
      IF (v_current_month_revenue + p_payment_amount) > v_arrangement.hybrid_revenue_threshold THEN
        DECLARE
          v_excess_amount DECIMAL;
          v_commissionable_amount DECIMAL;
        BEGIN
          v_excess_amount := (v_current_month_revenue + p_payment_amount) - v_arrangement.hybrid_revenue_threshold;
          v_commissionable_amount := LEAST(v_excess_amount, p_payment_amount);
          commission_amount := v_commissionable_amount * (v_arrangement.hybrid_commission_rate / 100);
        END;
      END IF;
      
      shop_amount := rent_deduction + commission_amount;
      barber_amount := p_payment_amount - shop_amount;
  END CASE;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ==========================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_configurations_updated_at
  BEFORE UPDATE ON public.payment_configurations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_financial_arrangements_updated_at
  BEFORE UPDATE ON public.financial_arrangements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_rent_ledger_updated_at
  BEFORE UPDATE ON public.rent_ledger
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ==========================================
-- MIGRATION COMPLETION
-- ==========================================
-- Update existing barbershops table with payment model configuration
ALTER TABLE public.barbershops 
ADD COLUMN IF NOT EXISTS payment_model VARCHAR(30) DEFAULT 'shop_only' CHECK (payment_model IN ('shop_only', 'individual_optional', 'individual_required')),
ADD COLUMN IF NOT EXISTS allow_barber_accounts BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS require_barber_accounts BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS default_arrangement_type VARCHAR(20) DEFAULT 'commission' CHECK (default_arrangement_type IN ('commission', 'booth_rent', 'hybrid'));

-- Update existing stripe_connected_accounts table
ALTER TABLE public.stripe_connected_accounts 
ADD COLUMN IF NOT EXISTS account_role VARCHAR(20) DEFAULT 'barbershop' CHECK (account_role IN ('barbershop', 'barber', 'platform'));

-- Create initial payment configurations for existing barbershops
INSERT INTO public.payment_configurations (barbershop_id)
SELECT id FROM public.barbershops b
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_configurations pc 
  WHERE pc.barbershop_id = b.id
)
ON CONFLICT (barbershop_id) DO NOTHING;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.payment_configurations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.financial_arrangements TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.rent_ledger TO authenticated;
GRANT SELECT, INSERT ON public.payment_allocations TO authenticated;
GRANT SELECT, INSERT ON public.usage_charges TO authenticated;
GRANT SELECT, INSERT ON public.commission_transactions TO authenticated;
GRANT SELECT ON public.barber_commission_balances TO authenticated;

COMMENT ON TABLE public.payment_configurations IS 'Single source of truth for all payment settings per barbershop';
COMMENT ON TABLE public.financial_arrangements IS 'Individual barber compensation agreements (commission, booth rent, hybrid)';
COMMENT ON TABLE public.rent_ledger IS 'Tracks booth rent charges and payments for booth rent and hybrid models';
COMMENT ON TABLE public.payment_allocations IS 'Records how each customer payment is split between shop and barber';
COMMENT ON TABLE public.usage_charges IS 'Tracks platform usage (AI tokens, SMS, email) for usage-based billing';
COMMENT ON TABLE public.commission_transactions IS 'Individual commission and rent payment transactions';
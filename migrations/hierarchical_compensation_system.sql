-- =======================================================================
-- HIERARCHICAL COMPENSATION SYSTEM MIGRATION
-- =======================================================================
-- Creates shop-level defaults with individual barber overrides
-- Replaces fragmented compensation tables with unified hierarchy
-- Date: 2025-01-02
-- =======================================================================

-- Drop existing views that might conflict
DROP VIEW IF EXISTS effective_compensation;

-- =======================================================================
-- SHOP-LEVEL DEFAULT COMPENSATION
-- =======================================================================
CREATE TABLE IF NOT EXISTS shop_compensation_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Default Model for ALL barbers
  default_model_type TEXT NOT NULL DEFAULT 'commission' 
    CHECK (default_model_type IN ('commission', 'booth_rent', 'tiered', 'hybrid')),
  
  -- Default Commission Settings
  default_commission_rate DECIMAL(5,2) DEFAULT 0.40, -- Shop keeps 40%, barber gets 60%
  
  -- Default Booth Rent Settings  
  default_booth_rent_amount DECIMAL(10,2),
  default_booth_rent_frequency TEXT DEFAULT 'monthly'
    CHECK (default_booth_rent_frequency IN ('daily', 'weekly', 'monthly')),
  
  -- Default Tier Structure
  default_tier_structure_id UUID,
  default_use_marginal_calculation BOOLEAN DEFAULT true,
  
  -- Default Hybrid Settings
  default_hybrid_base_rent DECIMAL(10,2),
  default_hybrid_commission_rate DECIMAL(5,2),
  default_hybrid_threshold DECIMAL(10,2), -- Revenue threshold where commission kicks in
  
  -- Default Product Commission (applies to all models)
  default_product_commission_rate DECIMAL(5,2) DEFAULT 0.10, -- 10% on product sales
  
  -- Default Payment Configuration
  default_payment_methods TEXT[] DEFAULT ARRAY['balance', 'ach', 'card'],
  default_billing_cycle TEXT DEFAULT 'monthly'
    CHECK (default_billing_cycle IN ('weekly', 'biweekly', 'monthly')),
  default_payment_due_day INTEGER DEFAULT 1 CHECK (default_payment_due_day BETWEEN 1 AND 31),
  
  -- Automation Settings
  apply_to_new_barbers BOOLEAN DEFAULT true, -- Auto-apply to new staff
  allow_barber_overrides BOOLEAN DEFAULT true, -- Can barbers request custom terms
  require_approval_for_overrides BOOLEAN DEFAULT true, -- Manager approval needed
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  last_modified_by UUID REFERENCES profiles(id),
  
  CONSTRAINT unique_shop_defaults UNIQUE(barbershop_id)
);

-- =======================================================================
-- INDIVIDUAL BARBER COMPENSATION OVERRIDES
-- =======================================================================
CREATE TABLE IF NOT EXISTS barber_compensation_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Master Override Control
  use_shop_defaults BOOLEAN DEFAULT true, -- FALSE = full custom override
  
  -- Override Model Selection (NULL = use shop default)
  override_model_type TEXT
    CHECK (override_model_type IN ('commission', 'booth_rent', 'tiered', 'hybrid') OR override_model_type IS NULL),
  
  -- Override Commission Settings (NULL = use shop default)
  override_commission_rate DECIMAL(5,2),
  
  -- Override Booth Rent Settings
  override_booth_rent_amount DECIMAL(10,2),
  override_booth_rent_frequency TEXT
    CHECK (override_booth_rent_frequency IN ('daily', 'weekly', 'monthly') OR override_booth_rent_frequency IS NULL),
  
  -- Override Tier Structure
  override_tier_structure_id UUID,
  override_use_marginal_calculation BOOLEAN,
  
  -- Override Hybrid Settings
  override_hybrid_base_rent DECIMAL(10,2),
  override_hybrid_commission_rate DECIMAL(5,2),
  override_hybrid_threshold DECIMAL(10,2),
  
  -- Override Product Commission
  override_product_commission_rate DECIMAL(5,2),
  
  -- Override Payment Configuration
  override_payment_methods TEXT[],
  override_billing_cycle TEXT
    CHECK (override_billing_cycle IN ('weekly', 'biweekly', 'monthly') OR override_billing_cycle IS NULL),
  override_payment_due_day INTEGER CHECK (override_payment_due_day BETWEEN 1 AND 31 OR override_payment_due_day IS NULL),
  
  -- Override Management
  override_reason TEXT, -- Why this barber has custom terms
  requested_by UUID REFERENCES profiles(id), -- Who requested the override
  approved_by UUID REFERENCES profiles(id), -- Who approved the override
  approved_at TIMESTAMPTZ, -- When it was approved
  
  -- Temporary Override Support
  effective_start_date DATE DEFAULT CURRENT_DATE,
  effective_end_date DATE, -- NULL = permanent override
  is_trial_period BOOLEAN DEFAULT false,
  trial_review_date DATE, -- When to review trial arrangements
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_pending_approval BOOLEAN DEFAULT false,
  rejection_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  
  CONSTRAINT unique_active_barber_override UNIQUE(barbershop_id, barber_id, is_active),
  CONSTRAINT valid_effective_dates CHECK (effective_end_date IS NULL OR effective_end_date > effective_start_date),
  CONSTRAINT trial_requires_end_date CHECK (NOT is_trial_period OR effective_end_date IS NOT NULL)
);

-- =======================================================================
-- ENHANCED TIER STRUCTURES (CONSOLIDATED)
-- =======================================================================
CREATE TABLE IF NOT EXISTS compensation_tier_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Tier Structure Details
  name TEXT NOT NULL,
  description TEXT,
  
  -- Tier Definition (JSON structure for flexibility)
  tiers JSONB NOT NULL, -- Array of {min, max, rate, name, color}
  
  -- Calculation Method
  calculation_method TEXT DEFAULT 'marginal'
    CHECK (calculation_method IN ('marginal', 'flat')),
  
  -- Reset Configuration
  reset_period TEXT DEFAULT 'monthly'
    CHECK (reset_period IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  reset_day INTEGER DEFAULT 1 CHECK (reset_day BETWEEN 1 AND 31),
  
  -- Configuration
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  CONSTRAINT valid_tiers_json CHECK (jsonb_typeof(tiers) = 'array'),
  CONSTRAINT unique_default_tier_per_shop UNIQUE(barbershop_id, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- =======================================================================
-- BARBER TIER PROGRESS TRACKING
-- =======================================================================
CREATE TABLE IF NOT EXISTS barber_tier_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  tier_config_id UUID REFERENCES compensation_tier_configs(id) ON DELETE CASCADE,
  
  -- Current Period Tracking
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  current_tier_level INTEGER DEFAULT 1,
  
  -- Revenue Tracking
  total_period_revenue DECIMAL(10,2) DEFAULT 0,
  total_period_bookings INTEGER DEFAULT 0,
  
  -- Tier Breakdown (for marginal calculations)
  tier_revenue_breakdown JSONB DEFAULT '{}', -- Revenue earned in each tier bracket
  tier_commission_breakdown JSONB DEFAULT '{}', -- Commission earned from each tier bracket
  
  -- Calculated Metrics
  effective_commission_rate DECIMAL(5,4), -- Overall rate after marginal calculation
  projected_period_revenue DECIMAL(10,2), -- Based on current trend
  next_tier_progress DECIMAL(5,4), -- Progress to next tier (0.0 to 1.0)
  days_to_next_tier INTEGER, -- Estimated days to reach next tier
  
  -- Performance Metrics
  avg_booking_value DECIMAL(8,2), -- Average service value
  bookings_per_week DECIMAL(5,2), -- Booking frequency
  
  -- Metadata
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_barber_period UNIQUE(barber_id, tier_config_id, period_start),
  CONSTRAINT valid_period CHECK (period_end > period_start)
);

-- =======================================================================
-- EFFECTIVE COMPENSATION VIEW (COMBINES DEFAULTS + OVERRIDES)
-- =======================================================================
CREATE VIEW effective_compensation AS
SELECT 
  -- Identifiers
  COALESCE(b.barbershop_id, s.barbershop_id) as barbershop_id,
  b.barber_id,
  
  -- Effective Model Type
  COALESCE(b.override_model_type, s.default_model_type) as model_type,
  
  -- Effective Commission Settings
  COALESCE(b.override_commission_rate, s.default_commission_rate) as commission_rate,
  
  -- Effective Booth Rent Settings
  COALESCE(b.override_booth_rent_amount, s.default_booth_rent_amount) as booth_rent_amount,
  COALESCE(b.override_booth_rent_frequency, s.default_booth_rent_frequency) as booth_rent_frequency,
  
  -- Effective Tier Settings
  COALESCE(b.override_tier_structure_id, s.default_tier_structure_id) as tier_structure_id,
  COALESCE(b.override_use_marginal_calculation, s.default_use_marginal_calculation) as use_marginal_calculation,
  
  -- Effective Hybrid Settings
  COALESCE(b.override_hybrid_base_rent, s.default_hybrid_base_rent) as hybrid_base_rent,
  COALESCE(b.override_hybrid_commission_rate, s.default_hybrid_commission_rate) as hybrid_commission_rate,
  COALESCE(b.override_hybrid_threshold, s.default_hybrid_threshold) as hybrid_threshold,
  
  -- Effective Product Commission
  COALESCE(b.override_product_commission_rate, s.default_product_commission_rate) as product_commission_rate,
  
  -- Effective Payment Settings
  COALESCE(b.override_payment_methods, s.default_payment_methods) as payment_methods,
  COALESCE(b.override_billing_cycle, s.default_billing_cycle) as billing_cycle,
  COALESCE(b.override_payment_due_day, s.default_payment_due_day) as payment_due_day,
  
  -- Override Status
  CASE 
    WHEN b.id IS NULL THEN 'shop_default'
    WHEN b.use_shop_defaults = true AND b.override_model_type IS NOT NULL THEN 'partial_override'
    WHEN b.use_shop_defaults = false THEN 'full_override'
    ELSE 'shop_default'
  END as compensation_source,
  
  -- Override Details
  b.override_reason,
  b.approved_by,
  b.approved_at,
  b.effective_start_date,
  b.effective_end_date,
  b.is_trial_period,
  b.is_active as override_active,
  
  -- Metadata
  GREATEST(s.updated_at, b.updated_at) as last_updated
  
FROM shop_compensation_defaults s
LEFT JOIN barber_compensation_overrides b 
  ON s.barbershop_id = b.barbershop_id 
  AND b.is_active = true
  AND (b.effective_start_date <= CURRENT_DATE)
  AND (b.effective_end_date IS NULL OR b.effective_end_date >= CURRENT_DATE)
WHERE s.barbershop_id IS NOT NULL;

-- =======================================================================
-- INDEXES FOR PERFORMANCE
-- =======================================================================

-- Shop defaults indexes
CREATE INDEX IF NOT EXISTS idx_shop_defaults_barbershop 
ON shop_compensation_defaults(barbershop_id);

-- Barber overrides indexes
CREATE INDEX IF NOT EXISTS idx_barber_overrides_barbershop_barber 
ON barber_compensation_overrides(barbershop_id, barber_id);

CREATE INDEX IF NOT EXISTS idx_barber_overrides_active 
ON barber_compensation_overrides(is_active, effective_start_date, effective_end_date);

CREATE INDEX IF NOT EXISTS idx_barber_overrides_approval 
ON barber_compensation_overrides(is_pending_approval, approved_by);

-- Tier configs indexes
CREATE INDEX IF NOT EXISTS idx_tier_configs_barbershop 
ON compensation_tier_configs(barbershop_id, is_active);

CREATE INDEX IF NOT EXISTS idx_tier_configs_default 
ON compensation_tier_configs(barbershop_id, is_default) WHERE is_default = true;

-- Tier progress indexes
CREATE INDEX IF NOT EXISTS idx_tier_progress_barber 
ON barber_tier_progress(barber_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_tier_progress_period 
ON barber_tier_progress(period_start, period_end, tier_config_id);

-- =======================================================================
-- TRIGGERS FOR AUTOMATED UPDATES
-- =======================================================================

-- Trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to shop defaults
DROP TRIGGER IF EXISTS trigger_shop_defaults_updated_at ON shop_compensation_defaults;
CREATE TRIGGER trigger_shop_defaults_updated_at
  BEFORE UPDATE ON shop_compensation_defaults
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply to barber overrides
DROP TRIGGER IF EXISTS trigger_barber_overrides_updated_at ON barber_compensation_overrides;
CREATE TRIGGER trigger_barber_overrides_updated_at
  BEFORE UPDATE ON barber_compensation_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply to tier configs
DROP TRIGGER IF EXISTS trigger_tier_configs_updated_at ON compensation_tier_configs;
CREATE TRIGGER trigger_tier_configs_updated_at
  BEFORE UPDATE ON compensation_tier_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger function to update tier progress timestamp
CREATE OR REPLACE FUNCTION update_tier_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tier progress
DROP TRIGGER IF EXISTS trigger_tier_progress_updated ON barber_tier_progress;
CREATE TRIGGER trigger_tier_progress_updated
  BEFORE UPDATE ON barber_tier_progress
  FOR EACH ROW EXECUTE FUNCTION update_tier_progress_timestamp();

-- =======================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =======================================================================

-- Enable RLS on all tables
ALTER TABLE shop_compensation_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_compensation_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE compensation_tier_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_tier_progress ENABLE ROW LEVEL SECURITY;

-- Shop defaults: Only shop owners/managers can access
CREATE POLICY "Shop owners can manage compensation defaults" ON shop_compensation_defaults
  FOR ALL USING (
    barbershop_id IN (
      -- Direct ownership
      SELECT shop_id FROM profiles WHERE id = auth.uid()
      UNION
      -- Staff with management role
      SELECT barbershop_id FROM barbershop_staff 
      WHERE user_id = auth.uid() AND role IN ('SHOP_OWNER', 'MANAGER') AND is_active = true
    )
  );

-- Barber overrides: Shop owners/managers + individual barbers can view their own
CREATE POLICY "Compensation overrides access" ON barber_compensation_overrides
  FOR ALL USING (
    barbershop_id IN (
      -- Direct ownership
      SELECT shop_id FROM profiles WHERE id = auth.uid()
      UNION
      -- Staff with management role
      SELECT barbershop_id FROM barbershop_staff 
      WHERE user_id = auth.uid() AND role IN ('SHOP_OWNER', 'MANAGER') AND is_active = true
    ) OR barber_id = auth.uid() -- Barbers can view their own
  );

-- Tier configs: Shop level access
CREATE POLICY "Tier configs shop access" ON compensation_tier_configs
  FOR ALL USING (
    barbershop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Tier progress: Shop + individual barber access
CREATE POLICY "Tier progress access" ON barber_tier_progress
  FOR ALL USING (
    barbershop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff 
      WHERE user_id = auth.uid() AND is_active = true
    ) OR barber_id = auth.uid()
  );

-- =======================================================================
-- GRANT PERMISSIONS
-- =======================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON shop_compensation_defaults TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON barber_compensation_overrides TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON compensation_tier_configs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON barber_tier_progress TO authenticated;
GRANT SELECT ON effective_compensation TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- =======================================================================
-- PAYMENT TRACKING TABLES (STRIPE INTEGRATION)
-- =======================================================================

-- Compensation payments (barber earnings)
CREATE TABLE IF NOT EXISTS compensation_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Payment Details
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  payment_method TEXT DEFAULT 'stripe_transfer',
  
  -- Stripe Integration
  stripe_transfer_id TEXT, -- For commission payments
  stripe_payment_intent_id TEXT, -- For booth rent collections
  
  -- Period Information
  period_start DATE,
  period_end DATE,
  calculation_type TEXT, -- 'commission', 'booth_rent', 'tiered', 'hybrid'
  
  -- Metadata
  metadata JSONB DEFAULT '{}', -- Calculation breakdown, rates, etc.
  notes TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_compensation_payments_barber (barber_id, created_at),
  INDEX idx_compensation_payments_shop (barbershop_id, status),
  INDEX idx_compensation_payments_stripe (stripe_transfer_id, stripe_payment_intent_id)
);

-- Automatic payout schedules
CREATE TABLE IF NOT EXISTS automatic_payout_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Schedule Configuration
  payout_frequency TEXT DEFAULT 'monthly' CHECK (payout_frequency IN ('weekly', 'biweekly', 'monthly')),
  payout_day INTEGER, -- Day of week (1-7) or month (1-31)
  minimum_payout_amount DECIMAL(8,2) DEFAULT 50.00,
  
  -- Payment Configuration
  payment_method TEXT DEFAULT 'stripe_transfer',
  auto_calculate BOOLEAN DEFAULT true,
  compensation_model TEXT, -- Reference to current model type
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_payout_date DATE,
  next_payout_date DATE,
  total_payouts_processed INTEGER DEFAULT 0,
  total_amount_paid DECIMAL(12,2) DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_barber_payout_schedule UNIQUE(barbershop_id, barber_id, is_active)
);

-- Booth rent payments (collections from barbers)
CREATE TABLE IF NOT EXISTS booth_rent_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Rent Details
  rent_amount DECIMAL(10,2) NOT NULL,
  period TEXT DEFAULT 'monthly',
  due_date DATE NOT NULL,
  
  -- Payment Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'failed', 'waived')),
  paid_amount DECIMAL(10,2) DEFAULT 0,
  paid_date TIMESTAMPTZ,
  
  -- Stripe Integration
  stripe_payment_intent_id TEXT,
  stripe_customer_id TEXT,
  
  -- Late Fees
  late_fee_amount DECIMAL(8,2) DEFAULT 0,
  late_fee_applied_date DATE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_booth_rent_barber_due (barber_id, due_date),
  INDEX idx_booth_rent_shop_status (barbershop_id, status),
  INDEX idx_booth_rent_overdue (due_date, status) WHERE status IN ('pending', 'overdue')
);

-- Stripe account status tracking
CREATE TABLE IF NOT EXISTS stripe_account_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Account Type
  account_type TEXT CHECK (account_type IN ('barber', 'shop')),
  stripe_account_id TEXT NOT NULL,
  
  -- Status Information
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  details_submitted BOOLEAN DEFAULT false,
  
  -- Capabilities
  card_payments TEXT DEFAULT 'inactive',
  transfers TEXT DEFAULT 'inactive',
  
  -- Requirements
  currently_due TEXT[] DEFAULT '{}', -- Array of requirements
  eventually_due TEXT[] DEFAULT '{}',
  past_due TEXT[] DEFAULT '{}',
  disabled_reason TEXT,
  
  -- Last Check
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  next_check_at TIMESTAMPTZ,
  
  -- Status History
  status_history JSONB DEFAULT '[]',
  
  CONSTRAINT unique_stripe_account UNIQUE(profile_id, stripe_account_id)
);

-- =======================================================================
-- PAYMENT TRACKING INDEXES
-- =======================================================================

CREATE INDEX IF NOT EXISTS idx_compensation_payments_period 
ON compensation_payments(barbershop_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_compensation_payments_status 
ON compensation_payments(status, processed_at);

CREATE INDEX IF NOT EXISTS idx_payout_schedules_next 
ON automatic_payout_schedules(next_payout_date, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_booth_rent_overdue 
ON booth_rent_payments(barbershop_id, due_date) WHERE status = 'overdue';

-- =======================================================================
-- PAYMENT TRACKING TRIGGERS
-- =======================================================================

-- Update automatic payout schedules timestamp
DROP TRIGGER IF EXISTS trigger_payout_schedules_updated_at ON automatic_payout_schedules;
CREATE TRIGGER trigger_payout_schedules_updated_at
  BEFORE UPDATE ON automatic_payout_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update booth rent payments timestamp
DROP TRIGGER IF EXISTS trigger_booth_rent_updated_at ON booth_rent_payments;
CREATE TRIGGER trigger_booth_rent_updated_at
  BEFORE UPDATE ON booth_rent_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =======================================================================
-- PAYMENT TRACKING RLS POLICIES
-- =======================================================================

-- Enable RLS on payment tables
ALTER TABLE compensation_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE automatic_payout_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE booth_rent_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_account_status ENABLE ROW LEVEL SECURITY;

-- Compensation payments: Shop owners/managers + individual barbers
CREATE POLICY "Compensation payments access" ON compensation_payments
  FOR ALL USING (
    barbershop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff 
      WHERE user_id = auth.uid() AND role IN ('SHOP_OWNER', 'MANAGER') AND is_active = true
    ) OR barber_id = auth.uid()
  );

-- Payout schedules: Shop owners/managers + individual barbers
CREATE POLICY "Payout schedules access" ON automatic_payout_schedules
  FOR ALL USING (
    barbershop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff 
      WHERE user_id = auth.uid() AND role IN ('SHOP_OWNER', 'MANAGER') AND is_active = true
    ) OR barber_id = auth.uid()
  );

-- Booth rent payments: Shop owners/managers + individual barbers
CREATE POLICY "Booth rent payments access" ON booth_rent_payments
  FOR ALL USING (
    barbershop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff 
      WHERE user_id = auth.uid() AND role IN ('SHOP_OWNER', 'MANAGER') AND is_active = true
    ) OR barber_id = auth.uid()
  );

-- Stripe account status: Individual users can see their own
CREATE POLICY "Stripe account status access" ON stripe_account_status
  FOR ALL USING (
    profile_id = auth.uid() OR 
    barbershop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff 
      WHERE user_id = auth.uid() AND role IN ('SHOP_OWNER', 'MANAGER') AND is_active = true
    )
  );

-- =======================================================================
-- PAYMENT TRACKING PERMISSIONS
-- =======================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON compensation_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON automatic_payout_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON booth_rent_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON stripe_account_status TO authenticated;

-- =======================================================================
-- TABLE COMMENTS FOR DOCUMENTATION
-- =======================================================================

COMMENT ON TABLE shop_compensation_defaults IS 'Shop-level default compensation settings that apply to all barbers unless individually overridden';
COMMENT ON TABLE barber_compensation_overrides IS 'Individual barber compensation overrides that take precedence over shop defaults when active';
COMMENT ON TABLE compensation_tier_configs IS 'Tier structure configurations for progressive commission systems';
COMMENT ON TABLE barber_tier_progress IS 'Real-time tracking of barber progress through compensation tiers';
COMMENT ON VIEW effective_compensation IS 'Computed view showing the actual compensation terms for each barber (defaults + overrides)';

-- =======================================================================
-- SUCCESS MESSAGE
-- =======================================================================

SELECT 
  '🎉 Hierarchical Compensation System Created Successfully!' as message,
  'Tables: shop_compensation_defaults, barber_compensation_overrides, compensation_tier_configs, barber_tier_progress' as tables_created,
  'View: effective_compensation provides unified access to all compensation data' as view_created,
  'RLS policies active - access controlled by shop ownership and staff roles' as security_enabled;
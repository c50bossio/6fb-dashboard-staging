-- ==========================================
-- PRODUCT COMMISSION TRACKING EXTENSIONS
-- ==========================================
-- Extends the existing progressive commission tier system to handle product sales
-- alongside service commissions with category-based rates and integrated tracking

-- ==========================================
-- PRODUCT CATEGORY COMMISSION RATES
-- ==========================================

-- Define commission rates by product category
CREATE TABLE IF NOT EXISTS product_commission_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Category information
  category_name VARCHAR(100) NOT NULL, -- 'hair_care', 'beard_care', 'styling', 'tools', 'accessories'
  category_display_name VARCHAR(255),
  category_description TEXT,
  
  -- Default commission rates for this category
  default_commission_rate DECIMAL(5,4) NOT NULL, -- 0.1000 = 10% to barber
  min_commission_rate DECIMAL(5,4) DEFAULT 0.0000,
  max_commission_rate DECIMAL(5,4) DEFAULT 1.0000,
  
  -- Business rules
  allows_tier_integration BOOLEAN DEFAULT true, -- Can product sales count toward tier progression
  tier_weight_multiplier DECIMAL(5,4) DEFAULT 1.0000, -- Weight for tier calculations (0.5 = 50% weight)
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(barbershop_id, category_name)
);

-- ==========================================
-- EXTENDED FINANCIAL ARRANGEMENTS
-- ==========================================

-- Add product commission fields to existing financial_arrangements table
DO $$ 
BEGIN
  -- Add product commission fields if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'financial_arrangements' 
                 AND column_name = 'product_commission_rate') THEN
    ALTER TABLE financial_arrangements 
    ADD COLUMN product_commission_rate DECIMAL(5,4) DEFAULT 0.1000; -- 10% default for products
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'financial_arrangements' 
                 AND column_name = 'product_category_overrides') THEN
    ALTER TABLE financial_arrangements 
    ADD COLUMN product_category_overrides JSONB DEFAULT '{}'; -- Category-specific rates
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'financial_arrangements' 
                 AND column_name = 'products_count_for_tiers') THEN
    ALTER TABLE financial_arrangements 
    ADD COLUMN products_count_for_tiers BOOLEAN DEFAULT true; -- Include in tier calculations
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'financial_arrangements' 
                 AND column_name = 'product_tier_weight') THEN
    ALTER TABLE financial_arrangements 
    ADD COLUMN product_tier_weight DECIMAL(5,4) DEFAULT 0.5000; -- 50% weight for tier progress
  END IF;
END $$;

-- ==========================================
-- PRODUCT COMMISSION TRANSACTIONS
-- ==========================================

-- Track product sales commission transactions (extends existing commission_transactions pattern)
CREATE TABLE IF NOT EXISTS product_commission_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Product sale reference
  product_sale_id UUID REFERENCES product_sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  
  -- Transaction details
  product_name VARCHAR(255),
  product_category VARCHAR(100),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(8,2) NOT NULL,
  total_sale_amount DECIMAL(10,2) NOT NULL,
  
  -- Commission calculation
  commission_rate DECIMAL(5,4) NOT NULL,
  base_commission_amount DECIMAL(8,2) NOT NULL,
  
  -- Tier integration
  tier_id UUID REFERENCES commission_tiers(id) ON DELETE SET NULL,
  tier_level INTEGER,
  tier_bonus_amount DECIMAL(8,2) DEFAULT 0,
  tier_weighted_amount DECIMAL(8,2), -- Amount that counts toward tier progress
  
  -- Final amounts
  total_commission_amount DECIMAL(8,2) NOT NULL, -- base + tier bonus
  shop_amount DECIMAL(8,2) NOT NULL,
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending_payout', -- 'pending_payout', 'paid_out', 'refunded'
  paid_out_at TIMESTAMP WITH TIME ZONE,
  
  -- Payment integration
  stripe_transfer_id VARCHAR(255),
  payment_method VARCHAR(50),
  
  -- Metadata
  arrangement_type VARCHAR(20),
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ENHANCED PRODUCT SALES TABLE
-- ==========================================

-- Add commission tracking fields to existing product_sales table
DO $$ 
BEGIN
  -- Add commission tracking fields if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'product_sales' 
                 AND column_name = 'commission_calculated') THEN
    ALTER TABLE product_sales 
    ADD COLUMN commission_calculated BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'product_sales' 
                 AND column_name = 'commission_transaction_ids') THEN
    ALTER TABLE product_sales 
    ADD COLUMN commission_transaction_ids UUID[]; -- Array of related commission transactions
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'product_sales' 
                 AND column_name = 'total_barber_commission') THEN
    ALTER TABLE product_sales 
    ADD COLUMN total_barber_commission DECIMAL(8,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'product_sales' 
                 AND column_name = 'tier_contribution_amount') THEN
    ALTER TABLE product_sales 
    ADD COLUMN tier_contribution_amount DECIMAL(8,2) DEFAULT 0; -- Amount contributing to tier progress
  END IF;
END $$;

-- ==========================================
-- ENHANCED TIER TRACKING
-- ==========================================

-- Add product sales tracking to tier assignments
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'barber_tier_assignments' 
                 AND column_name = 'current_period_product_revenue') THEN
    ALTER TABLE barber_tier_assignments 
    ADD COLUMN current_period_product_revenue DECIMAL(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'barber_tier_assignments' 
                 AND column_name = 'current_period_product_sales') THEN
    ALTER TABLE barber_tier_assignments 
    ADD COLUMN current_period_product_sales INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'barber_tier_assignments' 
                 AND column_name = 'combined_tier_progress_amount') THEN
    ALTER TABLE barber_tier_assignments 
    ADD COLUMN combined_tier_progress_amount DECIMAL(10,2) DEFAULT 0; -- Service + weighted product revenue
  END IF;
END $$;

-- Add product sales to commission tier history
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'commission_tier_history' 
                 AND column_name = 'period_product_revenue') THEN
    ALTER TABLE commission_tier_history 
    ADD COLUMN period_product_revenue DECIMAL(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'commission_tier_history' 
                 AND column_name = 'period_product_sales') THEN
    ALTER TABLE commission_tier_history 
    ADD COLUMN period_product_sales INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'commission_tier_history' 
                 AND column_name = 'combined_period_revenue') THEN
    ALTER TABLE commission_tier_history 
    ADD COLUMN combined_period_revenue DECIMAL(10,2) DEFAULT 0; -- Total service + product for tier calculation
  END IF;
END $$;

-- ==========================================
-- PRODUCT RETURN/REFUND TRACKING
-- ==========================================

-- Track product returns and commission adjustments
CREATE TABLE IF NOT EXISTS product_commission_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Original transaction reference
  original_commission_transaction_id UUID REFERENCES product_commission_transactions(id) ON DELETE CASCADE,
  original_product_sale_id UUID REFERENCES product_sales(id) ON DELETE CASCADE,
  
  -- Adjustment details
  adjustment_type VARCHAR(50) NOT NULL, -- 'return', 'refund', 'correction', 'tier_recalculation'
  adjustment_reason TEXT,
  
  -- Financial impact
  commission_adjustment_amount DECIMAL(8,2) NOT NULL, -- Negative for clawbacks, positive for additions
  tier_progress_adjustment DECIMAL(8,2) DEFAULT 0, -- Impact on tier progress
  
  -- Quantity changes (for partial returns)
  quantity_returned INTEGER DEFAULT 0,
  refund_amount DECIMAL(8,2) DEFAULT 0,
  
  -- Processing status
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- PERFORMANCE INDEXES
-- ==========================================

-- Product commission category indexes
CREATE INDEX IF NOT EXISTS idx_product_commission_categories_shop ON product_commission_categories(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_product_commission_categories_active ON product_commission_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_product_commission_categories_category ON product_commission_categories(category_name);

-- Product commission transaction indexes
CREATE INDEX IF NOT EXISTS idx_product_commission_tx_shop ON product_commission_transactions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_product_commission_tx_barber ON product_commission_transactions(barber_id);
CREATE INDEX IF NOT EXISTS idx_product_commission_tx_sale ON product_commission_transactions(product_sale_id);
CREATE INDEX IF NOT EXISTS idx_product_commission_tx_product ON product_commission_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_product_commission_tx_date ON product_commission_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_product_commission_tx_status ON product_commission_transactions(status);
CREATE INDEX IF NOT EXISTS idx_product_commission_tx_tier ON product_commission_transactions(tier_id, tier_level);

-- Product commission adjustment indexes
CREATE INDEX IF NOT EXISTS idx_product_commission_adj_shop ON product_commission_adjustments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_product_commission_adj_barber ON product_commission_adjustments(barber_id);
CREATE INDEX IF NOT EXISTS idx_product_commission_adj_original ON product_commission_adjustments(original_commission_transaction_id);
CREATE INDEX IF NOT EXISTS idx_product_commission_adj_type ON product_commission_adjustments(adjustment_type);
CREATE INDEX IF NOT EXISTS idx_product_commission_adj_processed ON product_commission_adjustments(processed);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS on new tables
ALTER TABLE product_commission_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_commission_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_commission_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_commission_categories
CREATE POLICY "Shop owners can manage their product commission categories" ON product_commission_categories
  FOR ALL USING (
    barbershop_id IN (
      SELECT bs.id FROM barbershops bs
      JOIN profiles p ON p.id = auth.uid()
      WHERE bs.owner_id = p.id
      OR p.id IN (
        SELECT staff.user_id FROM barbershop_staff staff
        WHERE staff.barbershop_id = bs.id
        AND staff.role IN ('manager', 'owner')
        AND staff.is_active = true
      )
    )
  );

-- RLS Policies for product_commission_transactions
CREATE POLICY "Barbers can view their own product commissions" ON product_commission_transactions
  FOR SELECT USING (
    barber_id = auth.uid()
    OR barbershop_id IN (
      SELECT bs.id FROM barbershops bs
      JOIN profiles p ON p.id = auth.uid()
      WHERE bs.owner_id = p.id
      OR p.id IN (
        SELECT staff.user_id FROM barbershop_staff staff
        WHERE staff.barbershop_id = bs.id
        AND staff.role IN ('manager', 'owner')
        AND staff.is_active = true
      )
    )
  );

CREATE POLICY "Shop owners can manage product commission transactions" ON product_commission_transactions
  FOR ALL USING (
    barbershop_id IN (
      SELECT bs.id FROM barbershops bs
      JOIN profiles p ON p.id = auth.uid()
      WHERE bs.owner_id = p.id
      OR p.id IN (
        SELECT staff.user_id FROM barbershop_staff staff
        WHERE staff.barbershop_id = bs.id
        AND staff.role IN ('manager', 'owner')
        AND staff.is_active = true
      )
    )
  );

-- RLS Policies for product_commission_adjustments
CREATE POLICY "Shop owners can manage product commission adjustments" ON product_commission_adjustments
  FOR ALL USING (
    barbershop_id IN (
      SELECT bs.id FROM barbershops bs
      JOIN profiles p ON p.id = auth.uid()
      WHERE bs.owner_id = p.id
      OR p.id IN (
        SELECT staff.user_id FROM barbershop_staff staff
        WHERE staff.barbershop_id = bs.id
        AND staff.role IN ('manager', 'owner')
        AND staff.is_active = true
      )
    )
  );

-- ==========================================
-- DEFAULT PRODUCT COMMISSION CATEGORIES
-- ==========================================

-- Create default product commission categories for existing barbershops
-- This will be populated by the initialization script

-- ==========================================
-- TRIGGERS FOR AUDIT LOGGING
-- ==========================================

-- Update timestamps trigger function (reuse existing if available)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to new tables
DROP TRIGGER IF EXISTS update_product_commission_categories_updated_at ON product_commission_categories;
CREATE TRIGGER update_product_commission_categories_updated_at
  BEFORE UPDATE ON product_commission_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- VIEWS FOR REPORTING
-- ==========================================

-- Comprehensive commission view combining services and products
CREATE OR REPLACE VIEW barber_commission_summary AS
SELECT 
  ba.barber_id,
  ba.barbershop_id,
  
  -- Service commissions
  COALESCE(SUM(st.commission_amount), 0) as service_commission_total,
  COALESCE(COUNT(st.id), 0) as service_transactions_count,
  
  -- Product commissions  
  COALESCE(SUM(pt.total_commission_amount), 0) as product_commission_total,
  COALESCE(COUNT(pt.id), 0) as product_transactions_count,
  
  -- Combined totals
  COALESCE(SUM(st.commission_amount), 0) + COALESCE(SUM(pt.total_commission_amount), 0) as total_commission,
  COALESCE(COUNT(st.id), 0) + COALESCE(COUNT(pt.id), 0) as total_transactions,
  
  -- Tier information
  ba.current_tier_id,
  ba.current_period_revenue as service_tier_revenue,
  ba.current_period_product_revenue as product_tier_revenue,
  ba.combined_tier_progress_amount as combined_tier_revenue,
  
  -- Time period
  ba.current_period_start,
  ba.current_period_end

FROM barber_tier_assignments ba
LEFT JOIN commission_transactions st ON st.barber_id = ba.barber_id 
  AND st.barbershop_id = ba.barbershop_id
  AND st.created_at >= ba.current_period_start
  AND st.created_at <= ba.current_period_end
LEFT JOIN product_commission_transactions pt ON pt.barber_id = ba.barber_id 
  AND pt.barbershop_id = ba.barbershop_id
  AND pt.created_at >= ba.current_period_start
  AND pt.created_at <= ba.current_period_end

WHERE ba.is_active = true
GROUP BY 
  ba.barber_id, ba.barbershop_id, ba.current_tier_id,
  ba.current_period_revenue, ba.current_period_product_revenue,
  ba.combined_tier_progress_amount, ba.current_period_start, ba.current_period_end;

-- Product sales performance view
CREATE OR REPLACE VIEW product_sales_performance AS
SELECT 
  ps.barbershop_id,
  ps.barber_id,
  p.category,
  p.brand,
  
  -- Sales metrics
  COUNT(ps.id) as sales_count,
  SUM(ps.total_amount) as total_sales_revenue,
  AVG(ps.total_amount) as avg_sale_amount,
  
  -- Commission metrics
  SUM(ps.total_barber_commission) as total_barber_commission,
  AVG(ps.total_barber_commission) as avg_commission_per_sale,
  
  -- Tier contribution
  SUM(ps.tier_contribution_amount) as total_tier_contribution,
  
  -- Time period
  DATE_TRUNC('month', ps.sale_date) as month_year

FROM product_sales ps
LEFT JOIN products p ON p.id = ps.line_items->0->>'product_id'::UUID
WHERE ps.payment_status = 'completed'
  AND ps.commission_calculated = true

GROUP BY 
  ps.barbershop_id, ps.barber_id, p.category, p.brand,
  DATE_TRUNC('month', ps.sale_date)
ORDER BY month_year DESC, total_sales_revenue DESC;

-- ==========================================
-- SUCCESS MESSAGE
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Product Commission Tracking Extensions installed successfully!';
  RAISE NOTICE 'New tables created:';
  RAISE NOTICE '  - product_commission_categories: Category-based commission rates';
  RAISE NOTICE '  - product_commission_transactions: Individual product commission tracking';
  RAISE NOTICE '  - product_commission_adjustments: Returns and refund handling';
  RAISE NOTICE 'Enhanced tables:';
  RAISE NOTICE '  - financial_arrangements: Added product commission fields';
  RAISE NOTICE '  - product_sales: Added commission tracking fields';
  RAISE NOTICE '  - barber_tier_assignments: Added product sales tracking';
  RAISE NOTICE '  - commission_tier_history: Added product sales history';
  RAISE NOTICE 'Views created:';
  RAISE NOTICE '  - barber_commission_summary: Combined service + product commissions';
  RAISE NOTICE '  - product_sales_performance: Product sales analytics';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ Ready for product commission integration!';
END $$;
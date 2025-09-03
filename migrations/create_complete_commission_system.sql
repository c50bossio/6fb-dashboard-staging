-- Complete Commission System Migration
-- Creates all commission tables from scratch with marginal support
-- Date: 2025-01-02

-- 1. Create commission_tier_structures table (base structure definitions)
CREATE TABLE IF NOT EXISTS commission_tier_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  calculation_method VARCHAR(20) DEFAULT 'marginal' NOT NULL CHECK (calculation_method IN ('marginal', 'flat')),
  reset_period VARCHAR(20) DEFAULT 'monthly' NOT NULL CHECK (reset_period IN ('monthly', 'quarterly', 'yearly')),
  reset_day INTEGER DEFAULT 1 NOT NULL CHECK (reset_day >= 1 AND reset_day <= 31),
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(barbershop_id, name)
);

-- 2. Create commission_tiers table (individual tier definitions)
CREATE TABLE IF NOT EXISTS commission_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID REFERENCES commission_tier_structures(id) ON DELETE CASCADE,
  tier_level INTEGER NOT NULL,
  name VARCHAR(50) NOT NULL,
  min_revenue DECIMAL(10,2) DEFAULT 0 NOT NULL,
  max_revenue DECIMAL(10,2) NULL, -- NULL means no upper limit
  commission_percentage DECIMAL(5,2) NOT NULL CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
  calculation_method VARCHAR(20) DEFAULT 'marginal' NOT NULL CHECK (calculation_method IN ('marginal', 'flat')),
  color_code VARCHAR(7) DEFAULT '#3B82F6',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(structure_id, tier_level),
  CHECK (min_revenue >= 0),
  CHECK (max_revenue IS NULL OR max_revenue > min_revenue)
);

-- 3. Create financial_arrangements table (barber compensation setup)
CREATE TABLE IF NOT EXISTS financial_arrangements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  arrangement_type VARCHAR(20) DEFAULT 'commission' NOT NULL CHECK (arrangement_type IN ('commission', 'hourly', 'salary', 'booth_rent')),
  
  -- Basic commission settings
  commission_rate DECIMAL(5,2), -- Flat commission rate if not using tiers
  use_tier_system BOOLEAN DEFAULT FALSE,
  tier_structure_id UUID REFERENCES commission_tier_structures(id) ON DELETE SET NULL,
  
  -- Other compensation types
  hourly_rate DECIMAL(8,2),
  salary_amount DECIMAL(10,2),
  booth_rent_amount DECIMAL(8,2),
  
  -- Settings
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(barbershop_id, barber_id)
);

-- 4. Create commission_transactions table (commission payments)
CREATE TABLE IF NOT EXISTS commission_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  arrangement_id UUID REFERENCES financial_arrangements(id) ON DELETE CASCADE,
  
  -- Transaction details
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_revenue DECIMAL(10,2) NOT NULL,
  total_commission DECIMAL(10,2) NOT NULL,
  effective_commission_rate DECIMAL(5,4), -- Overall rate after marginal calculation
  tier_breakdown JSONB, -- Breakdown by tier bracket for marginal calculations
  
  -- Payment tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMP,
  payment_method VARCHAR(50),
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Create barber_tier_progress table (real-time progress tracking)
CREATE TABLE IF NOT EXISTS barber_tier_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  structure_id UUID REFERENCES commission_tier_structures(id) ON DELETE CASCADE,
  
  -- Current period tracking
  current_period_start DATE NOT NULL,
  current_period_end DATE NOT NULL,
  current_period_revenue DECIMAL(10,2) DEFAULT 0 NOT NULL,
  current_period_bookings INTEGER DEFAULT 0 NOT NULL,
  
  -- Tier breakdown tracking (for marginal calculations)
  tier_revenue_breakdown JSONB NOT NULL DEFAULT '{}', -- Revenue earned in each tier bracket
  tier_commission_breakdown JSONB NOT NULL DEFAULT '{}', -- Commission earned in each tier bracket
  
  -- Calculated metrics
  effective_commission_rate DECIMAL(5,4),
  projected_period_revenue DECIMAL(10,2),
  next_tier_progress DECIMAL(5,4), -- Percentage progress to next tier (0.0 to 1.0)
  
  -- Metadata
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(barber_id, barbershop_id, structure_id, current_period_start)
);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_commission_tier_structures_barbershop 
ON commission_tier_structures(barbershop_id, is_active);

CREATE INDEX IF NOT EXISTS idx_commission_tiers_structure 
ON commission_tiers(structure_id, tier_level);

CREATE INDEX IF NOT EXISTS idx_commission_tiers_revenue_range 
ON commission_tiers(structure_id, min_revenue, max_revenue);

CREATE INDEX IF NOT EXISTS idx_financial_arrangements_barber 
ON financial_arrangements(barbershop_id, barber_id, is_active);

CREATE INDEX IF NOT EXISTS idx_financial_arrangements_tier_structure 
ON financial_arrangements(tier_structure_id);

CREATE INDEX IF NOT EXISTS idx_commission_transactions_barber_period 
ON commission_transactions(barber_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_commission_transactions_barbershop 
ON commission_transactions(barbershop_id, status);

CREATE INDEX IF NOT EXISTS idx_barber_tier_progress_barber 
ON barber_tier_progress(barber_id, barbershop_id);

CREATE INDEX IF NOT EXISTS idx_barber_tier_progress_period 
ON barber_tier_progress(current_period_start, current_period_end);

-- 7. Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
DROP TRIGGER IF EXISTS trigger_commission_tier_structures_updated_at ON commission_tier_structures;
CREATE TRIGGER trigger_commission_tier_structures_updated_at
  BEFORE UPDATE ON commission_tier_structures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_commission_tiers_updated_at ON commission_tiers;
CREATE TRIGGER trigger_commission_tiers_updated_at
  BEFORE UPDATE ON commission_tiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_financial_arrangements_updated_at ON financial_arrangements;
CREATE TRIGGER trigger_financial_arrangements_updated_at
  BEFORE UPDATE ON financial_arrangements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_commission_transactions_updated_at ON commission_transactions;
CREATE TRIGGER trigger_commission_transactions_updated_at
  BEFORE UPDATE ON commission_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Special trigger for barber_tier_progress last_updated
CREATE OR REPLACE FUNCTION update_tier_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tier_progress_timestamp ON barber_tier_progress;
CREATE TRIGGER trigger_update_tier_progress_timestamp
  BEFORE UPDATE ON barber_tier_progress
  FOR EACH ROW EXECUTE FUNCTION update_tier_progress_timestamp();

-- 8. Insert default tier structure template
INSERT INTO commission_tier_structures (
  id, barbershop_id, name, description, calculation_method, reset_period, 
  reset_day, is_default, is_active, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001', -- Fixed UUID for template
  '00000000-0000-0000-0000-000000000001', -- Template barbershop ID
  'Progressive Performance Tiers',
  'Marginal commission structure that rewards higher revenue with better rates on additional earnings. Like tax brackets, each tier rate only applies to revenue within that bracket.',
  'marginal',
  'monthly',
  1,
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 9. Insert default tier brackets for the template
INSERT INTO commission_tiers (
  id, structure_id, tier_level, name, min_revenue, max_revenue, 
  commission_percentage, calculation_method, color_code, 
  created_at, updated_at
) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 1, 'Base', 0, 1000, 50, 'marginal', '#CD7F32', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 2, 'Growth', 1000, 3000, 60, 'marginal', '#C0C0C0', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 3, 'Performance', 3000, 5000, 70, 'marginal', '#FFD700', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 4, 'Elite', 5000, NULL, 80, 'marginal', '#E5E4E2', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 10. Add helpful comments for documentation
COMMENT ON TABLE commission_tier_structures IS 'Defines commission tier structures with marginal or flat calculation methods';
COMMENT ON TABLE commission_tiers IS 'Individual tier brackets within a structure, supporting marginal (progressive) commission calculation';
COMMENT ON TABLE financial_arrangements IS 'Barber compensation arrangements linking to tier structures or flat rates';
COMMENT ON TABLE commission_transactions IS 'Historical commission payments with tier breakdown for marginal calculations';
COMMENT ON TABLE barber_tier_progress IS 'Real-time tracking of barber progress through marginal commission tiers within current period';

COMMENT ON COLUMN commission_tiers.min_revenue IS 'Minimum revenue for this tier bracket (inclusive)';
COMMENT ON COLUMN commission_tiers.max_revenue IS 'Maximum revenue for this tier bracket (exclusive), NULL for unlimited top tier';
COMMENT ON COLUMN commission_tiers.calculation_method IS 'marginal = applies only to revenue in this bracket, flat = applies to all revenue when this tier is reached';
COMMENT ON COLUMN commission_transactions.tier_breakdown IS 'JSON breakdown showing commission earned in each tier bracket for marginal calculations';
COMMENT ON COLUMN commission_transactions.effective_commission_rate IS 'Overall commission rate after marginal calculation (total_commission / total_revenue)';
COMMENT ON COLUMN barber_tier_progress.tier_revenue_breakdown IS 'JSON object tracking revenue earned in each tier bracket: {"tier_1": 1000, "tier_2": 2000}';
COMMENT ON COLUMN barber_tier_progress.tier_commission_breakdown IS 'JSON object tracking commission earned from each tier bracket: {"tier_1": 500, "tier_2": 1200}';

-- 11. Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON commission_tier_structures TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON commission_tiers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON financial_arrangements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON commission_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON barber_tier_progress TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 12. Create Row Level Security (RLS) policies
ALTER TABLE commission_tier_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_arrangements ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_tier_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access commission data for their barbershop
CREATE POLICY "Users can manage commission structures for their barbershop" ON commission_tier_structures
  FOR ALL USING (
    barbershop_id IN (
      SELECT barbershop_id FROM barbershop_staff 
      WHERE user_id = auth.uid() AND is_active = true
      UNION
      SELECT shop_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage commission tiers for their barbershop structures" ON commission_tiers
  FOR ALL USING (
    structure_id IN (
      SELECT id FROM commission_tier_structures 
      WHERE barbershop_id IN (
        SELECT barbershop_id FROM barbershop_staff 
        WHERE user_id = auth.uid() AND is_active = true
        UNION
        SELECT shop_id FROM profiles 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage financial arrangements for their barbershop" ON financial_arrangements
  FOR ALL USING (
    barbershop_id IN (
      SELECT barbershop_id FROM barbershop_staff 
      WHERE user_id = auth.uid() AND is_active = true
      UNION
      SELECT shop_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view commission transactions for their barbershop" ON commission_transactions
  FOR ALL USING (
    barbershop_id IN (
      SELECT barbershop_id FROM barbershop_staff 
      WHERE user_id = auth.uid() AND is_active = true
      UNION
      SELECT shop_id FROM profiles 
      WHERE id = auth.uid()
    ) OR barber_id = auth.uid()
  );

CREATE POLICY "Users can view tier progress for their barbershop" ON barber_tier_progress
  FOR ALL USING (
    barbershop_id IN (
      SELECT barbershop_id FROM barbershop_staff 
      WHERE user_id = auth.uid() AND is_active = true
      UNION
      SELECT shop_id FROM profiles 
      WHERE id = auth.uid()
    ) OR barber_id = auth.uid()
  );

-- Success message
SELECT 'Commission system tables created successfully! 🎉' as result;
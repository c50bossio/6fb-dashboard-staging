-- Simple Commission System Migration
-- Creates all tables with constraints inline
-- Date: 2025-01-02

-- 1. Commission Tier Structures
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

-- 2. Commission Tiers
CREATE TABLE IF NOT EXISTS commission_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID REFERENCES commission_tier_structures(id) ON DELETE CASCADE,
  tier_level INTEGER NOT NULL,
  name VARCHAR(50) NOT NULL,
  min_revenue DECIMAL(10,2) DEFAULT 0 NOT NULL CHECK (min_revenue >= 0),
  max_revenue DECIMAL(10,2) NULL,
  commission_percentage DECIMAL(5,2) NOT NULL CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
  calculation_method VARCHAR(20) DEFAULT 'marginal' NOT NULL CHECK (calculation_method IN ('marginal', 'flat')),
  color_code VARCHAR(7) DEFAULT '#3B82F6',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(structure_id, tier_level),
  CHECK (max_revenue IS NULL OR max_revenue > min_revenue)
);

-- 3. Financial Arrangements
CREATE TABLE IF NOT EXISTS financial_arrangements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  arrangement_type VARCHAR(20) DEFAULT 'commission' NOT NULL CHECK (arrangement_type IN ('commission', 'hourly', 'salary', 'booth_rent')),
  commission_rate DECIMAL(5,2),
  use_tier_system BOOLEAN DEFAULT FALSE,
  tier_structure_id UUID REFERENCES commission_tier_structures(id) ON DELETE SET NULL,
  hourly_rate DECIMAL(8,2),
  salary_amount DECIMAL(10,2),
  booth_rent_amount DECIMAL(8,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(barbershop_id, barber_id)
);

-- 4. Commission Transactions
CREATE TABLE IF NOT EXISTS commission_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  arrangement_id UUID REFERENCES financial_arrangements(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_revenue DECIMAL(10,2) NOT NULL,
  total_commission DECIMAL(10,2) NOT NULL,
  effective_commission_rate DECIMAL(5,4),
  tier_breakdown JSONB,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMP,
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Barber Tier Progress
CREATE TABLE IF NOT EXISTS barber_tier_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  structure_id UUID REFERENCES commission_tier_structures(id) ON DELETE CASCADE,
  current_period_start DATE NOT NULL,
  current_period_end DATE NOT NULL,
  current_period_revenue DECIMAL(10,2) DEFAULT 0 NOT NULL,
  current_period_bookings INTEGER DEFAULT 0 NOT NULL,
  tier_revenue_breakdown JSONB NOT NULL DEFAULT '{}',
  tier_commission_breakdown JSONB NOT NULL DEFAULT '{}',
  effective_commission_rate DECIMAL(5,4),
  projected_period_revenue DECIMAL(10,2),
  next_tier_progress DECIMAL(5,4),
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(barber_id, barbershop_id, structure_id, current_period_start)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_commission_tier_structures_barbershop ON commission_tier_structures(barbershop_id, is_active);
CREATE INDEX IF NOT EXISTS idx_commission_tiers_structure ON commission_tiers(structure_id, tier_level);
CREATE INDEX IF NOT EXISTS idx_commission_tiers_revenue_range ON commission_tiers(structure_id, min_revenue, max_revenue);
CREATE INDEX IF NOT EXISTS idx_financial_arrangements_barber ON financial_arrangements(barbershop_id, barber_id, is_active);
CREATE INDEX IF NOT EXISTS idx_financial_arrangements_tier_structure ON financial_arrangements(tier_structure_id);
CREATE INDEX IF NOT EXISTS idx_commission_transactions_barber_period ON commission_transactions(barber_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_commission_transactions_barbershop ON commission_transactions(barbershop_id, status);
CREATE INDEX IF NOT EXISTS idx_barber_tier_progress_barber ON barber_tier_progress(barber_id, barbershop_id);
CREATE INDEX IF NOT EXISTS idx_barber_tier_progress_period ON barber_tier_progress(current_period_start, current_period_end);

-- Create update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_tier_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS trigger_commission_tier_structures_updated_at ON commission_tier_structures;
CREATE TRIGGER trigger_commission_tier_structures_updated_at BEFORE UPDATE ON commission_tier_structures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_commission_tiers_updated_at ON commission_tiers;
CREATE TRIGGER trigger_commission_tiers_updated_at BEFORE UPDATE ON commission_tiers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_financial_arrangements_updated_at ON financial_arrangements;
CREATE TRIGGER trigger_financial_arrangements_updated_at BEFORE UPDATE ON financial_arrangements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_commission_transactions_updated_at ON commission_transactions;
CREATE TRIGGER trigger_commission_transactions_updated_at BEFORE UPDATE ON commission_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_tier_progress_timestamp ON barber_tier_progress;
CREATE TRIGGER trigger_update_tier_progress_timestamp BEFORE UPDATE ON barber_tier_progress FOR EACH ROW EXECUTE FUNCTION update_tier_progress_timestamp();

-- Insert default template data
INSERT INTO commission_tier_structures (
  id, barbershop_id, name, description, calculation_method, reset_period, 
  reset_day, is_default, is_active
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Progressive Performance Tiers',
  'Marginal commission structure that rewards higher revenue with better rates on additional earnings',
  'marginal',
  'monthly',
  1,
  true,
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO commission_tiers (
  id, structure_id, tier_level, name, min_revenue, max_revenue, 
  commission_percentage, calculation_method, color_code
) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 1, 'Base', 0, 1000, 50, 'marginal', '#CD7F32'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 2, 'Growth', 1000, 3000, 60, 'marginal', '#C0C0C0'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 3, 'Performance', 3000, 5000, 70, 'marginal', '#FFD700'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 4, 'Elite', 5000, NULL, 80, 'marginal', '#E5E4E2')
ON CONFLICT (id) DO NOTHING;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON commission_tier_structures TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON commission_tiers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON financial_arrangements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON commission_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON barber_tier_progress TO authenticated;

-- Success
SELECT 'Commission system created successfully! 🎉' as result;
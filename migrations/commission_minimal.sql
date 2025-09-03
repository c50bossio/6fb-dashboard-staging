-- Minimal Commission System - Core Tables Only
-- Creates just the essential tables needed for commission system
-- Date: 2025-01-02

-- 1. Commission Tier Structures (main configuration)
CREATE TABLE IF NOT EXISTS commission_tier_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  calculation_method VARCHAR(20) DEFAULT 'marginal' NOT NULL,
  reset_period VARCHAR(20) DEFAULT 'monthly' NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Commission Tiers (individual tier brackets)
CREATE TABLE IF NOT EXISTS commission_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL,
  tier_level INTEGER NOT NULL,
  name VARCHAR(50) NOT NULL,
  min_revenue DECIMAL(10,2) DEFAULT 0 NOT NULL,
  max_revenue DECIMAL(10,2) NULL,
  commission_percentage DECIMAL(5,2) NOT NULL,
  calculation_method VARCHAR(20) DEFAULT 'marginal' NOT NULL,
  color_code VARCHAR(7) DEFAULT '#3B82F6',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Financial Arrangements (links barbers to commission structures)
CREATE TABLE IF NOT EXISTS financial_arrangements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL,
  barber_id UUID NOT NULL,
  arrangement_type VARCHAR(20) DEFAULT 'commission' NOT NULL,
  commission_rate DECIMAL(5,2),
  use_tier_system BOOLEAN DEFAULT FALSE,
  tier_structure_id UUID NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Barber Tier Progress (tracks real-time progress)
CREATE TABLE IF NOT EXISTS barber_tier_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL,
  barbershop_id UUID NOT NULL,
  structure_id UUID NOT NULL,
  current_period_start DATE NOT NULL,
  current_period_end DATE NOT NULL,
  current_period_revenue DECIMAL(10,2) DEFAULT 0 NOT NULL,
  current_period_bookings INTEGER DEFAULT 0 NOT NULL,
  tier_revenue_breakdown JSONB NOT NULL DEFAULT '{}',
  tier_commission_breakdown JSONB NOT NULL DEFAULT '{}',
  effective_commission_rate DECIMAL(5,4),
  projected_period_revenue DECIMAL(10,2),
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add basic indexes (no complex ones that might fail)
CREATE INDEX IF NOT EXISTS idx_commission_tier_structures_barbershop 
ON commission_tier_structures(barbershop_id);

CREATE INDEX IF NOT EXISTS idx_commission_tiers_structure 
ON commission_tiers(structure_id);

CREATE INDEX IF NOT EXISTS idx_financial_arrangements_barber 
ON financial_arrangements(barbershop_id, barber_id);

CREATE INDEX IF NOT EXISTS idx_barber_tier_progress_barber 
ON barber_tier_progress(barber_id, barbershop_id);

-- Insert default template structure
INSERT INTO commission_tier_structures (
  id, barbershop_id, name, description, calculation_method, reset_period, is_default, is_active
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Progressive Performance Tiers',
  'Marginal commission structure with progressive rates',
  'marginal',
  'monthly',
  true,
  true
) ON CONFLICT (id) DO NOTHING;

-- Insert default tier brackets
INSERT INTO commission_tiers (
  id, structure_id, tier_level, name, min_revenue, max_revenue, 
  commission_percentage, calculation_method, color_code
) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 1, 'Base', 0, 1000, 50, 'marginal', '#CD7F32'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 2, 'Growth', 1000, 3000, 60, 'marginal', '#C0C0C0'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 3, 'Performance', 3000, 5000, 70, 'marginal', '#FFD700'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 4, 'Elite', 5000, NULL, 80, 'marginal', '#E5E4E2')
ON CONFLICT (id) DO NOTHING;

-- Grant basic permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON commission_tier_structures TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON commission_tiers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON financial_arrangements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON barber_tier_progress TO authenticated;

SELECT 'Minimal commission system created! ✅' as result;
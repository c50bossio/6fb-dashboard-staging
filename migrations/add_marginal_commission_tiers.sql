-- Migration: Add Marginal Commission Tiers Support
-- Date: 2025-01-02
-- Description: Enhances existing commission tier system to support marginal/progressive calculation

-- Add marginal calculation fields to commission_tiers table
ALTER TABLE commission_tiers ADD COLUMN IF NOT EXISTS 
  min_revenue DECIMAL(10,2) DEFAULT 0 NOT NULL;

ALTER TABLE commission_tiers ADD COLUMN IF NOT EXISTS 
  max_revenue DECIMAL(10,2) NULL; -- NULL means no upper limit

ALTER TABLE commission_tiers ADD COLUMN IF NOT EXISTS 
  calculation_method VARCHAR(20) DEFAULT 'marginal' NOT NULL;

-- Add index for efficient range queries
CREATE INDEX IF NOT EXISTS idx_commission_tiers_revenue_range 
ON commission_tiers(structure_id, min_revenue, max_revenue);

-- Update commission_tier_structures to track calculation method
ALTER TABLE commission_tier_structures ADD COLUMN IF NOT EXISTS 
  calculation_method VARCHAR(20) DEFAULT 'marginal' NOT NULL;

ALTER TABLE commission_tier_structures ADD COLUMN IF NOT EXISTS 
  description TEXT;

-- Enhance commission_transactions with bracket breakdown
ALTER TABLE commission_transactions ADD COLUMN IF NOT EXISTS 
  tier_breakdown JSONB; -- Store breakdown by tier/bracket

ALTER TABLE commission_transactions ADD COLUMN IF NOT EXISTS 
  effective_commission_rate DECIMAL(5,4); -- Effective rate after marginal calculation

-- Add table for tracking tier progress in real-time
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
  
  -- Tier breakdown tracking
  tier_revenue_breakdown JSONB NOT NULL DEFAULT '{}', -- Revenue earned in each tier bracket
  tier_commission_breakdown JSONB NOT NULL DEFAULT '{}', -- Commission earned in each tier bracket
  
  -- Calculated metrics
  effective_commission_rate DECIMAL(5,4),
  projected_period_revenue DECIMAL(10,2),
  next_tier_progress DECIMAL(5,4), -- Percentage progress to next tier
  
  -- Metadata
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(barber_id, barbershop_id, structure_id, current_period_start)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_barber_tier_progress_barber 
ON barber_tier_progress(barber_id, barbershop_id);

CREATE INDEX IF NOT EXISTS idx_barber_tier_progress_period 
ON barber_tier_progress(current_period_start, current_period_end);

-- Insert default marginal tier structure
INSERT INTO commission_tier_structures (
  id, barbershop_id, name, description, calculation_method, reset_period, 
  reset_day, is_default, is_active, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001', -- Default/template structure
  'Progressive Performance Tiers',
  'Marginal commission structure that rewards higher revenue with better rates on additional earnings',
  'marginal',
  'monthly',
  1,
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Get the structure ID for default tiers
WITH default_structure AS (
  SELECT id FROM commission_tier_structures 
  WHERE name = 'Progressive Performance Tiers' 
  AND barbershop_id = '00000000-0000-0000-0000-000000000001'
  LIMIT 1
)
-- Insert default marginal tiers
INSERT INTO commission_tiers (
  id, structure_id, tier_level, name, min_revenue, max_revenue, 
  commission_percentage, calculation_method, color_code, 
  created_at, updated_at
) SELECT 
  gen_random_uuid(),
  ds.id,
  tier_data.level,
  tier_data.name,
  tier_data.min_rev,
  tier_data.max_rev,
  tier_data.rate,
  'marginal',
  tier_data.color,
  NOW(),
  NOW()
FROM default_structure ds,
(VALUES
  (1, 'Base', 0, 1000, 50, '#CD7F32'),
  (2, 'Growth', 1000, 3000, 60, '#C0C0C0'),
  (3, 'Performance', 3000, 5000, 70, '#FFD700'),
  (4, 'Elite', 5000, NULL, 80, '#E5E4E2')
) AS tier_data(level, name, min_rev, max_rev, rate, color)
ON CONFLICT DO NOTHING;

-- Create trigger to auto-update barber_tier_progress
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

-- Add comments for documentation
COMMENT ON TABLE barber_tier_progress IS 'Real-time tracking of barber progress through marginal commission tiers';
COMMENT ON COLUMN commission_tiers.min_revenue IS 'Minimum revenue for this tier bracket (inclusive)';
COMMENT ON COLUMN commission_tiers.max_revenue IS 'Maximum revenue for this tier bracket (exclusive), NULL for unlimited';
COMMENT ON COLUMN commission_tiers.calculation_method IS 'marginal = applies only to revenue in bracket, flat = applies to all revenue';
COMMENT ON COLUMN commission_transactions.tier_breakdown IS 'JSON breakdown showing commission earned in each tier bracket';
COMMENT ON COLUMN commission_transactions.effective_commission_rate IS 'Overall commission rate after marginal calculation';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON barber_tier_progress TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
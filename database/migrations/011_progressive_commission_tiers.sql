-- Progressive Commission Tier System
-- This migration adds support for tiered commission structures that reward high performers
-- with higher commission rates as they hit revenue milestones

-- Commission Tier Configuration Table
-- Defines tier structures that can be applied to barbers
CREATE TABLE IF NOT EXISTS commission_tier_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- "Standard Tiers", "Elite Performer", etc.
    description TEXT,
    
    -- Tier Reset Configuration
    reset_period VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'monthly', 'quarterly', 'yearly'
    reset_day INTEGER DEFAULT 1, -- Day of period to reset (1st of month, quarter, etc.)
    
    -- Status and Metadata
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false, -- One default tier structure per barbershop
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- Individual Commission Tiers within a Structure
CREATE TABLE IF NOT EXISTS commission_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    structure_id UUID NOT NULL REFERENCES commission_tier_structures(id) ON DELETE CASCADE,
    
    -- Tier Definition
    tier_level INTEGER NOT NULL, -- 1, 2, 3, etc. (ordered)
    name VARCHAR(100) NOT NULL, -- "Starter", "Pro", "Elite"
    
    -- Threshold Configuration
    threshold_type VARCHAR(20) NOT NULL DEFAULT 'revenue', -- 'revenue', 'booking_count', 'client_count'
    threshold_amount DECIMAL(10,2) NOT NULL, -- Dollar amount or count
    
    -- Commission Rate for this tier
    commission_percentage DECIMAL(5,2) NOT NULL, -- 50.00 = 50%
    
    -- Tier Styling (for UI)
    color_code VARCHAR(7), -- Hex color for tier badge
    icon_name VARCHAR(50), -- Icon identifier
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT unique_structure_tier_level UNIQUE(structure_id, tier_level)
);

-- Barber Tier Assignments
-- Links barbers to tier structures and tracks their current tier
CREATE TABLE IF NOT EXISTS barber_tier_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    structure_id UUID NOT NULL REFERENCES commission_tier_structures(id) ON DELETE CASCADE,
    
    -- Current Tier Status
    current_tier_id UUID REFERENCES commission_tiers(id),
    current_period_start DATE NOT NULL,
    current_period_end DATE NOT NULL,
    
    -- Progress Tracking
    current_period_revenue DECIMAL(10,2) DEFAULT 0,
    current_period_bookings INTEGER DEFAULT 0,
    current_period_clients INTEGER DEFAULT 0,
    
    -- Forecasting Data
    daily_avg_revenue DECIMAL(10,2) DEFAULT 0,
    projected_period_revenue DECIMAL(10,2) DEFAULT 0,
    days_to_next_tier INTEGER,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT unique_barber_barbershop_assignment UNIQUE(barber_id, barbershop_id)
);

-- Historical Tier Achievement Tracking
CREATE TABLE IF NOT EXISTS commission_tier_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    tier_id UUID NOT NULL REFERENCES commission_tiers(id) ON DELETE CASCADE,
    
    -- Achievement Details
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    achieved_at TIMESTAMPTZ NOT NULL,
    
    -- Performance Metrics
    period_revenue DECIMAL(10,2) NOT NULL,
    period_bookings INTEGER NOT NULL,
    period_clients INTEGER NOT NULL,
    final_tier_level INTEGER NOT NULL,
    avg_commission_rate DECIMAL(5,2) NOT NULL,
    
    -- Tier Bonuses (optional future feature)
    tier_bonus_amount DECIMAL(10,2) DEFAULT 0,
    bonus_paid BOOLEAN DEFAULT false,
    bonus_paid_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enhanced Commission Transactions for Tier Tracking
-- Add tier information to existing commission transactions
DO $$
BEGIN
    -- Add tier-related columns to commission_transactions if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'commission_transactions' AND column_name = 'tier_id') THEN
        ALTER TABLE commission_transactions 
        ADD COLUMN tier_id UUID REFERENCES commission_tiers(id),
        ADD COLUMN tier_level INTEGER,
        ADD COLUMN base_commission_rate DECIMAL(5,2),
        ADD COLUMN tier_commission_rate DECIMAL(5,2),
        ADD COLUMN tier_bonus_amount DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

-- Update Financial Arrangements for Tier Integration
-- Add tier structure reference to financial arrangements
DO $$
BEGIN
    -- Add tier structure reference if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'financial_arrangements' AND column_name = 'tier_structure_id') THEN
        ALTER TABLE financial_arrangements 
        ADD COLUMN tier_structure_id UUID REFERENCES commission_tier_structures(id),
        ADD COLUMN use_tier_system BOOLEAN DEFAULT false,
        ADD COLUMN tier_bonus_eligible BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_commission_tier_structures_barbershop ON commission_tier_structures(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_commission_tier_structures_active ON commission_tier_structures(is_active);

CREATE INDEX IF NOT EXISTS idx_commission_tiers_structure ON commission_tiers(structure_id);
CREATE INDEX IF NOT EXISTS idx_commission_tiers_level ON commission_tiers(structure_id, tier_level);

CREATE INDEX IF NOT EXISTS idx_barber_tier_assignments_barber ON barber_tier_assignments(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_tier_assignments_barbershop ON barber_tier_assignments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_barber_tier_assignments_active ON barber_tier_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_barber_tier_assignments_period ON barber_tier_assignments(current_period_start, current_period_end);

CREATE INDEX IF NOT EXISTS idx_commission_tier_history_barber ON commission_tier_history(barber_id);
CREATE INDEX IF NOT EXISTS idx_commission_tier_history_barbershop ON commission_tier_history(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_commission_tier_history_period ON commission_tier_history(period_start, period_end);

-- Add tier information to commission transaction indexes
CREATE INDEX IF NOT EXISTS idx_commission_transactions_tier ON commission_transactions(tier_id);
CREATE INDEX IF NOT EXISTS idx_commission_transactions_tier_level ON commission_transactions(tier_level);

-- RLS Policies
ALTER TABLE commission_tier_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_tier_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_tier_history ENABLE ROW LEVEL SECURITY;

-- Commission Tier Structures Policies
CREATE POLICY "Shop owners can manage tier structures" ON commission_tier_structures
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Staff can view tier structures" ON commission_tier_structures
    FOR SELECT TO authenticated
    USING (
        barbershop_id IN (
            SELECT barbershop_id FROM barbershop_staff 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Commission Tiers Policies
CREATE POLICY "Users can view tiers for their structures" ON commission_tiers
    FOR SELECT TO authenticated
    USING (
        structure_id IN (
            SELECT id FROM commission_tier_structures
            WHERE barbershop_id IN (
                SELECT id FROM barbershops WHERE owner_id = auth.uid()
                UNION
                SELECT barbershop_id FROM barbershop_staff 
                WHERE user_id = auth.uid() AND is_active = true
            )
        )
    );

CREATE POLICY "Shop owners can manage tiers" ON commission_tiers
    FOR ALL TO authenticated
    USING (
        structure_id IN (
            SELECT id FROM commission_tier_structures
            WHERE barbershop_id IN (
                SELECT id FROM barbershops WHERE owner_id = auth.uid()
            )
        )
    );

-- Barber Tier Assignments Policies
CREATE POLICY "Users can view their tier assignments" ON barber_tier_assignments
    FOR SELECT TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops WHERE owner_id = auth.uid()
        )
        OR
        barber_id = auth.uid()
    );

CREATE POLICY "Shop owners can manage barber tier assignments" ON barber_tier_assignments
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops WHERE owner_id = auth.uid()
        )
    );

-- Commission Tier History Policies
CREATE POLICY "Users can view tier history" ON commission_tier_history
    FOR SELECT TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops WHERE owner_id = auth.uid()
        )
        OR
        barber_id = auth.uid()
    );

-- Updated timestamp triggers
CREATE TRIGGER update_commission_tier_structures_updated_at 
    BEFORE UPDATE ON commission_tier_structures 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_barber_tier_assignments_updated_at 
    BEFORE UPDATE ON barber_tier_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Default Tier Structure Data (Optional - can be customized per barbershop)
-- This creates a sample tier structure that barbershops can use as a starting point
INSERT INTO commission_tier_structures (
    barbershop_id, 
    name, 
    description, 
    reset_period, 
    is_default
) 
SELECT 
    id as barbershop_id,
    'Standard Performance Tiers' as name,
    'Progressive commission tiers that reward high-performing barbers with higher rates as they hit monthly revenue milestones.' as description,
    'monthly' as reset_period,
    true as is_default
FROM barbershops 
WHERE NOT EXISTS (
    SELECT 1 FROM commission_tier_structures 
    WHERE barbershop_id = barbershops.id AND is_default = true
)
ON CONFLICT DO NOTHING;

-- Add sample tiers for the default structures
WITH default_structures AS (
    SELECT id, barbershop_id FROM commission_tier_structures 
    WHERE is_default = true AND name = 'Standard Performance Tiers'
),
sample_tiers AS (
    SELECT 
        ds.id as structure_id,
        tier_data.tier_level,
        tier_data.name,
        tier_data.threshold_amount,
        tier_data.commission_percentage,
        tier_data.color_code
    FROM default_structures ds
    CROSS JOIN (
        VALUES 
            (1, 'Starter', 0.00, 50.00, '#6B7280'),
            (2, 'Professional', 5000.00, 60.00, '#3B82F6'),
            (3, 'Elite', 15000.00, 70.00, '#10B981'),
            (4, 'Master', 25000.00, 75.00, '#F59E0B')
    ) AS tier_data(tier_level, name, threshold_amount, commission_percentage, color_code)
)
INSERT INTO commission_tiers (
    structure_id, tier_level, name, threshold_type, 
    threshold_amount, commission_percentage, color_code
)
SELECT 
    structure_id, tier_level, name, 'revenue',
    threshold_amount, commission_percentage, color_code
FROM sample_tiers
ON CONFLICT (structure_id, tier_level) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Progressive commission tier system created successfully!';
    RAISE NOTICE 'Features added:';
    RAISE NOTICE '✓ Flexible tier structures with custom thresholds';
    RAISE NOTICE '✓ Revenue, booking count, and client count tier types';
    RAISE NOTICE '✓ Configurable reset periods (monthly, quarterly, yearly)';
    RAISE NOTICE '✓ Real-time progress tracking and forecasting';
    RAISE NOTICE '✓ Historical tier achievement records';
    RAISE NOTICE '✓ Integration with existing commission system';
    RAISE NOTICE '✓ Default tier structure created for existing barbershops';
END $$;
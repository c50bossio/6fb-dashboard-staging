-- Migration: Unified Booking Rules System v2
-- Description: Creates centralized booking rules table with JSONB structure
-- Author: Claude Code
-- Date: 2025-08-24
-- 
-- This migration creates a unified booking rules system that consolidates
-- all booking-related settings into a single, versioned JSONB structure

-- ============================================
-- 1. CREATE BOOKING RULES V2 TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS booking_rules_v2 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE NOT NULL,
    
    -- Version control
    version INTEGER DEFAULT 1 NOT NULL,
    is_active BOOLEAN DEFAULT true,
    
    -- Unified rules in JSONB
    rules JSONB NOT NULL DEFAULT '{
        "advance_booking_days": 30,
        "min_booking_hours": 2,
        "max_bookings_per_day": 50,
        "buffer_between_appointments": 15,
        "slot_intervals": [15, 30, 45, 60],
        "allow_double_booking": false,
        "max_per_customer_per_day": 2,
        "business_hours": {
            "monday": {"open": "09:00", "close": "18:00", "closed": false},
            "tuesday": {"open": "09:00", "close": "18:00", "closed": false},
            "wednesday": {"open": "09:00", "close": "18:00", "closed": false},
            "thursday": {"open": "09:00", "close": "18:00", "closed": false},
            "friday": {"open": "09:00", "close": "19:00", "closed": false},
            "saturday": {"open": "10:00", "close": "17:00", "closed": false},
            "sunday": {"open": "00:00", "close": "00:00", "closed": true}
        },
        "hours_overrides": [],
        "holidays": [],
        "accept_cash": true,
        "accept_card": true,
        "accept_online": false,
        "require_deposit": false,
        "deposit_percentage": 20,
        "cancellation_window": 24,
        "cancellation_fee": 25,
        "no_show_fee": 50,
        "require_phone": true,
        "require_email": false,
        "allow_walk_ins": true,
        "new_clients_allowed": true,
        "require_approval": false,
        "service_rules": {},
        "barber_rules": {},
        "dynamic_rules": []
    }'::jsonb,
    
    -- Effectiveness tracking
    effective_from TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    effective_until TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Ensure only one active rule set per barbershop
    CONSTRAINT unique_active_rules UNIQUE (barbershop_id, is_active) WHERE is_active = true
);

-- ============================================
-- 2. BOOKING RULE EVALUATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS booking_rule_evaluations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE NOT NULL,
    
    -- Evaluation details
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    request_id VARCHAR(50) NOT NULL,
    
    -- Request data
    request JSONB NOT NULL,
    
    -- Evaluation result
    result JSONB NOT NULL,
    
    -- Performance metrics
    performance JSONB,
    
    -- Indexes for analytics
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 3. BOOKING RULE CHANGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS booking_rule_changes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE NOT NULL,
    
    -- Change tracking
    changed_by UUID REFERENCES auth.users(id) NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Rule snapshots
    old_rules JSONB,
    new_rules JSONB NOT NULL,
    changes JSONB, -- Detailed change log
    
    -- Change metadata
    change_reason TEXT,
    change_source VARCHAR(50), -- 'ui', 'api', 'migration', 'admin'
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 4. RULE TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS booking_rule_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Template information
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- 'barber', 'salon', 'spa', 'custom'
    
    -- Template rules
    rules JSONB NOT NULL,
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    
    -- Metadata
    is_public BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 5. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_booking_rules_barbershop ON booking_rules_v2(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_booking_rules_active ON booking_rules_v2(is_active);
CREATE INDEX IF NOT EXISTS idx_booking_rules_version ON booking_rules_v2(version);
CREATE INDEX IF NOT EXISTS idx_booking_rules_effective ON booking_rules_v2(effective_from, effective_until);

CREATE INDEX IF NOT EXISTS idx_evaluations_barbershop ON booking_rule_evaluations(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_timestamp ON booking_rule_evaluations(timestamp);
CREATE INDEX IF NOT EXISTS idx_evaluations_request_id ON booking_rule_evaluations(request_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_result ON booking_rule_evaluations USING gin(result);

CREATE INDEX IF NOT EXISTS idx_rule_changes_barbershop ON booking_rule_changes(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_rule_changes_timestamp ON booking_rule_changes(changed_at);
CREATE INDEX IF NOT EXISTS idx_rule_changes_user ON booking_rule_changes(changed_by);

CREATE INDEX IF NOT EXISTS idx_templates_category ON booking_rule_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_public ON booking_rule_templates(is_public);

-- ============================================
-- 6. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE booking_rules_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_rule_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_rule_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_rule_templates ENABLE ROW LEVEL SECURITY;

-- Booking rules: Shop owners and admins can manage
CREATE POLICY "booking_rules_access" ON booking_rules_v2
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        ) OR
        barbershop_id IN (
            SELECT barbershop_id FROM barbershop_staff 
            WHERE user_id = (SELECT auth.uid()) 
            AND role IN ('admin', 'manager')
        )
    );

-- Evaluations: Shop owners and staff can view
CREATE POLICY "evaluations_access" ON booking_rule_evaluations
    FOR SELECT USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        ) OR
        barbershop_id IN (
            SELECT barbershop_id FROM barbershop_staff 
            WHERE user_id = (SELECT auth.uid())
        )
    );

-- Rule changes: Shop owners can view
CREATE POLICY "rule_changes_access" ON booking_rule_changes
    FOR SELECT USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

-- Templates: Public templates visible to all, private to creator
CREATE POLICY "templates_access" ON booking_rule_templates
    FOR SELECT USING (
        is_public = true OR 
        created_by = (SELECT auth.uid())
    );

-- ============================================
-- 7. MIGRATION FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION migrate_booking_rules_to_v2()
RETURNS void AS $$
DECLARE
    shop_record RECORD;
    merged_rules JSONB;
BEGIN
    -- Migrate existing rules for each barbershop
    FOR shop_record IN 
        SELECT DISTINCT barbershop_id 
        FROM business_settings 
        WHERE booking_rules IS NOT NULL
    LOOP
        -- Get existing rules from various sources
        SELECT 
            COALESCE(bs.booking_rules, '{}'::jsonb) ||
            COALESCE(b.booking_settings, '{}'::jsonb) ||
            COALESCE(b.payment_settings, '{}'::jsonb) ||
            jsonb_build_object('business_hours', COALESCE(b.business_hours, '{}'::jsonb))
        INTO merged_rules
        FROM business_settings bs
        LEFT JOIN barbershops b ON b.id = bs.barbershop_id
        WHERE bs.barbershop_id = shop_record.barbershop_id;
        
        -- Insert into new table if not exists
        INSERT INTO booking_rules_v2 (barbershop_id, rules, version)
        VALUES (shop_record.barbershop_id, merged_rules, 1)
        ON CONFLICT (barbershop_id, is_active) WHERE is_active = true
        DO UPDATE SET 
            rules = EXCLUDED.rules,
            updated_at = NOW();
    END LOOP;
    
    -- Also migrate barbershops without business_settings
    FOR shop_record IN 
        SELECT id 
        FROM barbershops b
        WHERE NOT EXISTS (
            SELECT 1 FROM booking_rules_v2 br 
            WHERE br.barbershop_id = b.id
        )
    LOOP
        -- Create default rules from barbershop settings
        SELECT 
            COALESCE(booking_settings, '{}'::jsonb) ||
            COALESCE(payment_settings, '{}'::jsonb) ||
            jsonb_build_object('business_hours', COALESCE(business_hours, '{}'::jsonb))
        INTO merged_rules
        FROM barbershops
        WHERE id = shop_record.id;
        
        INSERT INTO booking_rules_v2 (barbershop_id, rules, version)
        VALUES (shop_record.id, merged_rules, 1);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. HELPER FUNCTIONS
-- ============================================

-- Function to get active rules for a barbershop
CREATE OR REPLACE FUNCTION get_active_booking_rules(shop_id UUID)
RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT rules 
        FROM booking_rules_v2 
        WHERE barbershop_id = shop_id 
        AND is_active = true
        AND (effective_until IS NULL OR effective_until > NOW())
        ORDER BY version DESC
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update rules with versioning
CREATE OR REPLACE FUNCTION update_booking_rules(
    shop_id UUID,
    new_rules JSONB,
    user_id UUID,
    reason TEXT DEFAULT NULL
)
RETURNS booking_rules_v2 AS $$
DECLARE
    old_rules JSONB;
    new_version INTEGER;
    new_record booking_rules_v2;
BEGIN
    -- Get current rules
    SELECT rules, version 
    INTO old_rules, new_version
    FROM booking_rules_v2 
    WHERE barbershop_id = shop_id 
    AND is_active = true;
    
    IF FOUND THEN
        new_version := new_version + 1;
        
        -- Deactivate old rules
        UPDATE booking_rules_v2 
        SET is_active = false, 
            effective_until = NOW()
        WHERE barbershop_id = shop_id 
        AND is_active = true;
    ELSE
        new_version := 1;
    END IF;
    
    -- Insert new rules
    INSERT INTO booking_rules_v2 (
        barbershop_id, 
        rules, 
        version, 
        created_by, 
        updated_by
    )
    VALUES (shop_id, new_rules, new_version, user_id, user_id)
    RETURNING * INTO new_record;
    
    -- Log the change
    INSERT INTO booking_rule_changes (
        barbershop_id,
        changed_by,
        old_rules,
        new_rules,
        change_reason,
        change_source
    )
    VALUES (
        shop_id,
        user_id,
        old_rules,
        new_rules,
        reason,
        'api'
    );
    
    RETURN new_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. TRIGGERS
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_booking_rules_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_booking_rules_timestamp
    BEFORE UPDATE ON booking_rules_v2
    FOR EACH ROW EXECUTE FUNCTION update_booking_rules_timestamp();

-- ============================================
-- 10. DEFAULT TEMPLATES
-- ============================================
INSERT INTO booking_rule_templates (name, description, category, rules) VALUES
('Standard Barbershop', 'Default settings for a typical barbershop', 'barber', '{
    "advance_booking_days": 30,
    "min_booking_hours": 2,
    "max_bookings_per_day": 40,
    "buffer_between_appointments": 5,
    "slot_intervals": [30, 60],
    "allow_double_booking": false,
    "require_phone": true,
    "cancellation_window": 24
}'::jsonb),

('High-Volume Shop', 'Optimized for busy barbershops', 'barber', '{
    "advance_booking_days": 14,
    "min_booking_hours": 1,
    "max_bookings_per_day": 80,
    "buffer_between_appointments": 0,
    "slot_intervals": [15, 30],
    "allow_double_booking": true,
    "require_phone": true,
    "cancellation_window": 12
}'::jsonb),

('Premium Salon', 'Settings for upscale salons', 'salon', '{
    "advance_booking_days": 60,
    "min_booking_hours": 24,
    "max_bookings_per_day": 20,
    "buffer_between_appointments": 15,
    "slot_intervals": [45, 60, 90],
    "allow_double_booking": false,
    "require_deposit": true,
    "deposit_percentage": 30,
    "cancellation_window": 48
}'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================
-- 11. RUN MIGRATION
-- ============================================
SELECT migrate_booking_rules_to_v2();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Booking Rules v2 migration completed successfully!';
    RAISE NOTICE 'Created tables: booking_rules_v2, booking_rule_evaluations, booking_rule_changes, booking_rule_templates';
    RAISE NOTICE 'Migrated existing rules from business_settings and barbershops tables';
    RAISE NOTICE 'Added helper functions for rule management';
END $$;
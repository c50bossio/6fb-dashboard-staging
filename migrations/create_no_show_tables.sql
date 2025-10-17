-- No-Show Management System Tables
-- This migration creates all necessary tables for tracking and analyzing no-shows

-- 1. No-show records table
CREATE TABLE IF NOT EXISTS no_shows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    barber_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    
    -- No-show details
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    marked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    marked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Classification
    reason TEXT,
    is_excused BOOLEAN DEFAULT false,
    notes TEXT,
    
    -- Financial impact
    service_price DECIMAL(10, 2),
    lost_revenue DECIMAL(10, 2),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. No-show policies table
CREATE TABLE IF NOT EXISTS no_show_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL,
    
    -- Policy settings
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    
    -- Thresholds
    threshold_count INTEGER DEFAULT 3,
    threshold_period_days INTEGER DEFAULT 90,
    
    -- Actions
    action_type VARCHAR(50) CHECK (action_type IN ('warning', 'suspension', 'blacklist', 'fee')),
    suspension_days INTEGER,
    fee_amount DECIMAL(10, 2),
    
    -- Notification settings
    send_warning_email BOOLEAN DEFAULT true,
    send_warning_sms BOOLEAN DEFAULT false,
    warning_message TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 3. Policy enforcement history
CREATE TABLE IF NOT EXISTS no_show_enforcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    policy_id UUID REFERENCES no_show_policies(id) ON DELETE SET NULL,
    
    -- Enforcement details
    action_taken VARCHAR(50),
    enforcement_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Related no-shows
    trigger_count INTEGER,
    related_no_show_ids UUID[],
    
    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'reversed')),
    reversed_at TIMESTAMP WITH TIME ZONE,
    reversed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reversal_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Customer no-show statistics (materialized for performance)
CREATE TABLE IF NOT EXISTS customer_no_show_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Statistics
    total_no_shows INTEGER DEFAULT 0,
    total_excused INTEGER DEFAULT 0,
    total_unexcused INTEGER DEFAULT 0,
    last_no_show_date DATE,
    
    -- Period statistics
    no_shows_30_days INTEGER DEFAULT 0,
    no_shows_90_days INTEGER DEFAULT 0,
    no_shows_365_days INTEGER DEFAULT 0,
    
    -- Financial impact
    total_lost_revenue DECIMAL(10, 2) DEFAULT 0,
    
    -- Risk score
    risk_score DECIMAL(3, 2) DEFAULT 0,
    risk_category VARCHAR(20) CHECK (risk_category IN ('low', 'medium', 'high', 'blacklisted')),
    
    -- Last calculated
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(barbershop_id, customer_id)
);

-- 5. No-show trends for analytics
CREATE TABLE IF NOT EXISTS no_show_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL,
    
    -- Time period
    period_type VARCHAR(20) CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    period_date DATE NOT NULL,
    
    -- Metrics
    total_appointments INTEGER DEFAULT 0,
    total_no_shows INTEGER DEFAULT 0,
    no_show_rate DECIMAL(5, 2) DEFAULT 0,
    lost_revenue DECIMAL(10, 2) DEFAULT 0,
    
    -- Breakdown by type
    excused_count INTEGER DEFAULT 0,
    unexcused_count INTEGER DEFAULT 0,
    
    -- Top reasons (JSONB for flexibility)
    top_reasons JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(barbershop_id, period_type, period_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_no_shows_barbershop_date ON no_shows(barbershop_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_no_shows_customer ON no_shows(customer_id);
CREATE INDEX IF NOT EXISTS idx_no_shows_barber ON no_shows(barber_id);
CREATE INDEX IF NOT EXISTS idx_no_shows_appointment ON no_shows(appointment_id);
CREATE INDEX IF NOT EXISTS idx_no_shows_created_at ON no_shows(created_at);

CREATE INDEX IF NOT EXISTS idx_policies_barbershop_active ON no_show_policies(barbershop_id, is_active);

CREATE INDEX IF NOT EXISTS idx_enforcements_barbershop_customer ON no_show_enforcements(barbershop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_enforcements_status ON no_show_enforcements(status);
CREATE INDEX IF NOT EXISTS idx_enforcements_expires ON no_show_enforcements(expires_at);

CREATE INDEX IF NOT EXISTS idx_customer_stats_barbershop ON customer_no_show_stats(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_customer_stats_risk ON customer_no_show_stats(risk_category);

CREATE INDEX IF NOT EXISTS idx_trends_barbershop_period ON no_show_trends(barbershop_id, period_type, period_date);

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_no_shows_updated_at BEFORE UPDATE ON no_shows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON no_show_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enforcements_updated_at BEFORE UPDATE ON no_show_enforcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_stats_updated_at BEFORE UPDATE ON customer_no_show_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trends_updated_at BEFORE UPDATE ON no_show_trends
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing (optional - comment out for production)
/*
-- Sample no-show policy
INSERT INTO no_show_policies (barbershop_id, name, description, threshold_count, threshold_period_days, action_type)
VALUES (
    (SELECT id FROM barbershops LIMIT 1),
    'Standard No-Show Policy',
    'Three strikes in 90 days results in suspension',
    3,
    90,
    'suspension'
);
*/
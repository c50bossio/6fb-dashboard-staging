-- 6FB AI Agent System - Production Billing Database Schema
-- This schema supports real usage tracking, billing cycles, and invoice generation

-- =============================================================================
-- USAGE TRACKING TABLES
-- =============================================================================

-- Track individual usage events (AI calls, SMS sends, emails sent)
CREATE TABLE IF NOT EXISTS usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Event details
    event_type VARCHAR(50) NOT NULL, -- 'ai_tokens', 'sms_sent', 'email_sent'
    quantity INTEGER NOT NULL DEFAULT 1,
    cost_usd DECIMAL(10, 4) NOT NULL DEFAULT 0, -- Cost in USD cents (e.g., 0.0040 = $0.004)
    
    -- Context
    service_name VARCHAR(100), -- 'openai_gpt4', 'claude_sonnet', 'twilio_sms', 'sendgrid_email'
    metadata JSONB DEFAULT '{}', -- Additional context like model used, message length, etc
    
    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    billing_period DATE NOT NULL -- YYYY-MM-01 for monthly billing
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_events_user_period ON usage_events(user_id, billing_period);
CREATE INDEX IF NOT EXISTS idx_usage_events_barbershop_period ON usage_events(barbershop_id, billing_period);
CREATE INDEX IF NOT EXISTS idx_usage_events_type_period ON usage_events(event_type, billing_period);

-- =============================================================================
-- BILLING CYCLES AND INVOICES
-- =============================================================================

-- Monthly billing cycles
CREATE TABLE IF NOT EXISTS billing_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Cycle details
    period_start DATE NOT NULL, -- YYYY-MM-01
    period_end DATE NOT NULL,   -- YYYY-MM-31
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'billed', 'paid', 'overdue'
    
    -- Usage summary
    ai_tokens_used INTEGER DEFAULT 0,
    ai_cost_usd DECIMAL(10, 4) DEFAULT 0,
    sms_sent INTEGER DEFAULT 0,
    sms_cost_usd DECIMAL(10, 4) DEFAULT 0,
    email_sent INTEGER DEFAULT 0,
    email_cost_usd DECIMAL(10, 4) DEFAULT 0,
    
    -- Totals
    total_cost_usd DECIMAL(10, 4) DEFAULT 0,
    subscription_fee_usd DECIMAL(10, 4) DEFAULT 0, -- Monthly subscription cost
    grand_total_usd DECIMAL(10, 4) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint to prevent duplicate billing cycles
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_cycles_unique ON billing_cycles(user_id, period_start);
CREATE INDEX IF NOT EXISTS idx_billing_cycles_status ON billing_cycles(status, period_start);

-- Invoices generated from billing cycles
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    billing_cycle_id UUID NOT NULL REFERENCES billing_cycles(id) ON DELETE CASCADE,
    
    -- Invoice details
    invoice_number VARCHAR(50) NOT NULL UNIQUE, -- 6FB-2024-01-001
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'overdue', 'cancelled'
    
    -- Amounts (in USD)
    subtotal_usd DECIMAL(10, 4) NOT NULL,
    tax_usd DECIMAL(10, 4) DEFAULT 0,
    total_usd DECIMAL(10, 4) NOT NULL,
    
    -- Payment details
    stripe_invoice_id VARCHAR(100), -- Stripe invoice ID if using Stripe
    stripe_payment_intent_id VARCHAR(100),
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Invoice data
    invoice_data JSONB NOT NULL DEFAULT '{}', -- Full invoice details for PDF generation
    pdf_url TEXT, -- URL to generated PDF
    
    -- Timestamps
    due_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for invoice management
CREATE INDEX IF NOT EXISTS idx_invoices_user_status ON invoices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date, status);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_id ON invoices(stripe_invoice_id);

-- =============================================================================
-- PAYMENT METHODS AND STRIPE INTEGRATION
-- =============================================================================

-- Store payment methods (Stripe integration)
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Stripe details
    stripe_payment_method_id VARCHAR(100) NOT NULL UNIQUE,
    stripe_customer_id VARCHAR(100) NOT NULL,
    
    -- Card details (for display)
    card_brand VARCHAR(20), -- 'visa', 'mastercard', 'amex'
    card_last4 VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    
    -- Status
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure only one default payment method per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_methods_default ON payment_methods(user_id) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_customer ON payment_methods(stripe_customer_id);

-- =============================================================================
-- USAGE LIMITS AND TIER MANAGEMENT
-- =============================================================================

-- Track usage limits and overages per user
CREATE TABLE IF NOT EXISTS usage_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Current billing period
    period_start DATE NOT NULL,
    subscription_tier VARCHAR(20) NOT NULL, -- 'FREE', 'INDIVIDUAL', 'PROFESSIONAL', 'ENTERPRISE'
    
    -- Limits (from subscription tier)
    ai_tokens_limit INTEGER NOT NULL DEFAULT 5000,
    sms_limit INTEGER NOT NULL DEFAULT 500,
    email_limit INTEGER NOT NULL DEFAULT 1000,
    
    -- Current usage
    ai_tokens_used INTEGER DEFAULT 0,
    sms_used INTEGER DEFAULT 0,
    email_used INTEGER DEFAULT 0,
    
    -- Overage tracking
    ai_tokens_overage INTEGER DEFAULT 0,
    sms_overage INTEGER DEFAULT 0,
    email_overage INTEGER DEFAULT 0,
    
    -- Alerts
    ai_limit_warning_sent BOOLEAN DEFAULT FALSE,
    sms_limit_warning_sent BOOLEAN DEFAULT FALSE,
    email_limit_warning_sent BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint for one limit record per user per period
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_limits_unique ON usage_limits(user_id, period_start);

-- =============================================================================
-- BILLING CONFIGURATION
-- =============================================================================

-- System-wide billing configuration
CREATE TABLE IF NOT EXISTS billing_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Pricing configuration
    ai_token_cost_per_1k DECIMAL(10, 6) DEFAULT 0.040000, -- $0.04 per 1K tokens
    sms_cost_per_message DECIMAL(10, 4) DEFAULT 0.0100, -- $0.01 per SMS
    email_cost_per_message DECIMAL(10, 4) DEFAULT 0.0010, -- $0.001 per email
    
    -- Subscription pricing (monthly, in USD)
    free_tier_price DECIMAL(10, 2) DEFAULT 0.00,
    individual_tier_price DECIMAL(10, 2) DEFAULT 29.00,
    professional_tier_price DECIMAL(10, 2) DEFAULT 49.00,
    enterprise_tier_price DECIMAL(10, 2) DEFAULT 99.00,
    
    -- Billing settings
    invoice_due_days INTEGER DEFAULT 30,
    late_fee_percentage DECIMAL(5, 2) DEFAULT 2.00, -- 2% late fee
    tax_percentage DECIMAL(5, 2) DEFAULT 0.00, -- No tax by default
    
    -- Active configuration
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default billing configuration
INSERT INTO billing_config (is_active) VALUES (TRUE) ON CONFLICT DO NOTHING;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;

-- Users can only see their own billing data
CREATE POLICY "Users can view own usage events" ON usage_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own billing cycles" ON billing_cycles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own invoices" ON invoices FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own payment methods" ON payment_methods FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own usage limits" ON usage_limits FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Service role can manage all billing data
CREATE POLICY "Service role can manage usage events" ON usage_events FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can manage billing cycles" ON billing_cycles FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can manage invoices" ON invoices FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can manage payment methods" ON payment_methods FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can manage usage limits" ON usage_limits FOR ALL TO service_role USING (true);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to get current billing period start date
CREATE OR REPLACE FUNCTION get_current_billing_period()
RETURNS DATE AS $$
BEGIN
    RETURN date_trunc('month', CURRENT_DATE)::DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to increment usage and track events
CREATE OR REPLACE FUNCTION track_usage_event(
    p_user_id UUID,
    p_barbershop_id UUID,
    p_event_type VARCHAR(50),
    p_quantity INTEGER DEFAULT 1,
    p_cost_usd DECIMAL(10, 4) DEFAULT 0,
    p_service_name VARCHAR(100) DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
    current_period DATE;
BEGIN
    current_period := get_current_billing_period();
    
    -- Insert usage event
    INSERT INTO usage_events (
        user_id, barbershop_id, event_type, quantity, cost_usd, 
        service_name, metadata, billing_period
    ) VALUES (
        p_user_id, p_barbershop_id, p_event_type, p_quantity, p_cost_usd,
        p_service_name, p_metadata, current_period
    ) RETURNING id INTO event_id;
    
    -- Update usage limits (if exists)
    UPDATE usage_limits 
    SET 
        ai_tokens_used = ai_tokens_used + CASE WHEN p_event_type = 'ai_tokens' THEN p_quantity ELSE 0 END,
        sms_used = sms_used + CASE WHEN p_event_type = 'sms_sent' THEN p_quantity ELSE 0 END,
        email_used = email_used + CASE WHEN p_event_type = 'email_sent' THEN p_quantity ELSE 0 END,
        updated_at = NOW()
    WHERE user_id = p_user_id AND period_start = current_period;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(p_user_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    invoice_count INTEGER;
    year_month VARCHAR(7);
BEGIN
    year_month := to_char(CURRENT_DATE, 'YYYY-MM');
    
    SELECT COUNT(*) + 1 INTO invoice_count
    FROM invoices 
    WHERE user_id = p_user_id 
    AND invoice_number LIKE '6FB-' || year_month || '-%';
    
    RETURN '6FB-' || year_month || '-' || LPAD(invoice_count::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Update billing cycle totals when usage events are added
CREATE OR REPLACE FUNCTION update_billing_cycle_totals()
RETURNS TRIGGER AS $$
DECLARE
    cycle_id UUID;
BEGIN
    -- Find or create billing cycle for this period
    INSERT INTO billing_cycles (user_id, barbershop_id, period_start, period_end)
    VALUES (
        NEW.user_id,
        NEW.barbershop_id,
        NEW.billing_period,
        (NEW.billing_period + INTERVAL '1 month' - INTERVAL '1 day')::DATE
    )
    ON CONFLICT (user_id, period_start) DO NOTHING
    RETURNING id INTO cycle_id;
    
    -- Update totals
    UPDATE billing_cycles
    SET
        ai_tokens_used = COALESCE((
            SELECT SUM(quantity) FROM usage_events 
            WHERE user_id = NEW.user_id AND billing_period = NEW.billing_period AND event_type = 'ai_tokens'
        ), 0),
        ai_cost_usd = COALESCE((
            SELECT SUM(cost_usd) FROM usage_events 
            WHERE user_id = NEW.user_id AND billing_period = NEW.billing_period AND event_type = 'ai_tokens'
        ), 0),
        sms_sent = COALESCE((
            SELECT SUM(quantity) FROM usage_events 
            WHERE user_id = NEW.user_id AND billing_period = NEW.billing_period AND event_type = 'sms_sent'
        ), 0),
        sms_cost_usd = COALESCE((
            SELECT SUM(cost_usd) FROM usage_events 
            WHERE user_id = NEW.user_id AND billing_period = NEW.billing_period AND event_type = 'sms_sent'
        ), 0),
        email_sent = COALESCE((
            SELECT SUM(quantity) FROM usage_events 
            WHERE user_id = NEW.user_id AND billing_period = NEW.billing_period AND event_type = 'email_sent'
        ), 0),
        email_cost_usd = COALESCE((
            SELECT SUM(cost_usd) FROM usage_events 
            WHERE user_id = NEW.user_id AND billing_period = NEW.billing_period AND event_type = 'email_sent'
        ), 0),
        updated_at = NOW()
    WHERE user_id = NEW.user_id AND period_start = NEW.billing_period;
    
    -- Update grand total
    UPDATE billing_cycles
    SET 
        total_cost_usd = ai_cost_usd + sms_cost_usd + email_cost_usd,
        grand_total_usd = ai_cost_usd + sms_cost_usd + email_cost_usd + subscription_fee_usd
    WHERE user_id = NEW.user_id AND period_start = NEW.billing_period;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_billing_cycle_totals
    AFTER INSERT ON usage_events
    FOR EACH ROW
    EXECUTE FUNCTION update_billing_cycle_totals();

-- =============================================================================
-- SAMPLE DATA FOR TESTING
-- =============================================================================

-- This would be inserted via the application, but here for reference
/*
-- Sample usage tracking
SELECT track_usage_event(
    'user-uuid-here'::UUID,
    'barbershop-uuid-here'::UUID,
    'ai_tokens',
    1500, -- quantity
    0.0600, -- cost in USD ($0.06)
    'openai_gpt4',
    '{"model": "gpt-4", "prompt_tokens": 800, "completion_tokens": 700}'::JSONB
);
*/
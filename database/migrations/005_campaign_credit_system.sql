-- Campaign Credit System Migration
-- Based on industry best practices from Square, Booksy, and Textedly
-- This implements a credit-based campaign system funded by payment processing markup

-- Campaign Credits Balance Table
CREATE TABLE IF NOT EXISTS campaign_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Credit balances
    sms_credits INTEGER DEFAULT 0,
    email_credits INTEGER DEFAULT 0,
    
    -- Tier system (affects benefits and earning rates)
    tier TEXT DEFAULT 'starter' CHECK (tier IN ('starter', 'growth', 'professional', 'enterprise')),
    
    -- Tracking
    total_earned DECIMAL(10,2) DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    last_earned_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    
    -- Monthly allocations (resets monthly)
    monthly_bonus_credits INTEGER DEFAULT 0,
    bonus_reset_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(barbershop_id)
);

-- Credit Allocation Log (audit trail)
CREATE TABLE IF NOT EXISTS credit_allocation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Transaction details
    payment_intent_id TEXT,
    payment_amount DECIMAL(10,2),
    platform_markup DECIMAL(10,2),
    campaign_fund_allocation DECIMAL(10,2),
    
    -- Credits earned
    sms_credits_earned INTEGER DEFAULT 0,
    email_credits_earned INTEGER DEFAULT 0,
    bonus_credits INTEGER DEFAULT 0,
    
    -- Allocation type
    allocation_type TEXT CHECK (allocation_type IN (
        'payment_processing',  -- Earned from payment markup
        'monthly_bonus',       -- Monthly tier bonus
        'promotional',         -- Special promotions
        'referral',           -- Referral rewards
        'volume_bonus'        -- Volume milestone bonus
    )),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign Usage Log
CREATE TABLE IF NOT EXISTS campaign_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    campaign_id UUID,
    
    -- Usage details
    credit_type TEXT CHECK (credit_type IN ('sms', 'email')),
    credits_used INTEGER NOT NULL,
    
    -- Campaign details
    recipient_count INTEGER,
    campaign_type TEXT,
    message_content TEXT,
    
    -- Results tracking
    delivered_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign Templates (pre-built campaigns)
CREATE TABLE IF NOT EXISTS campaign_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Template info
    name TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK (category IN (
        'appointment_reminder',
        'booking_confirmation', 
        'review_request',
        'promotional',
        'win_back',
        'birthday',
        'holiday',
        'custom'
    )),
    
    -- Content
    sms_template TEXT,
    email_subject TEXT,
    email_template TEXT,
    
    -- Variables that can be replaced
    variables JSONB DEFAULT '[]', -- e.g., ["customer_name", "appointment_time", "barber_name"]
    
    -- Timing rules
    send_timing JSONB, -- e.g., {"type": "before_appointment", "hours": 24}
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automated Campaign Rules
CREATE TABLE IF NOT EXISTS campaign_automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Rule configuration
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    
    -- Trigger event
    trigger_event TEXT CHECK (trigger_event IN (
        'appointment_booked',
        'appointment_completed',
        'appointment_cancelled',
        'appointment_no_show',
        'customer_birthday',
        'no_visit_30_days',
        'no_visit_60_days',
        'no_visit_90_days',
        'first_visit',
        'milestone_visits' -- e.g., 5th, 10th visit
    )),
    
    -- Action to take
    template_id UUID REFERENCES campaign_templates(id),
    channel TEXT CHECK (channel IN ('sms', 'email', 'both')),
    
    -- Timing
    delay_hours INTEGER DEFAULT 0, -- Hours to wait after trigger
    
    -- Conditions (JSON for flexibility)
    conditions JSONB DEFAULT '{}', -- e.g., {"minimum_spend": 50, "customer_tier": "vip"}
    
    -- Performance tracking
    times_triggered INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Volume-based tier upgrades tracking
CREATE TABLE IF NOT EXISTS payment_volume_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Monthly volumes
    current_month_volume DECIMAL(12,2) DEFAULT 0,
    last_month_volume DECIMAL(12,2) DEFAULT 0,
    three_month_average DECIMAL(12,2) DEFAULT 0,
    
    -- Current tier based on volume
    current_tier TEXT DEFAULT 'starter',
    next_tier_threshold DECIMAL(12,2),
    credits_until_next_tier INTEGER,
    
    -- Reset tracking
    month_start_date DATE,
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(barbershop_id)
);

-- Indexes for performance
CREATE INDEX idx_campaign_credits_barbershop ON campaign_credits(barbershop_id);
CREATE INDEX idx_credit_allocation_log_barbershop ON credit_allocation_log(barbershop_id);
CREATE INDEX idx_credit_allocation_log_created ON credit_allocation_log(created_at);
CREATE INDEX idx_campaign_usage_log_barbershop ON campaign_usage_log(barbershop_id);
CREATE INDEX idx_campaign_usage_log_created ON campaign_usage_log(created_at);
CREATE INDEX idx_automation_rules_barbershop ON campaign_automation_rules(barbershop_id);
CREATE INDEX idx_automation_rules_trigger ON campaign_automation_rules(trigger_event) WHERE is_active = true;

-- Functions for credit management
CREATE OR REPLACE FUNCTION allocate_campaign_credits(
    p_barbershop_id UUID,
    p_payment_amount DECIMAL,
    p_payment_intent_id TEXT
) RETURNS JSON AS $$
DECLARE
    v_markup_amount DECIMAL;
    v_campaign_fund DECIMAL;
    v_sms_credits INTEGER;
    v_email_credits INTEGER;
    v_current_tier TEXT;
    v_bonus_credits INTEGER DEFAULT 0;
BEGIN
    -- Calculate markup (0.6% of payment)
    v_markup_amount := p_payment_amount * 0.006;
    
    -- 50% of markup goes to campaign fund
    v_campaign_fund := v_markup_amount * 0.5;
    
    -- Calculate credits (SMS costs $0.025 each)
    v_sms_credits := FLOOR(v_campaign_fund / 0.025);
    v_email_credits := 100; -- Emails are cheap, be generous
    
    -- Get current tier for bonus calculation
    SELECT tier INTO v_current_tier
    FROM campaign_credits
    WHERE barbershop_id = p_barbershop_id;
    
    -- Apply tier bonuses
    CASE v_current_tier
        WHEN 'growth' THEN v_bonus_credits := 10;
        WHEN 'professional' THEN v_bonus_credits := 25;
        WHEN 'enterprise' THEN v_bonus_credits := 50;
        ELSE v_bonus_credits := 0;
    END CASE;
    
    -- Update or insert credits
    INSERT INTO campaign_credits (
        barbershop_id,
        sms_credits,
        email_credits,
        total_earned,
        last_earned_at
    ) VALUES (
        p_barbershop_id,
        v_sms_credits + v_bonus_credits,
        v_email_credits,
        v_campaign_fund,
        NOW()
    )
    ON CONFLICT (barbershop_id) DO UPDATE SET
        sms_credits = campaign_credits.sms_credits + v_sms_credits + v_bonus_credits,
        email_credits = campaign_credits.email_credits + v_email_credits,
        total_earned = campaign_credits.total_earned + v_campaign_fund,
        last_earned_at = NOW();
    
    -- Log the allocation
    INSERT INTO credit_allocation_log (
        barbershop_id,
        payment_intent_id,
        payment_amount,
        platform_markup,
        campaign_fund_allocation,
        sms_credits_earned,
        email_credits_earned,
        bonus_credits,
        allocation_type
    ) VALUES (
        p_barbershop_id,
        p_payment_intent_id,
        p_payment_amount,
        v_markup_amount,
        v_campaign_fund,
        v_sms_credits,
        v_email_credits,
        v_bonus_credits,
        'payment_processing'
    );
    
    RETURN json_build_object(
        'sms_credits_earned', v_sms_credits + v_bonus_credits,
        'email_credits_earned', v_email_credits,
        'value_provided', v_campaign_fund
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check and update tier based on volume
CREATE OR REPLACE FUNCTION update_volume_tier(p_barbershop_id UUID) RETURNS TEXT AS $$
DECLARE
    v_monthly_volume DECIMAL;
    v_new_tier TEXT;
BEGIN
    -- Calculate current month volume
    SELECT COALESCE(SUM(payment_amount), 0) INTO v_monthly_volume
    FROM credit_allocation_log
    WHERE barbershop_id = p_barbershop_id
    AND created_at >= date_trunc('month', CURRENT_DATE);
    
    -- Determine tier based on volume
    CASE
        WHEN v_monthly_volume >= 100000 THEN v_new_tier := 'enterprise';
        WHEN v_monthly_volume >= 50000 THEN v_new_tier := 'professional';
        WHEN v_monthly_volume >= 10000 THEN v_new_tier := 'growth';
        ELSE v_new_tier := 'starter';
    END CASE;
    
    -- Update tier if changed
    UPDATE campaign_credits
    SET tier = v_new_tier
    WHERE barbershop_id = p_barbershop_id
    AND tier != v_new_tier;
    
    RETURN v_new_tier;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE campaign_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_allocation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_volume_tiers ENABLE ROW LEVEL SECURITY;

-- Barbershops can only see their own data
CREATE POLICY "Barbershops can view own credits" ON campaign_credits
    FOR ALL USING (barbershop_id IN (
        SELECT id FROM barbershops WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Barbershops can view own logs" ON credit_allocation_log
    FOR SELECT USING (barbershop_id IN (
        SELECT id FROM barbershops WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Barbershops can manage own automation" ON campaign_automation_rules
    FOR ALL USING (barbershop_id IN (
        SELECT id FROM barbershops WHERE owner_id = auth.uid()
    ));

-- Insert default campaign templates
INSERT INTO campaign_templates (name, category, sms_template, email_subject, email_template, variables, send_timing) VALUES
('Appointment Reminder (24hr)', 'appointment_reminder', 
 'Hi {{customer_name}}! This is a reminder about your appointment tomorrow at {{appointment_time}} with {{barber_name}}. Reply C to cancel.',
 'Appointment Reminder - {{barbershop_name}}',
 '<p>Hi {{customer_name}},</p><p>This is a friendly reminder about your appointment tomorrow at {{appointment_time}} with {{barber_name}}.</p>',
 '["customer_name", "appointment_time", "barber_name", "barbershop_name"]',
 '{"type": "before_appointment", "hours": 24}'),

('Booking Confirmation', 'booking_confirmation',
 'Thanks {{customer_name}}! Your appointment is confirmed for {{appointment_date}} at {{appointment_time}} with {{barber_name}}.',
 'Booking Confirmed - {{barbershop_name}}',
 '<p>Thank you for booking with us!</p><p>Your appointment is confirmed for {{appointment_date}} at {{appointment_time}} with {{barber_name}}.</p>',
 '["customer_name", "appointment_date", "appointment_time", "barber_name", "barbershop_name"]',
 '{"type": "immediate"}'),

('Review Request', 'review_request',
 'Hi {{customer_name}}, thanks for visiting {{barbershop_name}}! How was your experience? Leave us a review: {{review_link}}',
 'How was your visit to {{barbershop_name}}?',
 '<p>Hi {{customer_name}},</p><p>Thank you for choosing {{barbershop_name}}! We hope you enjoyed your service.</p><p><a href="{{review_link}}">Share your experience</a></p>',
 '["customer_name", "barbershop_name", "review_link"]',
 '{"type": "after_appointment", "hours": 2}'),

('Win Back Campaign', 'win_back',
 'Hi {{customer_name}}, we miss you at {{barbershop_name}}! Book your next appointment and get 15% off: {{booking_link}}',
 'We miss you! 15% off your next visit',
 '<p>Hi {{customer_name}},</p><p>It''s been a while since your last visit. We''d love to see you again!</p><p>Book now and get 15% off your next service.</p>',
 '["customer_name", "barbershop_name", "booking_link"]',
 '{"type": "no_visit_days", "days": 30}');
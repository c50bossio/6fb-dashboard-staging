-- Risk-Based Notification System Database Schema
-- Migration 007: Implements intelligent post-booking communication system
-- Based on research showing 67% of no-shows are preventable through better communication

-- =====================================================================================
-- NOTIFICATION MANAGEMENT TABLES
-- =====================================================================================

-- Booking notification plans - stores the communication strategy for each booking
CREATE TABLE IF NOT EXISTS booking_notification_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL, -- References appointments or bookings table
    customer_id UUID NOT NULL,
    barbershop_id UUID NOT NULL,
    customer_risk_tier TEXT NOT NULL CHECK (customer_risk_tier IN ('green', 'yellow', 'red')),
    communication_strategy TEXT NOT NULL, -- e.g. 'Minimal Touch - Reliable Customer'
    total_notifications_planned INTEGER NOT NULL DEFAULT 0,
    plan_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    plan_metadata JSONB, -- Stores the full communication plan and scheduled notifications
    
    -- Indexes for performance
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (barbershop_id) REFERENCES barbershops(id) ON DELETE CASCADE
);

-- Scheduled notifications - individual notification records
CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    barbershop_id UUID NOT NULL,
    notification_plan_id UUID REFERENCES booking_notification_plans(id) ON DELETE CASCADE,
    
    -- Notification details
    type TEXT NOT NULL, -- 'reminder', 'confirmation', 'personal_call', etc.
    channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'phone_call', 'push')),
    template TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Contact information
    contact_phone TEXT,
    contact_email TEXT,
    
    -- Scheduling
    scheduled_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'responded', 'cancelled')),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    
    -- Response tracking
    response_data JSONB, -- Stores customer response details
    
    -- Metadata
    metadata JSONB, -- includes_policies, requires_human_followup, etc.
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (barbershop_id) REFERENCES barbershops(id) ON DELETE CASCADE
);

-- Notification templates - reusable message templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID,
    template_name TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'phone_call', 'push')),
    risk_tier TEXT CHECK (risk_tier IN ('green', 'yellow', 'red', 'all')),
    
    -- Template content
    subject TEXT, -- For emails
    message_body TEXT NOT NULL,
    variables JSONB, -- Available template variables
    
    -- Template metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    FOREIGN KEY (barbershop_id) REFERENCES barbershops(id) ON DELETE CASCADE,
    UNIQUE(barbershop_id, template_name, channel)
);

-- =====================================================================================
-- PERFORMANCE AND ANALYTICS TABLES
-- =====================================================================================

-- Notification effectiveness metrics
CREATE TABLE IF NOT EXISTS notification_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL,
    customer_risk_tier TEXT NOT NULL CHECK (customer_risk_tier IN ('green', 'yellow', 'red')),
    
    -- Time period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Metrics
    total_notifications_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    total_responded INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    
    -- Calculated rates
    delivery_rate DECIMAL(5,2), -- Percentage
    engagement_rate DECIMAL(5,2), -- Percentage
    response_rate DECIMAL(5,2), -- Percentage
    
    -- Effectiveness
    appointments_kept INTEGER DEFAULT 0,
    no_shows_prevented INTEGER DEFAULT 0,
    
    -- Metadata
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    FOREIGN KEY (barbershop_id) REFERENCES barbershops(id) ON DELETE CASCADE,
    UNIQUE(barbershop_id, customer_risk_tier, period_start, period_end)
);

-- =====================================================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================================================

-- Booking notification plans indexes
CREATE INDEX IF NOT EXISTS idx_booking_notification_plans_booking_id ON booking_notification_plans(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_notification_plans_customer ON booking_notification_plans(customer_id, barbershop_id);
CREATE INDEX IF NOT EXISTS idx_booking_notification_plans_tier ON booking_notification_plans(customer_risk_tier);

-- Scheduled notifications indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_booking_id ON scheduled_notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_customer ON scheduled_notifications(customer_id, barbershop_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_schedule ON scheduled_notifications(scheduled_time, status);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status ON scheduled_notifications(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_channel ON scheduled_notifications(channel, scheduled_time);

-- Notification templates indexes
CREATE INDEX IF NOT EXISTS idx_notification_templates_barbershop ON notification_templates(barbershop_id, is_active);
CREATE INDEX IF NOT EXISTS idx_notification_templates_tier ON notification_templates(risk_tier);

-- Notification metrics indexes
CREATE INDEX IF NOT EXISTS idx_notification_metrics_barbershop ON notification_metrics(barbershop_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_notification_metrics_tier ON notification_metrics(customer_risk_tier, calculated_at);

-- =====================================================================================
-- VIEWS FOR EASY QUERYING
-- =====================================================================================

-- Comprehensive notification view for dashboard
CREATE OR REPLACE VIEW notification_dashboard_view AS
SELECT 
    sn.id,
    sn.booking_id,
    sn.customer_id,
    c.name as customer_name,
    c.phone as customer_phone,
    c.email as customer_email,
    sn.barbershop_id,
    b.name as barbershop_name,
    sn.type,
    sn.channel,
    sn.priority,
    sn.scheduled_time,
    sn.status,
    sn.sent_at,
    sn.delivered_at,
    sn.responded_at,
    bnp.customer_risk_tier,
    bnp.communication_strategy,
    
    -- Time calculations
    EXTRACT(EPOCH FROM (sn.scheduled_time - NOW())) / 3600 as hours_until_scheduled,
    
    -- Status flags
    CASE 
        WHEN sn.status = 'pending' AND sn.scheduled_time <= NOW() THEN 'overdue'
        WHEN sn.status = 'pending' AND sn.scheduled_time <= NOW() + INTERVAL '1 hour' THEN 'due_soon'
        ELSE sn.status
    END as display_status
    
FROM scheduled_notifications sn
JOIN customers c ON sn.customer_id = c.id
JOIN barbershops b ON sn.barbershop_id = b.id
LEFT JOIN booking_notification_plans bnp ON sn.notification_plan_id = bnp.id;

-- Notification effectiveness view
CREATE OR REPLACE VIEW notification_effectiveness_view AS
SELECT 
    bnp.barbershop_id,
    bnp.customer_risk_tier,
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN sn.status IN ('delivered', 'responded') THEN 1 END) as delivered_count,
    COUNT(CASE WHEN sn.status = 'responded' THEN 1 END) as responded_count,
    COUNT(CASE WHEN sn.status = 'failed' THEN 1 END) as failed_count,
    
    -- Calculate rates
    ROUND(
        COUNT(CASE WHEN sn.status IN ('delivered', 'responded') THEN 1 END)::DECIMAL / COUNT(*) * 100, 
        2
    ) as delivery_rate,
    
    ROUND(
        COUNT(CASE WHEN sn.status = 'responded' THEN 1 END)::DECIMAL / COUNT(*) * 100, 
        2
    ) as engagement_rate,
    
    -- Time period
    DATE_TRUNC('month', MIN(sn.created_at)) as period_start,
    DATE_TRUNC('month', MAX(sn.created_at)) as period_end
    
FROM booking_notification_plans bnp
JOIN scheduled_notifications sn ON bnp.id = sn.notification_plan_id
WHERE sn.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')
GROUP BY bnp.barbershop_id, bnp.customer_risk_tier;

-- =====================================================================================
-- FUNCTIONS FOR NOTIFICATION MANAGEMENT
-- =====================================================================================

-- Function to automatically update notification metrics
CREATE OR REPLACE FUNCTION calculate_notification_metrics(
    p_barbershop_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    risk_tier TEXT,
    total_sent INTEGER,
    delivery_rate DECIMAL,
    engagement_rate DECIMAL,
    response_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bnp.customer_risk_tier::TEXT,
        COUNT(sn.*)::INTEGER as total_sent,
        ROUND(
            COUNT(CASE WHEN sn.status IN ('delivered', 'responded') THEN 1 END)::DECIMAL / 
            NULLIF(COUNT(sn.*), 0) * 100, 2
        ) as delivery_rate,
        ROUND(
            COUNT(CASE WHEN sn.clicked_at IS NOT NULL THEN 1 END)::DECIMAL / 
            NULLIF(COUNT(sn.*), 0) * 100, 2
        ) as engagement_rate,
        ROUND(
            COUNT(CASE WHEN sn.status = 'responded' THEN 1 END)::DECIMAL / 
            NULLIF(COUNT(sn.*), 0) * 100, 2
        ) as response_rate
    FROM booking_notification_plans bnp
    JOIN scheduled_notifications sn ON bnp.id = sn.notification_plan_id
    WHERE bnp.barbershop_id = p_barbershop_id
      AND sn.created_at::DATE BETWEEN p_start_date AND p_end_date
    GROUP BY bnp.customer_risk_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old notification data (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_notifications(
    p_days_to_keep INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete old completed notifications (but keep failed ones for analysis)
    DELETE FROM scheduled_notifications 
    WHERE status IN ('delivered', 'responded')
      AND created_at < NOW() - INTERVAL '1 day' * p_days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update customer engagement score based on notification interactions
CREATE OR REPLACE FUNCTION update_customer_engagement_score(
    p_customer_id UUID,
    p_barbershop_id UUID,
    p_engagement_improvement INTEGER DEFAULT 5
)
RETURNS VOID AS $$
BEGIN
    -- Update the customer's communication score in behavior scoring table
    UPDATE customer_behavior_scores
    SET 
        communication_score = LEAST(100, COALESCE(communication_score, 0) + p_engagement_improvement),
        updated_at = NOW()
    WHERE customer_id = p_customer_id 
      AND barbershop_id = p_barbershop_id;
      
    -- If no existing score, this will be handled by the risk calculation system
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================================================

-- Enable RLS on all notification tables
ALTER TABLE booking_notification_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for booking_notification_plans
CREATE POLICY "Users can view their barbershop notification plans" ON booking_notification_plans
    FOR SELECT USING (
        barbershop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
            UNION
            SELECT barbershop_id FROM profiles WHERE id = auth.uid()
            UNION
            SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can insert notification plans for their barbershop" ON booking_notification_plans
    FOR INSERT WITH CHECK (
        barbershop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
            UNION
            SELECT barbershop_id FROM profiles WHERE id = auth.uid()
            UNION
            SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- RLS Policies for scheduled_notifications
CREATE POLICY "Users can view their barbershop notifications" ON scheduled_notifications
    FOR SELECT USING (
        barbershop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
            UNION
            SELECT barbershop_id FROM profiles WHERE id = auth.uid()
            UNION
            SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can manage their barbershop notifications" ON scheduled_notifications
    FOR ALL USING (
        barbershop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
            UNION
            SELECT barbershop_id FROM profiles WHERE id = auth.uid()
            UNION
            SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- RLS Policies for notification_templates
CREATE POLICY "Users can view their barbershop templates" ON notification_templates
    FOR SELECT USING (
        barbershop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
            UNION
            SELECT barbershop_id FROM profiles WHERE id = auth.uid()
            UNION
            SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can manage their barbershop templates" ON notification_templates
    FOR ALL USING (
        barbershop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
            UNION
            SELECT barbershop_id FROM profiles WHERE id = auth.uid()
            UNION
            SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- RLS Policies for notification_metrics
CREATE POLICY "Users can view their barbershop metrics" ON notification_metrics
    FOR SELECT USING (
        barbershop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
            UNION
            SELECT barbershop_id FROM profiles WHERE id = auth.uid()
            UNION
            SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- =====================================================================================
-- DEFAULT NOTIFICATION TEMPLATES
-- =====================================================================================

-- Insert default templates for all barbershops (will be customizable later)
INSERT INTO notification_templates (template_name, channel, risk_tier, subject, message_body, variables, barbershop_id) VALUES
-- Green tier templates (minimal, professional)
('green_tier_reminder', 'sms', 'green', NULL, 
 'Hi {customer_name}! Reminder: {service_name} appointment tomorrow at {time} with {barbershop_name}. See you then!',
 '{"customer_name": "string", "service_name": "string", "time": "string", "barbershop_name": "string"}', NULL),

('green_tier_day_of', 'sms', 'green', NULL,
 'Today''s appointment: {service_name} at {time}. {barbershop_name} - {address}',
 '{"service_name": "string", "time": "string", "barbershop_name": "string", "address": "string"}', NULL),

-- Yellow tier templates (enhanced with confirmations)
('yellow_tier_confirmation', 'email', 'yellow', 'Appointment Confirmed - Please Review',
 'Hi {customer_name},<br><br>Your {service_name} appointment is confirmed for {date} at {time}.<br><br>Please review our policies: {policies_link}<br><br>Reply to confirm your attendance.',
 '{"customer_name": "string", "service_name": "string", "date": "string", "time": "string", "policies_link": "string"}', NULL),

('yellow_tier_24h_reminder', 'sms', 'yellow', NULL,
 'Hi {customer_name}! Your {service_name} appointment is tomorrow at {time}. Reply YES to confirm or RESCHEDULE to change. {reschedule_link}',
 '{"customer_name": "string", "service_name": "string", "time": "string", "reschedule_link": "string"}', NULL),

('yellow_tier_day_of', 'sms', 'yellow', NULL,
 '{customer_name}, your appointment is today at {time}. Please reply CONFIRM to verify you''re coming. {barbershop_name}',
 '{"customer_name": "string", "time": "string", "barbershop_name": "string"}', NULL),

-- Red tier templates (white-glove, detailed)
('red_tier_personal_confirmation', 'phone_call', 'red', NULL,
 'Thank you for booking with {barbershop_name}. This is a personal confirmation call to verify your {service_name} appointment on {date} at {time}. We''re looking forward to providing you with exceptional service.',
 '{"barbershop_name": "string", "service_name": "string", "date": "string", "time": "string"}', NULL),

('red_tier_detailed_confirmation', 'email', 'red', 'Welcome to {barbershop_name} - Your VIP Appointment Details',
 'Dear {customer_name},<br><br>Welcome to {barbershop_name}! We''re excited to provide you with exceptional service.<br><br>Appointment Details:<br>- Service: {service_name}<br>- Date & Time: {date} at {time}<br>- Duration: {duration}<br>- Barber: {barber_name}<br><br>Location & Directions:<br>{address}<br>{directions_link}<br><br>What to Expect:<br>{service_description}<br><br>Our Policies:<br>{policies_details}<br><br>Contact us anytime: {phone} | {email}',
 '{"customer_name": "string", "barbershop_name": "string", "service_name": "string", "date": "string", "time": "string", "duration": "string", "barber_name": "string", "address": "string", "directions_link": "string", "service_description": "string", "policies_details": "string", "phone": "string", "email": "string"}', NULL),

('red_tier_pre_arrival', 'sms', 'red', NULL,
 '{customer_name}, this is {barbershop_name}. Your appointment is in 30 minutes. We''re ready to provide you with exceptional service. Please call if you need anything: {phone}',
 '{"customer_name": "string", "barbershop_name": "string", "phone": "string"}', NULL);

-- =====================================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to relevant tables
CREATE TRIGGER update_scheduled_notifications_updated_at
    BEFORE UPDATE ON scheduled_notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- FINAL NOTES AND DOCUMENTATION
-- =====================================================================================

-- Migration Summary:
-- 1. Created comprehensive notification system with 4 core tables
-- 2. Implemented 3-tier risk-based communication strategies
-- 3. Added performance indexes and analytics views
-- 4. Created utility functions for metrics and maintenance
-- 5. Applied Row Level Security for data protection
-- 6. Inserted default templates for immediate use
-- 7. Added automatic timestamp triggers

COMMENT ON TABLE booking_notification_plans IS 'Stores communication strategies for each booking based on customer risk assessment';
COMMENT ON TABLE scheduled_notifications IS 'Individual notification records with status tracking and engagement metrics';
COMMENT ON TABLE notification_templates IS 'Reusable message templates for different risk tiers and channels';
COMMENT ON TABLE notification_metrics IS 'Aggregated effectiveness metrics for dashboard analytics';

-- End of migration
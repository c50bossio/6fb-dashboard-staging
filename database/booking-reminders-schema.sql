-- Booking Reminders and Notification Preferences Schema
-- Enhanced schema for Phase 5: Automated Reminders and Confirmations

-- Table for storing notification preferences per user/email
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Channel preferences
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT false,
    in_app_enabled BOOLEAN DEFAULT true,
    
    -- Reminder type preferences
    booking_confirmations BOOLEAN DEFAULT true,
    reminder_24h BOOLEAN DEFAULT true,
    reminder_2h BOOLEAN DEFAULT true,
    reminder_30min BOOLEAN DEFAULT false,
    
    -- Cancellation/modification notifications
    cancellation_notifications BOOLEAN DEFAULT true,
    reschedule_notifications BOOLEAN DEFAULT true,
    
    -- Marketing preferences
    marketing_emails BOOLEAN DEFAULT false,
    marketing_sms BOOLEAN DEFAULT false,
    
    -- Channel priority and configuration
    preferred_channels JSONB DEFAULT '["email", "sms"]'::jsonb,
    quiet_hours JSONB DEFAULT '{"start": "22:00", "end": "08:00", "timezone": "America/New_York"}'::jsonb,
    
    -- Opt-out tracking
    email_opt_out_date TIMESTAMP,
    sms_opt_out_date TIMESTAMP,
    push_opt_out_date TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_notification_preferences_email (email),
    INDEX idx_notification_preferences_user_id (user_id)
);

-- Table for storing scheduled booking reminders
CREATE TABLE IF NOT EXISTS booking_reminders (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL,
    
    -- Customer information
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    customer_name VARCHAR(255),
    
    -- Reminder configuration
    reminder_type VARCHAR(50) NOT NULL, -- 'confirmation', 'early_reminder', 'day_of_reminder', 'final_reminder'
    scheduled_for TIMESTAMP NOT NULL,
    channels JSONB NOT NULL DEFAULT '["email"]'::jsonb,
    
    -- Reminder content and context
    reminder_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'processing', 'sent', 'failed', 'cancelled'
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Delivery results
    delivery_results JSONB DEFAULT '{}'::jsonb,
    sent_at TIMESTAMP,
    failed_at TIMESTAMP,
    
    -- Cancellation tracking
    cancellation_reason VARCHAR(255),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_booking_reminders_booking_id (booking_id),
    INDEX idx_booking_reminders_scheduled_for (scheduled_for),
    INDEX idx_booking_reminders_status (status),
    INDEX idx_booking_reminders_reminder_type (reminder_type),
    INDEX idx_booking_reminders_customer_email (customer_email),
    
    -- Composite indexes for queries
    INDEX idx_booking_reminders_status_scheduled (status, scheduled_for) WHERE status = 'scheduled',
    INDEX idx_booking_reminders_type_status (reminder_type, status)
);

-- Table for tracking notification delivery history
CREATE TABLE IF NOT EXISTS notification_delivery_log (
    id SERIAL PRIMARY KEY,
    reminder_id INTEGER REFERENCES booking_reminders(id) ON DELETE CASCADE,
    booking_id INTEGER NOT NULL,
    
    -- Delivery details
    channel VARCHAR(20) NOT NULL, -- 'email', 'sms', 'push', 'in_app'
    recipient VARCHAR(255) NOT NULL,
    message_content TEXT,
    
    -- Delivery status
    delivery_status VARCHAR(20) NOT NULL, -- 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked'
    delivery_provider VARCHAR(50), -- 'sendgrid', 'twilio', 'web_push', 'internal'
    
    -- External tracking
    external_message_id VARCHAR(255),
    external_response JSONB DEFAULT '{}'::jsonb,
    
    -- Timing
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    failed_at TIMESTAMP,
    
    -- Error tracking
    error_code VARCHAR(50),
    error_message TEXT,
    
    -- Cost tracking for SMS/email services
    cost_cents INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_notification_delivery_reminder_id (reminder_id),
    INDEX idx_notification_delivery_booking_id (booking_id),
    INDEX idx_notification_delivery_channel (channel),
    INDEX idx_notification_delivery_status (delivery_status),
    INDEX idx_notification_delivery_external_id (external_message_id),
    
    -- Composite indexes
    INDEX idx_notification_delivery_recipient_channel (recipient, channel),
    INDEX idx_notification_delivery_sent_at_status (sent_at, delivery_status)
);

-- Table for push notification subscriptions (Web Push API)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Push subscription details (Web Push API format)
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    
    -- Subscription metadata
    user_agent TEXT,
    ip_address INET,
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    unsubscribed_at TIMESTAMP,
    
    -- Delivery tracking
    successful_deliveries INTEGER DEFAULT 0,
    failed_deliveries INTEGER DEFAULT 0,
    last_delivery_attempt TIMESTAMP,
    
    -- Unique constraint to prevent duplicate subscriptions
    UNIQUE(endpoint, user_email),
    
    -- Indexes
    INDEX idx_push_subscriptions_user_email (user_email),
    INDEX idx_push_subscriptions_user_id (user_id),
    INDEX idx_push_subscriptions_active (is_active) WHERE is_active = true
);

-- Table for notification templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) UNIQUE NOT NULL,
    template_type VARCHAR(50) NOT NULL, -- 'confirmation', 'reminder', 'cancellation', etc.
    
    -- Template content for different channels
    email_subject VARCHAR(255),
    email_html_template TEXT,
    email_text_template TEXT,
    
    sms_template TEXT,
    push_title_template VARCHAR(100),
    push_body_template TEXT,
    in_app_title_template VARCHAR(100),
    in_app_message_template TEXT,
    
    -- Template variables and configuration
    required_variables JSONB DEFAULT '[]'::jsonb,
    optional_variables JSONB DEFAULT '[]'::jsonb,
    
    -- Template metadata
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by VARCHAR(255),
    
    -- Version control
    version INTEGER DEFAULT 1,
    parent_template_id INTEGER REFERENCES notification_templates(id),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_notification_templates_name (template_name),
    INDEX idx_notification_templates_type (template_type),
    INDEX idx_notification_templates_active (is_active) WHERE is_active = true
);

-- Insert default notification templates
INSERT INTO notification_templates (template_name, template_type, email_subject, sms_template, push_title_template, push_body_template, description) VALUES
('booking_confirmation', 'confirmation', 'Booking Confirmed - {{service_name}} at {{shop_name}}', 'Hi {{customer_name}}! Your {{service_name}} appointment with {{barber_name}} is confirmed for {{appointment_date}} at {{appointment_time}}. Reply STOP to opt out.', 'Booking Confirmed', 'Your {{service_name}} appointment is confirmed for {{appointment_date}} at {{appointment_time}}', 'Default booking confirmation template'),
('reminder_24h', 'reminder', 'Reminder: {{service_name}} appointment tomorrow at {{shop_name}}', 'Hi {{customer_name}}! Reminder: Your {{service_name}} appointment with {{barber_name}} is tomorrow ({{appointment_date}}) at {{appointment_time}}.', 'Appointment Tomorrow', '{{service_name}} with {{barber_name}} at {{appointment_time}}', '24-hour appointment reminder'),
('reminder_2h', 'reminder', 'Today: {{service_name}} appointment in 2 hours', 'Hi {{customer_name}}! Your {{service_name}} appointment with {{barber_name}} is in 2 hours ({{appointment_time}}) at {{shop_name}}.', 'Appointment in 2 Hours', '{{service_name}} with {{barber_name}} at {{appointment_time}}', '2-hour appointment reminder'),
('reminder_30min', 'reminder', 'Final Reminder: {{service_name}} appointment in 30 minutes', 'Final reminder: Your {{service_name}} appointment with {{barber_name}} is in 30 minutes at {{shop_name}}!', 'Appointment in 30 Minutes', 'Time to head to {{shop_name}} for your {{service_name}}', '30-minute final reminder')
ON CONFLICT (template_name) DO NOTHING;

-- Table for notification analytics and metrics
CREATE TABLE IF NOT EXISTS notification_analytics (
    id SERIAL PRIMARY KEY,
    date_recorded DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Counts by channel
    email_sent INTEGER DEFAULT 0,
    email_delivered INTEGER DEFAULT 0,
    email_opened INTEGER DEFAULT 0,
    email_clicked INTEGER DEFAULT 0,
    email_bounced INTEGER DEFAULT 0,
    
    sms_sent INTEGER DEFAULT 0,
    sms_delivered INTEGER DEFAULT 0,
    sms_failed INTEGER DEFAULT 0,
    
    push_sent INTEGER DEFAULT 0,
    push_delivered INTEGER DEFAULT 0,
    push_clicked INTEGER DEFAULT 0,
    
    in_app_sent INTEGER DEFAULT 0,
    in_app_viewed INTEGER DEFAULT 0,
    
    -- Counts by reminder type
    confirmations_sent INTEGER DEFAULT 0,
    early_reminders_sent INTEGER DEFAULT 0,
    day_of_reminders_sent INTEGER DEFAULT 0,
    final_reminders_sent INTEGER DEFAULT 0,
    
    -- Cost tracking
    total_cost_cents INTEGER DEFAULT 0,
    email_cost_cents INTEGER DEFAULT 0,
    sms_cost_cents INTEGER DEFAULT 0,
    
    -- Performance metrics
    average_processing_time_seconds DECIMAL(10,2),
    failed_deliveries INTEGER DEFAULT 0,
    retry_attempts INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint for daily records
    UNIQUE(date_recorded),
    
    -- Indexes
    INDEX idx_notification_analytics_date (date_recorded)
);

-- Create triggers to update timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables
CREATE TRIGGER trigger_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_booking_reminders_updated_at
    BEFORE UPDATE ON booking_reminders
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_notification_delivery_log_updated_at
    BEFORE UPDATE ON notification_delivery_log
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_push_subscriptions_updated_at
    BEFORE UPDATE ON push_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_notification_templates_updated_at
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_notification_analytics_updated_at
    BEFORE UPDATE ON notification_analytics
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Create stored procedures for common operations

-- Procedure to get user notification preferences with defaults
CREATE OR REPLACE FUNCTION get_notification_preferences(user_email VARCHAR)
RETURNS TABLE(
    email_enabled BOOLEAN,
    sms_enabled BOOLEAN,
    push_enabled BOOLEAN,
    booking_confirmations BOOLEAN,
    reminder_24h BOOLEAN,
    reminder_2h BOOLEAN,
    reminder_30min BOOLEAN,
    preferred_channels JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(np.email_enabled, true) as email_enabled,
        COALESCE(np.sms_enabled, true) as sms_enabled,
        COALESCE(np.push_enabled, false) as push_enabled,
        COALESCE(np.booking_confirmations, true) as booking_confirmations,
        COALESCE(np.reminder_24h, true) as reminder_24h,
        COALESCE(np.reminder_2h, true) as reminder_2h,
        COALESCE(np.reminder_30min, false) as reminder_30min,
        COALESCE(np.preferred_channels, '["email", "sms"]'::jsonb) as preferred_channels
    FROM notification_preferences np
    WHERE np.email = user_email
    UNION ALL
    SELECT 
        true as email_enabled,
        true as sms_enabled,
        false as push_enabled,
        true as booking_confirmations,
        true as reminder_24h,
        true as reminder_2h,
        false as reminder_30min,
        '["email", "sms"]'::jsonb as preferred_channels
    WHERE NOT EXISTS (SELECT 1 FROM notification_preferences WHERE email = user_email);
END;
$$ LANGUAGE plpgsql;

-- Procedure to increment notification analytics
CREATE OR REPLACE FUNCTION increment_notification_stat(
    metric_name VARCHAR,
    increment_value INTEGER DEFAULT 1,
    record_date DATE DEFAULT CURRENT_DATE
) RETURNS VOID AS $$
DECLARE
    sql_query TEXT;
BEGIN
    -- Build dynamic SQL to increment the specified metric
    sql_query := format('
        INSERT INTO notification_analytics (date_recorded, %I) 
        VALUES ($1, $2)
        ON CONFLICT (date_recorded) 
        DO UPDATE SET %I = notification_analytics.%I + $2',
        metric_name, metric_name, metric_name
    );
    
    EXECUTE sql_query USING record_date, increment_value;
END;
$$ LANGUAGE plpgsql;

-- Create views for easy querying

-- View for pending reminders
CREATE OR REPLACE VIEW pending_reminders AS
SELECT 
    br.*,
    EXTRACT(EPOCH FROM (br.scheduled_for - CURRENT_TIMESTAMP))/60 AS minutes_until_send
FROM booking_reminders br
WHERE br.status = 'scheduled' 
  AND br.scheduled_for <= CURRENT_TIMESTAMP + INTERVAL '5 minutes'
ORDER BY br.scheduled_for ASC;

-- View for reminder delivery success rates
CREATE OR REPLACE VIEW reminder_delivery_stats AS
SELECT 
    br.reminder_type,
    COUNT(*) as total_reminders,
    COUNT(CASE WHEN br.status = 'sent' THEN 1 END) as successful_deliveries,
    COUNT(CASE WHEN br.status = 'failed' THEN 1 END) as failed_deliveries,
    ROUND(
        COUNT(CASE WHEN br.status = 'sent' THEN 1 END)::decimal / COUNT(*) * 100, 2
    ) as success_rate_percent
FROM booking_reminders br
WHERE br.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY br.reminder_type
ORDER BY success_rate_percent DESC;

-- View for notification preferences summary
CREATE OR REPLACE VIEW notification_preferences_summary AS
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN email_enabled THEN 1 END) as email_enabled_users,
    COUNT(CASE WHEN sms_enabled THEN 1 END) as sms_enabled_users,
    COUNT(CASE WHEN push_enabled THEN 1 END) as push_enabled_users,
    COUNT(CASE WHEN booking_confirmations THEN 1 END) as confirmation_enabled_users,
    COUNT(CASE WHEN reminder_24h THEN 1 END) as reminder_24h_enabled_users,
    COUNT(CASE WHEN reminder_2h THEN 1 END) as reminder_2h_enabled_users,
    COUNT(CASE WHEN reminder_30min THEN 1 END) as reminder_30min_enabled_users
FROM notification_preferences;

-- Comments for documentation
COMMENT ON TABLE notification_preferences IS 'User preferences for notification channels and reminder types';
COMMENT ON TABLE booking_reminders IS 'Scheduled reminders for bookings with delivery tracking';
COMMENT ON TABLE notification_delivery_log IS 'Detailed log of all notification deliveries and their outcomes';
COMMENT ON TABLE push_subscriptions IS 'Web Push API subscriptions for browser notifications';
COMMENT ON TABLE notification_templates IS 'Customizable templates for different notification types';
COMMENT ON TABLE notification_analytics IS 'Daily aggregated metrics for notification performance';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO booking_app;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO booking_app;
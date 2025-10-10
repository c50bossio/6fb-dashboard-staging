-- Phase 5 Notification System Database Schema
-- Execute this SQL in your Supabase SQL Editor to set up the notification system

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Notification Preferences Table
-- Stores user notification preferences and settings
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    user_id UUID,
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    push_notifications BOOLEAN DEFAULT true,
    in_app_notifications BOOLEAN DEFAULT true,
    reminder_24h BOOLEAN DEFAULT true,
    reminder_2h BOOLEAN DEFAULT true,
    reminder_day_of BOOLEAN DEFAULT true,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_email)
);

-- 2. Booking Reminders Table
-- Stores scheduled reminders for bookings
CREATE TABLE IF NOT EXISTS public.booking_reminders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    reminder_type VARCHAR(50) NOT NULL, -- '24h_reminder', '2h_reminder', 'day_of_reminder'
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'cancelled'
    channels TEXT[] DEFAULT ARRAY['email'], -- ['email', 'sms', 'push', 'in_app']
    reminder_data JSONB DEFAULT '{}',
    cron_job_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- 3. Push Subscriptions Table
-- Stores web push notification subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(endpoint)
);

-- 4. Notification Delivery Log Table
-- Tracks all notification delivery attempts and results
CREATE TABLE IF NOT EXISTS public.notification_delivery_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id VARCHAR(255),
    user_email VARCHAR(255) NOT NULL,
    notification_type VARCHAR(100) NOT NULL, -- 'booking_confirmation', 'reminder', etc.
    channel VARCHAR(20) NOT NULL, -- 'email', 'sms', 'push', 'in_app'
    status VARCHAR(20) NOT NULL, -- 'sent', 'failed', 'pending'
    message_id VARCHAR(255), -- Provider message ID
    error_message TEXT,
    delivery_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- 5. Notification Templates Table (Optional - for future use)
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'booking_confirmation', 'reminder', etc.
    channel VARCHAR(20) NOT NULL, -- 'email', 'sms', 'push'
    subject VARCHAR(255),
    template_body TEXT NOT NULL,
    variables JSONB DEFAULT '[]', -- Array of variable names used in template
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, type, channel)
);

-- 6. Notification Analytics Table (Optional - for reporting)
CREATE TABLE IF NOT EXISTS public.notification_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE NOT NULL,
    notification_type VARCHAR(100) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, notification_type, channel)
);

-- INDEXES for Performance
-- Notification preferences
CREATE INDEX IF NOT EXISTS idx_notification_preferences_email 
ON public.notification_preferences(user_email);

-- Booking reminders
CREATE INDEX IF NOT EXISTS idx_booking_reminders_booking_id 
ON public.booking_reminders(booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_reminders_status 
ON public.booking_reminders(status);

CREATE INDEX IF NOT EXISTS idx_booking_reminders_scheduled_for 
ON public.booking_reminders(scheduled_for);

CREATE INDEX IF NOT EXISTS idx_booking_reminders_user_email 
ON public.booking_reminders(user_email);

-- Push subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_email 
ON public.push_subscriptions(user_email);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active 
ON public.push_subscriptions(is_active);

-- Notification delivery log
CREATE INDEX IF NOT EXISTS idx_notification_log_booking_id 
ON public.notification_delivery_log(booking_id);

CREATE INDEX IF NOT EXISTS idx_notification_log_email_type 
ON public.notification_delivery_log(user_email, notification_type);

CREATE INDEX IF NOT EXISTS idx_notification_log_created_at 
ON public.notification_delivery_log(created_at);

-- FUNCTIONS

-- Function to get notification preferences with defaults
CREATE OR REPLACE FUNCTION public.get_notification_preferences(user_email TEXT)
RETURNS TABLE (
    email_notifications BOOLEAN,
    sms_notifications BOOLEAN,
    push_notifications BOOLEAN,
    in_app_notifications BOOLEAN,
    reminder_24h BOOLEAN,
    reminder_2h BOOLEAN,
    reminder_day_of BOOLEAN,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(np.email_notifications, true) as email_notifications,
        COALESCE(np.sms_notifications, false) as sms_notifications,
        COALESCE(np.push_notifications, true) as push_notifications,
        COALESCE(np.in_app_notifications, true) as in_app_notifications,
        COALESCE(np.reminder_24h, true) as reminder_24h,
        COALESCE(np.reminder_2h, true) as reminder_2h,
        COALESCE(np.reminder_day_of, true) as reminder_day_of,
        COALESCE(np.quiet_hours_start, '22:00:00'::TIME) as quiet_hours_start,
        COALESCE(np.quiet_hours_end, '08:00:00'::TIME) as quiet_hours_end,
        COALESCE(np.timezone, 'UTC') as timezone
    FROM public.notification_preferences np
    WHERE np.user_email = $1
    UNION ALL
    SELECT true, false, true, true, true, true, true, '22:00:00'::TIME, '08:00:00'::TIME, 'UTC'
    WHERE NOT EXISTS (SELECT 1 FROM public.notification_preferences WHERE user_email = $1)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to upsert notification preferences
CREATE OR REPLACE FUNCTION public.upsert_notification_preferences(
    p_user_email TEXT,
    p_email_notifications BOOLEAN DEFAULT true,
    p_sms_notifications BOOLEAN DEFAULT false,
    p_push_notifications BOOLEAN DEFAULT true,
    p_in_app_notifications BOOLEAN DEFAULT true,
    p_reminder_24h BOOLEAN DEFAULT true,
    p_reminder_2h BOOLEAN DEFAULT true,
    p_reminder_day_of BOOLEAN DEFAULT true,
    p_quiet_hours_start TIME DEFAULT '22:00:00',
    p_quiet_hours_end TIME DEFAULT '08:00:00',
    p_timezone TEXT DEFAULT 'UTC'
)
RETURNS UUID AS $$
DECLARE
    preference_id UUID;
BEGIN
    INSERT INTO public.notification_preferences (
        user_email,
        email_notifications,
        sms_notifications,
        push_notifications,
        in_app_notifications,
        reminder_24h,
        reminder_2h,
        reminder_day_of,
        quiet_hours_start,
        quiet_hours_end,
        timezone
    ) VALUES (
        p_user_email,
        p_email_notifications,
        p_sms_notifications,
        p_push_notifications,
        p_in_app_notifications,
        p_reminder_24h,
        p_reminder_2h,
        p_reminder_day_of,
        p_quiet_hours_start,
        p_quiet_hours_end,
        p_timezone
    )
    ON CONFLICT (user_email) DO UPDATE SET
        email_notifications = EXCLUDED.email_notifications,
        sms_notifications = EXCLUDED.sms_notifications,
        push_notifications = EXCLUDED.push_notifications,
        in_app_notifications = EXCLUDED.in_app_notifications,
        reminder_24h = EXCLUDED.reminder_24h,
        reminder_2h = EXCLUDED.reminder_2h,
        reminder_day_of = EXCLUDED.reminder_day_of,
        quiet_hours_start = EXCLUDED.quiet_hours_start,
        quiet_hours_end = EXCLUDED.quiet_hours_end,
        timezone = EXCLUDED.timezone,
        updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO preference_id;
    
    RETURN preference_id;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old notifications
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.notification_delivery_log
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- TRIGGERS

-- Update timestamp trigger for notification_preferences
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_reminders_updated_at
    BEFORE UPDATE ON public.booking_reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ROW LEVEL SECURITY (RLS) - Enable if needed
-- ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.booking_reminders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- Create policies if RLS is enabled
-- CREATE POLICY "Users can view their own notification preferences" ON public.notification_preferences
--     FOR ALL USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

-- INITIAL DATA (Optional)
-- Insert default notification templates
INSERT INTO public.notification_templates (name, type, channel, subject, template_body, variables) VALUES
('booking_confirmation_email', 'booking_confirmation', 'email', 'Booking Confirmed - {{service_name}}', 
 'Your {{service_name}} appointment with {{barber_name}} is confirmed for {{appointment_datetime}}.', 
 '["service_name", "barber_name", "appointment_datetime"]'),
('booking_reminder_email', 'reminder', 'email', 'Appointment Reminder - {{service_name}}', 
 'Reminder: Your {{service_name}} appointment with {{barber_name}} is {{time_until}}.', 
 '["service_name", "barber_name", "time_until"]'),
('booking_reminder_sms', 'reminder', 'sms', '', 
 'Reminder: {{service_name}} with {{barber_name}} {{time_until}}. Location: {{shop_address}}', 
 '["service_name", "barber_name", "time_until", "shop_address"]')
ON CONFLICT (name, type, channel) DO NOTHING;

-- Summary
SELECT 'Phase 5 Notification System Database Setup Complete!' as status;
SELECT 'Tables created: notification_preferences, booking_reminders, push_subscriptions, notification_delivery_log, notification_templates, notification_analytics' as tables;
SELECT 'Functions created: get_notification_preferences, upsert_notification_preferences, cleanup_old_notifications' as functions;
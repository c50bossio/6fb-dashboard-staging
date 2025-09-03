-- Migration: Add daily_metrics table for real-time revenue tracking
-- Date: 2025-09-01
-- Purpose: Track daily revenue metrics and enable real-time dashboard updates

-- Create daily_metrics table
CREATE TABLE IF NOT EXISTS public.daily_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Revenue metrics
    total_revenue DECIMAL(10,2) DEFAULT 0.00,
    projected_revenue DECIMAL(10,2) DEFAULT 0.00,
    
    -- Appointment metrics  
    completed_appointments INTEGER DEFAULT 0,
    total_appointments INTEGER DEFAULT 0,
    cancelled_appointments INTEGER DEFAULT 0,
    
    -- Performance metrics
    average_service_price DECIMAL(10,2) DEFAULT 0.00,
    completion_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Customer metrics
    new_customers INTEGER DEFAULT 0,
    returning_customers INTEGER DEFAULT 0,
    total_customers_served INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure one record per barbershop per day
    CONSTRAINT unique_barbershop_date UNIQUE(barbershop_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS daily_metrics_barbershop_id_idx ON public.daily_metrics(barbershop_id);
CREATE INDEX IF NOT EXISTS daily_metrics_date_idx ON public.daily_metrics(date);
CREATE INDEX IF NOT EXISTS daily_metrics_barbershop_date_idx ON public.daily_metrics(barbershop_id, date);

-- Add RLS policies
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own barbershop's metrics
CREATE POLICY "Users can read own barbershop daily metrics" ON public.daily_metrics
    FOR SELECT USING (
        barbershop_id IN (
            SELECT barbershop_id FROM public.barbershop_staff 
            WHERE user_id = auth.uid() AND is_active = true
            UNION
            SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
        )
    );

-- Policy: Users can insert/update their own barbershop's metrics  
CREATE POLICY "Users can manage own barbershop daily metrics" ON public.daily_metrics
    FOR ALL USING (
        barbershop_id IN (
            SELECT barbershop_id FROM public.barbershop_staff 
            WHERE user_id = auth.uid() AND is_active = true
            UNION
            SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
        )
    );

-- Create scheduled_notifications table for follow-ups
CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
    
    -- Notification details
    type VARCHAR(50) NOT NULL, -- 'review_request', 'rebooking_reminder', 'follow_up', etc.
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'cancelled'
    
    -- Optional metadata
    metadata JSONB DEFAULT '{}',
    
    -- Processing info
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for scheduled notifications
CREATE INDEX IF NOT EXISTS scheduled_notifications_barbershop_id_idx ON public.scheduled_notifications(barbershop_id);
CREATE INDEX IF NOT EXISTS scheduled_notifications_scheduled_for_idx ON public.scheduled_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS scheduled_notifications_status_idx ON public.scheduled_notifications(status);
CREATE INDEX IF NOT EXISTS scheduled_notifications_type_idx ON public.scheduled_notifications(type);

-- Add RLS policies for scheduled notifications
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own barbershop scheduled notifications" ON public.scheduled_notifications
    FOR ALL USING (
        barbershop_id IN (
            SELECT barbershop_id FROM public.barbershop_staff 
            WHERE user_id = auth.uid() AND is_active = true
            UNION
            SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
        )
    );

-- Create customer_rewards table for loyalty milestones
CREATE TABLE IF NOT EXISTS public.customer_rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    
    -- Reward details
    type VARCHAR(50) NOT NULL, -- 'loyalty_milestone', 'referral', 'birthday', etc.
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Reward value
    discount_percent INTEGER DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    
    -- Validity
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    used_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for customer rewards
CREATE INDEX IF NOT EXISTS customer_rewards_customer_id_idx ON public.customer_rewards(customer_id);
CREATE INDEX IF NOT EXISTS customer_rewards_barbershop_id_idx ON public.customer_rewards(barbershop_id);
CREATE INDEX IF NOT EXISTS customer_rewards_expires_at_idx ON public.customer_rewards(expires_at);
CREATE INDEX IF NOT EXISTS customer_rewards_is_active_idx ON public.customer_rewards(is_active);

-- Add RLS policies for customer rewards
ALTER TABLE public.customer_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own barbershop customer rewards" ON public.customer_rewards
    FOR ALL USING (
        barbershop_id IN (
            SELECT barbershop_id FROM public.barbershop_staff 
            WHERE user_id = auth.uid() AND is_active = true
            UNION
            SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
        )
    );

-- Create notification_logs table for tracking
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    
    -- Notification details
    type VARCHAR(50) NOT NULL,
    results JSONB DEFAULT '[]',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for notification logs
CREATE INDEX IF NOT EXISTS notification_logs_barbershop_id_idx ON public.notification_logs(barbershop_id);
CREATE INDEX IF NOT EXISTS notification_logs_created_at_idx ON public.notification_logs(created_at);
CREATE INDEX IF NOT EXISTS notification_logs_type_idx ON public.notification_logs(type);

-- Add RLS policies for notification logs
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own barbershop notification logs" ON public.notification_logs
    FOR SELECT USING (
        barbershop_id IN (
            SELECT barbershop_id FROM public.barbershop_staff 
            WHERE user_id = auth.uid() AND is_active = true
            UNION
            SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
        )
    );

-- Add missing columns to customers table for loyalty tracking
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_visits INTEGER DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS last_visit TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_spent DECIMAL(10,2) DEFAULT 0.00;

-- Add missing columns to services table for rebooking suggestions
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS typical_frequency_days INTEGER DEFAULT 28;

-- Add missing columns to appointments table for status tracking
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cash';

-- Create function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_daily_metrics_updated_at 
    BEFORE UPDATE ON public.daily_metrics 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_notifications_updated_at 
    BEFORE UPDATE ON public.scheduled_notifications 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_rewards_updated_at 
    BEFORE UPDATE ON public.customer_rewards 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Migration 005: Add Missing Production Database Elements
-- Date: 2025-01-18
-- Description: Adds critical missing tables and columns for production-ready barbershop platform

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- BUSINESS SETTINGS TABLE ENHANCEMENTS
-- ============================================

-- First ensure business_settings table exists with base structure
CREATE TABLE IF NOT EXISTS business_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
    business_hours JSONB DEFAULT '{}'::jsonb,
    notification_preferences JSONB DEFAULT '{}'::jsonb,
    booking_rules JSONB DEFAULT '{}'::jsonb,
    integrations JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add payment-related columns to business_settings (referenced in BookingWizard.js)
DO $$ 
BEGIN
    -- Payment acceptance settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'accept_online_payment') THEN
        ALTER TABLE business_settings ADD COLUMN accept_online_payment BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'accept_in_person_payment') THEN
        ALTER TABLE business_settings ADD COLUMN accept_in_person_payment BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'require_online_payment') THEN
        ALTER TABLE business_settings ADD COLUMN require_online_payment BOOLEAN DEFAULT false;
    END IF;
    
    -- Deposit settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'deposit_required') THEN
        ALTER TABLE business_settings ADD COLUMN deposit_required BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'deposit_amount') THEN
        ALTER TABLE business_settings ADD COLUMN deposit_amount DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'deposit_percentage') THEN
        ALTER TABLE business_settings ADD COLUMN deposit_percentage INTEGER DEFAULT 20 CHECK (deposit_percentage >= 0 AND deposit_percentage <= 100);
    END IF;
    
    -- Cancellation settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'cancellation_window') THEN
        ALTER TABLE business_settings ADD COLUMN cancellation_window INTEGER DEFAULT 24; -- hours
    END IF;
END $$;

-- ============================================
-- BOOKINGS TABLE ENHANCEMENTS
-- ============================================

-- Ensure bookings table exists with base structure
CREATE TABLE IF NOT EXISTS bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id TEXT NOT NULL,
    barber_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    service_type TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no-show')),
    notes TEXT,
    price DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Add payment tracking columns to bookings table
DO $$ 
BEGIN
    -- Notification tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'confirmation_sent') THEN
        ALTER TABLE bookings ADD COLUMN confirmation_sent BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'reminder_sent') THEN
        ALTER TABLE bookings ADD COLUMN reminder_sent BOOLEAN DEFAULT false;
    END IF;
    
    -- Payment tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'payment_intent_id') THEN
        ALTER TABLE bookings ADD COLUMN payment_intent_id VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'receipt_url') THEN
        ALTER TABLE bookings ADD COLUMN receipt_url VARCHAR(500);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'payment_status') THEN
        ALTER TABLE bookings ADD COLUMN payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled'));
    END IF;
    
    -- Additional metadata
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'deposit_paid') THEN
        ALTER TABLE bookings ADD COLUMN deposit_paid BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'deposit_amount') THEN
        ALTER TABLE bookings ADD COLUMN deposit_amount DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

-- ============================================
-- BOOKING SERVICES TABLE (NEW)
-- ============================================

CREATE TABLE IF NOT EXISTS booking_services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    service_id UUID, -- Optional reference to services table if it exists
    service_name VARCHAR(255) NOT NULL, -- Denormalized for history
    price DECIMAL(10,2) NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTIFICATION QUEUE TABLE (NEW)
-- ============================================

CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Notification details
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'sms', 'push', 'in_app')),
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    content TEXT NOT NULL,
    template_id VARCHAR(100),
    
    -- Processing status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1 = highest priority
    max_attempts INTEGER DEFAULT 3,
    attempt_count INTEGER DEFAULT 0,
    
    -- Scheduling
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    
    -- Error handling
    error_message TEXT,
    error_code VARCHAR(50),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ANALYTICS EVENTS TABLE (ENSURE EXISTS)
-- ============================================

CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    session_id VARCHAR(255),
    
    -- Event details
    event_name VARCHAR(255) NOT NULL,
    event_category VARCHAR(100),
    event_action VARCHAR(100),
    event_label VARCHAR(255),
    event_value DECIMAL(10,2),
    
    -- Properties
    event_properties JSONB DEFAULT '{}',
    user_properties JSONB DEFAULT '{}',
    
    -- Context
    page_url VARCHAR(500),
    referrer VARCHAR(500),
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Business settings indexes
CREATE INDEX IF NOT EXISTS idx_business_settings_user_id ON business_settings(user_id);

-- Bookings indexes (additional)
CREATE INDEX IF NOT EXISTS idx_bookings_shop_id ON bookings(shop_id);
CREATE INDEX IF NOT EXISTS idx_bookings_barber_id ON bookings(barber_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_intent ON bookings(payment_intent_id);

-- Booking services indexes
CREATE INDEX IF NOT EXISTS idx_booking_services_booking_id ON booking_services(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_services_service_id ON booking_services(service_id);

-- Notification queue indexes
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notification_queue_booking_id ON notification_queue(booking_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_type ON notification_queue(type);
CREATE INDEX IF NOT EXISTS idx_notification_queue_priority ON notification_queue(priority DESC, scheduled_at ASC);

-- Analytics events indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Business settings policies
DROP POLICY IF EXISTS "Users can view own settings" ON business_settings;
CREATE POLICY "Users can view own settings" ON business_settings
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON business_settings;
CREATE POLICY "Users can update own settings" ON business_settings
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own settings" ON business_settings;
CREATE POLICY "Users can insert own settings" ON business_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Bookings policies (enhanced)
DROP POLICY IF EXISTS "Users can view bookings for their shop" ON bookings;
CREATE POLICY "Users can view bookings for their shop" ON bookings
    FOR SELECT USING (
        -- Shop owners can see all bookings for their shop
        shop_id IN (
            SELECT shop_name FROM profiles WHERE id = auth.uid()
        ) OR
        -- Barbers can see their own bookings
        barber_id = auth.uid()::text OR
        -- Customers can see their own bookings
        customer_email IN (
            SELECT email FROM profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create bookings for their shop" ON bookings;
CREATE POLICY "Users can create bookings for their shop" ON bookings
    FOR INSERT WITH CHECK (
        shop_id IN (
            SELECT shop_name FROM profiles WHERE id = auth.uid()
        ) OR
        created_by = auth.uid()
    );

DROP POLICY IF EXISTS "Users can update bookings for their shop" ON bookings;
CREATE POLICY "Users can update bookings for their shop" ON bookings
    FOR UPDATE USING (
        shop_id IN (
            SELECT shop_name FROM profiles WHERE id = auth.uid()
        ) OR
        barber_id = auth.uid()::text
    );

-- Booking services policies
CREATE POLICY "Users can view booking services" ON booking_services
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = booking_services.booking_id
            AND (
                bookings.shop_id IN (SELECT shop_name FROM profiles WHERE id = auth.uid()) OR
                bookings.barber_id = auth.uid()::text OR
                bookings.customer_email IN (SELECT email FROM profiles WHERE id = auth.uid())
            )
        )
    );

CREATE POLICY "Users can manage booking services" ON booking_services
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = booking_services.booking_id
            AND (
                bookings.shop_id IN (SELECT shop_name FROM profiles WHERE id = auth.uid()) OR
                bookings.barber_id = auth.uid()::text
            )
        )
    );

-- Notification queue policies
CREATE POLICY "Users can view their notifications" ON notification_queue
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = notification_queue.booking_id
            AND (
                bookings.shop_id IN (SELECT shop_name FROM profiles WHERE id = auth.uid()) OR
                bookings.barber_id = auth.uid()::text
            )
        )
    );

CREATE POLICY "System can manage notifications" ON notification_queue
    FOR ALL USING (true); -- Allow system operations

-- Analytics events policies
CREATE POLICY "Users can track their own events" ON analytics_events
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own events" ON analytics_events
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Create or update the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS update_business_settings_updated_at ON business_settings;
CREATE TRIGGER update_business_settings_updated_at 
    BEFORE UPDATE ON business_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at 
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_booking_services_updated_at ON booking_services;
CREATE TRIGGER update_booking_services_updated_at 
    BEFORE UPDATE ON booking_services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_queue_updated_at ON notification_queue;
CREATE TRIGGER update_notification_queue_updated_at 
    BEFORE UPDATE ON notification_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to process notification queue (for background jobs)
CREATE OR REPLACE FUNCTION process_notification_queue()
RETURNS TABLE(
    notification_id UUID,
    type VARCHAR(50),
    recipient VARCHAR(255),
    subject VARCHAR(255),
    content TEXT
) AS $$
BEGIN
    RETURN QUERY
    UPDATE notification_queue 
    SET 
        status = 'processing',
        attempt_count = attempt_count + 1,
        updated_at = NOW()
    WHERE id IN (
        SELECT nq.id 
        FROM notification_queue nq
        WHERE nq.status = 'pending' 
        AND nq.scheduled_at <= NOW()
        AND nq.attempt_count < nq.max_attempts
        ORDER BY nq.priority DESC, nq.scheduled_at ASC
        LIMIT 10
        FOR UPDATE SKIP LOCKED
    )
    RETURNING id, type, recipient, subject, content;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as sent
CREATE OR REPLACE FUNCTION mark_notification_sent(notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notification_queue 
    SET 
        status = 'sent',
        sent_at = NOW(),
        updated_at = NOW()
    WHERE id = notification_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as failed
CREATE OR REPLACE FUNCTION mark_notification_failed(
    notification_id UUID,
    error_msg TEXT DEFAULT NULL,
    error_cd VARCHAR(50) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notification_queue 
    SET 
        status = CASE 
            WHEN attempt_count >= max_attempts THEN 'failed'
            ELSE 'pending'
        END,
        failed_at = CASE 
            WHEN attempt_count >= max_attempts THEN NOW()
            ELSE failed_at
        END,
        error_message = error_msg,
        error_code = error_cd,
        scheduled_at = CASE 
            WHEN attempt_count < max_attempts THEN NOW() + INTERVAL '5 minutes'
            ELSE scheduled_at
        END,
        updated_at = NOW()
    WHERE id = notification_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE business_settings IS 'Business configuration settings including payment and booking rules';
COMMENT ON TABLE booking_services IS 'Services associated with each booking (many-to-many relationship)';
COMMENT ON TABLE notification_queue IS 'Queue for processing email, SMS, and push notifications';
COMMENT ON TABLE analytics_events IS 'User action tracking for analytics and insights';

COMMENT ON COLUMN business_settings.accept_online_payment IS 'Whether the business accepts online payments';
COMMENT ON COLUMN business_settings.require_online_payment IS 'Whether online payment is required for bookings';
COMMENT ON COLUMN business_settings.deposit_required IS 'Whether deposits are required for bookings';
COMMENT ON COLUMN business_settings.cancellation_window IS 'Hours before appointment when cancellation is allowed';

COMMENT ON COLUMN bookings.payment_intent_id IS 'Stripe payment intent ID for tracking payments';
COMMENT ON COLUMN bookings.payment_status IS 'Current status of payment processing';
COMMENT ON COLUMN bookings.confirmation_sent IS 'Whether booking confirmation has been sent';
COMMENT ON COLUMN bookings.reminder_sent IS 'Whether booking reminder has been sent';

COMMENT ON COLUMN notification_queue.priority IS 'Processing priority (1=highest, 10=lowest)';
COMMENT ON COLUMN notification_queue.max_attempts IS 'Maximum retry attempts before marking as failed';
COMMENT ON COLUMN notification_queue.scheduled_at IS 'When the notification should be processed';

-- Migration complete
SELECT 'Migration 005 completed successfully' AS status;
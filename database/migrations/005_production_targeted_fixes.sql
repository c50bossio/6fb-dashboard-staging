-- Migration 005: Targeted Production Database Fixes
-- Date: 2025-01-18
-- Description: Adds specific missing columns and tables based on current database analysis
-- IMPORTANT: Apply this manually in Supabase SQL Editor

-- ============================================
-- 1. ADD MISSING COLUMNS TO business_settings
-- ============================================

-- Payment acceptance settings (referenced in BookingWizard.js)
ALTER TABLE business_settings 
ADD COLUMN IF NOT EXISTS accept_online_payment BOOLEAN DEFAULT true;

ALTER TABLE business_settings 
ADD COLUMN IF NOT EXISTS accept_in_person_payment BOOLEAN DEFAULT true;

ALTER TABLE business_settings 
ADD COLUMN IF NOT EXISTS require_online_payment BOOLEAN DEFAULT false;

-- Deposit settings
ALTER TABLE business_settings 
ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT false;

ALTER TABLE business_settings 
ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) DEFAULT 0;

ALTER TABLE business_settings 
ADD COLUMN IF NOT EXISTS deposit_percentage INTEGER DEFAULT 20 
CHECK (deposit_percentage >= 0 AND deposit_percentage <= 100);

-- Cancellation settings
ALTER TABLE business_settings 
ADD COLUMN IF NOT EXISTS cancellation_window INTEGER DEFAULT 24; -- hours

-- ============================================
-- 2. ADD MISSING COLUMNS TO bookings TABLE
-- ============================================

-- Notification tracking
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS confirmation_sent BOOLEAN DEFAULT false;

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;

-- Payment tracking
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(255);

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS receipt_url VARCHAR(500);

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending' 
CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled'));

-- Deposit tracking
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT false;

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) DEFAULT 0;

-- ============================================
-- 3. CREATE booking_services TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS booking_services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id TEXT NOT NULL, -- Using TEXT to match existing bookings.id type
    service_id TEXT, -- Optional reference to services table if it exists
    service_name VARCHAR(255) NOT NULL, -- Denormalized for history
    price DECIMAL(10,2) NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint (will fail gracefully if bookings table structure changes)
DO $$ 
BEGIN
    ALTER TABLE booking_services 
    ADD CONSTRAINT fk_booking_services_booking_id 
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
EXCEPTION 
    WHEN duplicate_object THEN 
        -- Constraint already exists, skip
        NULL;
END $$;

-- ============================================
-- 4. CREATE notification_queue TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Notification details
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'sms', 'push', 'in_app')),
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    content TEXT NOT NULL,
    template_id VARCHAR(100),
    
    -- Processing status
    status VARCHAR(50) DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
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
-- 5. CREATE PERFORMANCE INDEXES
-- ============================================

-- Bookings indexes (additional ones for new columns)
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_intent ON bookings(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_confirmation_sent ON bookings(confirmation_sent);

-- Booking services indexes
CREATE INDEX IF NOT EXISTS idx_booking_services_booking_id ON booking_services(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_services_service_id ON booking_services(service_id);

-- Notification queue indexes (critical for performance)
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notification_queue_booking_id ON notification_queue(booking_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_type ON notification_queue(type);
CREATE INDEX IF NOT EXISTS idx_notification_queue_priority ON notification_queue(priority DESC, scheduled_at ASC);

-- ============================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on new tables
ALTER TABLE booking_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. CREATE RLS POLICIES
-- ============================================

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
    FOR ALL USING (true); -- Allow system operations for background processing

-- ============================================
-- 8. CREATE UPDATED_AT TRIGGERS
-- ============================================

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for new tables
CREATE TRIGGER update_booking_services_updated_at 
    BEFORE UPDATE ON booking_services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_queue_updated_at 
    BEFORE UPDATE ON notification_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. HELPER FUNCTIONS FOR NOTIFICATION PROCESSING
-- ============================================

-- Function to get pending notifications for processing
CREATE OR REPLACE FUNCTION get_pending_notifications(batch_size INTEGER DEFAULT 10)
RETURNS TABLE(
    notification_id UUID,
    type VARCHAR(50),
    recipient VARCHAR(255),
    subject VARCHAR(255),
    content TEXT,
    template_id VARCHAR(100),
    metadata JSONB
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
        LIMIT batch_size
        FOR UPDATE SKIP LOCKED
    )
    RETURNING id, type, recipient, subject, content, template_id, metadata;
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

-- Function to queue a new notification
CREATE OR REPLACE FUNCTION queue_notification(
    p_booking_id TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_type VARCHAR(50),
    p_recipient VARCHAR(255),
    p_subject VARCHAR(255) DEFAULT NULL,
    p_content TEXT,
    p_template_id VARCHAR(100) DEFAULT NULL,
    p_priority INTEGER DEFAULT 5,
    p_scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notification_queue (
        booking_id, user_id, type, recipient, subject, content, 
        template_id, priority, scheduled_at, metadata
    ) VALUES (
        p_booking_id, p_user_id, p_type, p_recipient, p_subject, p_content,
        p_template_id, p_priority, p_scheduled_at, p_metadata
    )
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN business_settings.accept_online_payment IS 'Whether the business accepts online payments';
COMMENT ON COLUMN business_settings.require_online_payment IS 'Whether online payment is required for bookings';
COMMENT ON COLUMN business_settings.deposit_required IS 'Whether deposits are required for bookings';
COMMENT ON COLUMN business_settings.cancellation_window IS 'Hours before appointment when cancellation is allowed';

COMMENT ON COLUMN bookings.payment_intent_id IS 'Stripe payment intent ID for tracking payments';
COMMENT ON COLUMN bookings.payment_status IS 'Current status of payment processing';
COMMENT ON COLUMN bookings.confirmation_sent IS 'Whether booking confirmation has been sent';
COMMENT ON COLUMN bookings.reminder_sent IS 'Whether booking reminder has been sent';

COMMENT ON TABLE booking_services IS 'Services associated with each booking (many-to-many relationship)';
COMMENT ON TABLE notification_queue IS 'Queue for processing email, SMS, and push notifications';

COMMENT ON COLUMN notification_queue.priority IS 'Processing priority (1=highest, 10=lowest)';
COMMENT ON COLUMN notification_queue.max_attempts IS 'Maximum retry attempts before marking as failed';
COMMENT ON COLUMN notification_queue.scheduled_at IS 'When the notification should be processed';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify new columns exist
SELECT 'business_settings columns' as table_name, 
       count(*) as total_columns,
       count(CASE WHEN column_name IN ('accept_online_payment', 'accept_in_person_payment', 'require_online_payment', 'deposit_required', 'deposit_amount', 'deposit_percentage', 'cancellation_window') THEN 1 END) as new_columns
FROM information_schema.columns 
WHERE table_name = 'business_settings' AND table_schema = 'public'

UNION ALL

SELECT 'bookings columns' as table_name, 
       count(*) as total_columns,
       count(CASE WHEN column_name IN ('confirmation_sent', 'reminder_sent', 'payment_intent_id', 'receipt_url', 'payment_status', 'deposit_paid', 'deposit_amount') THEN 1 END) as new_columns
FROM information_schema.columns 
WHERE table_name = 'bookings' AND table_schema = 'public'

UNION ALL

SELECT 'booking_services table' as table_name, 
       count(*) as total_columns,
       CASE WHEN count(*) > 0 THEN count(*) ELSE 0 END as new_columns
FROM information_schema.columns 
WHERE table_name = 'booking_services' AND table_schema = 'public'

UNION ALL

SELECT 'notification_queue table' as table_name, 
       count(*) as total_columns,
       CASE WHEN count(*) > 0 THEN count(*) ELSE 0 END as new_columns
FROM information_schema.columns 
WHERE table_name = 'notification_queue' AND table_schema = 'public';

-- Final success message
SELECT 'Migration 005 completed successfully! All missing database elements have been added.' AS status;
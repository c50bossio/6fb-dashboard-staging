-- ============================================================================
-- Walk-In Management & Waitlist System Schema
-- Migration: 002_walk_in_waitlist_schema.sql
-- Description: Creates tables for walk-in waitlist, SMS notifications, kiosk sessions, and deposit protection
-- ============================================================================

-- ============================================================================
-- Table: waitlist_entries
-- Purpose: Main waitlist queue for walk-in customers
-- ============================================================================

CREATE TABLE IF NOT EXISTS waitlist_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    barber_preference_id UUID REFERENCES barbershop_staff(id) ON DELETE SET NULL,
    position INTEGER NOT NULL,
    estimated_wait_minutes INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'seated', 'no_show', 'cancelled')),
    check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_sms_sent TIMESTAMPTZ,
    deposit_payment_id UUID,  -- FK to walk_in_deposits (added after that table is created)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE waitlist_entries IS 'Walk-in waitlist queue entries';
COMMENT ON COLUMN waitlist_entries.status IS 'waiting: in queue, notified: SMS sent, seated: being served, no_show: missed appointment, cancelled: customer cancelled';
COMMENT ON COLUMN waitlist_entries.position IS 'Position in queue (1 = next, 2 = second, etc.)';
COMMENT ON COLUMN waitlist_entries.estimated_wait_minutes IS 'Estimated minutes until service based on queue position and service durations';

-- ============================================================================
-- Table: waitlist_notifications
-- Purpose: Track SMS notification delivery for each waitlist stage
-- ============================================================================

CREATE TABLE IF NOT EXISTS waitlist_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    waitlist_entry_id UUID NOT NULL REFERENCES waitlist_entries(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('confirmation', 'almost_ready', 'ready_now', 'cancelled')),
    phone_number TEXT NOT NULL,
    message_content TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivery_status TEXT NOT NULL DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'failed', 'opted_out')),
    twilio_message_sid TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE waitlist_notifications IS 'SMS notification delivery tracking for waitlist customers';
COMMENT ON COLUMN waitlist_notifications.notification_type IS 'confirmation: check-in SMS, almost_ready: 2nd in line, ready_now: customer is next, cancelled: waitlist cancelled';
COMMENT ON COLUMN waitlist_notifications.delivery_status IS 'sent: dispatched to Twilio, delivered: confirmed delivery, failed: delivery failed, opted_out: customer opted out of SMS';

-- ============================================================================
-- Table: kiosk_sessions
-- Purpose: Track self-service kiosk usage and activity
-- ============================================================================

CREATE TABLE IF NOT EXISTS kiosk_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    device_identifier TEXT NOT NULL UNIQUE,
    kiosk_mode_active BOOLEAN NOT NULL DEFAULT false,
    check_in_count INTEGER NOT NULL DEFAULT 0,
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE kiosk_sessions IS 'Self-service kiosk sessions for walk-in check-in';
COMMENT ON COLUMN kiosk_sessions.device_identifier IS 'Unique device fingerprint or tablet UUID';
COMMENT ON COLUMN kiosk_sessions.check_in_count IS 'Total number of successful check-ins from this kiosk';

-- ============================================================================
-- Table: walk_in_deposits
-- Purpose: Stripe payment holds for no-show protection
-- ============================================================================

CREATE TABLE IF NOT EXISTS walk_in_deposits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    waitlist_entry_id UUID NOT NULL UNIQUE REFERENCES waitlist_entries(id) ON DELETE CASCADE,
    stripe_payment_intent_id TEXT NOT NULL UNIQUE,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 50 AND amount_cents <= 999999),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'released', 'captured')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Add comment
COMMENT ON TABLE walk_in_deposits IS 'Stripe payment intent holds for walk-in deposit protection';
COMMENT ON COLUMN walk_in_deposits.status IS 'pending: payment authorized but not captured, released: hold cancelled (customer showed up), captured: funds captured (customer no-showed)';
COMMENT ON COLUMN walk_in_deposits.amount_cents IS 'Deposit amount in cents (e.g., 1500 = $15.00)';

-- ============================================================================
-- Foreign Key: Link waitlist_entries to walk_in_deposits
-- ============================================================================

ALTER TABLE waitlist_entries
ADD CONSTRAINT fk_waitlist_deposit
FOREIGN KEY (deposit_payment_id) REFERENCES walk_in_deposits(id) ON DELETE SET NULL;

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiosk_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE walk_in_deposits ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policy: waitlist_entries
-- Users can only access waitlist for their own barbershop
-- ============================================================================

CREATE POLICY waitlist_entries_access_policy ON waitlist_entries
FOR ALL
USING (
    barbershop_id IN (
        SELECT barbershop_id
        FROM barbershop_staff
        WHERE user_id = auth.uid()
    )
);

COMMENT ON POLICY waitlist_entries_access_policy ON waitlist_entries IS 'Staff can only access waitlist entries for their own barbershop';

-- ============================================================================
-- RLS Policy: waitlist_notifications
-- Inherit access from waitlist_entries via FK
-- ============================================================================

CREATE POLICY waitlist_notifications_access_policy ON waitlist_notifications
FOR ALL
USING (
    waitlist_entry_id IN (
        SELECT id FROM waitlist_entries
        WHERE barbershop_id IN (
            SELECT barbershop_id
            FROM barbershop_staff
            WHERE user_id = auth.uid()
        )
    )
);

COMMENT ON POLICY waitlist_notifications_access_policy ON waitlist_notifications IS 'Staff can only access notifications for waitlist entries in their barbershop';

-- ============================================================================
-- RLS Policy: kiosk_sessions
-- Public read for kiosk mode, admin write only
-- ============================================================================

-- Public can read kiosk sessions (for kiosk display)
CREATE POLICY kiosk_sessions_read_policy ON kiosk_sessions
FOR SELECT
USING (true);

-- Only staff can insert/update kiosk sessions
CREATE POLICY kiosk_sessions_write_policy ON kiosk_sessions
FOR INSERT
WITH CHECK (
    barbershop_id IN (
        SELECT barbershop_id
        FROM barbershop_staff
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY kiosk_sessions_update_policy ON kiosk_sessions
FOR UPDATE
USING (
    barbershop_id IN (
        SELECT barbershop_id
        FROM barbershop_staff
        WHERE user_id = auth.uid()
    )
);

COMMENT ON POLICY kiosk_sessions_read_policy ON kiosk_sessions IS 'Public can read kiosk sessions for self-check-in';
COMMENT ON POLICY kiosk_sessions_write_policy ON kiosk_sessions IS 'Only staff can create kiosk sessions';

-- ============================================================================
-- RLS Policy: walk_in_deposits
-- Inherit access from waitlist_entries via FK
-- ============================================================================

CREATE POLICY walk_in_deposits_access_policy ON walk_in_deposits
FOR ALL
USING (
    waitlist_entry_id IN (
        SELECT id FROM waitlist_entries
        WHERE barbershop_id IN (
            SELECT barbershop_id
            FROM barbershop_staff
            WHERE user_id = auth.uid()
        )
    )
);

COMMENT ON POLICY walk_in_deposits_access_policy ON walk_in_deposits IS 'Staff can only access deposits for waitlist entries in their barbershop';

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Index for efficient queue queries (barbershop + status)
CREATE INDEX IF NOT EXISTS idx_waitlist_barbershop_status
ON waitlist_entries(barbershop_id, status)
WHERE status IN ('waiting', 'notified');

COMMENT ON INDEX idx_waitlist_barbershop_status IS 'Optimizes queue retrieval queries filtering by barbershop and active statuses';

-- Index for phone number lookup (customer recognition)
CREATE INDEX IF NOT EXISTS idx_waitlist_phone
ON waitlist_entries(phone_number);

COMMENT ON INDEX idx_waitlist_phone IS 'Enables fast customer lookup by phone number for repeat visit auto-fill';

-- Index for notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_entry
ON waitlist_notifications(waitlist_entry_id);

COMMENT ON INDEX idx_notifications_entry IS 'Optimizes notification lookup for specific waitlist entries';

-- Index for kiosk device lookup
CREATE INDEX IF NOT EXISTS idx_kiosk_device
ON kiosk_sessions(device_identifier);

COMMENT ON INDEX idx_kiosk_device IS 'Enables fast kiosk session lookup by device fingerprint';

-- Index for deposit lookup by Stripe payment intent
CREATE INDEX IF NOT EXISTS idx_deposits_stripe_id
ON walk_in_deposits(stripe_payment_intent_id);

COMMENT ON INDEX idx_deposits_stripe_id IS 'Enables fast deposit lookup by Stripe payment intent ID for webhook processing';

-- ============================================================================
-- Triggers for Automatic Timestamp Updates
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for waitlist_entries
CREATE TRIGGER update_waitlist_entries_updated_at
BEFORE UPDATE ON waitlist_entries
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for kiosk_sessions
CREATE TRIGGER update_kiosk_sessions_updated_at
BEFORE UPDATE ON kiosk_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Grant authenticated users access to tables (RLS will enforce barbershop scoping)
GRANT SELECT, INSERT, UPDATE, DELETE ON waitlist_entries TO authenticated;
GRANT SELECT, INSERT ON waitlist_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON kiosk_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON walk_in_deposits TO authenticated;

-- Grant anon (public) read access to kiosk_sessions for self-service kiosk
GRANT SELECT ON kiosk_sessions TO anon;

-- ============================================================================
-- Migration Complete
-- ============================================================================

COMMENT ON SCHEMA public IS 'Walk-in waitlist schema migration 002 applied successfully';

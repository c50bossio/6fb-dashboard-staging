-- Waitlist and Cancellation Management Schema
-- SQLite schema for comprehensive waitlist and cancellation functionality

-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- ==========================================
-- WAITLIST MANAGEMENT TABLES
-- ==========================================

-- Waitlist entries table
CREATE TABLE IF NOT EXISTS waitlist_entries (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    barbershop_id TEXT NOT NULL,
    service_id TEXT NOT NULL,
    barber_id TEXT,  -- NULL means any available barber
    
    -- Scheduling preferences
    preferred_dates TEXT,  -- JSON array of ISO dates
    preferred_times TEXT,  -- JSON array of time ranges like ["09:00-12:00", "14:00-17:00"]
    
    -- Waitlist management
    priority TEXT NOT NULL DEFAULT 'medium',  -- urgent, high, medium, low
    position INTEGER NOT NULL,
    estimated_wait_time INTEGER,  -- Minutes
    max_wait_days INTEGER DEFAULT 14,
    
    -- Customer information
    notes TEXT,
    notification_preferences TEXT,  -- JSON with email, sms, push preferences
    last_notified TIMESTAMP,
    notification_count INTEGER DEFAULT 0,
    
    -- Status tracking
    status TEXT DEFAULT 'active',  -- active, matched, expired, cancelled
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints would be added if referential tables exist
    -- FOREIGN KEY (customer_id) REFERENCES customers (id),
    -- FOREIGN KEY (barbershop_id) REFERENCES barbershops (id),
    -- FOREIGN KEY (service_id) REFERENCES services (id),
    -- FOREIGN KEY (barber_id) REFERENCES users (id)
    
    UNIQUE(customer_id, barbershop_id, service_id, barber_id)
);

-- Waitlist notifications table
CREATE TABLE IF NOT EXISTS waitlist_notifications (
    id TEXT PRIMARY KEY,
    waitlist_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    
    -- Notification details
    notification_type TEXT NOT NULL,  -- waitlist_added, position_updated, slot_available, booking_confirmed
    channel TEXT NOT NULL,  -- email, sms, push, system
    content TEXT,  -- JSON with notification content
    
    -- Delivery tracking
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'sent',  -- sent, failed, pending, delivered
    response_received BOOLEAN DEFAULT FALSE,
    response_data TEXT,  -- JSON with any response data
    response_deadline TIMESTAMP,  -- For time-sensitive notifications
    
    FOREIGN KEY (waitlist_id) REFERENCES waitlist_entries (id)
);

-- Waitlist analytics table
CREATE TABLE IF NOT EXISTS waitlist_analytics (
    id TEXT PRIMARY KEY,
    barbershop_id TEXT NOT NULL,
    date DATE NOT NULL,
    
    -- Daily metrics
    total_waitlist_entries INTEGER DEFAULT 0,
    successful_matches INTEGER DEFAULT 0,
    expired_entries INTEGER DEFAULT 0,
    cancelled_entries INTEGER DEFAULT 0,
    
    -- Performance metrics
    average_wait_time REAL DEFAULT 0.0,  -- In minutes
    conversion_rate REAL DEFAULT 0.0,  -- Percentage
    revenue_from_waitlist REAL DEFAULT 0.0,
    
    -- Position analytics
    average_position_at_booking REAL DEFAULT 0.0,
    max_waitlist_size INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(barbershop_id, date)
);

-- ==========================================
-- CANCELLATION MANAGEMENT TABLES
-- ==========================================

-- Cancellation records table
CREATE TABLE IF NOT EXISTS cancellation_records (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    barbershop_id TEXT NOT NULL,
    barber_id TEXT,
    service_id TEXT NOT NULL,
    
    -- Financial details
    original_amount REAL NOT NULL,
    cancellation_fee REAL DEFAULT 0.0,
    refund_amount REAL DEFAULT 0.0,
    refund_processed BOOLEAN DEFAULT FALSE,
    
    -- Cancellation details
    reason TEXT NOT NULL,  -- customer_request, no_show, barber_unavailable, emergency, weather, system_error
    cancelled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelled_by TEXT,  -- customer_id or staff_id who initiated cancellation
    policy_applied TEXT,  -- Which policy was used
    notes TEXT,
    
    -- Payment integration
    payment_intent_id TEXT,  -- Original Stripe payment intent
    refund_id TEXT,  -- Stripe refund ID
    refund_reason TEXT,
    
    -- Waitlist impact
    waitlist_notified INTEGER DEFAULT 0,  -- Number of waitlist customers notified
    slot_rebooked BOOLEAN DEFAULT FALSE,  -- Whether the slot was immediately rebooked
    
    -- Timestamps
    refund_processed_at TIMESTAMP,
    
    -- Foreign key would be added if booking table exists
    -- FOREIGN KEY (booking_id) REFERENCES bookings (id)
);

-- Service cancellation policies table
CREATE TABLE IF NOT EXISTS service_cancellation_policies (
    service_id TEXT PRIMARY KEY,
    
    -- Policy configuration
    policy_type TEXT NOT NULL DEFAULT 'standard',  -- flexible, standard, strict, no_refund
    
    -- Time-based rules
    full_refund_hours INTEGER DEFAULT 24,  -- Hours before appointment for full refund
    partial_refund_hours INTEGER DEFAULT 2,  -- Hours before appointment for partial refund
    partial_refund_percentage REAL DEFAULT 50.0,  -- Percentage of refund for partial
    
    -- Fees
    cancellation_fee REAL DEFAULT 0.0,  -- Fixed cancellation fee
    no_show_fee REAL DEFAULT 25.0,  -- Fee for no-shows
    
    -- Special conditions
    same_day_cancellation_allowed BOOLEAN DEFAULT TRUE,
    emergency_full_refund BOOLEAN DEFAULT TRUE,  -- Full refund for emergencies
    weather_policy TEXT DEFAULT 'full_refund',  -- Policy for weather cancellations
    
    -- Administrative
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    
    -- FOREIGN KEY (service_id) REFERENCES services (id)
);

-- Cancellation reasons lookup
CREATE TABLE IF NOT EXISTS cancellation_reasons (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    requires_fee BOOLEAN DEFAULT FALSE,
    allows_reschedule BOOLEAN DEFAULT TRUE,
    priority_for_refund INTEGER DEFAULT 50,  -- Higher number = higher refund priority
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- WAITLIST MATCHING AND OPTIMIZATION
-- ==========================================

-- Waitlist matching preferences
CREATE TABLE IF NOT EXISTS waitlist_matching_rules (
    id TEXT PRIMARY KEY,
    barbershop_id TEXT NOT NULL,
    
    -- Matching configuration
    max_notification_batch INTEGER DEFAULT 3,  -- Max customers to notify per slot
    response_timeout_hours INTEGER DEFAULT 2,  -- Hours to respond to slot offer
    priority_boost_for_loyalty REAL DEFAULT 1.1,  -- Priority multiplier for loyal customers
    
    -- Optimization goals
    optimize_for TEXT DEFAULT 'balanced',  -- revenue, customer_satisfaction, efficiency, balanced
    allow_barber_switching BOOLEAN DEFAULT TRUE,
    allow_service_upgrades BOOLEAN DEFAULT TRUE,
    
    -- Business rules
    vip_customer_priority BOOLEAN DEFAULT TRUE,
    same_day_booking_priority REAL DEFAULT 1.2,  -- Priority multiplier for same-day requests
    
    -- Notification settings
    enable_sms_notifications BOOLEAN DEFAULT TRUE,
    enable_email_notifications BOOLEAN DEFAULT TRUE,
    enable_push_notifications BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer waitlist preferences
CREATE TABLE IF NOT EXISTS customer_waitlist_preferences (
    customer_id TEXT PRIMARY KEY,
    
    -- Communication preferences
    preferred_notification_channel TEXT DEFAULT 'email',  -- email, sms, push
    notification_frequency TEXT DEFAULT 'immediate',  -- immediate, daily, weekly
    quiet_hours_start TIME,  -- No notifications during these hours
    quiet_hours_end TIME,
    
    -- Booking preferences
    flexible_on_barber BOOLEAN DEFAULT TRUE,
    flexible_on_time BOOLEAN DEFAULT TRUE,
    flexible_on_date BOOLEAN DEFAULT FALSE,
    max_travel_time INTEGER DEFAULT 30,  -- Minutes willing to travel
    
    -- Waitlist behavior
    auto_accept_within_hours INTEGER,  -- Auto-accept slots within X hours
    max_waitlist_position INTEGER DEFAULT 10,  -- Won't join if position > this
    cancel_if_no_response BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Waitlist entries indexes
CREATE INDEX IF NOT EXISTS idx_waitlist_entries_barbershop_service ON waitlist_entries (barbershop_id, service_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_entries_status ON waitlist_entries (status);
CREATE INDEX IF NOT EXISTS idx_waitlist_entries_position ON waitlist_entries (barbershop_id, service_id, position);
CREATE INDEX IF NOT EXISTS idx_waitlist_entries_customer ON waitlist_entries (customer_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_entries_expires ON waitlist_entries (expires_at);
CREATE INDEX IF NOT EXISTS idx_waitlist_entries_priority ON waitlist_entries (priority, position);

-- Cancellation records indexes
CREATE INDEX IF NOT EXISTS idx_cancellation_records_booking ON cancellation_records (booking_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_records_customer ON cancellation_records (customer_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_records_date ON cancellation_records (cancelled_at);
CREATE INDEX IF NOT EXISTS idx_cancellation_records_barbershop ON cancellation_records (barbershop_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_records_refund ON cancellation_records (refund_processed);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_waitlist_notifications_waitlist ON waitlist_notifications (waitlist_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_notifications_customer ON waitlist_notifications (customer_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_notifications_type ON waitlist_notifications (notification_type);
CREATE INDEX IF NOT EXISTS idx_waitlist_notifications_status ON waitlist_notifications (status);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_waitlist_analytics_barbershop_date ON waitlist_analytics (barbershop_id, date);

-- ==========================================
-- TRIGGERS FOR AUTOMATION
-- ==========================================

-- Update waitlist entry timestamp on changes
CREATE TRIGGER IF NOT EXISTS update_waitlist_entry_timestamp 
    AFTER UPDATE ON waitlist_entries
BEGIN
    UPDATE waitlist_entries SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update cancellation policy timestamp
CREATE TRIGGER IF NOT EXISTS update_cancellation_policy_timestamp 
    AFTER UPDATE ON service_cancellation_policies
BEGIN
    UPDATE service_cancellation_policies SET updated_at = CURRENT_TIMESTAMP WHERE service_id = NEW.service_id;
END;

-- Automatically expire old waitlist entries
CREATE TRIGGER IF NOT EXISTS expire_old_waitlist_entries 
    AFTER INSERT ON waitlist_entries
BEGIN
    UPDATE waitlist_entries 
    SET status = 'expired' 
    WHERE expires_at < CURRENT_TIMESTAMP AND status = 'active';
END;

-- Update analytics when waitlist entries change
CREATE TRIGGER IF NOT EXISTS update_waitlist_analytics_on_change
    AFTER UPDATE OF status ON waitlist_entries
    WHEN OLD.status != NEW.status
BEGIN
    INSERT OR REPLACE INTO waitlist_analytics (
        id, barbershop_id, date, total_waitlist_entries,
        successful_matches, expired_entries, cancelled_entries
    ) VALUES (
        NEW.barbershop_id || '_' || DATE('now'),
        NEW.barbershop_id,
        DATE('now'),
        COALESCE((SELECT total_waitlist_entries FROM waitlist_analytics 
                 WHERE barbershop_id = NEW.barbershop_id AND date = DATE('now')), 0),
        COALESCE((SELECT successful_matches FROM waitlist_analytics 
                 WHERE barbershop_id = NEW.barbershop_id AND date = DATE('now')), 0) + 
                 CASE WHEN NEW.status = 'matched' THEN 1 ELSE 0 END,
        COALESCE((SELECT expired_entries FROM waitlist_analytics 
                 WHERE barbershop_id = NEW.barbershop_id AND date = DATE('now')), 0) + 
                 CASE WHEN NEW.status = 'expired' THEN 1 ELSE 0 END,
        COALESCE((SELECT cancelled_entries FROM waitlist_analytics 
                 WHERE barbershop_id = NEW.barbershop_id AND date = DATE('now')), 0) + 
                 CASE WHEN NEW.status = 'cancelled' THEN 1 ELSE 0 END
    );
END;

-- ==========================================
-- INITIAL DATA SETUP
-- ==========================================

-- Insert default cancellation reasons
INSERT OR IGNORE INTO cancellation_reasons (code, name, description, requires_fee, allows_reschedule, priority_for_refund) VALUES
('customer_request', 'Customer Request', 'Customer voluntarily cancelled appointment', TRUE, TRUE, 50),
('no_show', 'No Show', 'Customer did not appear for appointment', TRUE, FALSE, 10),
('barber_unavailable', 'Barber Unavailable', 'Barber had to cancel due to emergency', FALSE, TRUE, 90),
('emergency', 'Emergency', 'Customer emergency situation', FALSE, TRUE, 95),
('weather', 'Weather', 'Severe weather conditions', FALSE, TRUE, 85),
('system_error', 'System Error', 'Technical issue with booking system', FALSE, TRUE, 100),
('illness', 'Illness', 'Customer or barber illness', FALSE, TRUE, 80),
('schedule_conflict', 'Schedule Conflict', 'Conflicting appointment discovered', FALSE, TRUE, 70);

-- Insert default service cancellation policies
INSERT OR IGNORE INTO service_cancellation_policies (
    service_id, policy_type, full_refund_hours, partial_refund_hours,
    partial_refund_percentage, cancellation_fee, no_show_fee
) VALUES
('haircut_classic', 'flexible', 2, 1, 100.0, 0.0, 15.0),
('haircut_premium', 'standard', 24, 2, 50.0, 5.0, 25.0),
('beard_trim', 'flexible', 2, 1, 100.0, 0.0, 10.0),
('full_service', 'standard', 24, 4, 50.0, 10.0, 35.0),
('hot_towel_shave', 'strict', 48, 4, 25.0, 15.0, 45.0),
('kids_cut', 'flexible', 2, 1, 100.0, 0.0, 10.0);

-- Insert default matching rules for demo barbershop
INSERT OR IGNORE INTO waitlist_matching_rules (
    id, barbershop_id, max_notification_batch, response_timeout_hours,
    optimize_for, priority_boost_for_loyalty, same_day_booking_priority
) VALUES
('default_rules', 'demo_barbershop', 3, 2, 'balanced', 1.1, 1.2);

-- ==========================================
-- VIEWS FOR COMMON QUERIES
-- ==========================================

-- Active waitlist with customer details
CREATE VIEW IF NOT EXISTS v_active_waitlist AS
SELECT 
    w.*,
    CASE w.priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END as priority_order
FROM waitlist_entries w
WHERE w.status = 'active'
ORDER BY w.barbershop_id, w.service_id, priority_order, w.position;

-- Waitlist analytics summary
CREATE VIEW IF NOT EXISTS v_waitlist_performance AS
SELECT 
    barbershop_id,
    COUNT(*) as total_entries,
    SUM(CASE WHEN status = 'matched' THEN 1 ELSE 0 END) as successful_matches,
    SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired_entries,
    AVG(estimated_wait_time) as avg_estimated_wait_minutes,
    AVG(notification_count) as avg_notifications_sent,
    ROUND(
        (SUM(CASE WHEN status = 'matched' THEN 1 ELSE 0 END) * 100.0) / COUNT(*), 2
    ) as conversion_rate_percent
FROM waitlist_entries
GROUP BY barbershop_id;

-- Recent cancellations with refund status
CREATE VIEW IF NOT EXISTS v_recent_cancellations AS
SELECT 
    c.*,
    (c.original_amount - c.cancellation_fee) as net_refund,
    CASE 
        WHEN c.refund_processed THEN 'Processed'
        WHEN c.refund_amount > 0 THEN 'Pending'
        ELSE 'No Refund'
    END as refund_status
FROM cancellation_records c
WHERE c.cancelled_at >= DATE('now', '-30 days')
ORDER BY c.cancelled_at DESC;

-- Performance metrics view
CREATE VIEW IF NOT EXISTS v_system_performance AS
SELECT 
    'waitlist' as metric_type,
    COUNT(*) as total_count,
    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count,
    AVG(CASE WHEN status = 'matched' THEN estimated_wait_time END) as avg_successful_wait_time,
    NULL as total_refunds
FROM waitlist_entries
UNION ALL
SELECT 
    'cancellations' as metric_type,
    COUNT(*) as total_count,
    SUM(CASE WHEN refund_processed THEN 1 ELSE 0 END) as active_count,
    AVG(cancellation_fee) as avg_successful_wait_time,
    SUM(refund_amount) as total_refunds
FROM cancellation_records
WHERE cancelled_at >= DATE('now', '-30 days');
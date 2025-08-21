-- Performance Optimization Indexes for Customer Intelligence Dashboard
-- Modified version that works with actual database schema

-- ============================================
-- CUSTOMER TABLE INDEXES
-- ============================================

-- Index for barbershop filtering (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_customers_barbershop_id 
ON customers(barbershop_id);

-- Composite index for barbershop + created date queries
CREATE INDEX IF NOT EXISTS idx_customers_barbershop_created 
ON customers(barbershop_id, created_at DESC);

-- Index for customer search by email and phone
CREATE INDEX IF NOT EXISTS idx_customers_email_lower 
ON customers(LOWER(email));

CREATE INDEX IF NOT EXISTS idx_customers_phone 
ON customers(phone) 
WHERE phone IS NOT NULL;

-- Index for active customers
CREATE INDEX IF NOT EXISTS idx_customers_active 
ON customers(barbershop_id, is_active) 
WHERE is_active = true;

-- ============================================
-- APPOINTMENTS TABLE INDEXES
-- ============================================

-- Composite index for customer appointment history
CREATE INDEX IF NOT EXISTS idx_appointments_customer_date 
ON appointments(customer_id, date DESC, start_time DESC);

-- Index for barbershop appointment queries
CREATE INDEX IF NOT EXISTS idx_appointments_barbershop_date 
ON appointments(barbershop_id, date DESC);

-- Index for appointment status filtering
CREATE INDEX IF NOT EXISTS idx_appointments_status 
ON appointments(status) 
WHERE status IN ('completed', 'confirmed', 'pending');

-- Composite index for revenue calculations
CREATE INDEX IF NOT EXISTS idx_appointments_barbershop_status_price 
ON appointments(barbershop_id, status, price) 
WHERE status = 'completed' AND price > 0;

-- ============================================
-- CUSTOMER HEALTH SCORES INDEXES
-- ============================================

-- Primary lookup index
CREATE INDEX IF NOT EXISTS idx_health_scores_customer 
ON customer_health_scores(customer_id, calculated_at DESC);

-- Barbershop-wide health score queries
CREATE INDEX IF NOT EXISTS idx_health_scores_barbershop 
ON customer_health_scores(barbershop_id, overall_score DESC);

-- Risk assessment queries
CREATE INDEX IF NOT EXISTS idx_health_scores_churn_risk 
ON customer_health_scores(barbershop_id, churn_risk_level) 
WHERE churn_risk_level IN ('high', 'critical');

-- ============================================
-- CUSTOMER CLV INDEXES
-- ============================================

-- CLV lookup by customer
CREATE INDEX IF NOT EXISTS idx_clv_customer 
ON customer_lifetime_values(customer_id, calculated_at DESC);

-- Top CLV customers by barbershop
CREATE INDEX IF NOT EXISTS idx_clv_barbershop_total 
ON customer_lifetime_values(barbershop_id, total_clv DESC);

-- CLV with churn probability for risk analysis
CREATE INDEX IF NOT EXISTS idx_clv_churn_probability 
ON customer_lifetime_values(barbershop_id, churn_probability DESC) 
WHERE churn_probability > 0.3;

-- ============================================
-- CUSTOMER SEGMENTS INDEXES
-- ============================================

-- Segment membership lookup
CREATE INDEX IF NOT EXISTS idx_segments_customer 
ON customer_segments(customer_id, updated_at DESC);

-- Barbershop segment distribution
CREATE INDEX IF NOT EXISTS idx_segments_barbershop_segment 
ON customer_segments(barbershop_id, segment_type, segment_value);

-- Active segments
CREATE INDEX IF NOT EXISTS idx_segments_active 
ON customer_segments(barbershop_id, is_active) 
WHERE is_active = true;

-- ============================================
-- ANALYTICS EVENTS INDEXES
-- ============================================

-- Event lookup by entity
CREATE INDEX IF NOT EXISTS idx_analytics_events_entity 
ON analytics_events(entity_type, entity_id, event_time DESC);

-- Barbershop event tracking
CREATE INDEX IF NOT EXISTS idx_analytics_events_barbershop_time 
ON analytics_events(barbershop_id, event_time DESC);

-- Event type filtering
CREATE INDEX IF NOT EXISTS idx_analytics_events_type 
ON analytics_events(event_type, barbershop_id, event_time DESC);

-- ============================================
-- BOOKING/TRANSACTION INDEXES
-- ============================================

-- Booking lookup by customer
CREATE INDEX IF NOT EXISTS idx_bookings_customer 
ON bookings(customer_id, created_at DESC);

-- Booking by barbershop and date
CREATE INDEX IF NOT EXISTS idx_bookings_shop_date 
ON bookings(shop_id, date DESC, time_slot);

-- ============================================
-- SIMPLIFIED INDEXES FOR CORE TABLES
-- ============================================

-- Customers table core indexes
CREATE INDEX IF NOT EXISTS idx_customers_created 
ON customers(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customers_last_visit 
ON customers(last_visit_at DESC) 
WHERE last_visit_at IS NOT NULL;

-- Appointments table core indexes  
CREATE INDEX IF NOT EXISTS idx_appointments_customer 
ON appointments(customer_id);

CREATE INDEX IF NOT EXISTS idx_appointments_barbershop 
ON appointments(barbershop_id);

CREATE INDEX IF NOT EXISTS idx_appointments_date 
ON appointments(date DESC);

-- Bookings table core indexes
CREATE INDEX IF NOT EXISTS idx_bookings_customer_simple 
ON bookings(customer_id);

CREATE INDEX IF NOT EXISTS idx_bookings_shop 
ON bookings(shop_id);

CREATE INDEX IF NOT EXISTS idx_bookings_date 
ON bookings(date DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_created 
ON bookings(created_at DESC);

-- ============================================
-- PARTIAL INDEXES FOR COMMON FILTERS
-- ============================================

-- Recent appointments (last 90 days)
CREATE INDEX IF NOT EXISTS idx_appointments_recent 
ON appointments(barbershop_id, date DESC) 
WHERE date >= CURRENT_DATE - INTERVAL '90 days';

-- Completed appointments for analytics
CREATE INDEX IF NOT EXISTS idx_appointments_completed 
ON appointments(barbershop_id, customer_id, date DESC) 
WHERE status = 'completed';

-- Active customers with recent visits
CREATE INDEX IF NOT EXISTS idx_customers_recent_active 
ON customers(barbershop_id, last_visit_at DESC) 
WHERE is_active = true AND last_visit_at IS NOT NULL;

-- ============================================
-- FUNCTION-BASED INDEXES
-- ============================================

-- Customer full name search (if you have separate first/last name fields)
-- Uncomment if you have these fields:
-- CREATE INDEX IF NOT EXISTS idx_customers_full_name 
-- ON customers(LOWER(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))));

-- Customer name search (for single name field)
CREATE INDEX IF NOT EXISTS idx_customers_name_lower 
ON customers(LOWER(name));

-- Date extraction for reporting
CREATE INDEX IF NOT EXISTS idx_appointments_month 
ON appointments(barbershop_id, DATE_TRUNC('month', date));

CREATE INDEX IF NOT EXISTS idx_bookings_month 
ON bookings(shop_id, DATE_TRUNC('month', date));

-- ============================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================

-- Update table statistics for better query planning
ANALYZE customers;
ANALYZE appointments;
ANALYZE bookings;

-- Only analyze these if tables exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_health_scores') THEN
        ANALYZE customer_health_scores;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_lifetime_values') THEN
        ANALYZE customer_lifetime_values;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_segments') THEN
        ANALYZE customer_segments;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_events') THEN
        ANALYZE analytics_events;
    END IF;
END $$;
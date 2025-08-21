-- Performance Optimization Indexes for Customer Intelligence Dashboard
-- This migration adds strategic indexes to improve query performance

-- ============================================
-- CUSTOMER TABLE INDEXES
-- ============================================

-- Index for barbershop filtering (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_customers_barbershop_id 
ON customers(barbershop_id) 
WHERE deleted_at IS NULL;

-- Composite index for barbershop + created date queries
CREATE INDEX IF NOT EXISTS idx_customers_barbershop_created 
ON customers(barbershop_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- Index for customer search by email and phone
CREATE INDEX IF NOT EXISTS idx_customers_email_lower 
ON customers(LOWER(email));

CREATE INDEX IF NOT EXISTS idx_customers_phone 
ON customers(phone) 
WHERE phone IS NOT NULL;

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
CREATE INDEX IF NOT EXISTS idx_bookings_barbershop_date 
ON bookings(shop_id, date DESC, time_slot);

-- Transaction lookup for revenue
CREATE INDEX IF NOT EXISTS idx_transactions_barbershop_date 
ON transactions(barbershop_id, created_at DESC) 
WHERE status = 'completed';

-- ============================================
-- PARTIAL INDEXES FOR COMMON FILTERS
-- ============================================

-- Active customers only
CREATE INDEX IF NOT EXISTS idx_customers_active 
ON customers(barbershop_id, last_visit_date DESC) 
WHERE status = 'active' AND deleted_at IS NULL;

-- Recent appointments (last 90 days)
CREATE INDEX IF NOT EXISTS idx_appointments_recent 
ON appointments(barbershop_id, date DESC) 
WHERE date >= CURRENT_DATE - INTERVAL '90 days';

-- High-value customers
CREATE INDEX IF NOT EXISTS idx_customers_high_value 
ON customer_lifetime_values(barbershop_id, customer_id) 
WHERE total_clv > 500;

-- ============================================
-- FUNCTION-BASED INDEXES
-- ============================================

-- Customer full name search
CREATE INDEX IF NOT EXISTS idx_customers_full_name 
ON customers(LOWER(CONCAT(first_name, ' ', last_name)));

-- Date extraction for reporting
CREATE INDEX IF NOT EXISTS idx_appointments_month 
ON appointments(barbershop_id, DATE_TRUNC('month', date));

-- ============================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================

-- Update table statistics for better query planning
ANALYZE customers;
ANALYZE appointments;
ANALYZE customer_health_scores;
ANALYZE customer_lifetime_values;
ANALYZE customer_segments;
ANALYZE analytics_events;
ANALYZE bookings;
ANALYZE transactions;

-- ============================================
-- MONITORING QUERIES
-- ============================================

-- Query to check index usage (run periodically)
/*
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
*/

-- Query to identify missing indexes
/*
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
    AND n_distinct > 100
    AND correlation < 0.1
ORDER BY n_distinct DESC;
*/

-- Query to find slow queries
/*
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time,
    stddev_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 20;
*/
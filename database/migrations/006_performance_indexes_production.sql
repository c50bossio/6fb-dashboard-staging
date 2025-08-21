-- Performance Optimization Indexes for Customer Intelligence Dashboard
-- Production version - Only indexes actual tables, not views

-- ============================================
-- CUSTOMER TABLE INDEXES
-- ============================================

-- Index for barbershop filtering (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_customers_barbershop_id 
ON customers(barbershop_id);

-- Composite index for barbershop + created date queries
CREATE INDEX IF NOT EXISTS idx_customers_barbershop_created 
ON customers(barbershop_id, created_at DESC);

-- Index for customer search by email
CREATE INDEX IF NOT EXISTS idx_customers_email_lower 
ON customers(LOWER(email));

-- Index for customer search by phone
CREATE INDEX IF NOT EXISTS idx_customers_phone 
ON customers(phone) 
WHERE phone IS NOT NULL;

-- Index for active customers
CREATE INDEX IF NOT EXISTS idx_customers_active 
ON customers(barbershop_id, is_active) 
WHERE is_active = true;

-- Index for customer name search
CREATE INDEX IF NOT EXISTS idx_customers_name_lower 
ON customers(LOWER(name));

-- Index on created date
CREATE INDEX IF NOT EXISTS idx_customers_created 
ON customers(created_at DESC);

-- Index on last visit
CREATE INDEX IF NOT EXISTS idx_customers_last_visit 
ON customers(last_visit_at DESC) 
WHERE last_visit_at IS NOT NULL;

-- Index for total visits (for segmentation)
CREATE INDEX IF NOT EXISTS idx_customers_total_visits 
ON customers(barbershop_id, total_visits DESC);

-- Index for VIP status
CREATE INDEX IF NOT EXISTS idx_customers_vip 
ON customers(barbershop_id, vip_status) 
WHERE vip_status = true;

-- ============================================
-- BOOKINGS TABLE INDEXES
-- ============================================

-- Booking lookup by customer
CREATE INDEX IF NOT EXISTS idx_bookings_customer 
ON bookings(customer_id, created_at DESC);

-- Booking by shop and date
CREATE INDEX IF NOT EXISTS idx_bookings_shop_date 
ON bookings(shop_id, date DESC);

-- Booking by date for time-based queries
CREATE INDEX IF NOT EXISTS idx_bookings_date 
ON bookings(date DESC);

-- Booking by creation time
CREATE INDEX IF NOT EXISTS idx_bookings_created 
ON bookings(created_at DESC);

-- Booking by status
CREATE INDEX IF NOT EXISTS idx_bookings_status 
ON bookings(status) 
WHERE status IN ('confirmed', 'completed', 'cancelled');

-- Composite index for revenue calculations
CREATE INDEX IF NOT EXISTS idx_bookings_shop_price 
ON bookings(shop_id, price) 
WHERE price > 0;

-- Recent bookings (last 90 days)
CREATE INDEX IF NOT EXISTS idx_bookings_recent 
ON bookings(shop_id, date DESC) 
WHERE date >= CURRENT_DATE - INTERVAL '90 days';

-- Monthly aggregation index
CREATE INDEX IF NOT EXISTS idx_bookings_month 
ON bookings(shop_id, DATE_TRUNC('month', date));

-- ============================================
-- BARBERSHOPS TABLE INDEXES (if needed)
-- ============================================

-- Check if barbershops table exists and add indexes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'barbershops') THEN
        -- Index on owner_id for shop lookup
        CREATE INDEX IF NOT EXISTS idx_barbershops_owner 
        ON barbershops(owner_id);
        
        -- Index on created date
        CREATE INDEX IF NOT EXISTS idx_barbershops_created 
        ON barbershops(created_at DESC);
    END IF;
END $$;

-- ============================================
-- USERS/PROFILES TABLE INDEXES (if needed)
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        -- Index on barbershop association
        CREATE INDEX IF NOT EXISTS idx_users_barbershop 
        ON users(barbershop_id) 
        WHERE barbershop_id IS NOT NULL;
        
        -- Index on email for lookups
        CREATE INDEX IF NOT EXISTS idx_users_email 
        ON users(LOWER(email));
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        -- Index on barbershop association
        CREATE INDEX IF NOT EXISTS idx_profiles_barbershop 
        ON profiles(barbershop_id) 
        WHERE barbershop_id IS NOT NULL;
        
        -- Index on shop_id (alternative field)
        CREATE INDEX IF NOT EXISTS idx_profiles_shop 
        ON profiles(shop_id) 
        WHERE shop_id IS NOT NULL;
    END IF;
END $$;

-- ============================================
-- ANALYTICS TABLES (Create only if they exist)
-- ============================================

DO $$
BEGIN
    -- Customer Health Scores
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_health_scores') THEN
        CREATE INDEX IF NOT EXISTS idx_health_scores_customer 
        ON customer_health_scores(customer_id, calculated_at DESC);
        
        CREATE INDEX IF NOT EXISTS idx_health_scores_barbershop 
        ON customer_health_scores(barbershop_id, overall_score DESC);
    END IF;
    
    -- Customer Lifetime Values
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_lifetime_values') THEN
        CREATE INDEX IF NOT EXISTS idx_clv_customer 
        ON customer_lifetime_values(customer_id, calculated_at DESC);
        
        CREATE INDEX IF NOT EXISTS idx_clv_barbershop 
        ON customer_lifetime_values(barbershop_id, total_clv DESC);
    END IF;
    
    -- Customer Segments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_segments') THEN
        CREATE INDEX IF NOT EXISTS idx_segments_customer 
        ON customer_segments(customer_id, updated_at DESC);
        
        CREATE INDEX IF NOT EXISTS idx_segments_barbershop 
        ON customer_segments(barbershop_id, segment_type);
    END IF;
    
    -- Analytics Events
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_events') THEN
        CREATE INDEX IF NOT EXISTS idx_analytics_events_entity 
        ON analytics_events(entity_type, entity_id, event_time DESC);
        
        CREATE INDEX IF NOT EXISTS idx_analytics_events_barbershop 
        ON analytics_events(barbershop_id, event_time DESC);
    END IF;
END $$;

-- ============================================
-- ANALYZE CORE TABLES
-- ============================================

-- Analyze tables that definitely exist
ANALYZE customers;
ANALYZE bookings;

-- Analyze other tables if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'barbershops') THEN
        ANALYZE barbershops;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ANALYZE users;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        ANALYZE profiles;
    END IF;
END $$;

-- ============================================
-- PERFORMANCE VERIFICATION
-- ============================================

-- Show created indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Show table sizes and row counts
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
-- Minimal Performance Indexes for Customer Intelligence Dashboard
-- Only creates indexes on columns that definitely exist

-- ============================================
-- CUSTOMER TABLE INDEXES (Core Performance)
-- ============================================

-- Primary performance index for barbershop filtering
CREATE INDEX IF NOT EXISTS idx_customers_barbershop_id 
ON customers(barbershop_id);

-- Index for customer search by email
CREATE INDEX IF NOT EXISTS idx_customers_email_lower 
ON customers(LOWER(email));

-- Index for customer name search  
CREATE INDEX IF NOT EXISTS idx_customers_name_lower 
ON customers(LOWER(name));

-- Index on created timestamp
CREATE INDEX IF NOT EXISTS idx_customers_created_at 
ON customers(created_at DESC);

-- Composite index for active customers per barbershop
CREATE INDEX IF NOT EXISTS idx_customers_barbershop_active 
ON customers(barbershop_id, is_active);

-- ============================================
-- BOOKINGS TABLE INDEXES (Safe columns only)
-- ============================================

-- Index by customer
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id 
ON bookings(customer_id);

-- Index by shop
CREATE INDEX IF NOT EXISTS idx_bookings_shop_id 
ON bookings(shop_id);

-- Index on creation timestamp
CREATE INDEX IF NOT EXISTS idx_bookings_created_at 
ON bookings(created_at DESC);

-- ============================================
-- ANALYZE TABLES
-- ============================================

ANALYZE customers;
ANALYZE bookings;

-- ============================================
-- VERIFY INDEXES WERE CREATED
-- ============================================

SELECT 
    'Indexes Created:' as status,
    COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%';

-- Show the indexes we just created
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
-- Performance Indexes for Bookings Table
-- These indexes optimize the most common query patterns used in analytics and dashboard APIs

-- Index for customer-based queries (customer analytics, retention analysis)
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);

-- Index for time-based queries (revenue calculations, daily/monthly reports)
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);

-- Index for service analysis (service popularity, pricing recommendations)
CREATE INDEX IF NOT EXISTS idx_bookings_service_name ON bookings(service_name);

-- Index for shop-based queries (multi-tenant support)
CREATE INDEX IF NOT EXISTS idx_bookings_shop_id ON bookings(shop_id);

-- Index for status-based queries (completed bookings, cancellations)
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Composite index for date range revenue queries (most common analytics query)
CREATE INDEX IF NOT EXISTS idx_bookings_date_revenue ON bookings(start_time, price, status);

-- Composite index for customer journey analysis
CREATE INDEX IF NOT EXISTS idx_bookings_customer_time ON bookings(customer_id, start_time, status);

-- Composite index for service performance analysis
CREATE INDEX IF NOT EXISTS idx_bookings_service_performance ON bookings(service_name, start_time, price, status);

-- Index for barber performance tracking
CREATE INDEX IF NOT EXISTS idx_bookings_barber_id ON bookings(barber_id);

-- Composite index for shop analytics
CREATE INDEX IF NOT EXISTS idx_bookings_shop_analytics ON bookings(shop_id, start_time, status);

-- Performance optimization for customers table
CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_last_visit ON customers(last_visit_at);
CREATE INDEX IF NOT EXISTS idx_customers_total_spent ON customers(total_spent);

-- Performance optimization for services table  
CREATE INDEX IF NOT EXISTS idx_services_shop_id ON services(shop_id);
CREATE INDEX IF NOT EXISTS idx_services_price ON services(price);

-- Add indexes for created_at timestamps for audit and reporting
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

-- Partial index for active bookings only (reduces index size)
CREATE INDEX IF NOT EXISTS idx_bookings_active ON bookings(start_time, customer_id) 
  WHERE status IN ('confirmed', 'completed');

-- Partial index for recent bookings (last 3 months) - most analytics focus here
CREATE INDEX IF NOT EXISTS idx_bookings_recent ON bookings(start_time, price, customer_id) 
  WHERE start_time >= (CURRENT_DATE - INTERVAL '3 months');

COMMENT ON INDEX idx_bookings_customer_id IS 'Optimizes customer-based analytics queries';
COMMENT ON INDEX idx_bookings_start_time IS 'Optimizes time-based revenue and trend queries';  
COMMENT ON INDEX idx_bookings_service_name IS 'Optimizes service popularity and pricing queries';
COMMENT ON INDEX idx_bookings_date_revenue IS 'Optimizes common revenue calculation queries';
COMMENT ON INDEX idx_bookings_recent IS 'Optimizes recent booking analytics (90% of queries)';
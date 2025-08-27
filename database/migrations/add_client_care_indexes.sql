-- Client Care Performance Optimization Indexes
-- Migration: add_client_care_indexes
-- Created: 2025-01-27
-- Purpose: Optimize database queries for client care functionality

-- Index for appointments by barbershop and status (for no-show queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_barbershop_status_date 
ON appointments (barbershop_id, status, appointment_date DESC);

-- Index for customers by barbershop and last visit (for inactive client queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_barbershop_last_visit 
ON customers (barbershop_id, last_visit_at DESC NULLS LAST);

-- Composite index for customers with visit and spending data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_barbershop_activity 
ON customers (barbershop_id, total_visits, total_spent, last_visit_at DESC);

-- Index for appointments by customer for relationship building
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_customer_date 
ON appointments (customer_id, appointment_date DESC);

-- Index for appointment date range queries (for time-based filtering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_date_range 
ON appointments (appointment_date) WHERE appointment_date >= CURRENT_DATE - INTERVAL '90 days';

-- Index for client strike history (if table exists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_strikes_barbershop_active 
ON client_strike_history (barbershop_id, active_strikes DESC, risk_score DESC)
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_strike_history');

-- Index for no-show incidents (if table exists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_no_show_incidents_barbershop_date 
ON no_show_incidents (barbershop_id, incident_date DESC)
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'no_show_incidents');

-- Add comments for documentation
COMMENT ON INDEX idx_appointments_barbershop_status_date IS 'Optimizes client care queries for no-shows and cancelled appointments';
COMMENT ON INDEX idx_customers_barbershop_last_visit IS 'Optimizes inactive client identification queries';
COMMENT ON INDEX idx_customers_barbershop_activity IS 'Optimizes client value and activity-based queries';
COMMENT ON INDEX idx_appointments_customer_date IS 'Optimizes client appointment history lookups';
COMMENT ON INDEX idx_appointments_date_range IS 'Optimizes recent appointment queries with automatic cleanup';

-- Performance monitoring query for index usage
-- Run this after deployment to verify indexes are being used:
/*
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes 
WHERE indexname LIKE 'idx_%client%' OR indexname LIKE 'idx_%appointment%' OR indexname LIKE 'idx_%customer%'
ORDER BY idx_scan DESC;
*/

-- Query plan analysis for client care endpoint
-- Use EXPLAIN ANALYZE on these key queries to verify performance:
/*
EXPLAIN ANALYZE
SELECT c.* FROM customers c 
WHERE c.barbershop_id = $1 
  AND (c.last_visit_at < CURRENT_DATE - INTERVAL '60 days' OR c.last_visit_at IS NULL)
  AND c.total_visits > 0
ORDER BY c.last_visit_at ASC NULLS LAST
LIMIT 25;

EXPLAIN ANALYZE  
SELECT a.customer_id, MIN(c.name) as name, c.email, c.phone, c.total_spent, c.total_visits, c.last_visit_at
FROM appointments a
INNER JOIN customers c ON a.customer_id = c.id
WHERE a.barbershop_id = $1 
  AND a.status = 'no_show'
  AND a.appointment_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY a.customer_id, c.email, c.phone, c.total_spent, c.total_visits, c.last_visit_at
LIMIT 25;
*/
-- =====================================================
-- MASTER DATABASE DEPLOYMENT SCRIPT
-- 6FB AI AGENT SYSTEM - SUPABASE POSTGRESQL
-- =====================================================
-- This script deploys the complete database schema and seed data
-- Run this in your Supabase SQL editor or via psql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search indexes

-- =====================================================
-- 1. CREATE ALL SCHEMAS
-- =====================================================

-- Create customers table and related objects
\i database/schemas/customers.sql

-- Create staff table and related objects  
\i database/schemas/staff.sql

-- Create services table and related objects
\i database/schemas/services.sql

-- Create inventory table and related objects
\i database/schemas/inventory.sql

-- Create payments table and related objects
\i database/schemas/payments.sql

-- =====================================================
-- 2. SEED ALL DATA (OPTIONAL - COMMENT OUT FOR PRODUCTION)
-- =====================================================

-- Insert customers seed data
\i database/seed/001_customers_seed.sql

-- Insert staff seed data
\i database/seed/002_staff_seed.sql

-- Insert services seed data  
\i database/seed/003_services_seed.sql

-- Insert inventory seed data
\i database/seed/004_inventory_seed.sql

-- Insert payments seed data
\i database/seed/005_payments_seed.sql

-- =====================================================
-- 3. ADDITIONAL PRODUCTION OPTIMIZATIONS
-- =====================================================

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_customers_status_last_visit 
ON customers(status, last_visit DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payments_date_status_barber 
ON payments(DATE(transaction_date), status, barber_id);

CREATE INDEX IF NOT EXISTS idx_staff_active_role 
ON staff(is_active, role) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_services_category_active_popular 
ON services(category, active, popular) 
WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_inventory_category_status 
ON inventory(category, status) 
WHERE is_active = true;

-- =====================================================
-- 4. SECURITY AND PERFORMANCE SETTINGS
-- =====================================================

-- Set default RLS policies for new tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT INSERT ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT UPDATE ON TABLES TO authenticated;

-- Create utility functions for common operations
CREATE OR REPLACE FUNCTION get_current_user_role() 
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        auth.jwt() ->> 'user_role',
        auth.jwt() ->> 'role',
        'staff'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is manager/admin
CREATE OR REPLACE FUNCTION is_manager_or_admin() 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_current_user_role() IN ('admin', 'manager', 'owner');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. DATABASE MAINTENANCE FUNCTIONS
-- =====================================================

-- Function to update all performance metrics
CREATE OR REPLACE FUNCTION update_all_performance_metrics()
RETURNS TEXT AS $$
DECLARE
    result_message TEXT := 'Performance metrics updated successfully:';
BEGIN
    -- Update service metrics
    PERFORM update_service_performance_metrics();
    result_message := result_message || ' Services updated.';
    
    -- Update staff metrics  
    PERFORM update_staff_performance_metrics();
    result_message := result_message || ' Staff updated.';
    
    -- Generate reorder suggestions
    PERFORM generate_reorder_suggestions();
    result_message := result_message || ' Inventory suggestions generated.';
    
    RETURN result_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old data (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_data(days_to_keep INTEGER DEFAULT 365)
RETURNS TEXT AS $$
DECLARE
    deleted_count INTEGER;
    result_message TEXT := 'Cleanup completed:';
BEGIN
    -- Clean up old stock movements (keep last year)
    DELETE FROM stock_movements 
    WHERE movement_date < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result_message := result_message || ' ' || deleted_count || ' old stock movements removed.';
    
    -- Clean up old completed reorder suggestions
    DELETE FROM reorder_suggestions 
    WHERE status = 'ordered' 
      AND order_date < CURRENT_DATE - INTERVAL '1 day' * (days_to_keep / 2);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result_message := result_message || ' ' || deleted_count || ' old reorder suggestions removed.';
    
    -- Clean up old performance reviews (keep last 3 years)
    DELETE FROM staff_performance_reviews 
    WHERE review_date < CURRENT_DATE - INTERVAL '1 day' * (days_to_keep * 3);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result_message := result_message || ' ' || deleted_count || ' old performance reviews removed.';
    
    RETURN result_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. VERIFICATION QUERIES
-- =====================================================

-- Verify all tables are created and populated
SELECT 
    'DATABASE DEPLOYMENT VERIFICATION' as status,
    (SELECT COUNT(*) FROM customers) as customers_count,
    (SELECT COUNT(*) FROM staff WHERE is_active = true) as active_staff_count,
    (SELECT COUNT(*) FROM services WHERE active = true) as active_services_count,
    (SELECT COUNT(*) FROM inventory WHERE is_active = true) as inventory_items_count,
    (SELECT COUNT(*) FROM payments WHERE status = 'completed') as completed_payments_count;

-- Show table sizes and indexes
SELECT 
    schemaname,
    tablename,
    attname as column_name,
    n_distinct,
    correlation
FROM pg_stats 
WHERE schemaname = 'public' 
  AND tablename IN ('customers', 'staff', 'services', 'inventory', 'payments')
ORDER BY tablename, attname;

-- Show all indexes created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('customers', 'staff', 'services', 'inventory', 'payments')
ORDER BY tablename, indexname;

COMMENT ON DATABASE current_database() IS 'MYMYSQLUEMEXQLONUBESETIP9EDEFENXFR8RDAOTACOVDAECOER9RDAOT6FBAIA: Complete barbershop management system with customer relationships, staff scheduling, service catalog, inventory management, and financial tracking. Deployed: ' || CURRENT_TIMESTAMP;

-- Final success message
SELECT 
    '✅ 6FB AI Agent System Database Deployment Complete!' as message,
    'All schemas, indexes, RLS policies, and seed data have been successfully deployed.' as details,
    CURRENT_TIMESTAMP as deployed_at;
-- =====================================================
-- Migration 004 Verification Queries
-- =====================================================
-- Purpose: Verify that all indexes were created successfully
-- Usage: Run after deploying migration 004
-- =====================================================

-- =====================================================
-- 1. COUNT ALL INDEXES BY TABLE
-- =====================================================
SELECT
  tablename,
  COUNT(*) as index_count,
  array_agg(indexname ORDER BY indexname) as index_names
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
  AND tablename IN (
    'appointments',
    'customers',
    'products',
    'barber_customizations',
    'product_sales',
    'inventory_adjustments',
    'financial_arrangements',
    'services',
    'barbershop_staff',
    'profiles',
    'users'
  )
GROUP BY tablename
ORDER BY tablename;

-- Expected results:
-- appointments: 7-8 indexes
-- customers: 9 indexes
-- products: 7 indexes
-- barber_customizations: 5 indexes
-- product_sales: 6 indexes
-- inventory_adjustments: 4 indexes
-- financial_arrangements: 4 indexes
-- services: 3 indexes
-- barbershop_staff: 2 indexes
-- profiles: 3 indexes (if exists)
-- users: 2 indexes (if exists)

-- =====================================================
-- 2. VERIFY TOTAL INDEX COUNT
-- =====================================================
SELECT
  COUNT(*) as total_migration_indexes,
  'Expected: 50+' as expected_count
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
  AND tablename IN (
    'appointments', 'customers', 'products', 'barber_customizations',
    'product_sales', 'inventory_adjustments', 'financial_arrangements',
    'services', 'barbershop_staff', 'profiles', 'users'
  );

-- =====================================================
-- 3. CHECK INDEX VALIDITY (All should be valid)
-- =====================================================
SELECT
  schemaname,
  tablename,
  indexname,
  CASE
    WHEN indisvalid THEN 'VALID'
    ELSE 'INVALID - REBUILD REQUIRED'
  END as index_status
FROM pg_indexes
JOIN pg_class ON pg_indexes.indexname = pg_class.relname
JOIN pg_index ON pg_class.oid = pg_index.indexrelid
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
  AND tablename IN (
    'appointments', 'customers', 'products', 'barber_customizations',
    'product_sales', 'inventory_adjustments', 'financial_arrangements',
    'services', 'barbershop_staff', 'profiles', 'users'
  )
  AND NOT indisvalid;

-- Expected: 0 rows (all indexes should be valid)

-- =====================================================
-- 4. VERIFY SPECIFIC CRITICAL INDEXES
-- =====================================================
-- Check that most important indexes exist
SELECT
  'idx_appointments_shop_date_status' as critical_index,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_appointments_shop_date_status'
  ) THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 'idx_customers_name_search',
  CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customers_name_search')
  THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT 'idx_customers_email_search',
  CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customers_email_search')
  THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT 'idx_products_low_stock',
  CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_products_low_stock')
  THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT 'idx_barber_custom_slug',
  CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_barber_custom_slug')
  THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT 'idx_product_sales_unpaid_commission',
  CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_product_sales_unpaid_commission')
  THEN 'EXISTS' ELSE 'MISSING' END;

-- Expected: All should show 'EXISTS'

-- =====================================================
-- 5. CHECK INDEX SIZE (Storage impact)
-- =====================================================
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexrelname LIKE 'idx_%'
  AND tablename IN (
    'appointments', 'customers', 'products', 'barber_customizations',
    'product_sales', 'inventory_adjustments', 'financial_arrangements',
    'services', 'barbershop_staff', 'profiles', 'users'
  )
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

-- =====================================================
-- 6. PERFORMANCE TEST: Sample queries to verify speedup
-- =====================================================
-- Test 1: Date range query on appointments (should use idx_appointments_shop_date_status)
EXPLAIN ANALYZE
SELECT *
FROM appointments
WHERE barbershop_id = '00000000-0000-0000-0000-000000000001'
  AND scheduled_at >= NOW() - INTERVAL '30 days'
  AND status = 'CONFIRMED'
ORDER BY scheduled_at DESC
LIMIT 50;

-- Expected: "Index Scan using idx_appointments_shop_date_status"

-- Test 2: Customer name search (should use idx_customers_name_search)
EXPLAIN ANALYZE
SELECT *
FROM customers
WHERE barbershop_id = '00000000-0000-0000-0000-000000000001'
  AND deleted_at IS NULL
  AND LOWER(name) LIKE '%john%'
LIMIT 20;

-- Expected: "Index Scan using idx_customers_name_search"

-- Test 3: Low stock products (should use idx_products_low_stock)
EXPLAIN ANALYZE
SELECT *
FROM products
WHERE barbershop_id = '00000000-0000-0000-0000-000000000001'
  AND is_active = true
  AND current_stock <= min_stock_level
ORDER BY current_stock ASC;

-- Expected: "Index Scan using idx_products_low_stock"

-- =====================================================
-- 7. TABLE STATISTICS (Updated by ANALYZE command)
-- =====================================================
SELECT
  schemaname,
  tablename,
  last_analyze,
  last_autoanalyze,
  n_live_tup as live_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'appointments', 'customers', 'products', 'barber_customizations',
    'product_sales', 'inventory_adjustments', 'financial_arrangements',
    'services', 'barbershop_staff'
  )
ORDER BY tablename;

-- Expected: last_analyze should be recent (within last hour)

-- =====================================================
-- 8. COMPARE BEFORE/AFTER INDEX COUNT
-- =====================================================
-- This query helps track the change in index count
SELECT
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%') as current_index_count,
  'Check against backup state file' as note;

-- =====================================================
-- 9. CHECK FOR MISSING EXPECTED INDEXES
-- =====================================================
-- List all expected indexes from migration 004
WITH expected_indexes AS (
  SELECT unnest(ARRAY[
    'idx_appointments_shop_date_status',
    'idx_appointments_barber_date',
    'idx_appointments_date_only',
    'idx_appointments_service',
    'idx_appointments_client',
    'idx_appointments_active',
    'idx_appointments_status_date',
    'idx_customers_shop_active',
    'idx_customers_name_search',
    'idx_customers_email_search',
    'idx_customers_phone_search',
    'idx_customers_total_spent',
    'idx_customers_total_visits',
    'idx_customers_loyalty',
    'idx_customers_last_visit_date',
    'idx_customers_vip',
    'idx_products_shop_active',
    'idx_products_category',
    'idx_products_low_stock',
    'idx_products_sku',
    'idx_products_brand',
    'idx_products_retail_price',
    'idx_products_inventory_value',
    'idx_barber_custom_slug',
    'idx_barber_custom_approval',
    'idx_barber_custom_barber',
    'idx_barber_custom_pending',
    'idx_barber_custom_approved',
    'idx_product_sales_shop_date',
    'idx_product_sales_barber_date',
    'idx_product_sales_product',
    'idx_product_sales_payment',
    'idx_product_sales_unpaid_commission',
    'idx_product_sales_customer',
    'idx_inventory_adj_product_date',
    'idx_inventory_adj_shop_date',
    'idx_inventory_adj_type',
    'idx_inventory_adj_user',
    'idx_financial_arr_active',
    'idx_financial_arr_barber',
    'idx_financial_arr_type',
    'idx_financial_arr_dates',
    'idx_services_shop_active',
    'idx_services_price',
    'idx_services_duration',
    'idx_staff_shop_active',
    'idx_staff_user',
    'idx_profiles_role',
    'idx_profiles_name_search',
    'idx_profiles_email',
    'idx_users_email',
    'idx_users_role_active'
  ]) as expected_index_name
)
SELECT
  ei.expected_index_name,
  CASE
    WHEN pi.indexname IS NOT NULL THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
FROM expected_indexes ei
LEFT JOIN pg_indexes pi ON ei.expected_index_name = pi.indexname AND pi.schemaname = 'public'
WHERE pi.indexname IS NULL;

-- Expected: 0 rows (all indexes should exist)
-- Note: profiles and users indexes may be missing if tables don't exist (this is OK)

-- =====================================================
-- 10. SUMMARY REPORT
-- =====================================================
SELECT
  'Migration 004 Verification Summary' as report_section,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%') as total_indexes,
  (SELECT COUNT(DISTINCT tablename) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%') as tables_with_indexes,
  'Verification Complete' as status;

-- =====================================================
-- VERIFICATION NOTES
-- =====================================================
-- If any indexes are MISSING:
-- 1. Check migration execution logs
-- 2. Re-run migration (it's idempotent)
-- 3. Manually create missing indexes
--
-- If any indexes are INVALID:
-- 1. Rebuild with: REINDEX INDEX CONCURRENTLY index_name;
-- 2. Check for table corruption
--
-- If EXPLAIN ANALYZE doesn't use indexes:
-- 1. Run ANALYZE on tables
-- 2. Check query patterns match index columns
-- 3. Verify statistics are up to date
-- =====================================================

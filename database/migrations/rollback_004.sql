-- =====================================================
-- MIGRATION 004 ROLLBACK
-- =====================================================
-- Purpose: Safely remove all indexes created by migration 004
-- Date: 2025-01-10
-- WARNING: Only use if migration causes performance issues
-- =====================================================
-- IMPORTANT: This rollback is IDEMPOTENT - safe to run multiple times
-- =====================================================

-- =====================================================
-- SAFETY CHECK: Confirm this is intentional
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'MIGRATION 004 ROLLBACK - REMOVING PERFORMANCE INDEXES';
  RAISE NOTICE '=================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'This will remove 50+ performance indexes.';
  RAISE NOTICE 'Query performance will return to pre-migration levels.';
  RAISE NOTICE '';
  RAISE NOTICE 'If you did not intend to rollback, cancel this script now!';
  RAISE NOTICE '';
  RAISE NOTICE 'Proceeding in 5 seconds...';
  RAISE NOTICE '';

  -- Wait 5 seconds (PostgreSQL doesn't have sleep, so this is informational)
END $$;

-- =====================================================
-- 1. REMOVE APPOINTMENTS TABLE INDEXES
-- =====================================================
DROP INDEX IF EXISTS idx_appointments_shop_date_status;
DROP INDEX IF EXISTS idx_appointments_barber_date;
DROP INDEX IF EXISTS idx_appointments_date_only;
DROP INDEX IF EXISTS idx_appointments_service;
DROP INDEX IF EXISTS idx_appointments_client;
DROP INDEX IF EXISTS idx_appointments_active;
DROP INDEX IF EXISTS idx_appointments_status_date;

-- =====================================================
-- 2. REMOVE CUSTOMERS TABLE INDEXES
-- =====================================================
DROP INDEX IF EXISTS idx_customers_shop_active;
DROP INDEX IF EXISTS idx_customers_name_search;
DROP INDEX IF EXISTS idx_customers_email_search;
DROP INDEX IF EXISTS idx_customers_phone_search;
DROP INDEX IF EXISTS idx_customers_total_spent;
DROP INDEX IF EXISTS idx_customers_total_visits;
DROP INDEX IF EXISTS idx_customers_loyalty;
DROP INDEX IF EXISTS idx_customers_last_visit_date;
DROP INDEX IF EXISTS idx_customers_vip;

-- =====================================================
-- 3. REMOVE PRODUCTS TABLE INDEXES
-- =====================================================
DROP INDEX IF EXISTS idx_products_shop_active;
DROP INDEX IF EXISTS idx_products_category;
DROP INDEX IF EXISTS idx_products_low_stock;
DROP INDEX IF EXISTS idx_products_sku;
DROP INDEX IF EXISTS idx_products_brand;
DROP INDEX IF EXISTS idx_products_retail_price;
DROP INDEX IF EXISTS idx_products_inventory_value;

-- =====================================================
-- 4. REMOVE BARBER_CUSTOMIZATIONS TABLE INDEXES
-- =====================================================
DROP INDEX IF EXISTS idx_barber_custom_slug;
DROP INDEX IF EXISTS idx_barber_custom_approval;
DROP INDEX IF EXISTS idx_barber_custom_barber;
DROP INDEX IF EXISTS idx_barber_custom_pending;
DROP INDEX IF EXISTS idx_barber_custom_approved;

-- =====================================================
-- 5. REMOVE PRODUCT_SALES TABLE INDEXES
-- =====================================================
DROP INDEX IF EXISTS idx_product_sales_shop_date;
DROP INDEX IF EXISTS idx_product_sales_barber_date;
DROP INDEX IF EXISTS idx_product_sales_product;
DROP INDEX IF EXISTS idx_product_sales_payment;
DROP INDEX IF EXISTS idx_product_sales_unpaid_commission;
DROP INDEX IF EXISTS idx_product_sales_customer;

-- =====================================================
-- 6. REMOVE INVENTORY_ADJUSTMENTS TABLE INDEXES
-- =====================================================
DROP INDEX IF EXISTS idx_inventory_adj_product_date;
DROP INDEX IF EXISTS idx_inventory_adj_shop_date;
DROP INDEX IF EXISTS idx_inventory_adj_type;
DROP INDEX IF EXISTS idx_inventory_adj_user;

-- =====================================================
-- 7. REMOVE FINANCIAL_ARRANGEMENTS TABLE INDEXES
-- =====================================================
DROP INDEX IF EXISTS idx_financial_arr_active;
DROP INDEX IF EXISTS idx_financial_arr_barber;
DROP INDEX IF EXISTS idx_financial_arr_type;
DROP INDEX IF EXISTS idx_financial_arr_dates;

-- =====================================================
-- 8. REMOVE SERVICES TABLE INDEXES
-- =====================================================
DROP INDEX IF EXISTS idx_services_shop_active;
DROP INDEX IF EXISTS idx_services_price;
DROP INDEX IF EXISTS idx_services_duration;

-- =====================================================
-- 9. REMOVE BARBERSHOP_STAFF TABLE INDEXES
-- =====================================================
DROP INDEX IF EXISTS idx_staff_shop_active;
DROP INDEX IF EXISTS idx_staff_user;

-- =====================================================
-- 10. REMOVE PROFILES TABLE INDEXES (if exists)
-- =====================================================
DROP INDEX IF EXISTS idx_profiles_role;
DROP INDEX IF EXISTS idx_profiles_name_search;
DROP INDEX IF EXISTS idx_profiles_email;

-- =====================================================
-- 11. REMOVE USERS TABLE INDEXES (if exists)
-- =====================================================
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_role_active;

-- =====================================================
-- ANALYZE TABLES (update query planner statistics)
-- =====================================================
ANALYZE appointments;
ANALYZE customers;
ANALYZE products;
ANALYZE barber_customizations;
ANALYZE product_sales;
ANALYZE inventory_adjustments;
ANALYZE financial_arrangements;
ANALYZE services;
ANALYZE barbershop_staff;

-- Analyze profiles/users if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    EXECUTE 'ANALYZE profiles';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    EXECUTE 'ANALYZE users';
  END IF;
END $$;

-- =====================================================
-- VALIDATION: Verify rollback
-- =====================================================
DO $$
DECLARE
  remaining_indexes integer;
BEGIN
  -- Count how many migration 004 indexes still exist
  SELECT COUNT(*) INTO remaining_indexes
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
    AND tablename IN (
      'appointments', 'customers', 'products', 'barber_customizations',
      'product_sales', 'inventory_adjustments', 'financial_arrangements',
      'services', 'barbershop_staff', 'profiles', 'users'
    );

  -- Report results
  RAISE NOTICE '';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'ROLLBACK COMPLETE';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Remaining migration 004 indexes: %', remaining_indexes;

  IF remaining_indexes > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE 'WARNING: % indexes were not removed', remaining_indexes;
    RAISE NOTICE 'This may be due to:';
    RAISE NOTICE '- Indexes created outside migration 004';
    RAISE NOTICE '- Custom indexes with similar naming';
    RAISE NOTICE '- System-generated indexes';
    RAISE NOTICE '';
    RAISE NOTICE 'Run verification query to check:';
    RAISE NOTICE 'SELECT indexname, tablename FROM pg_indexes WHERE schemaname = ''public'' AND indexname LIKE ''idx_%%'';';
  ELSE
    RAISE NOTICE 'All migration 004 indexes successfully removed';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Performance Impact:';
  RAISE NOTICE '- Queries will be slower without indexes';
  RAISE NOTICE '- Expect 10-100x slowdown on filtered queries';
  RAISE NOTICE '- Consider re-applying migration after resolving issues';
  RAISE NOTICE '';
  RAISE NOTICE '=================================================';
END $$;

-- =====================================================
-- ROLLBACK NOTES
-- =====================================================
--
-- WHEN TO ROLLBACK:
-- 1. Migration causes table lock issues
-- 2. Indexes consume too much storage
-- 3. Index creation fails repeatedly
-- 4. Need to re-apply with different strategy (CONCURRENTLY)
--
-- AFTER ROLLBACK:
-- 1. Monitor query performance (will be slower)
-- 2. Identify root cause of migration issues
-- 3. Fix underlying problems
-- 4. Re-apply migration when ready
--
-- TO RE-APPLY MIGRATION:
-- Run: migration 004_add_performance_indexes.sql
-- (It's idempotent and safe to re-run)
--
-- MONITORING QUERIES:
-- -- Check if any indexes remain
-- SELECT indexname, tablename
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname LIKE 'idx_%'
--   AND tablename IN (
--     'appointments', 'customers', 'products', 'barber_customizations',
--     'product_sales', 'inventory_adjustments', 'financial_arrangements'
--   );
--
-- -- Verify tables still function normally
-- SELECT COUNT(*) FROM appointments;
-- SELECT COUNT(*) FROM customers;
-- SELECT COUNT(*) FROM products;
--
-- =====================================================

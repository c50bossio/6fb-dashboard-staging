-- =====================================================
-- Test Queries for Inventory Marketplace
-- =====================================================

-- 1. Check master products were created
SELECT sku, name, brand, wholesale_price, msrp 
FROM master_products 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Check warehouse inventory levels
SELECT 
  mp.sku,
  mp.name,
  wi.quantity_available,
  wi.reorder_point
FROM warehouse_inventory wi
JOIN master_products mp ON wi.master_product_id = mp.id
ORDER BY mp.sku;

-- 3. Check marketplace enrollments (will be empty initially)
SELECT 
  barbershop_id,
  enrollment_status,
  discount_tier,
  credit_limit,
  created_at
FROM marketplace_enrollment
ORDER BY created_at DESC;

-- 4. Check if any barbershop has local inventory (will be empty initially)
SELECT 
  barbershop_id,
  name,
  sku,
  quantity_on_hand,
  retail_price
FROM barbershop_inventory
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check for any orders (will be empty initially)
SELECT 
  order_number,
  barbershop_id,
  status,
  total_amount,
  created_at
FROM marketplace_orders
ORDER BY created_at DESC
LIMIT 10;

-- 6. Verify RLS policies are in place
SELECT 
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename IN (
  'master_products',
  'warehouse_inventory', 
  'barbershop_inventory',
  'marketplace_enrollment',
  'marketplace_orders'
)
ORDER BY tablename, policyname;
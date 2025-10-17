# Product Inventory Quick Reference Guide

Quick reference for working with the seeded product inventory data.

## Quick Stats

- **Total Products:** 90
- **Total Inventory Value:** $114,095.01
- **Locations:** 3 (Tomb45 Channelside, Tomb45 GasWorx, Elite Cuts LA)
- **Categories:** 5 (Hair Products, Grooming Tools, Retail, Beard Care, Styling)
- **Average Product Price:** $32.17
- **Cost-to-Retail Ratio:** 60-70% (realistic wholesale margins)

## Barbershop IDs

```javascript
const BARBERSHOPS = {
  TOMB45_CHANNELSIDE: 'c5a58548-8f23-426c-bedc-49a83d238724',
  TOMB45_GASWORX: '9306d931-7ab0-45b7-88d5-599678085526',
  ELITE_CUTS_LA: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
};
```

## Common Queries

### Get All Products for a Location

```sql
SELECT
  p.*,
  b.name as barbershop_name
FROM products p
JOIN barbershops b ON p.barbershop_id = b.id
WHERE p.barbershop_id = 'c5a58548-8f23-426c-bedc-49a83d238724'
ORDER BY p.category, p.name;
```

### Get Products by Category

```sql
SELECT * FROM products
WHERE category = 'GROOMING_TOOLS'
  AND is_active = true
ORDER BY retail_price DESC;
```

### Find Low Stock Products

```sql
SELECT
  p.name,
  p.current_stock,
  p.reorder_point,
  p.retail_price,
  b.name as barbershop
FROM products p
JOIN barbershops b ON p.barbershop_id = b.id
WHERE p.current_stock <= p.reorder_point
ORDER BY p.current_stock ASC;
```

### Calculate Total Inventory Value by Location

```sql
SELECT
  b.name as barbershop,
  COUNT(p.id) as product_count,
  SUM(p.current_stock * p.retail_price) as inventory_value,
  SUM(p.current_stock * p.cost_price) as cost_value,
  SUM(p.current_stock * (p.retail_price - p.cost_price)) as potential_profit
FROM products p
JOIN barbershops b ON p.barbershop_id = b.id
GROUP BY b.name
ORDER BY inventory_value DESC;
```

### Top Selling Products (by inventory value)

```sql
SELECT
  p.name,
  p.brand,
  p.retail_price,
  p.current_stock,
  (p.current_stock * p.retail_price) as inventory_value,
  p.commission_rate,
  b.name as barbershop
FROM products p
JOIN barbershops b ON p.barbershop_id = b.id
ORDER BY inventory_value DESC
LIMIT 20;
```

### Products by Commission Rate

```sql
SELECT
  category,
  AVG(commission_rate) as avg_commission,
  COUNT(*) as product_count,
  SUM(current_stock * retail_price) as inventory_value
FROM products
GROUP BY category
ORDER BY avg_commission DESC;
```

### Search Products by Name or Brand

```sql
SELECT
  p.name,
  p.brand,
  p.category,
  p.retail_price,
  p.current_stock,
  b.name as barbershop
FROM products p
JOIN barbershops b ON p.barbershop_id = b.id
WHERE p.name ILIKE '%beard%'
   OR p.brand ILIKE '%beard%'
ORDER BY p.retail_price ASC;
```

## Sample Product Data

### Sample High-End Products
- **Andis Master Cordless Clipper** - $189.99 (Grooming Tools, 10% commission)
- **Oster Classic 76 Clipper** - $169.99 (Grooming Tools, 10% commission)
- **Wahl Professional 5-Star Magic Clip** - $149.99 (Grooming Tools, 10% commission)
- **Professional Barber Scissors 6.5"** - $129.99 (Grooming Tools, 10% commission)

### Sample Mid-Range Products
- **Paul Mitchell Tea Tree Shampoo** - $24.99 (Hair Products, 15% commission)
- **Beard Growth Serum** - $29.99 (Beard Care, 20% commission)
- **Hanz de Fuko Claymation** - $24.99 (Styling, 15% commission)
- **Boar Bristle Beard Brush** - $24.99 (Beard Care, 20% commission)

### Sample Budget Products
- **Murray's Superior Pomade** - $8.99 (Hair Products, 15% commission)
- **Pinaud Clubman Aftershave** - $8.99 (Retail, 12% commission)
- **Volumizing Gel** - $7.99 (Hair Products, 15% commission)
- **Sea Salt Spray** - $8.99 (Hair Products, 15% commission)

## Category Breakdown

### HAIR_PRODUCTS (31.1%)
- **Commission:** 15%
- **Count:** 28 products
- **Avg Price:** $15.35
- **Examples:** Pomades, oils, shampoos, sprays, gels

### GROOMING_TOOLS (22.2%)
- **Commission:** 10%
- **Count:** 20 products
- **Avg Price:** $86.49
- **Examples:** Clippers, trimmers, scissors, combs, razors

### RETAIL (17.8%)
- **Commission:** 12%
- **Count:** 16 products
- **Avg Price:** $16.43
- **Examples:** Capes, neck strips, aftershave, towels, disinfectant

### BEARD_CARE (16.7%)
- **Commission:** 20% (Highest!)
- **Count:** 15 products
- **Avg Price:** $17.86
- **Examples:** Beard oils, balms, brushes, combs, shampoos

### STYLING (12.2%)
- **Commission:** 15%
- **Count:** 11 products
- **Avg Price:** $22.63
- **Examples:** Waxes, clays, texturizing powder, fiber thickener

## SKU Format

- **Format:** `{LOCATION}-{CATEGORY}-{NUMBER}`
- **Location Codes:**
  - `TC` = Tomb45 Channelside
  - `TG` = Tomb45 GasWorx
  - `EC` = Elite Cuts LA
- **Category Codes:**
  - `HAIR` = Hair Products
  - `BEARD` = Beard Care
  - `TOOL` = Grooming Tools
  - `STYLE` = Styling
  - `RETAIL` = Retail

**Examples:**
- `TC-HAIR-001` = Tomb45 Channelside, Hair Product #1
- `TG-TOOL-015` = Tomb45 GasWorx, Grooming Tool #15
- `EC-BEARD-008` = Elite Cuts LA, Beard Care Product #8

## Commission Calculations

### Calculate Commission on a Sale

```javascript
// Example: Selling Beard Growth Serum ($29.99, 20% commission)
const productPrice = 29.99;
const commissionRate = 20.0;
const barberCommission = productPrice * (commissionRate / 100);
// Result: $6.00 commission to barber

// With quantity
const quantity = 2;
const totalCommission = productPrice * quantity * (commissionRate / 100);
// Result: $12.00 commission to barber
```

### SQL: Calculate Total Commission for All Products

```sql
SELECT
  category,
  SUM(current_stock * retail_price * (commission_rate / 100)) as total_commission_pool,
  AVG(commission_rate) as avg_commission_rate
FROM products
GROUP BY category
ORDER BY total_commission_pool DESC;
```

## Stock Management

### Stock Level Tiers
- **High Sellers:** 50-100 units (reorder at 15)
- **Medium Sellers:** 20-50 units (reorder at 8)
- **Slow Sellers:** 5-20 units (reorder at 3)

### Reorder Alert Query

```sql
SELECT
  p.name,
  p.sku,
  p.current_stock,
  p.reorder_point,
  (p.reorder_point - p.current_stock) as units_below_threshold,
  b.name as barbershop
FROM products p
JOIN barbershops b ON p.barbershop_id = b.id
WHERE p.current_stock <= p.reorder_point
ORDER BY units_below_threshold DESC;
```

### Update Stock After Sale

```sql
-- Decrease stock after product sale
UPDATE products
SET
  current_stock = current_stock - 1,
  on_hand = on_hand - 1,
  updated_at = NOW()
WHERE id = 'product-id-here';
```

## Integration Examples

### JavaScript/TypeScript: Fetch Products for POS

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Get all active products for a barbershop
async function getShopProducts(barbershopId) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      barbershops (name, city, state)
    `)
    .eq('barbershop_id', barbershopId)
    .eq('is_active', true)
    .order('category')
    .order('name');

  if (error) throw error;
  return data;
}

// Search products by name
async function searchProducts(searchTerm, barbershopId) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .eq('is_active', true)
    .or(`name.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%`)
    .limit(20);

  if (error) throw error;
  return data;
}

// Get low stock products
async function getLowStockProducts(barbershopId) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .lte('current_stock', 'reorder_point')
    .order('current_stock', { ascending: true });

  if (error) throw error;
  return data;
}

// Calculate total inventory value
async function getInventoryValue(barbershopId) {
  const { data, error } = await supabase
    .from('products')
    .select('current_stock, retail_price, cost_price')
    .eq('barbershop_id', barbershopId);

  if (error) throw error;

  const totalRetailValue = data.reduce((sum, p) =>
    sum + (p.current_stock * p.retail_price), 0
  );

  const totalCostValue = data.reduce((sum, p) =>
    sum + (p.current_stock * p.cost_price), 0
  );

  return {
    retailValue: totalRetailValue,
    costValue: totalCostValue,
    potentialProfit: totalRetailValue - totalCostValue
  };
}
```

## Testing Scenarios

### POS Product Selection Test
1. Query products for Tomb45 Channelside
2. Filter by category (e.g., HAIR_PRODUCTS)
3. Search for "pomade"
4. Verify pricing and stock levels

### Commission Calculation Test
1. Add Beard Growth Serum to cart ($29.99)
2. Calculate commission: $29.99 × 20% = $6.00
3. Verify commission is credited to barber after sale

### Inventory Tracking Test
1. Initial stock: 50 units
2. Sell 1 unit
3. Verify stock decremented to 49
4. Verify low stock alert if below reorder point

### Low Stock Alert Test
1. Query products where current_stock <= reorder_point
2. Should return 0 products initially (all well-stocked)
3. After sales, verify alerts appear correctly

## Maintenance Commands

### Restock All Products

```sql
UPDATE products
SET
  current_stock = max_stock_level,
  on_hand = max_stock_level,
  updated_at = NOW()
WHERE current_stock <= reorder_point;
```

### Reset Test Data

```bash
# Delete and reseed all products
node database/seed-product-inventory.js --force
```

### Backup Product Data

```sql
-- Export to CSV
COPY (SELECT * FROM products)
TO '/tmp/products_backup.csv'
WITH CSV HEADER;
```

## Business Insights

### Best Products to Promote (High Commission)
1. **Beard Care** (20% commission) - Focus on beard oils and balms
2. **Hair Products** (15% commission) - Pomades and styling products
3. **Styling** (15% commission) - Clays and waxes

### Highest Margin Products
- Beard Growth Serum: $29.99 retail, 20% commission = $6.00 per sale
- Hanz de Fuko Claymation: $24.99 retail, 15% commission = $3.75 per sale
- Professional Scissors: $129.99 retail, 10% commission = $13.00 per sale

### Volume Products (Lower Price, Higher Volume)
- Murray's Pomade: $8.99, easy upsell
- Neck Strips: $12.99, consumable (repeat purchase)
- Aftershave: $8.99, post-service add-on

## Documentation

- **Full Summary:** `/database/PRODUCT_INVENTORY_SEEDING_SUMMARY.md`
- **Seeding Script:** `/database/seed-product-inventory.js`
- **Quick Reference:** `/database/PRODUCT_INVENTORY_QUICK_REFERENCE.md` (this file)

## Support

If you encounter issues:
1. Check product data: `SELECT COUNT(*) FROM products;` (should return 90)
2. Verify barbershop links: `SELECT DISTINCT barbershop_id FROM products;`
3. Check stock levels: `SELECT MIN(current_stock) FROM products;` (should be >= 0)
4. Reseed if needed: `node database/seed-product-inventory.js --force`

---

**Last Updated:** October 11, 2025
**Total Products:** 90
**Database Table:** `products`
**Status:** ✅ Production Ready

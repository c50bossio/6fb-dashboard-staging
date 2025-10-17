# Data Consolidation Roadmap - Single Source of Truth

## Executive Summary

The 6FB AI Agent System currently has **fragmented product/inventory data** across multiple database tables and API endpoints. While immediate fixes have been implemented to make the system functional, a comprehensive consolidation effort is needed to establish a true "single source of truth" architecture.

**Status**: ✅ Immediate fixes complete | ⚠️ Long-term consolidation pending

## Current State: Data Fragmentation

### Identified Tables

| Table Name | Status | Used By | Record Count | Data Quality |
|------------|--------|---------|--------------|--------------|
| `inventory` | ❌ Does not exist | InventoryPanel (OLD) | 0 | N/A - Caused $NaN errors |
| `barbershop_inventory` | ✅ Active | Inventory APIs | Unknown | Good - Has cost_price, stock data |
| `products` | ✅ Active | Shop & POS systems | Unknown | Good - Has retail_price, stock data |

### Current API Landscape

| API Endpoint | Database Table | Components Using It |
|--------------|----------------|---------------------|
| `/api/inventory/products` | `barbershop_inventory` | InventoryPanel (FIXED), LocalInventoryManager |
| `/api/shop/products` | `products` | Shop products page, Dashboard |
| `/api/pos/products` | `products` | POS system |

### Data Flow Diagram (Current State)

```
┌────────────────────────────────────────────────────────┐
│                   Supabase Database                    │
│                                                        │
│  ┌─────────────────────┐    ┌──────────────────────┐ │
│  │ barbershop_inventory│    │     products         │ │
│  │ (Inventory data)    │    │  (Product catalog)   │ │
│  │                     │    │                      │ │
│  │ • product_name      │    │ • name               │ │
│  │ • cost_price        │    │ • retail_price       │ │
│  │ • quantity_on_hand  │    │ • cost_price         │ │
│  │ • reorder_point     │    │ • current_stock      │ │
│  └─────────────────────┘    └──────────────────────┘ │
│           ▲                           ▲               │
└───────────┼───────────────────────────┼───────────────┘
            │                           │
            │                           │
    ┌───────┴────────┐          ┌──────┴──────────┐
    │ /api/inventory/│          │ /api/shop/      │
    │   products     │          │   products      │
    └───────┬────────┘          │ /api/pos/       │
            │                   │   products      │
            │                   └──────┬──────────┘
            │                          │
    ┌───────┴────────┐          ┌──────┴──────────┐
    │ InventoryPanel │          │ Shop Products   │
    │ LocalInventory │          │ POS System      │
    │ Manager        │          │                 │
    └────────────────┘          └─────────────────┘

    ❌ PROBLEM: Different components see different data!
```

## Immediate Fixes Completed (October 17, 2025)

### Fix #1: POS Products Endpoint
**File**: `/app/api/pos/products/route.js` (CREATED)

**Problem**: POS system called non-existent endpoint
**Solution**: Created endpoint that queries `products` table
**Status**: ✅ Complete

### Fix #2: InventoryPanel Component
**File**: `/components/dashboard/InventoryPanel.js` (MODIFIED)

**Problem**: Direct query to non-existent `inventory` table caused "$NaN" errors
**Solution**: Changed to API call to `/api/inventory/products`
**Status**: ✅ Complete

## Proposed Solution: Single Source of Truth

### Phase 1: Data Analysis & Decision (1-2 hours)

**Goal**: Choose the canonical product/inventory table

**Tasks**:
1. **Query both tables** to understand data overlap
   ```sql
   -- Compare record counts
   SELECT COUNT(*) FROM barbershop_inventory;
   SELECT COUNT(*) FROM products;

   -- Check for duplicate products
   SELECT bi.product_name, p.name
   FROM barbershop_inventory bi
   FULL OUTER JOIN products p ON bi.product_name = p.name;
   ```

2. **Analyze schema differences**:
   - Which table has more complete data?
   - Which table has better foreign key relationships?
   - Which table aligns with business requirements?

3. **Review application dependencies**:
   - Which APIs depend on each table?
   - Which components would be affected by changes?
   - What's the migration risk assessment?

4. **Make decision**:
   - **Option A**: Use `products` table as single source
     - Pros: Used by POS and shop systems already
     - Cons: Need to migrate inventory-specific fields

   - **Option B**: Use `barbershop_inventory` table as single source
     - Pros: More inventory-specific fields
     - Cons: Need to update shop and POS systems

   - **Option C**: Create new unified table
     - Pros: Clean slate with optimal schema
     - Cons: Requires migrating both tables

**Deliverable**: Decision document with chosen approach

### Phase 2: Schema Design (2-3 hours)

**Goal**: Design the unified product/inventory schema

**Recommended Schema** (if choosing `products` table):

```sql
CREATE TABLE IF NOT EXISTS products (
  -- Core identification
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,

  -- Product information
  name VARCHAR(255) NOT NULL,
  description TEXT,
  brand VARCHAR(100),
  category VARCHAR(50),

  -- SKU and barcodes
  sku VARCHAR(100) UNIQUE,
  barcode VARCHAR(100),
  upc VARCHAR(50),

  -- Pricing (combining both schemas)
  retail_price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2),
  wholesale_price DECIMAL(10,2),

  -- Inventory management (from barbershop_inventory)
  current_stock INTEGER DEFAULT 0,
  quantity_on_hand INTEGER DEFAULT 0,  -- Physical count
  quantity_available INTEGER DEFAULT 0, -- Available for sale
  quantity_reserved INTEGER DEFAULT 0,  -- Reserved/pending
  min_stock_level INTEGER DEFAULT 10,
  reorder_point INTEGER DEFAULT 5,
  max_stock_level INTEGER DEFAULT 100,

  -- Commission and tax
  commission_rate DECIMAL(5,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  is_taxable BOOLEAN DEFAULT true,

  -- Product status
  is_active BOOLEAN DEFAULT true,
  is_available_for_purchase BOOLEAN DEFAULT true,

  -- Media
  image_url TEXT,
  images JSONB DEFAULT '[]',

  -- Metadata
  supplier_id UUID REFERENCES suppliers(id),
  last_restocked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Indexes for performance
  INDEX idx_products_barbershop (barbershop_id),
  INDEX idx_products_sku (sku),
  INDEX idx_products_barcode (barcode),
  INDEX idx_products_category (category)
);
```

**Tasks**:
1. Draft unified schema
2. Map fields from both existing tables
3. Plan data transformation rules
4. Design migration strategy
5. Create rollback plan

**Deliverable**: SQL migration script with rollback

### Phase 3: API Consolidation (3-4 hours)

**Goal**: Update all APIs to use single source of truth

**API Endpoints to Update**:

1. **`/api/inventory/products/route.js`**
   - Currently queries: `barbershop_inventory`
   - Change to: Unified `products` table
   - Field mapping updates required

2. **`/api/shop/products/route.js`**
   - Currently queries: `products` table
   - Status: ✅ Already correct (if using products as source)
   - May need field additions

3. **`/api/pos/products/route.js`**
   - Currently queries: `products` table
   - Status: ✅ Already correct (if using products as source)
   - Verify all required fields present

**Implementation Pattern**:

```javascript
// Before (barbershop_inventory query)
const { data, error } = await supabase
  .from('barbershop_inventory')
  .select('product_name, cost_price, quantity_on_hand')

// After (unified products query)
const { data, error } = await supabase
  .from('products')
  .select('name, cost_price, current_stock, quantity_on_hand')
```

**Tasks**:
1. Update each API endpoint
2. Add data transformation layers
3. Update response formats
4. Add deprecation warnings
5. Update API documentation

**Deliverable**: Updated API endpoints with tests

### Phase 4: Component Updates (2-3 hours)

**Goal**: Update all React components to use standardized data format

**Components to Update**:

1. **`InventoryPanel.js`**
   - Status: ✅ Already uses API (recently fixed)
   - Action: Verify field mappings after API changes

2. **`LocalInventoryManager.js`**
   - Status: ✅ Already uses API
   - Action: Verify field mappings after API changes

3. **`POSInterface.tsx`**
   - Status: ✅ Already uses API
   - Action: Test after API updates

4. **Shop Products Page**
   - Location: `/app/(protected)/shop/products/page.js`
   - Status: Uses `/api/shop/products`
   - Action: Verify no breaking changes

**Testing Checklist**:
```bash
# Test each view for data consistency
- [ ] Main dashboard inventory panel (/dashboard?mode=inventory)
- [ ] Dedicated inventory page (/dashboard/inventory)
- [ ] Shop products page (/shop/products)
- [ ] POS system (/pos)
- [ ] Product search functionality
- [ ] Stock level updates
- [ ] Price calculations
```

**Deliverable**: Tested and verified components

### Phase 5: Data Migration (2-3 hours)

**Goal**: Migrate data from old tables to unified table

**Migration Steps**:

1. **Backup current data**:
   ```sql
   -- Create backup tables
   CREATE TABLE barbershop_inventory_backup AS SELECT * FROM barbershop_inventory;
   CREATE TABLE products_backup AS SELECT * FROM products;
   ```

2. **Merge data into unified table**:
   ```sql
   -- If using products as base, add barbershop_inventory data
   UPDATE products p
   SET
     quantity_on_hand = bi.quantity_on_hand,
     quantity_available = bi.quantity_available,
     reorder_point = bi.reorder_point,
     max_stock_level = bi.max_stock_level
   FROM barbershop_inventory bi
   WHERE p.name = bi.product_name
     AND p.barbershop_id = bi.barbershop_id;
   ```

3. **Handle orphaned records**:
   - Products in `barbershop_inventory` but not in `products`
   - Products in `products` but not in `barbershop_inventory`

4. **Verify data integrity**:
   ```sql
   -- Check for missing data
   SELECT COUNT(*) FROM products WHERE cost_price IS NULL;
   SELECT COUNT(*) FROM products WHERE current_stock IS NULL;
   ```

5. **Drop old tables** (after verification):
   ```sql
   -- ONLY after thorough testing
   DROP TABLE barbershop_inventory;
   -- Keep inventory table reference removed since it never existed
   ```

**Deliverable**: Migrated data with verification report

### Phase 6: Testing & Validation (2-3 hours)

**Goal**: Comprehensive testing of consolidated system

**Test Scenarios**:

1. **Data Consistency**:
   - [ ] All products visible in all views
   - [ ] Prices match across dashboard, shop, and POS
   - [ ] Stock levels synchronized

2. **CRUD Operations**:
   - [ ] Create product in dashboard → Appears in POS
   - [ ] Update stock in POS → Reflects in dashboard
   - [ ] Delete product → Removes from all views

3. **Multi-Shop Isolation**:
   - [ ] Shop A cannot see Shop B's products
   - [ ] barbershop_id filtering works correctly

4. **Performance**:
   - [ ] Page load times acceptable (<2s)
   - [ ] API response times acceptable (<500ms)
   - [ ] No N+1 query issues

5. **Edge Cases**:
   - [ ] Empty inventory displays correctly
   - [ ] Zero stock products handled
   - [ ] Null prices handled gracefully

**Deliverable**: Test report with pass/fail results

### Phase 7: Documentation & Cleanup (1-2 hours)

**Goal**: Document the new architecture and clean up

**Tasks**:

1. **Update Documentation**:
   - Update `/docs/SCHEMA_STANDARDS.md`
   - Update `/docs/API_REFERENCE.md`
   - Update component documentation
   - Create data model diagram

2. **Code Cleanup**:
   - Remove old commented code
   - Remove temporary fixes
   - Update inline comments
   - Clean up migration scripts

3. **Team Communication**:
   - Update team on new data model
   - Document breaking changes
   - Provide migration guide for future features

**Deliverable**: Updated documentation and clean codebase

## Implementation Timeline

| Phase | Estimated Time | Can Start | Priority |
|-------|----------------|-----------|----------|
| Phase 1: Analysis | 1-2 hours | Immediately | High |
| Phase 2: Schema Design | 2-3 hours | After Phase 1 | High |
| Phase 3: API Updates | 3-4 hours | After Phase 2 | High |
| Phase 4: Component Updates | 2-3 hours | After Phase 3 | Medium |
| Phase 5: Data Migration | 2-3 hours | After Phase 4 | Medium |
| Phase 6: Testing | 2-3 hours | After Phase 5 | High |
| Phase 7: Documentation | 1-2 hours | After Phase 6 | Medium |

**Total Estimated Time**: 14-20 hours

**Recommended Approach**: Spread over 2-3 work sessions to allow for testing and validation between phases.

## Risk Assessment

### High Risk Items:
- ❌ Data loss during migration
- ❌ Breaking existing functionality
- ❌ Production downtime

### Mitigation Strategies:
- ✅ Comprehensive backups before migration
- ✅ Rollback plan for each phase
- ✅ Feature flags to enable/disable new code
- ✅ Staging environment testing before production
- ✅ Gradual rollout with monitoring

## Success Metrics

After consolidation is complete, we should achieve:

1. **Single Source of Truth**: ✅ One table for all product/inventory data
2. **Data Consistency**: ✅ Same data visible across all views
3. **Simplified Maintenance**: ✅ Updates in one place propagate everywhere
4. **Better Performance**: ✅ Fewer joins, simpler queries
5. **Clear Documentation**: ✅ Well-documented data model

## Current Status

### Completed:
- ✅ POS products endpoint created
- ✅ InventoryPanel fixed to use API
- ✅ Immediate functionality restored

### In Progress:
- 🔄 Documentation (this document)

### Not Started:
- ⏳ Data analysis and decision
- ⏳ Schema design
- ⏳ API consolidation
- ⏳ Data migration

## Next Steps

**For Next Session**:

1. **Start with Phase 1**: Run database queries to analyze data overlap
2. **Make Decision**: Choose `products` vs `barbershop_inventory` vs new table
3. **Begin Schema Design**: Draft unified schema
4. **Review with Team**: Get approval before proceeding with migration

**Recommended Command**:
```bash
# To begin Phase 1, run:
node scripts/analyze-product-data.js
```

## Related Documentation

- **Immediate Fix**: `/INVENTORY_PANEL_FIX_SUMMARY.md`
- **POS Fix**: `/POS_PRODUCTS_FIX_COMPLETE.md`
- **Visual Guide**: `/POS_FIX_VISUAL_GUIDE.md`
- **Schema Standards**: `/docs/SCHEMA_STANDARDS.md`
- **Staff Architecture**: `/docs/STAFF_ID_ARCHITECTURE.md`

---

**Questions or Concerns?**

This is a significant refactoring effort. If you have questions about:
- Implementation approach
- Risk mitigation
- Timeline estimates
- Technical decisions

Please reach out before beginning Phase 1 to ensure alignment.

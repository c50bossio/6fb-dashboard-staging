# shop_id to barbershop_id Migration Analysis Report

**Generated**: October 10, 2025
**Analysis Tool**: analyze-shop-id-tables.js
**Database**: Supabase Production

---

## Executive Summary

This report documents the comprehensive analysis of all database tables containing `shop_id` columns, identifying data migration requirements and risks associated with the incomplete 2025 schema migration.

### Critical Findings

✅ **barbershop_id is the active standard** - 100+ tables use it exclusively
❌ **shop_id is deprecated** - Only 11 tables have it, mostly legacy
🚨 **Data loss risk** - Customers table has ZERO rows with shop_id but 52 with barbershop_id
⚠️ **Mixed state** - 5 tables have BOTH columns with inconsistent data

---

## Detailed Table Analysis

### 🔴 CRITICAL - Tables Requiring Immediate Migration

#### 1. `profiles` Table
**Status**: HAS BOTH shop_id AND barbershop_id (DUPLICATE COLUMNS)
**Impact**: HIGH - Affects ALL user queries and shop assignments

| Metric | Count |
|--------|-------|
| Total rows | 34 |
| Rows with `shop_id` | 4 |
| Rows with `barbershop_id` | 6 |
| Rows with NEITHER | 24 |

**Data Risk**:
- Users with only `shop_id` set will fail queries that use `barbershop_id`
- 24 users have no shop assignment at all (clients or incomplete profiles)
- Code using `shop_id` fallback will get wrong shop ID for 6 users

**Migration Action**:
```sql
-- Migrate shop_id data to barbershop_id where barbershop_id is NULL
UPDATE profiles
SET barbershop_id = shop_id
WHERE barbershop_id IS NULL
  AND shop_id IS NOT NULL;
```

**Priority**: ⚠️ **URGENT** - Affects calendar, booking, and all shop-scoped queries

---

#### 2. `services` Table
**Status**: HAS BOTH shop_id AND barbershop_id (DUPLICATE COLUMNS)
**Impact**: HIGH - Affects booking system and service selection

| Metric | Count |
|--------|-------|
| Total rows | 17 |
| Rows with `shop_id` | 3 |
| Rows with `barbershop_id` | 17 |

**Data Risk**:
- **ALL services have barbershop_id** (100% coverage)
- Only 3 services have shop_id (18% - outdated)
- Queries using shop_id will miss 14 services (82% data loss!)

**Migration Action**:
```sql
-- Already complete - all services have barbershop_id
-- Only need to verify and drop shop_id column

-- Verification:
SELECT COUNT(*) FROM services WHERE barbershop_id IS NULL;
-- Expected: 0

-- Safe to drop:
ALTER TABLE services DROP COLUMN shop_id;
```

**Priority**: ⚠️ **HIGH** - Safe to drop shop_id after verification

---

#### 3. `customers` Table
**Status**: HAS BOTH shop_id AND barbershop_id (DUPLICATE COLUMNS)
**Impact**: CRITICAL - Affects appointments and customer management

| Metric | Count |
|--------|-------|
| Total rows | 55 |
| Rows with `shop_id` | 0 |
| Rows with `barbershop_id` | 52 |

**Data Risk**:
- **ZERO customers have shop_id** (0% coverage)
- 52 customers have barbershop_id (95% coverage)
- **100% data loss if querying shop_id**
- 3 customers have neither (orphaned records)

**Migration Action**:
```sql
-- No data to migrate - shop_id is completely empty
-- Clean up orphaned records

-- Find orphaned customers:
SELECT id, name, email, created_at
FROM customers
WHERE barbershop_id IS NULL;

-- Safe to drop shop_id:
ALTER TABLE customers DROP COLUMN shop_id;
```

**Priority**: 🚨 **CRITICAL** - This is the smoking gun proving shop_id is obsolete

---

### 🟡 MIXED STATUS - Tables with Both Columns

#### 4. `appointment_records` Table
**Status**: HAS BOTH shop_id AND barbershop_id (DUPLICATE COLUMNS)
**Impact**: LOW - Archive/audit table with no active data

| Metric | Count |
|--------|-------|
| Total rows | 0 |

**Action**: Monitor - no immediate action required (table is empty)

---

#### 5. `customers_backup` Table
**Status**: HAS BOTH shop_id AND barbershop_id (DUPLICATE COLUMNS)
**Impact**: LOW - Backup table

| Metric | Count |
|--------|-------|
| Total rows | 101 |
| Rows with `shop_id` | 101 |
| Rows with `barbershop_id` | 70 |

**Analysis**:
- This is a backup table with historical data
- 101 rows have shop_id (pre-migration backup)
- 70 rows have barbershop_id (partial migration)
- 31 rows have only shop_id (old customer records)

**Action**:
- Keep as-is for historical reference
- Do not use for active queries
- Low priority for cleanup

---

### 📜 LEGACY TABLES - Only shop_id Column

#### 6. `barbers` Table
**Status**: Legacy table with ONLY shop_id
**Impact**: MEDIUM - Should use `profiles` + `barbershop_staff` instead

| Metric | Count |
|--------|-------|
| Total rows | 8 |
| Rows with `shop_id` | 8 |

**Recommendation**: Migrate barbers to `profiles` table and create `barbershop_staff` records

---

#### 7. `production_barbers` Table
**Status**: Legacy table with ONLY shop_id
**Impact**: MEDIUM - Duplicate of barbers table

| Metric | Count |
|--------|-------|
| Total rows | 4 |
| Rows with `shop_id` | 4 |

**Recommendation**: Migrate to `profiles` + `barbershop_staff`, then drop table

---

#### 8. `inventory` Table
**Status**: Legacy table with ONLY shop_id
**Impact**: LOW - Should use `barbershop_inventory`

| Metric | Count |
|--------|-------|
| Total rows | 3 |
| Rows with `shop_id` | 0 |

**Recommendation**: Empty legacy table - safe to drop after verification

---

#### 9. `invoice_history` Table
**Status**: Archive table with ONLY shop_id
**Impact**: LOW - Historical invoices

| Metric | Count |
|--------|-------|
| Total rows | 0 |

**Action**: Keep for historical purposes, no active use

---

#### 10. `payout_history` Table
**Status**: Archive table with ONLY shop_id
**Impact**: LOW - Historical payouts

| Metric | Count |
|--------|-------|
| Total rows | 0 |

**Action**: Keep for historical purposes, no active use

---

#### 11. `user_shop_access_history` Table
**Status**: Audit table with ONLY shop_id
**Impact**: LOW - Access audit trail

| Metric | Count |
|--------|-------|
| Total rows | 2 |
| Rows with `shop_id` | 2 |

**Recommendation**: Shop_id is acceptable for audit tables - no migration needed

---

## Data Migration Plan

### Phase 1: Data Migration (URGENT)

**Priority 1: profiles Table**
```sql
-- Migrate shop_id → barbershop_id where needed
UPDATE profiles
SET barbershop_id = shop_id
WHERE barbershop_id IS NULL
  AND shop_id IS NOT NULL;

-- Verify migration
SELECT
  COUNT(*) as total,
  COUNT(shop_id) as has_shop_id,
  COUNT(barbershop_id) as has_barbershop_id
FROM profiles
WHERE role IN ('BARBER', 'SHOP_OWNER', 'ENTERPRISE_OWNER');
```

**Priority 2: Verify services (Already Complete)**
```sql
-- Verify all services have barbershop_id
SELECT COUNT(*) FROM services WHERE barbershop_id IS NULL;
-- Expected: 0

-- Services migration is complete - 100% have barbershop_id
```

**Priority 3: Clean up customers**
```sql
-- Identify orphaned customers (no barbershop_id)
SELECT id, name, email, phone FROM customers WHERE barbershop_id IS NULL;

-- Either assign to barbershop or delete (business decision)
```

### Phase 2: Code Updates

**Search for shop_id References**
```bash
# Find all files referencing shop_id
grep -r "shop_id" app/ components/ lib/ | grep -v "node_modules" > shop_id_references.txt

# Find dangerous fallback patterns
grep -r "shop_id || barbershop_id" app/ components/ lib/

# Count occurrences
wc -l shop_id_references.txt
```

**Update Patterns**:
1. Change `profile.shop_id` → `profile.barbershop_id`
2. Change `.eq('shop_id', id)` → `.eq('barbershop_id', id)`
3. Remove `shop_id || barbershop_id` fallbacks
4. Update component props from `shopId` to `barbershopId`

### Phase 3: Schema Cleanup

**Drop shop_id Columns** (After code updates verified):
```sql
-- Drop from critical tables (after verification)
ALTER TABLE profiles DROP COLUMN IF EXISTS shop_id;
ALTER TABLE services DROP COLUMN IF EXISTS shop_id;
ALTER TABLE customers DROP COLUMN IF EXISTS shop_id;
ALTER TABLE appointment_records DROP COLUMN IF EXISTS shop_id;

-- Keep shop_id in archive/audit tables
-- (invoice_history, payout_history, user_shop_access_history)
```

**Drop Legacy Tables**:
```sql
-- After migrating barbers to profiles + barbershop_staff
DROP TABLE IF EXISTS barbers CASCADE;
DROP TABLE IF EXISTS production_barbers CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;

-- Keep customers_backup for reference
-- Keep history tables for audit trail
```

### Phase 4: Testing & Validation

**Test Checklist**:
- [ ] Calendar page loads appointments
- [ ] Services dropdown populates correctly
- [ ] Customer list shows all customers
- [ ] Barber selection works
- [ ] Shop switching functions correctly
- [ ] Multi-tenant isolation maintained
- [ ] No "empty data" errors in console

**Validation Queries**:
```sql
-- Verify all active profiles have barbershop_id
SELECT COUNT(*) FROM profiles
WHERE barbershop_id IS NULL
AND role IN ('BARBER', 'SHOP_OWNER');
-- Expected: 0

-- Verify all services have barbershop_id
SELECT COUNT(*) FROM services WHERE barbershop_id IS NULL;
-- Expected: 0

-- Verify all customers have barbershop_id
SELECT COUNT(*) FROM customers WHERE barbershop_id IS NULL;
-- Expected: 0 or very few (orphaned records)
```

---

## Risk Assessment

### High Risk Items

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Data loss from querying shop_id | HIGH | HIGH | Already happening - fix immediately |
| Calendar shows no appointments | HIGH | HIGH | Already occurred - fixed in calendar page |
| Services not loading | HIGH | MEDIUM | Code still has fallbacks preventing total failure |
| Customer data inaccessible | HIGH | MEDIUM | customers table has 0 shop_id rows |

### Low Risk Items

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Legacy table data loss | LOW | LOW | Not actively used |
| Historical data corruption | LOW | LOW | Archive tables preserved |
| Audit trail gaps | LOW | LOW | shop_id acceptable in audit tables |

---

## Recommendations

### Immediate Actions (This Week)

1. ✅ **Document the standard** - SCHEMA_STANDARDS.md created
2. ✅ **Update CLAUDE.md** - Critical warning added
3. ✅ **Update TROUBLESHOOTING.md** - Diagnosis section added
4. 🔄 **Analyze all tables** - THIS REPORT
5. ⏳ **Create migration SQL** - Next task
6. ⏳ **Execute migration** - Profiles table priority

### Short-Term Actions (This Month)

1. Migrate profiles.shop_id → profiles.barbershop_id
2. Remove all `shop_id || barbershop_id` fallback patterns
3. Update API routes to use barbershop_id exclusively
4. Drop shop_id columns from critical tables
5. Test calendar, booking, and services thoroughly

### Long-Term Actions (Next Quarter)

1. Migrate legacy barbers → profiles + barbershop_staff
2. Drop legacy tables (barbers, production_barbers, inventory)
3. Archive customers_backup to cold storage
4. Update all documentation
5. Create automated tests for schema compliance

---

## Success Criteria

Migration is complete when:

- [ ] All profiles have barbershop_id (where applicable)
- [ ] All services have barbershop_id
- [ ] All customers have barbershop_id
- [ ] Zero code references to shop_id
- [ ] shop_id columns dropped from active tables
- [ ] Calendar loads all appointments
- [ ] Services populate correctly
- [ ] No "empty data" console errors
- [ ] All tests passing

---

## Appendix A: Full Table List with shop_id

| Table Name | Total Rows | shop_id Count | barbershop_id Count | Status |
|------------|-----------|---------------|---------------------|--------|
| appointment_records | 0 | 0 | 0 | Empty |
| barbers | 8 | 8 | 0 | Legacy |
| customers | 55 | 0 | 52 | **Critical** |
| customers_backup | 101 | 101 | 70 | Archive |
| inventory | 3 | 0 | 0 | Legacy |
| invoice_history | 0 | 0 | N/A | Archive |
| payout_history | 0 | 0 | N/A | Archive |
| production_barbers | 4 | 4 | 0 | Legacy |
| profiles | 34 | 4 | 6 | **Critical** |
| services | 17 | 3 | 17 | **Critical** |
| user_shop_access_history | 2 | 2 | N/A | Audit |

---

## Appendix B: SQL Verification Script

```sql
-- Run this to verify migration status
DO $$
DECLARE
    profiles_missing INT;
    services_missing INT;
    customers_missing INT;
BEGIN
    -- Check profiles
    SELECT COUNT(*) INTO profiles_missing
    FROM profiles
    WHERE barbershop_id IS NULL
      AND role IN ('BARBER', 'SHOP_OWNER', 'ENTERPRISE_OWNER');

    -- Check services
    SELECT COUNT(*) INTO services_missing
    FROM services
    WHERE barbershop_id IS NULL;

    -- Check customers
    SELECT COUNT(*) INTO customers_missing
    FROM customers
    WHERE barbershop_id IS NULL;

    -- Report
    RAISE NOTICE 'Migration Status Report:';
    RAISE NOTICE 'Profiles missing barbershop_id: %', profiles_missing;
    RAISE NOTICE 'Services missing barbershop_id: %', services_missing;
    RAISE NOTICE 'Customers missing barbershop_id: %', customers_missing;

    IF profiles_missing = 0 AND services_missing = 0 THEN
        RAISE NOTICE '✅ Migration COMPLETE - Safe to drop shop_id columns';
    ELSE
        RAISE NOTICE '⚠️ Migration INCOMPLETE - Do not drop shop_id columns yet';
    END IF;
END $$;
```

---

**Report Status**: COMPLETE
**Next Action**: Create data migration SQL script (Phase 1, Task 5)
**Document Owner**: Backend Team
**Last Updated**: October 10, 2025

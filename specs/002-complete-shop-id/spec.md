# Feature Specification: Complete shop_id → barbershop_id Cleanup Migration

**Feature Number**: 002
**Branch**: `002-complete-shop-id`
**Priority**: 🔴 **CRITICAL** - Blocking production deployment
**Status**: In Progress
**Created**: October 11, 2025

---

## 📋 Executive Summary

Complete the `shop_id → barbershop_id` schema migration to resolve critical data loss bugs and schema inconsistencies across the 6FB AI Agent System database.

**Problem**: An incomplete 2025 migration left duplicate `shop_id` and `barbershop_id` columns in 11 tables, causing:
- Empty calendar views (queried wrong column)
- Missing services/customers in dropdowns
- Developer confusion about which field to use
- Hours of debugging and lost data

**Solution**: Three-phase cleanup:
1. **Phase 1**: SQL data migration (profiles.shop_id → profiles.barbershop_id)
2. **Phase 2**: Code cleanup (remove all shop_id references)
3. **Phase 3**: Schema cleanup (drop shop_id columns)

---

## 🎯 Success Criteria

### Must Have (P0)
- [ ] SQL migration committed and verified (profiles table complete)
- [ ] All code references to `shop_id` replaced with `barbershop_id`
- [ ] Calendar displays appointments correctly (zero query errors)
- [ ] Services/customers dropdowns show all data
- [ ] Zero foreign key constraint violations
- [ ] All E2E tests passing

### Should Have (P1)
- [ ] shop_id columns dropped from all 11 affected tables
- [ ] Database backup created before migration
- [ ] Rollback procedure documented and tested
- [ ] SCHEMA_STANDARDS.md updated

### Nice to Have (P2)
- [ ] Performance comparison (before/after migration)
- [ ] Monitoring dashboard for barbershop_id usage
- [ ] Automated schema validation CI check

---

## 📊 Database Schema Analysis

### Tables Affected

#### **1. Tables with BOTH shop_id AND barbershop_id** (Cleanup Required)

| Table | shop_id Rows | barbershop_id Rows | Status | Priority |
|-------|--------------|--------------------|---------| ---------|
| `profiles` | 4 rows | 52 rows | ⚠️ **Needs Migration** | **P0 - CRITICAL** |
| `customers` | 0 rows | 52 rows | ✅ Complete | P1 |
| `services` | 3 rows | 17 rows | ⚠️ Partial | P1 |
| `appointment_records` | Unknown | Unknown | ⚠️ Audit Needed | P2 |
| `customers_backup` | N/A | N/A | 📦 Backup Table | P2 |

**Critical Finding**:
- **profiles table**: 4 rows have `shop_id` but not `barbershop_id` → **Must migrate**
- **customers table**: All 52 rows have `barbershop_id`, `shop_id` is NULL → **Already clean**
- **services table**: 17 have `barbershop_id`, only 3 have `shop_id` → **Verify data integrity**

#### **2. Legacy Tables with ONLY shop_id** (Deprecated)

| Table | Purpose | Migration Strategy |
|-------|---------|-------------------|
| `barbers` | Legacy staff tracking | Use `profiles` + `barbershop_staff` instead |
| `inventory` | Legacy inventory | Use `barbershop_inventory` instead |
| `invoice_history` | Legacy invoicing | Archive or migrate |
| `payout_history` | Legacy payouts | Archive or migrate |
| `production_barbers` | Legacy production table | Archive |
| `user_shop_access_history` | Access audit trail | Keep as-is (shop_id OK for historical data) |

#### **3. Standard Tables with ONLY barbershop_id** (100+ tables)

These follow the standard and require no changes:
- `appointments`, `barber_availability`, `barber_services`
- `business_hours`, `cancellation_policies`
- `customer_feedback`, `customer_segments`
- `loyalty_programs`, `notifications`, `payments`, `products`
- ...and 90+ more tables

---

## 🔧 Implementation Phases

### **Phase 1: SQL Data Migration** 🔴 **CRITICAL**

**Objective**: Migrate remaining data from shop_id → barbershop_id

**Tasks**:
1. ✅ Review existing migration SQL (`/database/migrations/shop_id_to_barbershop_id_migration.sql`)
2. ⏳ Test migration in ROLLBACK mode (currently set)
3. ⏳ Verify pre-migration backup creation
4. ⏳ Update migration to COMMIT mode
5. ⏳ Execute migration in production
6. ⏳ Verify post-migration data integrity

**SQL Migration Details**:
```sql
-- Current state: 4 profiles need migration
UPDATE profiles
SET barbershop_id = shop_id,
    updated_at = CURRENT_TIMESTAMP
WHERE shop_id IS NOT NULL
  AND barbershop_id IS NULL;

-- Verify migration
SELECT COUNT(*) FROM profiles WHERE barbershop_id IS NOT NULL; -- Should be 56
SELECT COUNT(*) FROM profiles WHERE shop_id IS NOT NULL AND barbershop_id IS NULL; -- Should be 0
```

**Safety Features**:
- ✅ Transaction-based (auto rollback on error)
- ✅ Pre-migration backups (`profiles_backup_shop_id_migration`)
- ✅ Detailed logging and verification
- ✅ Rollback procedure documented

**Files**:
- `/database/migrations/shop_id_to_barbershop_id_migration.sql` (exists, needs COMMIT)
- `/database/migrations/rollback_shop_id_migration.sql` (to be created)

---

### **Phase 2: Code Cleanup** 🟡 **HIGH PRIORITY**

**Objective**: Remove all code references to `shop_id` and replace with `barbershop_id`

**Code Patterns to Find and Fix**:

#### ❌ **Wrong Patterns (To Remove)**:
```javascript
// Pattern 1: Direct shop_id query
.eq('shop_id', shopId) // ❌ Returns empty

// Pattern 2: Dangerous fallback
const id = profile?.shop_id || profile?.barbershop_id // ❌ Prioritizes wrong field

// Pattern 3: Profile query using shop_id
const shopId = profile?.shop_id // ❌ Deprecated
```

#### ✅ **Correct Patterns (To Use)**:
```javascript
// Pattern 1: Always use barbershop_id
.eq('barbershop_id', barbershopId) // ✅ Correct

// Pattern 2: No fallback needed
const barbershopId = profile?.barbershop_id // ✅ Single source of truth

// Pattern 3: Component props
<Component barbershopId={barbershopId} /> // ✅ Consistent naming
```

**Files to Update** (Based on Grep Analysis):

**Critical Files** (P0):
- `/app/(protected)/dashboard/calendar/page.js` - ✅ Already Fixed (lines 50-58)
- `/components/UnifiedDashboard.js` - Verify barbershop_id usage
- `/components/Navigation.js` - Check shop selector logic
- `/contexts/GlobalDashboardContext.js` - ✅ Uses barbershop_id correctly

**API Endpoints** (P0):
- `/app/api/customers/route.js` - ✅ Uses barbershop_id correctly
- `/app/api/appointments/route.js` - Verify all endpoints
- `/app/api/services/route.js` - Verify all endpoints
- `/app/api/staff/route.js` - Check for shop_id references

**Backend Services** (P1):
- Search all Python files in `/services/` for shop_id references
- Update FastAPI backend `fastapi_backend.py`
- Check database query functions

**Tasks**:
1. ⏳ Run comprehensive grep: `git grep -n "shop_id" --` (exclude backups)
2. ⏳ Update each file to use `barbershop_id`
3. ⏳ Update component prop types and interfaces
4. ⏳ Update API request/response types
5. ⏳ Update database query functions
6. ⏳ Run linter and fix any issues
7. ⏳ Run test suite and fix failures

---

### **Phase 3: Schema Cleanup** 🟢 **MEDIUM PRIORITY**

**Objective**: Drop shop_id columns from all affected tables

**⚠️ Prerequisites** (Must Complete Before Phase 3):
- ✅ Phase 1 SQL migration committed
- ✅ Phase 2 code cleanup complete
- ✅ All tests passing
- ✅ Staging environment verified
- ✅ Backup created

**Schema Changes**:
```sql
-- Drop shop_id columns from 11 affected tables
BEGIN;

ALTER TABLE profiles DROP COLUMN IF EXISTS shop_id;
ALTER TABLE customers DROP COLUMN IF EXISTS shop_id;
ALTER TABLE services DROP COLUMN IF EXISTS shop_id;
ALTER TABLE appointment_records DROP COLUMN IF EXISTS shop_id;
ALTER TABLE customers_backup DROP COLUMN IF EXISTS shop_id;

-- Legacy tables (consider deprecating entirely)
ALTER TABLE barbers DROP COLUMN IF EXISTS shop_id;
ALTER TABLE inventory DROP COLUMN IF EXISTS shop_id;
ALTER TABLE invoice_history DROP COLUMN IF EXISTS shop_id;
ALTER TABLE payout_history DROP COLUMN IF EXISTS shop_id;
ALTER TABLE production_barbers DROP COLUMN IF EXISTS shop_id;

-- user_shop_access_history: Keep shop_id for historical audit trail

COMMIT;
```

**Verification Queries**:
```sql
-- Verify no shop_id columns remain (except audit tables)
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name = 'shop_id'
  AND table_schema = 'public'
  AND table_name NOT IN ('user_shop_access_history');
-- Should return 0 rows
```

**Tasks**:
1. ⏳ Create schema cleanup migration script
2. ⏳ Test in staging environment
3. ⏳ Create rollback script (add columns back if needed)
4. ⏳ Schedule production maintenance window
5. ⏳ Execute schema cleanup
6. ⏳ Verify no application errors
7. ⏳ Update database documentation

---

## 🔍 Testing Strategy

### **Unit Tests**
- [ ] Test profile queries return correct barbershop_id
- [ ] Test appointment queries use barbershop_id filter
- [ ] Test service catalog loads with barbershop_id
- [ ] Test customer list filters by barbershop_id

### **Integration Tests**
- [ ] Test calendar loads appointments for current shop
- [ ] Test shop selector switches locations correctly
- [ ] Test multi-location enterprise views
- [ ] Test API endpoints with barbershop_id parameter

### **E2E Tests**
- [ ] Complete user flow: Login → Select Shop → View Calendar → Create Appointment
- [ ] Shop owner flow: Switch locations → View analytics
- [ ] Barber flow: View personal schedule → Book appointment
- [ ] Verify no "empty data" errors in console

### **Regression Tests**
- [ ] Re-run existing test suite (all must pass)
- [ ] Performance comparison (query speed before/after)
- [ ] Memory usage (no leaks from query changes)

---

## 📝 Rollback Plan

**If migration causes issues**:

### **Immediate Rollback** (Within 1 hour):
```sql
-- Restore from backups
BEGIN;

UPDATE profiles p
SET barbershop_id = b.barbershop_id,
    shop_id = b.shop_id,
    updated_at = b.updated_at
FROM profiles_backup_shop_id_migration b
WHERE p.id = b.id;

COMMIT;
```

### **Code Rollback** (Revert Git commit):
```bash
git revert <commit-hash>  # Revert code changes
git push origin main      # Deploy rollback
```

### **Communication Plan**:
1. Notify team in #backend-updates
2. Document rollback reason in incident log
3. Schedule post-mortem review
4. Update migration plan with lessons learned

---

## 📚 Related Documentation

### **Primary References**:
- `/docs/SCHEMA_STANDARDS.md` - Field naming conventions (**authoritative**)
- `/database/migrations/shop_id_to_barbershop_id_migration.sql` - SQL migration script
- `/docs/STAFF_ID_ARCHITECTURE.md` - Staff data architecture

### **Migration History**:
- `/docs/MIGRATION_BOOKING_CONSOLIDATION_COMPLETE.md` - Previous migration (customer_* → client_*)
- `/docs/FIELD_MAPPING_REFERENCE.md` - Field mapping utilities

### **Technical Docs**:
- `/docs/DATABASE_SCHEMA.md` - Full database schema reference
- `/docs/API_DOCUMENTATION.md` - API endpoints and data formats

---

## 🎯 Definition of Done

**Phase 1 Complete When**:
- [ ] SQL migration executed with COMMIT
- [ ] Post-migration verification queries show 0 rows needing migration
- [ ] Backups created and verified
- [ ] No database errors in production logs

**Phase 2 Complete When**:
- [ ] Grep search for "shop_id" returns only comments/documentation
- [ ] All API endpoints use `barbershop_id` parameter
- [ ] All components use `barbershopId` prop (camelCase)
- [ ] GlobalDashboardContext uses `currentLocationId` consistently
- [ ] All tests passing (unit + integration + E2E)
- [ ] Code review approved by 2+ team members

**Phase 3 Complete When**:
- [ ] shop_id columns dropped from all non-audit tables
- [ ] Schema validation query returns 0 unexpected columns
- [ ] Application runs without errors for 24 hours
- [ ] Performance metrics show no degradation
- [ ] SCHEMA_STANDARDS.md updated with completion status

**Overall Success**:
- [ ] Zero "empty results" bugs in production
- [ ] Calendar shows all appointments correctly
- [ ] Services and customers dropdowns populated
- [ ] No console errors related to schema
- [ ] Team understands new standard (barbershop_id only)

---

## ⚠️ Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss during migration | Low | **CRITICAL** | Transaction-based migration + pre-migration backups |
| Missing code references cause runtime errors | Medium | High | Comprehensive grep + test coverage |
| Foreign key constraints broken | Low | High | Verify FK relationships before dropping columns |
| Performance degradation from query changes | Low | Medium | Query optimization + index analysis |
| Developer confusion about field names | Medium | Medium | Update SCHEMA_STANDARDS.md + team training |

---

## 📊 Success Metrics

### **Technical Metrics**:
- Query success rate: 100% (zero "column not found" errors)
- Calendar load time: <2 seconds (consistent with current performance)
- Database size: Minimal change (<1% reduction from dropped columns)
- Test pass rate: 100% (all existing tests continue to pass)

### **User Experience Metrics**:
- Zero user-reported "empty calendar" bugs
- Zero user-reported "missing services/customers" bugs
- Support ticket reduction: 50% decrease in schema-related issues

### **Developer Experience Metrics**:
- Schema confusion incidents: 0 per week
- Time to debug schema issues: <5 minutes (clear error messages)
- New developer onboarding: Single source of truth (SCHEMA_STANDARDS.md)

---

**Document Owner**: Backend Team Lead
**Reviewers**: Database Admin, Frontend Lead, QA Lead
**Last Updated**: October 11, 2025
**Version**: 1.0
**Status**: Active Specification

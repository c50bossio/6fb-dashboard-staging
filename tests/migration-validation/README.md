# shop_id → barbershop_id Migration Testing Suite

**Version**: 1.0
**Created**: October 10, 2025
**Status**: Ready for Execution

---

## 📋 Overview

Comprehensive test suite for validating the shop_id → barbershop_id migration that addresses critical production bugs:
- **Calendar showing zero appointments** (profile queried shop_id instead of barbershop_id)
- **Services API returning empty arrays** (shop_id column empty, barbershop_id populated)
- **Customer data inaccessible** (customers table has 0 rows in shop_id, 52 in barbershop_id)

## 🎯 Objectives

1. **Document Current State** - Establish baseline of shop_id vs barbershop_id usage
2. **Validate Migration** - Ensure data migrates correctly without loss
3. **Verify Fixes** - Confirm UI/API work with barbershop_id only
4. **Prevent Regression** - Ensure no new bugs introduced
5. **Performance Check** - Validate query performance improvements

---

## 📁 Test Structure

```
tests/migration-validation/
├── README.md                              # This file
├── SHOP_ID_MIGRATION_TEST_PLAN.md         # Detailed test plan
├── setup.js                               # Test setup utilities
├── teardown.js                            # Cleanup scripts
├── fixtures/                              # Test data
│   ├── test-profiles.json
│   ├── test-appointments.json
│   └── test-barbershops.json
│
├── pre-migration/                         # PHASE 1: Baseline
│   ├── database-baseline.test.js          # ✅ Database state analysis
│   ├── api-current-state.test.js          # API bug documentation
│   ├── ui-broken-flows.test.js            # E2E current bugs
│   └── data-distribution.test.js          # Data gap analysis
│
├── post-migration/                        # PHASE 2: Validation
│   ├── data-migration-complete.test.js    # Migration success check
│   ├── api-barbershop-id-only.test.js     # API correctness
│   ├── ui-appointments-visible.test.js    # E2E fixes verified
│   └── cross-table-consistency.test.js    # FK integrity
│
├── regression/                            # PHASE 3: No New Bugs
│   ├── booking-flow.test.js               # End-to-end booking
│   ├── multi-shop-users.test.js           # Shop switching
│   ├── staff-management.test.js           # Staff CRUD
│   └── financial-reports.test.js          # Revenue calculations
│
├── edge-cases/                            # PHASE 4: Edge Cases
│   ├── null-barbershop-id.test.js         # NULL handling
│   ├── orphaned-records.test.js           # Data cleanup
│   ├── concurrent-updates.test.js         # Race conditions
│   └── foreign-key-constraints.test.js    # DB integrity
│
└── performance/                           # PHASE 5: Performance
    ├── query-performance.test.js          # SQL benchmarks
    ├── api-response-times.test.js         # Endpoint speed
    └── concurrent-operations.test.js      # Load testing
```

---

## 🚀 Quick Start

### Prerequisites
```bash
# Install dependencies
npm install

# Configure test environment
cp .env.example .env.test
# Edit .env.test with test database credentials
```

### Run Tests

```bash
# Run all pre-migration baseline tests
npm run test:pre-migration

# Run post-migration validation
npm run test:post-migration

# Run regression suite
npm run test:regression

# Run complete migration test suite
npm run test:migration-suite

# Generate test report
npm run test:migration-report
```

---

## 📊 Test Categories

### Category 1: Pre-Migration Baseline
**Goal**: Document current broken state

✅ **database-baseline.test.js** - Created
- Profile table shop_id vs barbershop_id distribution
- Customers table data analysis (0 shop_id, 52 barbershop_id)
- Services table coverage verification
- Appointments FK integrity check

🔲 **api-current-state.test.js** - TODO
- Demonstrate calendar API returns empty with shop_id
- Show services API works with barbershop_id
- Document staff API behavior

🔲 **ui-broken-flows.test.js** - TODO
- Calendar shows zero appointments
- Services dropdown empty
- Customer list not loading

### Category 2: Post-Migration Validation
**Goal**: Verify migration success

🔲 **data-migration-complete.test.js** - TODO
- All profiles have barbershop_id (where applicable)
- shop_id columns dropped from critical tables
- No data loss during migration

🔲 **api-barbershop-id-only.test.js** - TODO
- APIs accept only barbershop_id parameter
- shop_id parameter rejected with 400/422
- All responses include barbershop_id

🔲 **ui-appointments-visible.test.js** - TODO
- Calendar loads and shows appointments
- Booking modal creates appointments successfully
- All shop-scoped pages work correctly

### Category 3: Regression Tests
**Goal**: Ensure no new bugs

🔲 **booking-flow.test.js** - TODO
- Complete booking flow works
- Multi-step wizards functional
- Data persisted correctly

🔲 **multi-shop-users.test.js** - TODO
- Enterprise owners can switch shops
- Shop-specific data loads correctly
- No cross-shop data leakage

### Category 4: Edge Cases
**Goal**: Test boundary conditions

🔲 **null-barbershop-id.test.js** - TODO
- Client profiles (expected NULL)
- Orphaned barber profiles (error case)
- API error handling

🔲 **foreign-key-constraints.test.js** - TODO
- Invalid barbershop_id rejected
- Cascade updates work correctly
- Referential integrity maintained

### Category 5: Performance
**Goal**: Validate performance improvements

🔲 **query-performance.test.js** - TODO
- barbershop_id queries < 100ms
- Complex joins < 500ms
- Index usage verified

---

## ✅ Success Criteria

Migration is **SUCCESSFUL** when ALL of the following pass:

### Database Layer
- [ ] All staff profiles have barbershop_id (0 NULL values)
- [ ] All services have barbershop_id (100% coverage)
- [ ] shop_id columns dropped from: profiles, services, customers
- [ ] No orphaned appointments (all have valid FK)
- [ ] Foreign key constraints enforced

### API Layer
- [ ] All endpoints use barbershop_id only
- [ ] shop_id parameter returns 400/422 error
- [ ] Response times < 500ms
- [ ] All responses include barbershop_id

### UI Layer
- [ ] Calendar loads appointments (count > 0)
- [ ] Booking flow works end-to-end
- [ ] Shop switching functional
- [ ] Zero console errors

### Code Quality
- [ ] 0 files use `profile.shop_id ||` pattern
- [ ] 0 files use `.eq('shop_id',` query
- [ ] All components use `barbershopId` prop
- [ ] ESLint/TypeScript passes

---

## 🔴 Rollback Triggers

### CRITICAL - Immediate Rollback Required

1. **Data Loss**
   - Profile count decreases
   - Appointment count drops >5%
   - Service count decreases

2. **Calendar Broken**
   - Returns 500 error
   - Shows zero appointments when data exists
   - Cannot create appointments

3. **Database Integrity**
   - FK constraint errors
   - NULL barbershop_id >10% of profiles
   - Orphaned appointments >5%

### WARNING - Manual Review

1. **Performance Issues**
   - Query times increase >50%
   - Page load >2 seconds slower
   - API response >1 second

2. **Partial Failures**
   - 1-10% data shows empty
   - Specific shops affected
   - Intermittent errors

---

## 📈 Test Execution Flow

### Phase 1: Pre-Migration (1 hour)
```bash
# 1. Database baseline
npm run test:pre-migration:database

# 2. API current state
npm run test:pre-migration:api

# 3. UI broken flows
npm run test:pre-migration:ui

# 4. Generate report
npm run test:pre-migration:report
```

### Phase 2: Migration (30 minutes)
```bash
# 1. Backup database
npm run db:backup

# 2. Run migration
npm run db:migrate:shop-id-cleanup

# 3. Verify migration
npm run db:verify-migration
```

### Phase 3: Post-Migration (1 hour)
```bash
# 1. Data validation
npm run test:post-migration:data

# 2. API validation
npm run test:post-migration:api

# 3. UI validation
npm run test:post-migration:ui

# 4. FK integrity
npm run test:post-migration:integrity
```

### Phase 4: Regression (2 hours)
```bash
# 1. User flows
npm run test:regression:flows

# 2. Edge cases
npm run test:edge-cases

# 3. Performance
npm run test:performance

# 4. Final report
npm run test:migration:final-report
```

---

## 📝 Key Database Queries

### Pre-Migration Analysis
```sql
-- Profile distribution
SELECT
  role,
  COUNT(*) as total,
  COUNT(shop_id) as has_shop_id,
  COUNT(barbershop_id) as has_barbershop_id
FROM profiles
GROUP BY role;

-- Customers gap
SELECT
  COUNT(*) as total,
  COUNT(shop_id) as has_shop_id,
  COUNT(barbershop_id) as has_barbershop_id
FROM customers;
```

### Post-Migration Validation
```sql
-- Verify migration success
SELECT
  COUNT(CASE WHEN barbershop_id IS NULL AND role IN ('BARBER', 'SHOP_OWNER') THEN 1 END) as missing
FROM profiles;

-- Verify column dropped
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'shop_id';
```

---

## 🔗 Related Documentation

### Reference Files
- [`/docs/SCHEMA_STANDARDS.md`](/Users/bossio/6FB AI Agent System/docs/SCHEMA_STANDARDS.md) - Field naming standards
- [`/docs/TROUBLESHOOTING.md`](/Users/bossio/6FB AI Agent System/docs/TROUBLESHOOTING.md) - Known bugs and fixes
- [`/docs/SHOP_ID_MIGRATION_ANALYSIS.md`](/Users/bossio/6FB AI Agent System/docs/SHOP_ID_MIGRATION_ANALYSIS.md) - Full table analysis

### Key Files to Test
- `/app/(protected)/dashboard/calendar/page.js` - Calendar (FIXED: line 52-58)
- `/app/(protected)/dashboard/settings/page.js` - Settings (has fallback)
- `/components/navigation/ShopSelector.js` - Shop switching (has fallback)
- `/app/api/appointments/route.js` - Appointments API
- `/app/api/services/route.js` - Services API
- `/app/api/staff/route.js` - Staff API

---

## 🧪 Sample Test Implementation

### Database Baseline Test
```javascript
it('should count rows with shop_id vs barbershop_id', async () => {
  const { data } = await supabase
    .from('profiles')
    .select('id, role, shop_id, barbershop_id')
    .in('role', ['BARBER', 'SHOP_OWNER'])

  const stats = {
    total: data.length,
    hasShopId: data.filter(p => p.shop_id !== null).length,
    hasBarbershopId: data.filter(p => p.barbershop_id !== null).length,
  }

  console.log(`Migration will affect ${stats.hasShopId} profiles`)
  expect(stats.hasBarbershopId).toBeGreaterThan(stats.hasShopId)
})
```

### API Validation Test
```javascript
it('should return appointments using barbershop_id', async () => {
  const response = await fetch(`/api/appointments?barbershop_id=${testShopId}`)
  const data = await response.json()

  expect(response.ok).toBe(true)
  expect(data.data).toBeInstanceOf(Array)
  expect(data.data.length).toBeGreaterThan(0)
})
```

### E2E UI Test
```javascript
it('should load calendar with appointments', async ({ page }) => {
  await page.goto('/dashboard/calendar')
  await page.waitForSelector('[data-testid="calendar-container"]')

  const appointmentCount = await page.locator('[data-testid="appointment-count"]').textContent()
  expect(parseInt(appointmentCount)).toBeGreaterThan(0)

  const events = await page.locator('.fc-event').count()
  expect(events).toBeGreaterThan(0)
})
```

---

## 📞 Support & Escalation

### Test Infrastructure
- **QA Lead**: Available for test strategy questions
- **Database Team**: Available for schema/migration issues
- **Frontend Team**: Available for component questions

### Emergency Contacts
- **Rollback Procedure**: See `/database/rollback-procedures.md`
- **Production Issues**: Escalate to DevOps immediately
- **Data Loss**: Stop migration, contact Database Team

---

## 📋 Next Steps Checklist

### Week 1: Pre-Migration
- [ ] Create remaining pre-migration test files
- [ ] Execute pre-migration test suite
- [ ] Document all current bugs
- [ ] Generate baseline report
- [ ] Review with team

### Week 2: Migration
- [ ] Create post-migration test files
- [ ] Execute database migration
- [ ] Run post-migration validation
- [ ] Fix any issues discovered
- [ ] Update API routes

### Week 3: Regression
- [ ] Create regression test files
- [ ] Execute regression suite
- [ ] Create edge case tests
- [ ] Run performance benchmarks
- [ ] Document all findings

### Week 4: Cleanup
- [ ] Remove shop_id code references
- [ ] Drop shop_id database columns
- [ ] Update all documentation
- [ ] Add CI/CD automated tests
- [ ] Monitor production metrics

---

**Status**: Phase 1 Started (Pre-Migration Tests)
**Next Milestone**: Complete pre-migration baseline tests
**Target Completion**: November 10, 2025

---

*For detailed test specifications, see [`SHOP_ID_MIGRATION_TEST_PLAN.md`](./SHOP_ID_MIGRATION_TEST_PLAN.md)*

# Phase 6: Comprehensive Testing Strategy - shop_id to barbershop_id Migration

**Generated**: October 10, 2025
**Purpose**: Validate shop_id → barbershop_id migration and prevent data loss bugs
**Status**: DRAFT - Ready for Implementation

---

## Executive Summary

This testing plan addresses the critical shop_id → barbershop_id migration that caused production bugs (empty calendar, missing appointments, zero services). The strategy uses a multi-layered approach to validate data integrity, code correctness, and user experience before, during, and after migration.

**Key Facts:**
- **Root Cause**: Code queried `shop_id` (empty) instead of `barbershop_id` (populated)
- **Data Distribution**: customers table has 0 rows in shop_id, 52 in barbershop_id
- **Impact**: Calendar showed no appointments, services returned empty arrays
- **Files Affected**: 27 files use shop_id, 344+ use barbershop_id

---

## Testing Philosophy

### Core Principles
1. **Test Against Real Data** - Use Supabase production/staging database (no mocks)
2. **Validate Data First** - Database tests before UI tests
3. **Progressive Validation** - Pre-migration → Migration → Post-migration → Regression
4. **Fail-Safe Rollback** - Clear triggers for automatic rollback
5. **Multi-Browser Coverage** - Playwright cross-browser testing

### Testing Layers
```
Layer 1: Database Validation (SQL queries)
    ↓
Layer 2: API Contract Testing (endpoint responses)
    ↓
Layer 3: Service Integration (full request/response)
    ↓
Layer 4: UI/E2E Testing (user workflows)
    ↓
Layer 5: Regression Testing (no new bugs)
```

---

## Test Categories

### Category 1: Pre-Migration Baseline Tests

**Purpose**: Establish current state and identify existing bugs

**Test Files**:
```
/tests/migration-validation/
  ├── pre-migration/
  │   ├── database-baseline.test.js
  │   ├── api-current-state.test.js
  │   ├── ui-broken-flows.test.js
  │   └── data-distribution.test.js
```

**Critical Test Cases**:

#### 1.1 Database State Validation
```javascript
describe('Pre-Migration: Database Baseline', () => {
  it('should count rows with shop_id vs barbershop_id in profiles', async () => {
    const result = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(shop_id) as has_shop_id,
        COUNT(barbershop_id) as has_barbershop_id,
        COUNT(CASE WHEN shop_id IS NOT NULL AND barbershop_id IS NULL THEN 1 END) as only_shop_id,
        COUNT(CASE WHEN barbershop_id IS NOT NULL AND shop_id IS NULL THEN 1 END) as only_barbershop_id,
        COUNT(CASE WHEN shop_id IS NOT NULL AND barbershop_id IS NOT NULL THEN 1 END) as has_both
      FROM profiles
      WHERE role IN ('BARBER', 'SHOP_OWNER')
    `)

    expect(result.has_barbershop_id).toBeGreaterThan(result.has_shop_id)
    // Document the gap for migration plan
    const dataGap = result.has_barbershop_id - result.has_shop_id
    console.log(`Migration will affect ${dataGap} profiles`)
  })

  it('should verify customers table has zero shop_id data', async () => {
    const result = await query(`
      SELECT COUNT(*) as shop_id_count FROM customers WHERE shop_id IS NOT NULL
    `)
    expect(result.shop_id_count).toBe(0) // Proves shop_id is obsolete
  })

  it('should verify services table completeness', async () => {
    const result = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(shop_id) as has_shop_id,
        COUNT(barbershop_id) as has_barbershop_id
      FROM services
    `)
    expect(result.has_barbershop_id).toBe(result.total) // All services must have barbershop_id
  })
})
```

#### 1.2 API Current State (Document Broken Behavior)
```javascript
describe('Pre-Migration: API Current State', () => {
  it('should demonstrate calendar API returns empty with shop_id query', async () => {
    const profile = await getProfile(testUserId)
    const shopId = profile.shop_id // This is NULL or outdated

    const response = await fetch(`/api/appointments?shop_id=${shopId}`)
    const data = await response.json()

    // Document the bug
    expect(data.appointments || data.data).toHaveLength(0)
    console.log('BUG CONFIRMED: shop_id query returns 0 appointments')
  })

  it('should demonstrate calendar API works with barbershop_id query', async () => {
    const profile = await getProfile(testUserId)
    const barbershopId = profile.barbershop_id

    const response = await fetch(`/api/appointments?barbershop_id=${barbershopId}`)
    const data = await response.json()

    expect(data.appointments || data.data).toBeGreaterThan(0)
    console.log(`SUCCESS: barbershop_id query returns ${data.data.length} appointments`)
  })
})
```

#### 1.3 UI Broken Flows (Document Current Bugs)
```javascript
describe('Pre-Migration: Calendar Page Bug', () => {
  it('should demonstrate calendar shows zero appointments with shop_id fallback', async ({ page }) => {
    await page.goto('/dashboard/calendar')
    await page.waitForSelector('[data-testid="calendar-container"]')

    // Check if calendar shows "No appointments" message
    const noDataMessage = await page.locator('text=/No appointments|Empty calendar/i').isVisible()
    expect(noDataMessage).toBe(true)

    // Verify stats show 0 appointments
    const appointmentCount = await page.locator('[data-testid="appointment-count"]').textContent()
    expect(appointmentCount).toBe('0')

    console.log('BUG CONFIRMED: Calendar shows 0 appointments due to shop_id query')
  })
})
```

---

### Category 2: Post-Migration Validation Tests

**Purpose**: Verify migration success and data consistency

**Test Files**:
```
/tests/migration-validation/
  ├── post-migration/
  │   ├── data-migration-complete.test.js
  │   ├── api-barbershop-id-only.test.js
  │   ├── ui-appointments-visible.test.js
  │   └── cross-table-consistency.test.js
```

**Critical Test Cases**:

#### 2.1 Data Migration Verification
```javascript
describe('Post-Migration: Data Validation', () => {
  it('should verify all profiles have barbershop_id migrated', async () => {
    const result = await query(`
      SELECT COUNT(*) as missing_count
      FROM profiles
      WHERE barbershop_id IS NULL
        AND role IN ('BARBER', 'SHOP_OWNER', 'ENTERPRISE_OWNER')
        AND shop_id IS NOT NULL
    `)

    expect(result.missing_count).toBe(0) // Migration should copy shop_id → barbershop_id
  })

  it('should verify no data loss during migration', async () => {
    const before = await query(`SELECT COUNT(*) as count FROM profiles WHERE role = 'BARBER'`)
    const after = await query(`SELECT COUNT(*) as count FROM profiles WHERE barbershop_id IS NOT NULL AND role = 'BARBER'`)

    expect(after.count).toBeGreaterThanOrEqual(before.count)
  })

  it('should verify shop_id columns are dropped from critical tables', async () => {
    const tables = ['profiles', 'services', 'customers']

    for (const table of tables) {
      const result = await query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = '${table}' AND column_name = 'shop_id'
      `)

      expect(result.rows).toHaveLength(0) // shop_id should be dropped
    }
  })
})
```

#### 2.2 API Barbershop ID Only
```javascript
describe('Post-Migration: API Uses barbershop_id Only', () => {
  it('should return appointments using barbershop_id parameter', async () => {
    const profile = await getProfile(testUserId)
    const response = await fetch(`/api/appointments?barbershop_id=${profile.barbershop_id}`)
    const data = await response.json()

    expect(response.ok).toBe(true)
    expect(data.data).toBeInstanceOf(Array)
    expect(data.data.length).toBeGreaterThan(0)
  })

  it('should reject requests with shop_id parameter', async () => {
    const response = await fetch(`/api/appointments?shop_id=some-id`)

    // Should either error or return empty (shop_id no longer supported)
    expect([400, 422]).toContain(response.status)
    // OR
    const data = await response.json()
    expect(data.error || data.message).toMatch(/barbershop_id.*required/i)
  })

  it('should return services filtered by barbershop_id', async () => {
    const barbershopId = 'test-shop-id'
    const response = await fetch(`/api/services?barbershop_id=${barbershopId}`)
    const data = await response.json()

    expect(data.services).toBeInstanceOf(Array)
    data.services.forEach(service => {
      expect(service.barbershop_id).toBe(barbershopId)
    })
  })
})
```

#### 2.3 UI Appointments Visible (Fix Verified)
```javascript
describe('Post-Migration: Calendar Shows Data', () => {
  it('should load and display appointments after migration', async ({ page }) => {
    await page.goto('/dashboard/calendar')
    await page.waitForSelector('[data-testid="calendar-container"]')

    // Verify appointments are loaded
    const appointmentCount = await page.locator('[data-testid="appointment-count"]').textContent()
    expect(parseInt(appointmentCount)).toBeGreaterThan(0)

    // Verify calendar events are rendered
    const events = await page.locator('.fc-event').count()
    expect(events).toBeGreaterThan(0)

    console.log(`SUCCESS: Calendar displays ${events} appointments`)
  })

  it('should allow creating new appointments', async ({ page }) => {
    await page.goto('/dashboard/calendar')

    // Click on time slot
    await page.locator('.fc-timegrid-slot').first().click()

    // Verify modal opens
    await page.waitForSelector('[data-testid="appointment-modal"]')

    // Fill form
    await page.fill('[name="client_name"]', 'Test Client')
    await page.fill('[name="client_phone"]', '+1234567890')
    await page.selectOption('[name="service_id"]', { index: 0 })

    // Submit
    await page.click('button[type="submit"]')

    // Verify success
    await page.waitForSelector('text=/Appointment created|Success/i')
  })
})
```

---

### Category 3: Regression Tests (No New Bugs)

**Purpose**: Ensure migration doesn't break existing functionality

**Test Files**:
```
/tests/migration-validation/
  ├── regression/
  │   ├── booking-flow.test.js
  │   ├── multi-shop-users.test.js
  │   ├── staff-management.test.js
  │   └── financial-reports.test.js
```

**Critical Test Cases**:

#### 3.1 Complete Booking Flow
```javascript
describe('Regression: Booking Flow', () => {
  it('should complete end-to-end booking with barbershop_id', async ({ page }) => {
    // Navigate to public booking page
    const barbershopId = 'test-shop-123'
    await page.goto(`/book/${barbershopId}`)

    // Select service
    await page.click('[data-testid="service-card"]:first-child')

    // Select barber
    await page.click('[data-testid="barber-option"]:first-child')

    // Select time slot
    await page.click('[data-testid="time-slot"]:first-child')

    // Fill client info
    await page.fill('[name="client_name"]', 'Regression Test User')
    await page.fill('[name="client_email"]', 'test@regression.com')
    await page.fill('[name="client_phone"]', '+1555123456')

    // Confirm booking
    await page.click('button:has-text("Confirm Booking")')

    // Verify confirmation
    await page.waitForSelector('text=/Booking confirmed|Thank you/i')

    // Verify appointment created in database
    const appointment = await query(`
      SELECT * FROM appointments
      WHERE client_email = 'test@regression.com'
        AND barbershop_id = '${barbershopId}'
      ORDER BY created_at DESC
      LIMIT 1
    `)

    expect(appointment).toBeDefined()
    expect(appointment.barbershop_id).toBe(barbershopId)
    expect(appointment.client_name).toBe('Regression Test User')
  })
})
```

#### 3.2 Multi-Shop User Switching
```javascript
describe('Regression: Multi-Shop User Access', () => {
  it('should switch between shops using barbershop_id', async ({ page }) => {
    // Login as enterprise owner with multiple shops
    await loginAsEnterpriseOwner(page)

    // Verify shop selector shows all shops
    const shopCount = await page.locator('[data-testid="shop-option"]').count()
    expect(shopCount).toBeGreaterThan(1)

    // Switch to Shop A
    await page.selectOption('[data-testid="shop-selector"]', { label: 'Shop A' })
    await page.waitForLoadState('networkidle')

    // Verify data is for Shop A
    const shopAAppointments = await page.locator('.fc-event').count()

    // Switch to Shop B
    await page.selectOption('[data-testid="shop-selector"]', { label: 'Shop B' })
    await page.waitForLoadState('networkidle')

    // Verify data changed to Shop B
    const shopBAppointments = await page.locator('.fc-event').count()

    expect(shopAAppointments).not.toBe(shopBAppointments) // Different shops should have different data
  })

  it('should maintain barbershop_id in profile after switching', async () => {
    const userId = 'test-enterprise-owner'
    const shopAId = 'shop-a-123'
    const shopBId = 'shop-b-456'

    // Switch to Shop A
    await updateProfile(userId, { barbershop_id: shopAId })
    let profile = await getProfile(userId)
    expect(profile.barbershop_id).toBe(shopAId)

    // Switch to Shop B
    await updateProfile(userId, { barbershop_id: shopBId })
    profile = await getProfile(userId)
    expect(profile.barbershop_id).toBe(shopBId)

    // Verify no shop_id column exists
    expect(profile).not.toHaveProperty('shop_id')
  })
})
```

---

### Category 4: Edge Case & Error Handling Tests

**Purpose**: Test boundary conditions and error scenarios

**Test Files**:
```
/tests/migration-validation/
  ├── edge-cases/
  │   ├── null-barbershop-id.test.js
  │   ├── orphaned-records.test.js
  │   ├── concurrent-updates.test.js
  │   └── foreign-key-constraints.test.js
```

**Critical Test Cases**:

#### 4.1 NULL barbershop_id Handling
```javascript
describe('Edge Case: NULL barbershop_id', () => {
  it('should handle client profiles with NULL barbershop_id gracefully', async () => {
    const clientProfile = await query(`
      SELECT * FROM profiles WHERE role = 'CLIENT' AND barbershop_id IS NULL LIMIT 1
    `)

    // Clients shouldn't have barbershop_id - this is expected
    expect(clientProfile).toBeDefined()
    expect(clientProfile.barbershop_id).toBeNull()
  })

  it('should error when barber has NULL barbershop_id', async () => {
    const orphanedBarber = await query(`
      SELECT * FROM profiles
      WHERE role = 'BARBER' AND barbershop_id IS NULL
      LIMIT 1
    `)

    if (orphanedBarber) {
      // This is a data integrity issue - should be flagged
      console.error('INTEGRITY ERROR: Barber without barbershop_id', orphanedBarber.id)
      expect(orphanedBarber).toBeUndefined() // Test should fail if found
    }
  })

  it('should return error when querying appointments with NULL barbershop_id', async () => {
    const response = await fetch(`/api/appointments?barbershop_id=null`)
    expect([400, 422]).toContain(response.status)
  })
})
```

#### 4.2 Foreign Key Constraint Testing
```javascript
describe('Edge Case: Foreign Key Constraints', () => {
  it('should enforce barbershop_id FK in appointments table', async () => {
    const invalidShopId = 'non-existent-shop-id'

    await expect(async () => {
      await query(`
        INSERT INTO appointments (barbershop_id, client_name, scheduled_at, duration_minutes)
        VALUES ('${invalidShopId}', 'Test', NOW(), 30)
      `)
    }).rejects.toThrow(/foreign key constraint|violates/)
  })

  it('should cascade updates when barbershop_id changes', async () => {
    // This depends on FK ON UPDATE CASCADE configuration
    const testShopId = 'test-shop-cascade'
    const newShopId = 'test-shop-updated'

    // Create test shop
    await query(`INSERT INTO barbershops (id, name) VALUES ('${testShopId}', 'Test Shop')`)

    // Create appointment
    await query(`
      INSERT INTO appointments (barbershop_id, client_name, scheduled_at, duration_minutes)
      VALUES ('${testShopId}', 'Test Client', NOW(), 30)
    `)

    // Update shop ID (if cascade enabled)
    await query(`UPDATE barbershops SET id = '${newShopId}' WHERE id = '${testShopId}'`)

    // Verify appointments updated
    const appointment = await query(`
      SELECT * FROM appointments WHERE barbershop_id = '${newShopId}'
    `)

    expect(appointment).toBeDefined()
  })
})
```

---

### Category 5: Performance & Load Tests

**Purpose**: Ensure migration doesn't degrade performance

**Test Files**:
```
/tests/migration-validation/
  ├── performance/
  │   ├── query-performance.test.js
  │   ├── api-response-times.test.js
  │   └── concurrent-operations.test.js
```

**Critical Test Cases**:

#### 5.1 Query Performance Comparison
```javascript
describe('Performance: Query Speed', () => {
  it('should query barbershop_id faster than shop_id (indexed)', async () => {
    const barbershopId = 'test-shop-performance'

    // Measure barbershop_id query
    const start1 = Date.now()
    await query(`SELECT * FROM appointments WHERE barbershop_id = '${barbershopId}'`)
    const barbershopIdTime = Date.now() - start1

    console.log(`barbershop_id query: ${barbershopIdTime}ms`)
    expect(barbershopIdTime).toBeLessThan(100) // Should be fast with index
  })

  it('should handle large dataset queries efficiently', async () => {
    const start = Date.now()
    const result = await query(`
      SELECT a.*, s.name as service_name, p.full_name as barber_name
      FROM appointments a
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN profiles p ON a.barber_id = p.id
      WHERE a.barbershop_id = 'production-shop-id'
        AND a.scheduled_at >= NOW() - INTERVAL '30 days'
      ORDER BY a.scheduled_at DESC
      LIMIT 1000
    `)
    const queryTime = Date.now() - start

    console.log(`Complex join query: ${queryTime}ms for ${result.rows.length} rows`)
    expect(queryTime).toBeLessThan(500)
  })
})
```

---

## Test File Structure

### Directory Organization
```
/tests/migration-validation/
├── README.md                          # This document
├── setup.js                           # Test setup and utilities
├── teardown.js                        # Cleanup after tests
├── fixtures/                          # Test data
│   ├── test-profiles.json
│   ├── test-appointments.json
│   └── test-barbershops.json
├── pre-migration/
│   ├── database-baseline.test.js      # SQL validation
│   ├── api-current-state.test.js      # API bug documentation
│   ├── ui-broken-flows.test.js        # E2E current bugs
│   └── data-distribution.test.js      # Data analysis
├── post-migration/
│   ├── data-migration-complete.test.js # Migration success
│   ├── api-barbershop-id-only.test.js  # API correctness
│   ├── ui-appointments-visible.test.js # E2E fixes verified
│   └── cross-table-consistency.test.js # FK integrity
├── regression/
│   ├── booking-flow.test.js            # End-to-end booking
│   ├── multi-shop-users.test.js        # Shop switching
│   ├── staff-management.test.js        # Staff CRUD
│   └── financial-reports.test.js       # Revenue calculations
├── edge-cases/
│   ├── null-barbershop-id.test.js      # NULL handling
│   ├── orphaned-records.test.js        # Data cleanup
│   ├── concurrent-updates.test.js      # Race conditions
│   └── foreign-key-constraints.test.js # DB integrity
└── performance/
    ├── query-performance.test.js       # SQL benchmarks
    ├── api-response-times.test.js      # Endpoint speed
    └── concurrent-operations.test.js   # Load testing
```

---

## Database Validation Queries

### Pre-Migration Analysis
```sql
-- Query 1: Profile Table Analysis
SELECT
  role,
  COUNT(*) as total,
  COUNT(shop_id) as has_shop_id,
  COUNT(barbershop_id) as has_barbershop_id,
  COUNT(CASE WHEN shop_id IS NOT NULL AND barbershop_id IS NULL THEN 1 END) as needs_migration,
  COUNT(CASE WHEN shop_id IS NULL AND barbershop_id IS NULL THEN 1 END) as orphaned
FROM profiles
GROUP BY role;

-- Query 2: Customers Data Distribution
SELECT
  COUNT(*) as total_customers,
  COUNT(shop_id) as has_shop_id,
  COUNT(barbershop_id) as has_barbershop_id,
  COUNT(CASE WHEN barbershop_id IS NULL THEN 1 END) as orphaned
FROM customers;

-- Query 3: Services Completeness
SELECT
  COUNT(*) as total_services,
  COUNT(CASE WHEN barbershop_id IS NOT NULL THEN 1 END) as has_barbershop_id,
  COUNT(CASE WHEN shop_id IS NOT NULL THEN 1 END) as has_shop_id_only
FROM services;

-- Query 4: Appointments Foreign Key Check
SELECT
  COUNT(DISTINCT a.barbershop_id) as unique_shops,
  COUNT(a.*) as total_appointments,
  COUNT(CASE WHEN b.id IS NULL THEN 1 END) as orphaned_appointments
FROM appointments a
LEFT JOIN barbershops b ON a.barbershop_id = b.id;
```

### Post-Migration Validation
```sql
-- Query 5: Verify Migration Success
SELECT
  'profiles' as table_name,
  COUNT(CASE WHEN barbershop_id IS NULL AND role IN ('BARBER', 'SHOP_OWNER') THEN 1 END) as missing_barbershop_id
FROM profiles
UNION ALL
SELECT
  'services',
  COUNT(CASE WHEN barbershop_id IS NULL THEN 1 END)
FROM services
UNION ALL
SELECT
  'customers',
  COUNT(CASE WHEN barbershop_id IS NULL THEN 1 END)
FROM customers;

-- Query 6: Verify shop_id Columns Dropped
SELECT
  table_name,
  column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'shop_id'
  AND table_name IN ('profiles', 'services', 'customers', 'appointment_records');

-- Query 7: Data Integrity Check
SELECT
  COUNT(*) as total_appointments,
  COUNT(CASE WHEN barbershop_id IS NOT NULL THEN 1 END) as has_barbershop_id,
  COUNT(CASE WHEN barber_id IS NOT NULL THEN 1 END) as has_barber,
  COUNT(CASE WHEN client_id IS NOT NULL OR client_name IS NOT NULL THEN 1 END) as has_client
FROM appointments
WHERE scheduled_at >= NOW() - INTERVAL '7 days';
```

---

## Success Criteria

### Migration is considered SUCCESSFUL when:

#### Database Layer
- [ ] All profiles with role=BARBER/SHOP_OWNER have barbershop_id (0 NULL values)
- [ ] All services have barbershop_id (100% coverage)
- [ ] All customers have barbershop_id or are marked as orphaned
- [ ] shop_id columns dropped from: profiles, services, customers, appointment_records
- [ ] Foreign key constraints validated on barbershop_id
- [ ] No orphaned appointments (all have valid barbershop FK)

#### API Layer
- [ ] `/api/appointments?barbershop_id=X` returns correct data (response time < 500ms)
- [ ] `/api/services?barbershop_id=X` returns shop-specific services
- [ ] `/api/staff?barbershop_id=X` returns shop-specific staff
- [ ] `/api/customers?barbershop_id=X` returns shop-specific customers
- [ ] shop_id parameter rejected with 400/422 error
- [ ] All API responses include barbershop_id in returned objects

#### UI Layer (E2E)
- [ ] Calendar page loads and displays appointments (count > 0)
- [ ] Appointment booking modal opens and saves successfully
- [ ] Services dropdown populated correctly
- [ ] Barber selection shows all shop staff
- [ ] Multi-shop users can switch shops without errors
- [ ] No console errors related to shop_id

#### Code Quality
- [ ] Zero grep matches for `profile.shop_id ||` pattern
- [ ] Zero grep matches for `.eq('shop_id',` in queries
- [ ] All components use `barbershopId` prop (not `shopId`)
- [ ] TypeScript/ESLint passes with no warnings

#### Performance
- [ ] Calendar load time < 2 seconds
- [ ] Appointment query time < 500ms
- [ ] No N+1 query issues
- [ ] Database indexes on barbershop_id verified

---

## Rollback Triggers

### AUTOMATIC ROLLBACK if any of these occur:

#### Critical Failures (Immediate Rollback)
1. **Data Loss Detected**
   - Profile count decreases after migration
   - Appointment count decreases by >5%
   - Service count decreases by any amount

2. **Calendar Completely Broken**
   - Calendar page returns 500 error
   - Zero appointments displayed when database has data
   - Unable to create new appointments

3. **Database Integrity Violations**
   - Foreign key constraint errors on barbershop_id
   - NULL barbershop_id in >10% of profiles
   - Orphaned appointments increase by >5%

#### Warning Triggers (Manual Review Required)
1. **Performance Degradation**
   - Query times increase by >50%
   - Page load times increase by >2 seconds
   - API response times > 1 second

2. **Partial Data Issues**
   - 1-10% of data shows empty results
   - Specific shops affected but not all
   - Intermittent errors in logs

### Rollback Procedure
```sql
-- Emergency Rollback Script
BEGIN;

-- 1. Restore shop_id columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shop_id UUID;
ALTER TABLE services ADD COLUMN IF NOT EXISTS shop_id UUID;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shop_id UUID;

-- 2. Copy barbershop_id back to shop_id
UPDATE profiles SET shop_id = barbershop_id WHERE barbershop_id IS NOT NULL;
UPDATE services SET shop_id = barbershop_id WHERE barbershop_id IS NOT NULL;
UPDATE customers SET shop_id = barbershop_id WHERE barbershop_id IS NOT NULL;

-- 3. Re-enable legacy code paths
-- (Revert code changes via git)

COMMIT;
```

---

## Testing Tools & Configuration

### Required Dependencies
```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "jest": "^29.7.0",
    "@supabase/supabase-js": "^2.38.0",
    "dotenv": "^16.3.1"
  }
}
```

### Environment Setup
```bash
# .env.test
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=test-password
TEST_BARBERSHOP_ID=test-shop-123
```

### Test Execution Commands
```bash
# Run all pre-migration tests
npm run test:pre-migration

# Run post-migration validation
npm run test:post-migration

# Run regression suite
npm run test:regression

# Run edge case tests
npm run test:edge-cases

# Run performance tests
npm run test:performance

# Run complete migration test suite
npm run test:migration-suite

# Generate test report
npm run test:migration-report
```

### Playwright Configuration
```javascript
// playwright.config.migration.mjs
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/migration-validation',
  timeout: 60000,
  retries: 2,
  workers: 1, // Sequential execution for migration tests
  use: {
    baseURL: 'http://localhost:9999',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'pre-migration',
      testMatch: /pre-migration.*\.test\.js/,
    },
    {
      name: 'post-migration',
      testMatch: /post-migration.*\.test\.js/,
    },
    {
      name: 'regression',
      testMatch: /regression.*\.test\.js/,
    },
  ],
})
```

---

## Test Execution Sequence

### Phase 1: Pre-Migration (Establish Baseline)
```bash
# 1. Run database analysis
npm run test:pre-migration:database

# 2. Document API current state
npm run test:pre-migration:api

# 3. Capture UI broken flows
npm run test:pre-migration:ui

# 4. Generate baseline report
npm run test:pre-migration:report
```

### Phase 2: Execute Migration
```bash
# 1. Backup database
npm run db:backup

# 2. Run migration SQL
npm run db:migrate:shop-id-cleanup

# 3. Verify migration success
npm run db:verify-migration
```

### Phase 3: Post-Migration Validation
```bash
# 1. Validate data migration
npm run test:post-migration:data

# 2. Test API endpoints
npm run test:post-migration:api

# 3. Verify UI fixes
npm run test:post-migration:ui

# 4. Check cross-table consistency
npm run test:post-migration:integrity
```

### Phase 4: Regression Testing
```bash
# 1. Run critical user flows
npm run test:regression:flows

# 2. Test edge cases
npm run test:edge-cases

# 3. Performance benchmarks
npm run test:performance

# 4. Generate final report
npm run test:migration:final-report
```

---

## Monitoring & Observability

### Key Metrics to Track
1. **Database Metrics**
   - Row counts before/after migration
   - NULL barbershop_id count by table
   - Query execution times
   - Foreign key violation errors

2. **API Metrics**
   - Response times by endpoint
   - Error rates (4xx, 5xx)
   - Request counts by parameter (barbershop_id vs shop_id)

3. **UI Metrics**
   - Page load times
   - Calendar render time
   - User error rates
   - Console error logs

### Logging Strategy
```javascript
// Example: Enhanced logging for migration testing
const migrationLogger = {
  logQuery: (query, params, result, duration) => {
    console.log('[MIGRATION TEST]', {
      timestamp: new Date().toISOString(),
      query: query.substring(0, 100),
      params,
      rowCount: result.rows?.length,
      duration: `${duration}ms`
    })
  },

  logAPICall: (endpoint, params, status, data, duration) => {
    console.log('[MIGRATION TEST API]', {
      timestamp: new Date().toISOString(),
      endpoint,
      params,
      status,
      dataLength: JSON.stringify(data).length,
      duration: `${duration}ms`
    })
  }
}
```

---

## Reference Documentation

### Related Files
- `/docs/SCHEMA_STANDARDS.md` - Authoritative field naming reference
- `/docs/TROUBLESHOOTING.md` - Known shop_id bugs and fixes
- `/docs/SHOP_ID_MIGRATION_ANALYSIS.md` - Complete table analysis
- `/database/migrations/shop_id_to_barbershop_id_migration.sql` - Migration SQL

### Key Code Files to Test
- `/app/(protected)/dashboard/calendar/page.js` - Calendar page (fixed)
- `/app/(protected)/dashboard/settings/page.js` - Settings page (has fallback)
- `/components/navigation/ShopSelector.js` - Shop switching (has fallback)
- `/app/api/appointments/route.js` - Appointments API
- `/app/api/services/route.js` - Services API
- `/app/api/staff/route.js` - Staff API

---

## Next Steps

### Immediate Actions (Week 1)
1. [ ] Create test file structure in `/tests/migration-validation/`
2. [ ] Write pre-migration baseline tests
3. [ ] Execute pre-migration test suite
4. [ ] Document current bugs and data gaps
5. [ ] Review test results with team

### Short-Term Actions (Week 2)
1. [ ] Execute database migration
2. [ ] Run post-migration validation tests
3. [ ] Fix any migration issues discovered
4. [ ] Update API routes to reject shop_id
5. [ ] Run regression test suite

### Long-Term Actions (Week 3-4)
1. [ ] Remove all shop_id code references
2. [ ] Drop shop_id columns from tables
3. [ ] Update documentation
4. [ ] Add automated CI/CD tests
5. [ ] Monitor production metrics

---

**Document Owner**: QA Team Lead
**Status**: DRAFT - Pending Review
**Last Updated**: October 10, 2025
**Next Review**: After pre-migration tests complete

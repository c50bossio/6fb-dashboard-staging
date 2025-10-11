# Phase 3: shop_id to barbershop_id Fix Checklist

**Priority Order**: Critical → High → Medium → Low
**DO NOT make code changes yet** - This checklist is for planning only

---

## Critical Priority - Week 1 (PRODUCTION BROKEN)

### API Routes - Customer Management

- [ ] `/app/api/customers/route.js`
  - Line 26: `.eq('shop_id', barbershopId)` → `.eq('barbershop_id', barbershopId)`
  - Line 52: `.eq('shop_id', barbershopId)` → `.eq('barbershop_id', barbershopId)`
  - Line 112: `.eq('shop_id', barbershop_id)` → `.eq('barbershop_id', barbershop_id)`
  - Line 139: `shop_id: barbershop_id` → `barbershop_id: barbershop_id`
  - **Impact**: Fixes empty customer list (0 → 52 customers)
  - **Test**: GET `/api/customers?barbershop_id=<id>` should return 52 customers

### API Routes - Calendar & Appointments

- [ ] `/app/api/calendar/appointments/route.js`
  - Line 52: `.eq('shop_id', filterShopId)` → `.eq('barbershop_id', filterShopId)`
  - Line 270: `.eq('shop_id', shopId)` → `.eq('barbershop_id', shopId)`
  - Line 317: `.eq('shop_id', shopId)` → `.eq('barbershop_id', shopId)`
  - Line 363: `.eq('shop_id', shopId)` → `.eq('barbershop_id', shopId)`
  - Line 421: `.eq('shop_id', bookingData.shop_id)` → `.eq('barbershop_id', bookingData.barbershop_id)`
  - **Impact**: Fixes empty calendar
  - **Test**: Calendar page should show appointments

- [ ] `/app/(protected)/dashboard/calendar/page.js`
  - Line 52: `if (profile?.shop_id)` → `if (profile?.barbershop_id)`
  - **Impact**: Calendar loads with correct shop context
  - **Test**: Calendar page renders without errors

### Libraries - Dashboard Data

- [ ] `/lib/dashboard-data.js`
  - Line 44: `.eq('shop_id', barbershopId)` → `.eq('barbershop_id', barbershopId)`
  - Line 50: `.eq('shop_id', barbershopId)` → `.eq('barbershop_id', barbershopId)`
  - Line 56: `.eq('shop_id', barbershopId)` → `.eq('barbershop_id', barbershopId)`
  - **Impact**: Dashboard shows real metrics instead of zeros
  - **Test**: Dashboard displays revenue, customers, appointments

- [ ] `/lib/database-analytics.js`
  - Line 33: `.eq('shop_id', barbershopId)` → `.eq('barbershop_id', barbershopId)`
  - Line 164: `.eq('shop_id', barbershopId)` → `.eq('barbershop_id', barbershopId)`
  - **Impact**: Analytics queries return data
  - **Test**: Analytics page shows charts with data

### Hooks - Realtime Features

- [ ] `/hooks/useRealtimeAppointments.js`
  - Line 109: `.eq('shop_id', barbershopId)` → `.eq('barbershop_id', barbershopId)`
  - **Impact**: Live appointment updates work
  - **Test**: Create appointment, verify realtime update

### API Routes - Services

- [ ] `/app/api/services/route.js`
  - Find all `.eq('shop_id', ...)` and replace with `.eq('barbershop_id', ...)`
  - **Impact**: Service list shows all 17 services (currently shows 3)
  - **Test**: Services page shows complete list

### API Routes - Other Critical Endpoints

- [ ] `/app/api/walk-ins/route.js`
  - Line 133: `.eq('shop_id', barbershop_id)` → `.eq('barbershop_id', barbershop_id)`

- [ ] `/app/api/shop/demo-data/route.js`
  - Line 216: `.eq('shop_id', shopId)` → `.eq('barbershop_id', shopId)`

- [ ] `/app/api/debug/cleanup-database/route.js`
  - Line 32: `.eq('shop_id', barbershopId)` → `.eq('barbershop_id', barbershopId)`

- [ ] `/app/api/debug/fix-remaining-users/route.js`
  - Line 93: `.eq('shop_id', barbershopId)` → `.eq('barbershop_id', barbershopId)`

### Components - Critical UI

- [ ] `/components/FloatingAIChat.js`
  - Line 155: `.select('shop_id, role, barbershop_name')` → `.select('barbershop_id, role, barbershop_name')`
  - Line 159: `if (profileData?.shop_id)` → `if (profileData?.barbershop_id)`
  - Line 165: `.eq('id', profileData.shop_id)` → `.eq('id', profileData.barbershop_id)`
  - Line 168: `barbershop_id=${profileData.shop_id}` → `barbershop_id=${profileData.barbershop_id}`
  - Line 171: `shopId=${profileData.shop_id}` → `shopId=${profileData.barbershop_id}`
  - Line 174: `barbershop_id=${profileData.shop_id}` → `barbershop_id=${profileData.barbershop_id}`
  - Line 187: `.eq('shop_id', profileData.shop_id)` → `.eq('barbershop_id', profileData.barbershop_id)`
  - Line 198: `.eq('barbershop_id', profileData.shop_id)` → `.eq('barbershop_id', profileData.barbershop_id)` (second param)
  - Line 209: `shop_id: profileData.shop_id` → `barbershop_id: profileData.barbershop_id`
  - Line 230: `id: profileData.shop_id` → `id: profileData.barbershop_id`
  - Line 468: `barbershop_id: shopData?.shop_id || user?.id` → `barbershop_id: shopData?.barbershop_id || user?.id`
  - Line 490: `barbershop_id: shopData?.shop_id || user?.id` → `barbershop_id: shopData?.barbershop_id || user?.id`
  - Line 497: `barbershop_id: shopData?.shop_id || user?.id` → `barbershop_id: shopData?.barbershop_id || user?.id`
  - **Impact**: AI chat has business context
  - **Test**: AI chat loads and shows shop-specific insights

- [ ] `/contexts/GlobalDashboardContext.js`
  - Line 389: `.eq('shop_id', context.locationId)` → `.eq('barbershop_id', context.locationId)`

### Week 1 Testing Checklist

After completing all Week 1 fixes:

- [ ] **Unit Tests**
  - [ ] Customer API returns 52 customers
  - [ ] Services API returns 17 services
  - [ ] Appointments API returns data
  - [ ] Dashboard metrics show non-zero values

- [ ] **Integration Tests**
  - [ ] Calendar page loads and displays appointments
  - [ ] Customer list page shows all customers
  - [ ] Dashboard shows all widgets with data
  - [ ] AI chat initializes with business context

- [ ] **E2E Tests**
  - [ ] Complete booking flow works
  - [ ] Customer creation and editing works
  - [ ] Service management works
  - [ ] Shop switching works (if applicable)

- [ ] **Regression Tests**
  - [ ] No existing features broken
  - [ ] All critical user flows functional
  - [ ] Performance not degraded

---

## High Priority - Week 2 (FUNCTIONALITY DEGRADED)

### Financial Systems

- [ ] `/app/api/stripe/collect-booth-rent/route.js`
  - Line 64: `.select('shop_id, role')` → `.select('barbershop_id, role')`
  - Line 68: `if (!profile?.shop_id)` → `if (!profile?.barbershop_id)`
  - Line 132: `barbershop_id: profile.shop_id` → `barbershop_id: profile.barbershop_id`
  - Line 143: `barbershop_id: profile.shop_id` → `barbershop_id: profile.barbershop_id`
  - Line 291: `.select('shop_id, role')` → `.select('barbershop_id, role')`
  - Line 295: `if (!profile?.shop_id)` → `if (!profile?.barbershop_id)`
  - Line 332: `.eq('barbershop_id', profile.shop_id)` → `.eq('barbershop_id', profile.barbershop_id)`

- [ ] `/app/api/stripe/compensation/transfer/route.js`
  - Line 62: `.select('shop_id, role')` → `.select('barbershop_id, role')`
  - Line 66: `if (!profile?.shop_id)` → `if (!profile?.barbershop_id)`
  - Line 85: `.eq('id', profile.shop_id)` → `.eq('id', profile.barbershop_id)`
  - Line 121: `barbershop_id: profile.shop_id` → `barbershop_id: profile.barbershop_id`
  - Line 136: `barbershop_id: profile.shop_id` → `barbershop_id: profile.barbershop_id`

- [ ] `/app/api/v1/compensation/unified/route.js`
  - Line 38: `.select('shop_id')` → `.select('barbershop_id')`
  - Line 42: `if (!profile?.shop_id)` → `if (!profile?.barbershop_id)`
  - Line 46: `const barbershopId = profile.shop_id` → `const barbershopId = profile.barbershop_id`
  - Line 121: `.select('shop_id, role')` → `.select('barbershop_id, role')`
  - Line 125: `if (!profile?.shop_id)` → `if (!profile?.barbershop_id)`
  - Line 134: `const barbershopId = profile.shop_id` → `const barbershopId = profile.barbershop_id`
  - Line 219: `.select('shop_id, role')` → `.select('barbershop_id, role')`
  - Line 223: `if (!profile?.shop_id)` → `if (!profile?.barbershop_id)`
  - Line 227: `const barbershopId = profile.shop_id` → `const barbershopId = profile.barbershop_id`
  - Line 287: `.select('shop_id, role')` → `.select('barbershop_id, role')`
  - Line 291: `if (!profile?.shop_id)` → `if (!profile?.barbershop_id)`
  - Line 300: `const barbershopId = profile.shop_id` → `const barbershopId = profile.barbershop_id`

- [ ] `/app/api/payments/subscriptions/route.js`
  - Line 84: `const shop_id = searchParams.get('shop_id')` → `const barbershopId = searchParams.get('barbershop_id')`
  - Line 93-96: Update variable references
  - Line 100: `.eq('shop_id', shop_id)` → `.eq('barbershop_id', barbershopId)`
  - Line 117: `shop_id: shop_id || null` → `barbershop_id: barbershopId || null`
  - Line 188-189: Update variable references and query
  - All other shop_id references throughout file

- [ ] `/app/api/payments/methods/route.js`
  - Line 111: `const shop_id = searchParams.get('shop_id')` → `const barbershopId = searchParams.get('barbershop_id')`
  - Line 118-122: Update references and query
  - Line 237: Update field name
  - Line 440-467: Update all references

- [ ] `/app/api/payments/commissions/route.js`
  - Line 38: `const shop_id = searchParams.get('shop_id')` → `const barbershopId = searchParams.get('barbershop_id')`
  - Line 95: Update field name
  - Line 120-121: `.eq('shop_id', shop_id)` → `.eq('barbershop_id', barbershopId)`
  - Line 231: `id: payment.shop_id` → `id: payment.barbershop_id`

### Shop Selector & Multi-Location

- [ ] `/components/navigation/ShopSelector.js`
  - Line 44: `if (profile?.shop_id && shops.length > 0)` → `if (profile?.barbershop_id && shops.length > 0)`
  - Line 45: `const newSelectedShop = shops.find(shop => shop.id === profile.shop_id)` → `profile.barbershop_id`
  - Line 51: `}, [profile?.shop_id, shops, selectedShop])` → `}, [profile?.barbershop_id, shops, selectedShop])`
  - Line 83: `shop => shop.id === profile.shop_id ||` → `shop => shop.id === profile.barbershop_id ||`
  - Line 92: `shop_id: profile.shop_id` → `barbershop_id: profile.barbershop_id`
  - Line 121: `shop_id: shop.id` → `barbershop_id: shop.id` (Note: This sets the barbershop_id in profile)
  - **IMPORTANT**: Review entire file - shop switching logic is complex

- [ ] `/lib/tenant-resolver.js`
  - Line 74: `if (profile?.shop_id)` → `if (profile?.barbershop_id)`
  - Review entire file for tenant resolution logic

- [ ] `/contexts/TenantContext.js`
  - Line 64: `if (profile?.shop_id)` → `if (profile?.barbershop_id)`
  - Review entire context for state management

- [ ] `/app/api/locations/[id]/route.js`
  - Line 113: `.select('role, shop_id, barbershop_id, organization_id')` → `.select('role, barbershop_id, organization_id')`
  - Line 137: `userShopId: profile?.shop_id || profile?.barbershop_id` → `userShopId: profile?.barbershop_id`
  - Line 150: `shopId: profile?.shop_id || profile?.barbershop_id` → `shopId: profile?.barbershop_id`
  - Line 162: `userShopId: profile?.shop_id || profile?.barbershop_id` → `userShopId: profile?.barbershop_id`
  - Line 242: `.select('role, shop_id, barbershop_id, organization_id')` → `.select('role, barbershop_id, organization_id')`
  - Line 304: `.eq('shop_id', id)` → `.eq('barbershop_id', id)`

### Profile Access Patterns (High Impact)

- [ ] `/components/dashboard/UnifiedDashboard.js`
  - Line 118: `const barbershopId = profile?.barbershop_id || profile?.shop_id` → `const barbershopId = profile?.barbershop_id`
  - Line 272: `const barbershopId = profile?.barbershop_id || profile?.shop_id` → `const barbershopId = profile?.barbershop_id`
  - Line 342: `if (!dashboardData && !profile?.barbershop_id && !profile?.shop_id)` → `if (!dashboardData && !profile?.barbershop_id)`
  - Line 445: `<SmartAlertsPanel barbershop_id={profile?.barbershop_id || profile?.shop_id} />` → `barbershop_id={profile?.barbershop_id}`

- [ ] `/app/api/billing/subscription/route.js`
  - Line 23: `.select('shop_id, barbershop_id, role')` → `.select('barbershop_id, role')`
  - Line 31: `const shopId = profile?.shop_id || profile?.barbershop_id` → `const shopId = profile?.barbershop_id`

- [ ] `/app/api/v1/settings/barbershop/route.js`
  - Line 38: `const shopId = profile?.shop_id || profile?.barbershop_id` → `const shopId = profile?.barbershop_id`
  - Line 130: `const shopId = profile?.shop_id || profile?.barbershop_id` → `const shopId = profile?.barbershop_id`

- [ ] `/app/api/performance/dashboard/route.js`
  - Line 23: `.select('barbershop_id, shop_id')` → `.select('barbershop_id')`
  - Line 27: `const barbershopId = profile?.barbershop_id || profile?.shop_id` → `const barbershopId = profile?.barbershop_id`

### Settings & Configuration Pages

- [ ] `/app/(protected)/shop/settings/general/page.js`
  - Search for all `shop_id` references and replace with `barbershop_id`

- [ ] `/app/(protected)/shop/website/page.js`
  - Search for all `shop_id` references and replace with `barbershop_id`

- [ ] `/app/(protected)/dashboard/customers/page.js`
  - Search for all `shop_id` references and replace with `barbershop_id`

- [ ] `/app/(protected)/seo/dashboard/page.js`
  - Search for all `shop_id` references and replace with `barbershop_id`

### Week 2 Testing Checklist

- [ ] **Component Tests**
  - [ ] Shop selector switches shops correctly
  - [ ] Dashboard renders with all data
  - [ ] Settings pages load and save
  - [ ] Multi-location features work

- [ ] **Financial Tests**
  - [ ] Stripe payments process correctly
  - [ ] Commission calculations accurate
  - [ ] Booth rent collection works
  - [ ] Subscription management functional

- [ ] **E2E Tests**
  - [ ] Complete user flow from different roles
  - [ ] Enterprise multi-shop workflows
  - [ ] Financial transaction flows
  - [ ] Settings update flows

---

## Medium Priority - Week 3 (BACKEND & CLEANUP)

### Python Backend Services

- [ ] `/services/shop_service.py`
  - Line 203: `.eq('shop_id', shop_id)` → `.eq('barbershop_id', barbershop_id)`
  - Line 266: `.eq('shop_id', shop_id)` → `.eq('barbershop_id', barbershop_id)`
  - Line 296: `.eq('shop_id', shop_id)` → `.eq('barbershop_id', barbershop_id)`
  - Line 394: `.eq('shop_id', shop_id)` → `.eq('barbershop_id', barbershop_id)`
  - Line 442: `.eq('shop_id', shop_id)` → `.eq('barbershop_id', barbershop_id)`

- [ ] `/services/supabase_api_proxy.py`
  - Line 55: `.eq('shop_id', barbershop_id)` → `.eq('barbershop_id', barbershop_id)`
  - Line 150: `.eq('shop_id', barbershop_id)` → `.eq('barbershop_id', barbershop_id)`

- [ ] `/services/vector_store_service.py`
  - Line 174: `.eq('shop_id', barbershop_id)` → `.eq('barbershop_id', barbershop_id)`

- [ ] `/supabase_backend.py`
  - Line 517: `.eq("shop_id", barbershop_id)` → `.eq("barbershop_id", barbershop_id)`

- [ ] `/routers/shop_management.py`
  - Line 585: `.eq('shop_id', shop_id)` → `.eq('barbershop_id', barbershop_id)`

- [ ] Other Python files (12 more files)
  - Use grep to find all remaining Python files with shop_id
  - Systematically update each one

### Remaining API Routes

- [ ] `/app/api/enterprise/locations/route.js`
  - Line 35: `.select('id, role, shop_id, barbershop_id, organization_id')` → remove shop_id
  - Line 47: Update logic
  - Line 175: Similar updates

- [ ] `/app/api/user/locations/route.js`
  - Line 95: `.select('id, role, shop_id, barbershop_id, organization_id')` → remove shop_id
  - Line 107: Update logic

- [ ] `/app/api/payments/create-intent/route.js`
  - Line 48: Parameter naming
  - Line 172: Field naming
  - Line 219: Field naming

- [ ] All other API routes from grep results
  - Systematically update each remaining file

### Remaining Components

- [ ] `/components/booking/steps/PaymentStep.js`
  - Line 173: `shop_id: bookingData.location?.id || bookingData.locationDetails?.id` → `barbershop_id: ...`

- [ ] `/components/onboarding/FinancialSetupEnhanced.js`
  - Line 126: `.select('id, shop_id, barbershop_id, role')` → remove shop_id
  - Line 137: Update logic

- [ ] `/components/onboarding/CompensationSetup.js`
  - Line 62: `.select('id, shop_id, barbershop_id, role')` → remove shop_id

- [ ] All other components from grep results

### Database Migration

- [ ] **Preparation**
  - [ ] Verify all code changes deployed and tested
  - [ ] Confirm no active usage of shop_id columns
  - [ ] Full database backup

- [ ] **Migration Script** (`/database/migrations/drop_shop_id_columns.sql`)
  ```sql
  -- Drop shop_id columns from all tables
  BEGIN;

  -- Verify no data loss (shop_id should be NULL everywhere)
  DO $$
  DECLARE
    rec RECORD;
  BEGIN
    FOR rec IN
      SELECT table_name
      FROM information_schema.columns
      WHERE column_name = 'shop_id'
      AND table_schema = 'public'
    LOOP
      EXECUTE format('
        SELECT COUNT(*) FROM %I WHERE shop_id IS NOT NULL
      ', rec.table_name);

      IF FOUND THEN
        RAISE EXCEPTION 'Table % still has shop_id data', rec.table_name;
      END IF;
    END LOOP;
  END $$;

  -- Drop foreign key constraints first
  ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_shop_id_fkey;
  ALTER TABLE services DROP CONSTRAINT IF EXISTS services_shop_id_fkey;
  ALTER TABLE barbers DROP CONSTRAINT IF EXISTS barbers_shop_id_fkey;
  -- Add more as needed

  -- Drop columns
  ALTER TABLE customers DROP COLUMN IF EXISTS shop_id;
  ALTER TABLE services DROP COLUMN IF EXISTS shop_id;
  ALTER TABLE barbers DROP COLUMN IF EXISTS shop_id;
  ALTER TABLE profiles DROP COLUMN IF EXISTS shop_id;
  -- Add all other tables

  COMMIT;
  ```

- [ ] **Test Migration**
  - [ ] Run on staging database
  - [ ] Verify application still works
  - [ ] Check for any errors
  - [ ] Performance test

- [ ] **Production Migration**
  - [ ] Schedule maintenance window
  - [ ] Run migration
  - [ ] Verify success
  - [ ] Monitor application

### Linting & Prevention

- [ ] **ESLint Rule**
  ```javascript
  // .eslintrc.js
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: "MemberExpression[property.name='shop_id']",
        message: 'Use barbershop_id instead of deprecated shop_id'
      },
      {
        selector: "Literal[value='shop_id']",
        message: 'Use barbershop_id instead of deprecated shop_id'
      }
    ]
  }
  ```

- [ ] **TypeScript Types**
  - Remove shop_id from all interface definitions
  - Update type files
  - Run type checker

- [ ] **Pre-commit Hook**
  ```bash
  #!/bin/bash
  if git diff --cached | grep -E "(\.shop_id|'shop_id'|\"shop_id\")"; then
    echo "ERROR: shop_id is deprecated. Use barbershop_id"
    exit 1
  fi
  ```

### Documentation Updates

- [ ] Update `/docs/SCHEMA_STANDARDS.md`
  - Remove all shop_id examples
  - Mark as fully deprecated

- [ ] Update `/docs/SCHEMA_QUICK_REFERENCE.md`
  - Remove shop_id patterns

- [ ] Update `/CLAUDE.md`
  - Update critical section
  - Add migration completion note

- [ ] Update `/README.md`
  - Remove any shop_id references

- [ ] Update API documentation
  - All endpoints use barbershop_id

### Week 3 Testing Checklist

- [ ] **Python Service Tests**
  - [ ] All backend queries return data
  - [ ] No Python errors in logs
  - [ ] API endpoints functional

- [ ] **Database Tests**
  - [ ] All queries use barbershop_id
  - [ ] No foreign key errors
  - [ ] Performance not degraded

- [ ] **Regression Tests**
  - [ ] Full application test suite passes
  - [ ] No console errors
  - [ ] All features functional

- [ ] **Migration Verification**
  - [ ] shop_id columns dropped successfully
  - [ ] No application errors
  - [ ] All features still work

---

## Low Priority - Week 4 (DOCUMENTATION & POLISH)

### Test Files

- [ ] Update all test fixtures
- [ ] Update mock data generators
- [ ] Update test utilities
- [ ] Remove shop_id from test assertions

### Documentation Files

- [ ] Review all markdown files
- [ ] Update troubleshooting guides
- [ ] Update architecture docs
- [ ] Update API specs

### Code Comments

- [ ] Remove outdated comments referencing shop_id
- [ ] Add migration notes where helpful
- [ ] Update JSDoc comments
- [ ] Update inline documentation

---

## Validation Checklist (After Each Week)

### Week 1 Validation

- [ ] Run: `grep -r "\.eq('shop_id'," app/api/`
  - Should find 0 matches in fixed files

- [ ] Test customer API: `curl /api/customers?barbershop_id=<id>`
  - Should return 52 customers

- [ ] Test calendar page: Visit `/dashboard/calendar`
  - Should show appointments

- [ ] Test dashboard: Visit `/dashboard`
  - Should show non-zero metrics

### Week 2 Validation

- [ ] Run: `grep -r "profile?.shop_id" .`
  - Should find 0 matches in production code

- [ ] Test shop switching
  - Should update tenant context correctly

- [ ] Test financial flows
  - Payments should process correctly

### Week 3 Validation

- [ ] Run: `grep -r "shop_id" . | grep -v "barbershop_id" | grep -v ".md" | grep -v "test"`
  - Should find minimal matches (only in migration docs)

- [ ] Check database:
  ```sql
  SELECT COUNT(*) FROM information_schema.columns
  WHERE column_name = 'shop_id' AND table_schema = 'public';
  ```
  - Should return 0

- [ ] Full regression test suite
  - All tests should pass

---

## Rollback Plan (If Needed)

### Week 1 Rollback
- Revert code changes (git)
- No database changes to rollback

### Week 2 Rollback
- Revert code changes
- Clear any tenant cache
- Restart services

### Week 3 Rollback (CRITICAL)
**BEFORE Migration**:
- Keep shop_id columns for 30 days after code changes
- Don't drop columns immediately

**IF Migration Fails**:
- Restore database from backup
- Revert code changes
- Investigate issues

---

## Success Metrics

### Week 1 Success Criteria
- [ ] 0 critical bugs in production
- [ ] Calendar shows appointments
- [ ] Customer list shows all 52 customers
- [ ] Dashboard shows real metrics
- [ ] No new shop_id queries in logs

### Week 2 Success Criteria
- [ ] Shop switching works reliably
- [ ] Financial systems functional
- [ ] Multi-location features work
- [ ] 0 profile?.shop_id references in code

### Week 3 Success Criteria
- [ ] Python services updated
- [ ] Database migration complete
- [ ] 0 shop_id columns in database
- [ ] Linting prevents new shop_id usage
- [ ] Documentation updated

---

## Notes for Implementation

1. **Work in Feature Branches**
   - Create separate branches for each week
   - Week 1: `fix/critical-shop-id-migration`
   - Week 2: `fix/profile-shop-id-cleanup`
   - Week 3: `fix/database-shop-id-removal`

2. **Testing Strategy**
   - Write tests BEFORE making changes
   - Run tests after each file change
   - Don't batch changes - test incrementally

3. **Deployment Strategy**
   - Week 1: Deploy to staging first, test 24h, then production
   - Week 2: Same staged deployment
   - Week 3: Schedule maintenance window for database migration

4. **Monitoring**
   - Set up alerts for shop_id query attempts
   - Monitor error rates closely
   - Watch for performance degradation

5. **Communication**
   - Notify team before each phase
   - Update stakeholders on progress
   - Document any issues encountered

---

**REMEMBER**: DO NOT start making changes until this plan is reviewed and approved!

This checklist ensures systematic, tested, and safe migration from shop_id to barbershop_id.

# TASK BREAKDOWN: Enterprise Overview Dashboard

**Feature ID**: ENTERPRISE-DASHBOARD-001
**Specification**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)
**Created**: 2025-10-10
**Status**: Task Breakdown Phase
**Branch**: main

## Task Overview

Total Tasks: 15
Estimated Time: 7-10 hours
Complexity: Medium

## Phase 1: Backend API (Tasks 1-5)

### Task 1: Create Enterprise Overview API Endpoint
**File**: `/app/api/enterprise/overview/route.js`
**Estimated Time**: 1 hour
**Complexity**: Medium
**Dependencies**: None

**Acceptance Criteria**:
- [ ] GET endpoint created at `/api/enterprise/overview`
- [ ] Validates user authentication via Supabase Auth
- [ ] Validates user role (ENTERPRISE_OWNER or SUPER_ADMIN)
- [ ] Queries organization details from profiles table
- [ ] Counts total/active/inactive locations from barbershops table
- [ ] Aggregates metrics from location_performance_metrics (last 30 days)
- [ ] Calculates: totalRevenue, totalBookings, avgSatisfaction, avgUtilization
- [ ] Identifies top and bottom performer locations
- [ ] Returns JSON response with proper structure
- [ ] Handles errors gracefully (403 for unauthorized, 500 for database errors)
- [ ] No mock data used - all queries hit real Supabase tables

**Implementation Steps**:
1. Create route file at `/app/api/enterprise/overview/route.js`
2. Import Supabase client from `@/lib/supabase/server`
3. Implement authentication check using `supabase.auth.getUser()`
4. Query profiles table for user role and organization_id
5. Validate role is ENTERPRISE_OWNER or SUPER_ADMIN
6. Query organizations table for organization name
7. Query barbershops table to count locations
8. Query location_performance_metrics for last 30 days
9. Aggregate metrics (sum revenue, avg satisfaction, etc.)
10. Identify top/bottom performers by revenue
11. Return formatted JSON response

**Testing Requirements**:
- Unit test for aggregation logic
- Integration test with real Supabase data
- Test unauthorized access (should return 403)
- Test with empty data (should return zeros gracefully)

---

### Task 2: Create Location Performance API Endpoint
**File**: `/app/api/enterprise/locations/performance/route.js`
**Estimated Time**: 1 hour
**Complexity**: Medium
**Dependencies**: Task 1 (similar auth pattern)

**Acceptance Criteria**:
- [ ] GET endpoint created at `/api/enterprise/locations/performance`
- [ ] Accepts date range query parameter (default: 30_days)
- [ ] Validates authentication and authorization
- [ ] Queries location_performance_metrics with barbershops JOIN
- [ ] Groups metrics by location_id
- [ ] Calculates per-location: revenue, bookings, satisfaction, utilization
- [ ] Sorts locations by revenue (descending)
- [ ] Adds performanceRank to each location
- [ ] Returns array of location objects
- [ ] No mock data used

**Implementation Steps**:
1. Create route file
2. Implement same auth pattern as Task 1
3. Parse date range query parameter
4. Query location_performance_metrics with JOIN to barbershops
5. Aggregate data by location_id
6. Calculate averages for satisfaction and utilization
7. Sort by revenue and add rank
8. Return formatted array

**Testing Requirements**:
- Test with different date ranges
- Test sorting and ranking logic
- Verify RLS enforcement

---

### Task 3: Add Enterprise Routes to Navigation
**Files**:
- `/components/Navigation.js` (or sidebar component)
- `/app/(protected)/layout.js` (if needed)

**Estimated Time**: 30 minutes
**Complexity**: Low
**Dependencies**: None

**Acceptance Criteria**:
- [ ] "Enterprise" menu section added to navigation
- [ ] Menu items: Overview, Locations, Analytics, Settings
- [ ] Only visible for ENTERPRISE_OWNER and SUPER_ADMIN roles
- [ ] Links navigate to correct routes
- [ ] Active state highlights current page
- [ ] Icons included for each menu item

**Implementation Steps**:
1. Locate navigation component
2. Add conditional rendering based on user role
3. Create enterprise menu section with 4 items
4. Add icons from @heroicons/react
5. Configure active state styling

---

### Task 4: Verify RLS Policies on Database
**Location**: Supabase Dashboard or SQL query
**Estimated Time**: 30 minutes
**Complexity**: Low
**Dependencies**: None

**Acceptance Criteria**:
- [ ] RLS enabled on location_performance_metrics table
- [ ] Policy exists: Enterprise owners see their org metrics only
- [ ] Policy exists: Super admins see all metrics
- [ ] Test query with organization_id filter works
- [ ] Test query without organization_id fails (RLS blocks)
- [ ] Performance indexes exist on organization_id columns

**Implementation Steps**:
1. Connect to Supabase SQL editor
2. Verify RLS is enabled: `SELECT * FROM pg_tables WHERE tablename = 'location_performance_metrics'`
3. Check policies: `SELECT * FROM pg_policies WHERE tablename = 'location_performance_metrics'`
4. If missing, create policy filtering by organization_id
5. Verify indexes exist for performance
6. Test with sample query

**SQL to Run**:
```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'location_performance_metrics';

-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'location_performance_metrics';

-- Verify index exists
SELECT indexname FROM pg_indexes
WHERE tablename = 'location_performance_metrics' AND indexname LIKE '%organization%';
```

---

### Task 5: Seed Test Data (If Development)
**Location**: Supabase SQL editor or seed script
**Estimated Time**: 30 minutes
**Complexity**: Low
**Dependencies**: Task 4

**Acceptance Criteria**:
- [ ] Sample organization created in organizations table
- [ ] 3-5 barbershops linked to organization
- [ ] Performance metrics populated for last 30 days
- [ ] Data realistic (varies by location)
- [ ] No mock data generators - use database INSERT

**Implementation Steps**:
1. Check if organizations table has test data
2. If not, insert sample organization
3. Insert 3-5 barbershops with organization_id
4. Call existing `seed_enterprise_data()` function from phase9-10 schema
5. Verify data populated correctly

**SQL Example**:
```sql
-- Use existing seed function
SELECT seed_enterprise_data('{organization_id}');

-- Or manual inserts if needed
INSERT INTO organizations (id, name, owner_id) VALUES (...);
INSERT INTO barbershops (id, name, organization_id, ...) VALUES (...);
```

---

## Phase 2: Frontend Components (Tasks 6-11)

### Task 6: Create SummaryCards Component
**File**: `/components/enterprise/SummaryCards.js`
**Estimated Time**: 1 hour
**Complexity**: Medium
**Dependencies**: None

**Acceptance Criteria**:
- [ ] Component accepts props: revenue, locations, satisfaction, utilization, loading
- [ ] Displays 4 cards in responsive grid (1 col mobile, 2 tablet, 4 desktop)
- [ ] Each card shows: title, value, icon, colored background
- [ ] Loading state shows skeleton or "..." placeholders
- [ ] Values formatted correctly (currency for revenue, percentage for utilization)
- [ ] Icons from @heroicons/react
- [ ] Tailwind CSS for styling
- [ ] No hardcoded values - all from props

**Implementation Steps**:
1. Create component file
2. Define card data structure (title, value, icon, colors)
3. Map over cards array to render Card components
4. Add formatCurrency() helper for revenue
5. Add loading state handling
6. Style with Tailwind grid and colors
7. Export component

**Card Structure**:
- Total Revenue (green, CurrencyDollarIcon)
- Total Locations (amber, BuildingStorefrontIcon)
- Avg Satisfaction (blue, StarIcon)
- Avg Utilization (purple, ChartBarIcon)

---

### Task 7: Create PerformanceChart Component
**File**: `/components/enterprise/PerformanceChart.js`
**Estimated Time**: 1.5 hours
**Complexity**: High
**Dependencies**: Recharts library (already installed)

**Acceptance Criteria**:
- [ ] Component accepts props: data (locations array), dateRange, loading
- [ ] Uses Recharts LineChart component
- [ ] Displays revenue trends for top 5 locations
- [ ] Each location has different colored line
- [ ] X-axis shows dates
- [ ] Y-axis shows revenue
- [ ] Tooltip shows formatted values
- [ ] Legend identifies each location
- [ ] Responsive container (100% width, 400px height)
- [ ] Loading state shows skeleton
- [ ] No data state handled gracefully

**Implementation Steps**:
1. Create component file
2. Import Recharts components
3. Transform location data for chart format
4. Filter top 5 locations by revenue
5. Create line for each location
6. Configure axes, tooltip, legend
7. Add responsive container
8. Handle loading and empty states
9. Define color palette for lines

**Data Transformation**:
```javascript
// Input: locations array
// Output: chartData for Recharts
const chartData = dates.map(date => ({
  date,
  'Location A': getRevenueForDate(locationA, date),
  'Location B': getRevenueForDate(locationB, date),
  ...
}))
```

---

### Task 8: Create LocationComparisonGrid Component
**File**: `/components/enterprise/LocationComparisonGrid.js`
**Estimated Time**: 1.5 hours
**Complexity**: Medium
**Dependencies**: None

**Acceptance Criteria**:
- [ ] Component accepts props: locations, topPerformer, bottomPerformer, loading
- [ ] Displays sortable table with columns: Location, Revenue, Bookings, Satisfaction, Utilization, Status
- [ ] Click on column header to sort
- [ ] Sort direction indicator (arrow up/down)
- [ ] Click on row navigates to location dashboard
- [ ] Top performer row highlighted green
- [ ] Bottom performer row highlighted red
- [ ] Hover state on rows
- [ ] Loading state shows skeleton rows
- [ ] Mobile responsive (horizontal scroll on small screens)

**Implementation Steps**:
1. Create component file
2. Add state for sortField and sortDirection
3. Implement handleSort function
4. Create SortableHeader component
5. Sort locations array based on current sort
6. Map locations to table rows
7. Add click handler to navigate
8. Style highlights for top/bottom performers
9. Add responsive overflow-x-auto

**Sorting Logic**:
```javascript
const handleSort = (field) => {
  if (sortField === field) {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
  } else {
    setSortField(field)
    setSortDirection('desc')
  }
}
```

---

### Task 9: Create Main Dashboard Page
**File**: `/app/(protected)/enterprise/dashboard/page.js`
**Estimated Time**: 1.5 hours
**Complexity**: Medium
**Dependencies**: Tasks 6, 7, 8

**Acceptance Criteria**:
- [ ] Page component created as Next.js client component
- [ ] Uses SupabaseAuthProvider for user context
- [ ] Uses UnifiedContextProvider for organization context
- [ ] Fetches data with SWR from both API endpoints
- [ ] Auto-refreshes every 60 seconds
- [ ] Validates user role (ENTERPRISE_OWNER/SUPER_ADMIN)
- [ ] Shows unauthorized message for other roles
- [ ] Renders all components: SummaryCards, PerformanceChart, LocationComparisonGrid
- [ ] Passes correct props to each component
- [ ] Handles loading states
- [ ] Handles error states

**Implementation Steps**:
1. Create page.js in /app/(protected)/enterprise/dashboard/
2. Mark as 'use client'
3. Import all necessary components and hooks
4. Add useAuth() and useUnifiedContext() hooks
5. Add useSWR() for /api/enterprise/overview
6. Add useSWR() for /api/enterprise/locations/performance
7. Add role validation logic
8. Render dashboard layout with all components
9. Pass data from SWR to components
10. Add date range selector (future enhancement placeholder)

**SWR Configuration**:
```javascript
const { data, error, isLoading } = useSWR(
  '/api/enterprise/overview',
  fetcher,
  { refreshInterval: 60000 } // 60 seconds
)
```

---

### Task 10: Add Dashboard Header Component
**File**: `/components/enterprise/DashboardHeader.js`
**Estimated Time**: 30 minutes
**Complexity**: Low
**Dependencies**: None

**Acceptance Criteria**:
- [ ] Component shows organization name
- [ ] Displays current date range (e.g., "Last 30 Days")
- [ ] Optional: Date range selector dropdown
- [ ] Breadcrumbs: Organization → Dashboard
- [ ] Clean, professional styling

**Implementation Steps**:
1. Create component file
2. Accept props: organizationName, dateRange, onDateRangeChange
3. Render header with title and breadcrumbs
4. Add date range selector (if time permits)
5. Style with Tailwind

---

### Task 11: Add Quick Actions Component
**File**: `/components/enterprise/QuickActions.js`
**Estimated Time**: 30 minutes
**Complexity**: Low
**Dependencies**: None

**Acceptance Criteria**:
- [ ] Component shows action buttons
- [ ] "Add Location" button (navigates to /enterprise/locations with modal open)
- [ ] "View Reports" button (navigates to /enterprise/analytics)
- [ ] Clean card layout
- [ ] Icons for each action

**Implementation Steps**:
1. Create component file
2. Add button elements with navigation
3. Add icons from @heroicons/react
4. Style as card with button grid

---

## Phase 3: Integration & Testing (Tasks 12-15)

### Task 12: Integration Testing
**Location**: Browser and API testing
**Estimated Time**: 1 hour
**Complexity**: Medium
**Dependencies**: Tasks 1-11

**Acceptance Criteria**:
- [ ] Login as enterprise owner works
- [ ] Dashboard page loads without errors
- [ ] API endpoints return real data (no mock data)
- [ ] Summary cards display correct values
- [ ] Chart renders with location data
- [ ] Table displays and sorts correctly
- [ ] Clicking location navigates correctly
- [ ] Role validation prevents shop owners from accessing

**Test Steps**:
1. Start development server: `./dev-start.sh`
2. Login as enterprise owner (or create test account)
3. Navigate to /enterprise/dashboard
4. Verify all components render
5. Check browser console for errors
6. Inspect network tab - verify API calls
7. Test sorting in location grid
8. Click on location to navigate
9. Logout and login as shop owner
10. Verify dashboard is inaccessible

---

### Task 13: Write E2E Tests
**File**: `/tests/e2e/enterprise-dashboard.spec.js`
**Estimated Time**: 1 hour
**Complexity**: Medium
**Dependencies**: Task 12

**Acceptance Criteria**:
- [ ] Test file created for Playwright
- [ ] Test: Enterprise owner can view dashboard
- [ ] Test: Summary cards display
- [ ] Test: Chart renders
- [ ] Test: Location grid displays
- [ ] Test: Clicking location navigates
- [ ] Test: Shop owner cannot access (gets 403 or redirect)
- [ ] All tests pass

**Test Structure**:
```javascript
import { test, expect } from '@playwright/test'

test.describe('Enterprise Dashboard', () => {
  test('enterprise owner can view dashboard', async ({ page }) => {
    // Login
    await loginAsEnterpriseOwner(page)

    // Navigate
    await page.goto('/enterprise/dashboard')

    // Assertions
    await expect(page.locator('[data-testid="total-revenue"]')).toBeVisible()
    await expect(page.locator('[data-testid="performance-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="location-grid"]')).toBeVisible()
  })

  test('shop owner cannot access', async ({ page }) => {
    await loginAsShopOwner(page)
    await page.goto('/enterprise/dashboard')
    await expect(page.locator('[data-testid="unauthorized"]')).toBeVisible()
  })
})
```

---

### Task 14: Constitution Compliance Validation
**Location**: Manual checklist
**Estimated Time**: 30 minutes
**Complexity**: Low
**Dependencies**: All tasks

**Acceptance Criteria**:
- [ ] Principle I verified: Only Supabase PostgreSQL used (no SQLite, no local storage)
- [ ] Principle II verified: Backend API + Frontend UI both complete
- [ ] Principle III verified: No mock data anywhere (grep codebase for "generateMock")
- [ ] Principle IV verified: RLS enforced on all queries
- [ ] Principle V verified: Tests written and passing
- [ ] Principle VI verified: No AI needed for this feature
- [ ] Principle VII verified: Enterprise hierarchy supported

**Validation Steps**:
1. Search codebase for "mock" - should find zero results in new code
2. Verify all API routes query Supabase tables
3. Check RLS policies in Supabase dashboard
4. Run test suite: `npm run test:e2e`
5. Verify all 7 principles from constitution are followed

**Grep Commands**:
```bash
# Should return no results in new files
grep -r "generateMock" app/api/enterprise/
grep -r "generateMock" components/enterprise/

# Verify Supabase queries (should find many)
grep -r "supabase.from" app/api/enterprise/

# Verify no SQLite
grep -r "sqlite" app/api/enterprise/ # Should be empty
```

---

### Task 15: Final QA and Polish
**Location**: Browser testing
**Estimated Time**: 1 hour
**Complexity**: Low
**Dependencies**: Tasks 12-14

**Acceptance Criteria**:
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile responsive (test on phone viewport)
- [ ] Loading states work smoothly
- [ ] Error states handled gracefully
- [ ] No console errors or warnings
- [ ] Performance acceptable (page load < 2s)
- [ ] Accessibility: keyboard navigation works
- [ ] Colors and styling consistent with app theme

**Test Checklist**:
- [ ] Chrome desktop
- [ ] Firefox desktop
- [ ] Safari desktop
- [ ] Mobile Chrome (iPhone viewport)
- [ ] Mobile Safari (iPhone viewport)
- [ ] Tablet view (iPad viewport)
- [ ] Dark mode (if applicable)
- [ ] High contrast mode

**Polish Items**:
- [ ] Add loading skeletons for better UX
- [ ] Ensure proper spacing and alignment
- [ ] Fix any visual bugs
- [ ] Optimize image sizes (if any)
- [ ] Add helpful empty states
- [ ] Include tooltips where helpful

---

## Task Dependencies Graph

```
Task 1 (Overview API)
  ├── Task 2 (Locations API)
  ├── Task 4 (RLS Verification)
  └── Task 5 (Seed Data)

Task 6 (SummaryCards) ─┐
Task 7 (PerformanceChart) ─┤
Task 8 (LocationGrid) ─────┤
Task 10 (Header) ──────────┼─→ Task 9 (Main Page)
Task 11 (Quick Actions) ───┘

Task 3 (Navigation) → (Independent)

Task 12 (Integration) → Task 13 (E2E Tests) → Task 14 (Constitution) → Task 15 (QA)
```

## Implementation Order

**Recommended Sequence**:
1. Task 4 - Verify RLS (foundation)
2. Task 5 - Seed test data (if needed)
3. Task 1 - Overview API
4. Task 2 - Locations API
5. Task 6 - SummaryCards component
6. Task 7 - PerformanceChart component
7. Task 8 - LocationGrid component
8. Task 10 - Header component
9. Task 11 - Quick Actions component
10. Task 9 - Main dashboard page (integrates all components)
11. Task 3 - Add to navigation
12. Task 12 - Integration testing
13. Task 13 - E2E tests
14. Task 14 - Constitution validation
15. Task 15 - Final QA and polish

## Progress Tracking

**Status Legend**:
- ⬜ Not Started
- 🟡 In Progress
- ✅ Complete
- ❌ Blocked

| Task | Status | Assignee | Notes |
|------|--------|----------|-------|
| 1 | ⬜ | Claude | Overview API |
| 2 | ⬜ | Claude | Locations API |
| 3 | ⬜ | Claude | Navigation |
| 4 | ⬜ | Claude | RLS Verification |
| 5 | ⬜ | Claude | Seed Data |
| 6 | ⬜ | Claude | SummaryCards |
| 7 | ⬜ | Claude | Chart |
| 8 | ⬜ | Claude | Grid |
| 9 | ⬜ | Claude | Main Page |
| 10 | ⬜ | Claude | Header |
| 11 | ⬜ | Claude | Quick Actions |
| 12 | ⬜ | Claude | Integration |
| 13 | ⬜ | Claude | E2E Tests |
| 14 | ⬜ | Claude | Constitution |
| 15 | ⬜ | Claude | QA |

## Risk Mitigation

**Risk 1**: RLS policies may not exist
- **Mitigation**: Task 4 validates and creates if needed
- **Fallback**: Add manual RLS policy creation step

**Risk 2**: Test data may not exist
- **Mitigation**: Task 5 creates seed data
- **Fallback**: Use existing seed_enterprise_data() function

**Risk 3**: Recharts may have rendering issues
- **Mitigation**: Start with simple line chart, add complexity gradually
- **Fallback**: Use simpler charting library if needed

**Risk 4**: Integration may reveal API bugs
- **Mitigation**: Task 12 catches issues before E2E tests
- **Fallback**: Iterate on API endpoints based on frontend needs

## Definition of Done

**A task is complete when**:
✅ Code written and tested locally
✅ No console errors or warnings
✅ Constitution principles validated
✅ No mock data used
✅ Tests written (unit or E2E as appropriate)
✅ Code committed to main branch
✅ Works in development environment
✅ Ready for deployment

**Feature is complete when**:
✅ All 15 tasks marked complete
✅ Integration testing passes
✅ E2E tests pass
✅ Constitution compliance verified
✅ QA checklist complete
✅ No blocking bugs
✅ Performance acceptable
✅ Accessibility validated
✅ Documentation updated

---

**Next Step**: Begin implementation starting with Task 4 (RLS Verification)

# IMPLEMENTATION PLAN: Enterprise Overview Dashboard

**Feature ID**: ENTERPRISE-DASHBOARD-001
**Specification**: [spec.md](./spec.md)
**Created**: 2025-10-10
**Status**: Planning Phase
**Branch**: main

## Architecture Overview

### System Context

```
┌─────────────────────────────────────────────────────────┐
│                    Enterprise Owner                       │
│                  (Browser: Dashboard)                     │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ├── HTTPS/WebSocket
                        │
┌───────────────────────▼─────────────────────────────────┐
│              Next.js 14 Application                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │   /app/(protected)/enterprise/dashboard/        │   │
│  │                                                   │   │
│  │   Components:                                     │   │
│  │   - EnterpriseDashboard (main page)              │   │
│  │   - SummaryCards                                  │   │
│  │   - PerformanceChart (Recharts)                   │   │
│  │   - LocationComparisonGrid                        │   │
│  └──────────────────┬────────────────────────────────┘   │
│                     │                                     │
│  ┌──────────────────▼────────────────────────────────┐   │
│  │      API Routes (/app/api/enterprise/)           │   │
│  │   - GET /overview (org stats)                     │   │
│  │   - GET /locations/performance (location data)    │   │
│  └──────────────────┬────────────────────────────────┘   │
└────────────────────┬┼────────────────────────────────────┘
                     ││
                     ││ Supabase Client (RLS enforced)
                     ││
┌────────────────────▼▼────────────────────────────────────┐
│                 Supabase PostgreSQL                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │   Tables (existing):                               │  │
│  │   - location_performance_metrics                   │  │
│  │   - barbershops (with organization_id)             │  │
│  │   - organizations                                  │  │
│  │   - profiles (user context)                        │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  RLS Policies: Filter by organization_id                 │
└───────────────────────────────────────────────────────────┘
```

### Data Flow Sequence

```
1. User navigates to /enterprise/dashboard
   ↓
2. UnifiedContextProvider provides organization_id from profile
   ↓
3. Page component calls SWR hook: useDashboardData(organization_id)
   ↓
4. SWR fetches: GET /api/enterprise/overview
   ↓
5. API endpoint validates user role (ENTERPRISE_OWNER/SUPER_ADMIN)
   ↓
6. API queries location_performance_metrics with RLS
   ↓
7. Supabase enforces RLS: WHERE organization_id = {user_org_id}
   ↓
8. API aggregates data and returns JSON
   ↓
9. Components render with real data
   ↓
10. Charts/tables display metrics
```

## Component Breakdown

### Backend Components

#### 1. API Route: `/api/enterprise/overview/route.js`
**Purpose**: Fetch organization-wide summary statistics

**Dependencies**:
- `@/lib/supabase/server` - Supabase client
- User authentication from session

**Implementation Logic**:
```javascript
export async function GET(request) {
  // 1. Get authenticated user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 2. Validate user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (!['ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // 3. Get organization details
  const { data: organization } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', profile.organization_id)
    .single()

  // 4. Count locations
  const { data: locations, count: totalLocations } = await supabase
    .from('barbershops')
    .select('id, is_active', { count: 'exact' })
    .eq('organization_id', profile.organization_id)

  const activeLocations = locations.filter(l => l.is_active).length

  // 5. Aggregate performance metrics (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: metrics } = await supabase
    .from('location_performance_metrics')
    .select('total_revenue, total_customers, customer_satisfaction_score, capacity_utilization')
    .eq('organization_id', profile.organization_id)
    .gte('metric_date', thirtyDaysAgo.toISOString().split('T')[0])
    .eq('metric_period', 'daily')

  // 6. Calculate aggregates
  const totalRevenue = metrics.reduce((sum, m) => sum + (m.total_revenue || 0), 0)
  const totalBookings = metrics.reduce((sum, m) => sum + (m.total_customers || 0), 0)
  const avgSatisfaction = metrics.reduce((sum, m) => sum + (m.customer_satisfaction_score || 0), 0) / metrics.length
  const avgUtilization = metrics.reduce((sum, m) => sum + (m.capacity_utilization || 0), 0) / metrics.length

  // 7. Find top/bottom performers
  const { data: locationMetrics } = await supabase
    .from('location_performance_metrics')
    .select('location_id, total_revenue, barbershops(id, name)')
    .eq('organization_id', profile.organization_id)
    .gte('metric_date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('total_revenue', { ascending: false })

  // Aggregate by location
  const locationRevenue = {}
  locationMetrics.forEach(m => {
    if (!locationRevenue[m.location_id]) {
      locationRevenue[m.location_id] = {
        locationId: m.location_id,
        locationName: m.barbershops.name,
        revenue: 0
      }
    }
    locationRevenue[m.location_id].revenue += m.total_revenue
  })

  const sorted = Object.values(locationRevenue).sort((a, b) => b.revenue - a.revenue)

  // 8. Return response
  return NextResponse.json({
    success: true,
    data: {
      organizationId: organization.id,
      organizationName: organization.name,
      totalLocations,
      activeLocations,
      inactiveLocations: totalLocations - activeLocations,
      totalRevenue,
      totalBookings,
      averageSatisfaction: avgSatisfaction || 0,
      averageUtilization: avgUtilization || 0,
      topPerformer: sorted[0] || null,
      bottomPerformer: sorted[sorted.length - 1] || null
    },
    meta: {
      dateRange: '30_days',
      lastUpdated: new Date().toISOString()
    }
  })
}
```

**Error Handling**:
- Unauthorized access → 403
- Invalid organization_id → 404
- Database errors → 500 with error details
- Empty data → Return zeros with success: true

#### 2. API Route: `/api/enterprise/locations/performance/route.js`
**Purpose**: Fetch detailed performance data for all locations

**Implementation Logic**:
```javascript
export async function GET(request) {
  // Similar auth and validation as overview endpoint

  // Query location_performance_metrics grouped by location
  const { data: metrics } = await supabase
    .from('location_performance_metrics')
    .select(`
      location_id,
      total_revenue,
      total_customers,
      customer_satisfaction_score,
      capacity_utilization,
      barbershops(id, name, city, state)
    `)
    .eq('organization_id', profile.organization_id)
    .gte('metric_date', dateRangeStart)
    .lte('metric_date', dateRangeEnd)
    .eq('metric_period', 'daily')

  // Aggregate by location
  const locationData = {}
  metrics.forEach(m => {
    if (!locationData[m.location_id]) {
      locationData[m.location_id] = {
        id: m.location_id,
        name: m.barbershops.name,
        city: m.barbershops.city,
        state: m.barbershops.state,
        revenue: 0,
        bookings: 0,
        satisfactionSum: 0,
        utilizationSum: 0,
        dataPoints: 0
      }
    }
    locationData[m.location_id].revenue += m.total_revenue || 0
    locationData[m.location_id].bookings += m.total_customers || 0
    locationData[m.location_id].satisfactionSum += m.customer_satisfaction_score || 0
    locationData[m.location_id].utilizationSum += m.capacity_utilization || 0
    locationData[m.location_id].dataPoints++
  })

  // Calculate averages and add ranking
  const locations = Object.values(locationData).map(loc => ({
    id: loc.id,
    name: loc.name,
    city: loc.city,
    state: loc.state,
    revenue: loc.revenue,
    bookings: loc.bookings,
    satisfaction: loc.satisfactionSum / loc.dataPoints,
    utilization: loc.utilizationSum / loc.dataPoints,
    trend: calculateTrend(loc.id, metrics) // Helper function
  }))

  // Sort by revenue and add rank
  locations.sort((a, b) => b.revenue - a.revenue)
  locations.forEach((loc, index) => {
    loc.performanceRank = index + 1
  })

  return NextResponse.json({
    success: true,
    data: { locations }
  })
}
```

### Frontend Components

#### 3. Main Dashboard Page: `/app/(protected)/enterprise/dashboard/page.js`

**Imports**:
```javascript
'use client'

import { useAuth } from '@/components/SupabaseAuthProvider'
import { useUnifiedContext } from '@/contexts/UnifiedContextProvider'
import useSWR from 'swr'
import SummaryCards from '@/components/enterprise/SummaryCards'
import PerformanceChart from '@/components/enterprise/PerformanceChart'
import LocationComparisonGrid from '@/components/enterprise/LocationComparisonGrid'
import { useState } from 'react'
```

**Component Structure**:
```javascript
export default function EnterpriseDashboard() {
  const { profile } = useAuth()
  const { context } = useUnifiedContext()
  const [dateRange, setDateRange] = useState('30_days')

  // Data fetching with SWR (auto-refresh every 60s)
  const { data: overview, error, isLoading } = useSWR(
    `/api/enterprise/overview?range=${dateRange}`,
    fetcher,
    { refreshInterval: 60000 }
  )

  const { data: locations } = useSWR(
    `/api/enterprise/locations/performance?range=${dateRange}`,
    fetcher,
    { refreshInterval: 60000 }
  )

  // Role validation
  if (!['ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile?.role)) {
    return <UnauthorizedView />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <DashboardHeader
        organizationName={overview?.data?.organizationName}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      {/* Summary Cards */}
      <SummaryCards
        revenue={overview?.data?.totalRevenue}
        locations={overview?.data?.totalLocations}
        satisfaction={overview?.data?.averageSatisfaction}
        utilization={overview?.data?.averageUtilization}
        loading={isLoading}
      />

      {/* Performance Chart */}
      <PerformanceChart
        data={locations?.data?.locations}
        dateRange={dateRange}
        loading={!locations}
      />

      {/* Location Comparison Grid */}
      <LocationComparisonGrid
        locations={locations?.data?.locations}
        topPerformer={overview?.data?.topPerformer}
        bottomPerformer={overview?.data?.bottomPerformer}
        loading={!locations}
      />

      {/* Quick Actions */}
      <QuickActions />
    </div>
  )
}
```

#### 4. Component: `SummaryCards.js`
**Location**: `/components/enterprise/SummaryCards.js`

**Structure**:
```javascript
export default function SummaryCards({ revenue, locations, satisfaction, utilization, loading }) {
  const cards = [
    {
      title: 'Total Revenue',
      value: loading ? '...' : formatCurrency(revenue),
      icon: CurrencyDollarIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Locations',
      value: loading ? '...' : locations,
      icon: BuildingStorefrontIcon,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100'
    },
    {
      title: 'Avg Satisfaction',
      value: loading ? '...' : `${(satisfaction || 0).toFixed(1)}/5.0`,
      icon: StarIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Avg Utilization',
      value: loading ? '...' : `${((utilization || 0) * 100).toFixed(0)}%`,
      icon: ChartBarIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <Card key={index} className={card.bgColor}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{card.title}</p>
              <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
            </div>
            <card.icon className={`h-12 w-12 ${card.color}`} />
          </div>
        </Card>
      ))}
    </div>
  )
}
```

#### 5. Component: `PerformanceChart.js`
**Location**: `/components/enterprise/PerformanceChart.js`

**Uses**: Recharts `LineChart` component

**Structure**:
```javascript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function PerformanceChart({ data, dateRange, loading }) {
  if (loading) {
    return <ChartSkeleton />
  }

  // Transform data for Recharts
  const chartData = transformDataForChart(data, dateRange)

  // Get top 5 locations by revenue
  const topLocations = data
    ?.sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  return (
    <Card className="mb-8">
      <CardHeader>
        <h2 className="text-xl font-semibold">Revenue Trends - Top 5 Locations</h2>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            {topLocations.map((location, index) => (
              <Line
                key={location.id}
                type="monotone"
                dataKey={location.name}
                stroke={CHART_COLORS[index]}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

#### 6. Component: `LocationComparisonGrid.js`
**Location**: `/components/enterprise/LocationComparisonGrid.js`

**Features**: Sortable columns, click to navigate, performance indicators

**Structure**:
```javascript
export default function LocationComparisonGrid({ locations, topPerformer, bottomPerformer, loading }) {
  const [sortField, setSortField] = useState('revenue')
  const [sortDirection, setSortDirection] = useState('desc')

  const sortedLocations = locations?.sort((a, b) => {
    const aVal = a[sortField]
    const bVal = b[sortField]
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
  })

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold">Location Performance Comparison</h2>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <SortableHeader field="name" label="Location" onSort={handleSort} />
                <SortableHeader field="revenue" label="Revenue" onSort={handleSort} />
                <SortableHeader field="bookings" label="Bookings" onSort={handleSort} />
                <SortableHeader field="satisfaction" label="Satisfaction" onSort={handleSort} />
                <SortableHeader field="utilization" label="Utilization" onSort={handleSort} />
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} />
              ) : (
                sortedLocations?.map((location) => (
                  <tr
                    key={location.id}
                    className={`
                      border-b border-border cursor-pointer hover:bg-muted/50
                      ${location.id === topPerformer?.locationId ? 'bg-green-50 dark:bg-green-900/10' : ''}
                      ${location.id === bottomPerformer?.locationId ? 'bg-red-50 dark:bg-red-900/10' : ''}
                    `}
                    onClick={() => navigateToLocation(location.id)}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium">{location.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {location.city}, {location.state}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {formatCurrency(location.revenue)}
                    </td>
                    <td className="px-4 py-3">{location.bookings}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <StarIcon className="h-4 w-4 text-yellow-500 mr-1" />
                        {location.satisfaction.toFixed(1)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {(location.utilization * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3">
                      {location.id === topPerformer?.locationId && (
                        <Badge variant="success">Top Performer</Badge>
                      )}
                      {location.id === bottomPerformer?.locationId && (
                        <Badge variant="destructive">Needs Attention</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
```

## Database Considerations

### Existing Schema Validation

**Tables Required** (all exist):
✅ `location_performance_metrics` - Performance data
✅ `barbershops` - Location details with `organization_id`
✅ `organizations` - Organization details
✅ `profiles` - User context with `organization_id`

**RLS Policies Required**:
```sql
-- Already exists on location_performance_metrics
CREATE POLICY "Enterprise owners see their org metrics"
  ON location_performance_metrics
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );
```

**Performance Indexes** (verify exist):
```sql
-- Should already exist
CREATE INDEX idx_performance_org_date
  ON location_performance_metrics(organization_id, metric_date DESC);

CREATE INDEX idx_barbershops_organization_id
  ON barbershops(organization_id);
```

### Data Population Strategy

**For Development/Testing**:
```sql
-- Use existing seed function from phase9-10-enterprise-schema.sql
SELECT seed_enterprise_data('{organization_id}');

-- This creates sample performance metrics for last 30 days
```

**For Production**:
- Real metrics populated by daily cron jobs
- Data comes from actual appointments and transactions
- No migration needed (tables already exist)

## Integration Points

### 1. Authentication Integration
**Provider**: SupabaseAuthProvider
**Validation**: Check `profile.role` for ENTERPRISE_OWNER or SUPER_ADMIN
**Implementation**:
```javascript
const { profile } = useAuth()
if (!['ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile?.role)) {
  redirect('/dashboard') // Or show unauthorized message
}
```

### 2. Context Integration
**Provider**: UnifiedContextProvider
**Usage**: Get current organization_id
**Implementation**:
```javascript
const { context } = useUnifiedContext()
const organizationId = context.organizationId
```

### 3. Navigation Integration
**ShopSelector**: Link to individual location dashboards
**Breadcrumbs**: Organization → Dashboard
**Sidebar**: Add "Enterprise Dashboard" menu item

**Menu Structure**:
```javascript
{
  title: 'Enterprise',
  items: [
    { name: 'Overview', href: '/enterprise/dashboard', icon: ChartBarIcon },
    { name: 'Locations', href: '/enterprise/locations', icon: BuildingStorefrontIcon },
    { name: 'Analytics', href: '/enterprise/analytics', icon: PresentationChartLineIcon },
    { name: 'Settings', href: '/enterprise/settings', icon: CogIcon }
  ]
}
```

### 4. Real-Time Updates (Optional Phase 2)
**Technology**: SWR with auto-refresh
**Interval**: 60 seconds
**Future**: Pusher subscription for instant updates

## Testing Strategy

### Unit Tests
**Components to Test**:
- SummaryCards: Loading states, formatting, error handling
- PerformanceChart: Data transformation, chart rendering
- LocationComparisonGrid: Sorting, filtering, click handlers

**Test Files**:
- `__tests__/components/enterprise/SummaryCards.test.js`
- `__tests__/components/enterprise/PerformanceChart.test.js`
- `__tests__/components/enterprise/LocationComparisonGrid.test.js`

### API Tests
**Endpoints to Test**:
- `/api/enterprise/overview`: Auth, RLS, data aggregation
- `/api/enterprise/locations/performance`: Filtering, sorting, pagination

**Test Scenarios**:
- ✅ Authorized enterprise owner gets org data
- ✅ RLS prevents cross-organization access
- ✅ Invalid role returns 403
- ✅ Empty data returns gracefully
- ✅ Date range filtering works

### E2E Tests
**User Workflows**:
```javascript
test('Enterprise owner can view dashboard', async ({ page }) => {
  // 1. Login as enterprise owner
  await loginAsEnterpriseOwner(page)

  // 2. Navigate to dashboard
  await page.goto('/enterprise/dashboard')

  // 3. Verify summary cards display
  await expect(page.locator('[data-testid="total-revenue"]')).toBeVisible()
  await expect(page.locator('[data-testid="total-locations"]')).toBeVisible()

  // 4. Verify chart renders
  await expect(page.locator('[data-testid="performance-chart"]')).toBeVisible()

  // 5. Verify location grid displays
  await expect(page.locator('[data-testid="location-grid"]')).toBeVisible()

  // 6. Click on location to navigate
  await page.click('[data-testid="location-row-0"]')
  await expect(page).toHaveURL(/\/dashboard/)
})

test('Shop owner cannot access enterprise dashboard', async ({ page }) => {
  await loginAsShopOwner(page)
  await page.goto('/enterprise/dashboard')

  // Should redirect or show unauthorized
  await expect(page.locator('[data-testid="unauthorized"]')).toBeVisible()
})
```

### Accessibility Tests
**Requirements**:
- Keyboard navigation works
- Screen reader compatible
- ARIA labels on interactive elements
- Focus indicators visible
- Color contrast meets WCAG AA

**Test**:
```javascript
test('Dashboard is accessible', async ({ page }) => {
  await injectAxe(page)
  await page.goto('/enterprise/dashboard')
  const violations = await checkA11y(page)
  expect(violations).toHaveLength(0)
})
```

### Performance Tests
**Metrics to Validate**:
- Page load < 2 seconds
- API response < 500ms
- Chart render < 1 second
- No layout shift (CLS < 0.1)

**Test**:
```javascript
test('Dashboard loads quickly', async ({ page }) => {
  const startTime = Date.now()
  await page.goto('/enterprise/dashboard')
  await page.waitForSelector('[data-testid="summary-cards"]')
  const loadTime = Date.now() - startTime

  expect(loadTime).toBeLessThan(2000)
})
```

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing (unit, API, E2E)
- [ ] RLS policies validated
- [ ] No mock data in codebase
- [ ] Environment variables configured
- [ ] Database indexes verified
- [ ] API rate limiting configured
- [ ] Error tracking enabled (Sentry)

### Deployment Steps
1. Merge to main branch (no feature branch needed)
2. Run production build: `npm run build`
3. Verify build succeeds
4. Deploy to Vercel
5. Run post-deployment smoke tests
6. Monitor error rates for 24 hours

### Post-Deployment Validation
- [ ] Dashboard loads for enterprise users
- [ ] Data displays correctly
- [ ] Charts render properly
- [ ] Navigation works
- [ ] No console errors
- [ ] Performance metrics acceptable

## Performance Optimization

### Database Queries
**Optimization**: Use materialized views for expensive aggregations
```sql
-- Create materialized view for org-wide stats (refresh daily)
CREATE MATERIALIZED VIEW org_performance_summary AS
SELECT
  organization_id,
  SUM(total_revenue) as total_revenue,
  AVG(customer_satisfaction_score) as avg_satisfaction,
  COUNT(DISTINCT location_id) as location_count
FROM location_performance_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY organization_id;

CREATE INDEX idx_org_summary ON org_performance_summary(organization_id);

-- Refresh via cron job
REFRESH MATERIALIZED VIEW org_performance_summary;
```

### Frontend Optimization
**Strategies**:
- React.memo() on heavy components
- useMemo() for expensive calculations
- Virtual scrolling for large location lists
- Debounce search/filter inputs
- Lazy load chart library

### Caching Strategy
**SWR Configuration**:
```javascript
const { data } = useSWR('/api/enterprise/overview', fetcher, {
  refreshInterval: 60000,  // Auto-refresh every 60s
  revalidateOnFocus: false, // Don't refetch on window focus
  dedupingInterval: 5000,   // Dedupe requests within 5s
})
```

**API Caching**:
```javascript
// Add caching headers
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'private, max-age=60' // Cache for 60 seconds
  }
})
```

## Security Considerations

### RLS Enforcement
**Validation Points**:
1. API endpoint validates user role
2. Supabase RLS filters by organization_id
3. Frontend hides unauthorized features

### Input Validation
**API Endpoints**:
- Validate date range parameters
- Sanitize organization_id input
- Prevent SQL injection via parameterized queries

### Rate Limiting
**Configuration**:
```javascript
// Apply to enterprise endpoints
export const config = {
  runtime: 'edge',
  unstable_allowDynamic: ['/lib/supabase/**']
}

// Rate limit: 60 requests per minute per user
```

## Rollback Plan

### If Issues Arise
1. **Backend Issues**: Revert API routes (2 files)
2. **Frontend Issues**: Hide dashboard link in navigation
3. **Database Issues**: No schema changes = no rollback needed
4. **Performance Issues**: Disable auto-refresh, add pagination

### Monitoring
**Metrics to Watch**:
- API error rate (should be < 1%)
- Page load time (should be < 2s)
- Database query time (should be < 500ms)
- User engagement (visits per week)

## Future Enhancements (Out of Scope)

### Phase 2
- AI-generated insights on performance trends
- Predictive analytics for revenue forecasting
- Automated alerts for underperforming locations
- Custom metric widgets (drag-and-drop)

### Phase 3
- Export capabilities (PDF, CSV, Excel)
- Email/SMS performance reports
- Mobile app view
- Advanced filtering and search

### Phase 4
- Multi-organization comparison (for super admins)
- Custom date ranges and time zones
- Scheduled reports delivery
- Integration with third-party analytics

## Constitution Compliance Verification

### ✅ Principle I: Database-First Architecture
- Uses Supabase PostgreSQL exclusively
- Queries existing tables (location_performance_metrics, barbershops)
- RLS enforced on all queries
- No SQLite or local storage

### ✅ Principle II: Full-Stack Completeness
- Backend API endpoints: `/api/enterprise/overview`, `/api/enterprise/locations/performance`
- Frontend UI: Complete dashboard page with 4 components
- Integration: SWR connects API to UI
- Dashboard visibility: Accessible via enterprise menu
- End-to-end workflow: Login → View dashboard → Click location → Navigate

### ✅ Principle III: Zero Mock Data Policy
- All data from Supabase queries
- No generateMock*() functions
- No hardcoded fallback data
- Loading states for async operations
- Empty states return gracefully

### ✅ Principle IV: Multi-Tenant Security
- RLS policies enforce organization_id filtering
- Role validation in API (ENTERPRISE_OWNER, SUPER_ADMIN)
- No cross-organization data access
- Authentication middleware on all routes

### ✅ Principle V: Test-Driven Quality
- Unit tests for all components
- API endpoint integration tests
- E2E tests for complete workflows
- Accessibility tests (WCAG AA)
- Cross-browser testing planned

### ✅ Principle VI: AI-Native Development
- No AI integration needed for this feature
- (Future: AI insights on performance trends)

### ✅ Principle VII: Barber Operations Hierarchy
- Supports enterprise owner level
- Multi-location visibility
- Organization context from UnifiedContextProvider
- Scales with location count

## Sign-Off

**Plan Author**: Claude Code AI Agent
**Reviewed By**: [Pending]
**Approved**: [Pending]
**Implementation Start Date**: [TBD]

---

**Next Step**: Break down into actionable tasks (`tasks.md`)

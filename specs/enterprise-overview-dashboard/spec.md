# FEATURE SPECIFICATION: Enterprise Overview Dashboard

**Feature ID**: ENTERPRISE-DASHBOARD-001
**Created**: 2025-10-10
**Status**: Specification Phase
**Priority**: HIGH
**Branch**: main (no feature branch)

## Problem Statement

Enterprise owners managing multiple barbershop locations currently lack a centralized view of their organization's performance. They cannot easily:
- Compare performance across locations
- Identify top and bottom performing shops
- Monitor organization-wide KPIs in real-time
- Make data-driven decisions about resource allocation
- Track trends across their franchise

**Business Impact**: Without this visibility, enterprise owners struggle to optimize operations, miss opportunities to replicate successful patterns, and cannot quickly address underperforming locations.

## User Stories

### Story 1: Organization-Wide Performance View
**As an** enterprise owner
**I want to** see aggregate performance metrics across all my locations
**So that** I can understand my overall business health at a glance

**Acceptance Criteria**:
- Dashboard displays total revenue across all locations
- Shows total number of locations with active/inactive status
- Displays organization-wide booking count
- Shows average customer satisfaction score
- Presents average capacity utilization
- All metrics update in real-time from database
- No mock data is used

### Story 2: Location Comparison
**As an** enterprise owner
**I want to** compare performance metrics between my locations
**So that** I can identify which shops need support and which are performing well

**Acceptance Criteria**:
- Sortable table showing all locations with key metrics
- Columns include: Location Name, Revenue, Bookings, Satisfaction, Utilization
- Click to sort by any metric (ascending/descending)
- Visual indicators for top performers (green) and underperformers (red)
- Ability to filter by location status (active/inactive)
- Data comes from `location_performance_metrics` table

### Story 3: Performance Trends
**As an** enterprise owner
**I want to** see revenue and booking trends over time
**So that** I can identify growth patterns and seasonal variations

**Acceptance Criteria**:
- Interactive line chart showing revenue trends (last 30 days)
- Multi-line chart comparing top 5 locations
- Booking volume trend chart
- Date range selector (7 days, 30 days, 90 days)
- Charts built with Recharts library
- Data aggregated from `location_performance_metrics`

### Story 4: Quick Location Access
**As an** enterprise owner
**I want to** quickly navigate to individual location dashboards
**So that** I can drill down into specific shop details

**Acceptance Criteria**:
- Click on location name navigates to location-specific dashboard
- ShopSelector integration for easy switching
- Recent locations history
- Search/filter capability when many locations exist

## Technical Requirements

### Database Schema

**Existing Tables Used** (NO new tables needed):
```sql
-- location_performance_metrics (already exists in phase9-10-enterprise-schema.sql)
-- Columns: id, location_id, organization_id, metric_date, metric_period,
--          total_revenue, total_customers, customer_satisfaction_score,
--          capacity_utilization, staff_efficiency, etc.

-- barbershops (already exists with organization_id FK)
-- Columns: id, name, city, state, organization_id, owner_id, is_active

-- organizations (already exists)
-- Columns: id, name, description, owner_id
```

**Row Level Security (RLS)**:
- All queries MUST filter by `organization_id` from user's profile
- Enterprise owners can ONLY see their own organization's data
- Super admins can see all organizations

### API Endpoints

#### GET `/api/enterprise/overview`
**Purpose**: Fetch organization-wide summary statistics

**Request**:
```typescript
Headers: {
  Authorization: "Bearer {supabase_access_token}"
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    organizationId: string,
    organizationName: string,
    totalLocations: number,
    activeLocations: number,
    inactiveLocations: number,
    totalRevenue: number,        // Sum across all locations
    totalBookings: number,         // Sum across all locations
    averageSatisfaction: number,   // Weighted average
    averageUtilization: number,    // Weighted average
    topPerformer: {
      locationId: string,
      locationName: string,
      revenue: number
    },
    bottomPerformer: {
      locationId: string,
      locationName: string,
      revenue: number
    }
  },
  meta: {
    dateRange: string,
    lastUpdated: string
  }
}
```

**Query Logic**:
```sql
-- Aggregate from location_performance_metrics
SELECT
  SUM(total_revenue) as total_revenue,
  SUM(total_customers) as total_bookings,
  AVG(customer_satisfaction_score) as avg_satisfaction,
  AVG(capacity_utilization) as avg_utilization
FROM location_performance_metrics
WHERE organization_id = {user_org_id}
  AND metric_date >= {date_range_start}
  AND metric_date <= {date_range_end}
  AND metric_period = 'daily'
```

#### GET `/api/enterprise/locations/performance`
**Purpose**: Fetch detailed performance data for all locations

**Response**:
```typescript
{
  success: true,
  data: {
    locations: [
      {
        id: string,
        name: string,
        city: string,
        state: string,
        revenue: number,
        bookings: number,
        satisfaction: number,
        utilization: number,
        trend: 'up' | 'down' | 'stable',
        performanceRank: number
      }
    ]
  }
}
```

### Frontend Components

**Page**: `/app/(protected)/enterprise/dashboard/page.js`

**Component Hierarchy**:
```
EnterpriseDashboard
├── DashboardHeader
│   ├── OrganizationName
│   └── DateRangeSelector
├── SummaryCards (4 cards)
│   ├── TotalRevenueCard
│   ├── TotalLocationsCard
│   ├── AverageSatisfactionCard
│   └── AverageUtilizationCard
├── PerformanceChart (Recharts)
│   └── RevenueT rendLine
├── LocationComparisonGrid
│   ├── SortableTableHeader
│   ├── LocationRow (repeated)
│   └── Pagination
└── QuickActions
    ├── AddLocationButton
    └── ViewReportsButton
```

**Key Components to Build**:

1. **SummaryCards.js**
```javascript
// Display KPI cards with loading states
// Props: revenue, locations, satisfaction, utilization, loading
```

2. **PerformanceChart.js**
```javascript
// Recharts LineChart component
// Props: data, dateRange, loading
// Features: Multi-line for location comparison, tooltips, responsive
```

3. **LocationComparisonGrid.js**
```javascript
// Sortable table with all locations
// Props: locations, onSort, sortField, sortDirection, loading
// Features: Click to sort, visual indicators, click to navigate
```

4. **EnterpriseDashboard.js** (main page)
```javascript
// Orchestrates data fetching and component composition
// Uses SWR for data fetching with auto-refresh
// Integrates with UnifiedContextProvider for organization context
```

### Data Flow

```
User Loads Dashboard
    ↓
UnifiedContextProvider provides organization_id
    ↓
SWR fetches /api/enterprise/overview
    ↓
API queries location_performance_metrics with RLS
    ↓
Supabase returns real data (NO MOCK)
    ↓
Components render with loading states
    ↓
Charts/tables display real metrics
```

### Integration Points

**Authentication**:
- Uses existing SupabaseAuthProvider
- Requires ENTERPRISE_OWNER or SUPER_ADMIN role
- Validates organization_id from user profile

**Context Management**:
- Integrates with UnifiedContextProvider
- Respects current organization context
- Updates when organization changes

**Navigation**:
- Links with ShopSelector for location switching
- Breadcrumbs show: Organization → Dashboard
- Sidebar navigation includes enterprise menu

**Real-Time Updates** (Future Enhancement):
- Pusher subscriptions for live metric updates
- Auto-refresh every 60 seconds via SWR
- Visual indicators when data updates

## Non-Functional Requirements

### Performance
- Page load time: < 2 seconds
- API response time: < 500ms
- Chart rendering: < 1 second
- Support up to 100 locations without pagination

### Accessibility
- WCAG 2.2 AA compliance
- Keyboard navigation support
- Screen reader compatible
- High contrast mode support
- Focus indicators on interactive elements

### Browser Compatibility
- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Mobile Chrome (iOS/Android) ✅
- Mobile Safari (iOS) ✅

### Security
- RLS enforced on all database queries
- Organization data isolation validated
- No cross-organization data leakage
- Input sanitization on API endpoints
- Rate limiting on API routes

## Constitution Compliance Checklist

### ✅ Principle I: Database-First Architecture
- [x] Uses Supabase PostgreSQL exclusively
- [x] No SQLite or local storage
- [x] Row Level Security enabled
- [x] Queries existing tables (location_performance_metrics, barbershops)

### ✅ Principle II: Full-Stack Completeness
- [x] Backend API endpoints defined
- [x] Frontend UI components specified
- [x] Integration between layers planned
- [x] Dashboard visibility ensured
- [x] End-to-end workflow complete

### ✅ Principle III: Zero Mock Data Policy
- [x] All data from Supabase queries
- [x] No generateMock*() functions
- [x] No hardcoded fallback data
- [x] Loading states for async operations
- [x] Empty states handled gracefully

### ✅ Principle IV: Multi-Tenant Security
- [x] RLS policies enforced
- [x] Organization_id filtering in all queries
- [x] Role validation (ENTERPRISE_OWNER)
- [x] No cross-organization access

### ✅ Principle V: Test-Driven Quality
- [x] E2E tests planned for complete workflow
- [x] API endpoint tests required
- [x] Component unit tests specified
- [x] Cross-browser testing required
- [x] Accessibility tests included

### ✅ Principle VI: AI-Native Development
- [x] No AI integration needed for this feature
- [x] (Future: AI-generated insights on performance trends)

### ✅ Principle VII: Barber Operations Hierarchy
- [x] Supports enterprise owner level
- [x] Multi-location visibility
- [x] Organization context awareness
- [x] Scales with location count

## Success Metrics

**User Adoption**:
- 80% of enterprise owners access dashboard within 7 days of launch
- Average 3+ visits per week per enterprise owner
- 60% use location comparison feature

**Performance**:
- 95% of page loads < 2 seconds
- 99% API uptime
- < 1% error rate

**Business Impact**:
- Enterprise owners identify underperforming locations
- Data-driven resource allocation decisions
- Improved cross-location operational efficiency

## Risks & Mitigation

**Risk 1**: Large organizations (50+ locations) may experience slow page load
- **Mitigation**: Implement pagination, server-side filtering, data caching

**Risk 2**: Real-time data may be stale during high traffic
- **Mitigation**: SWR auto-refresh, cache invalidation strategy

**Risk 3**: RLS policies may have performance impact
- **Mitigation**: Database indexes on organization_id, query optimization

**Risk 4**: Chart rendering may be slow with large datasets
- **Mitigation**: Data aggregation at API level, client-side memoization

## Dependencies

**Existing Features Required**:
- ✅ UnifiedContextProvider (organization context)
- ✅ SupabaseAuthProvider (authentication)
- ✅ ShopSelector (navigation)
- ✅ location_performance_metrics table (already exists)
- ✅ organizations table (already exists)

**External Dependencies**:
- Recharts (already installed)
- SWR (already installed)
- Tailwind CSS (already configured)
- Headless UI (already installed)

**No New Dependencies Required**: All libraries already in package.json

## Implementation Timeline

**Phase 1: Backend API** (2-3 hours)
- Create `/api/enterprise/overview` endpoint
- Create `/api/enterprise/locations/performance` endpoint
- Implement data aggregation logic
- Add RLS validation
- Write API tests

**Phase 2: Frontend Components** (3-4 hours)
- Build SummaryCards component
- Build PerformanceChart with Recharts
- Build LocationComparisonGrid
- Create main dashboard page
- Integrate with UnifiedContextProvider

**Phase 3: Testing & Polish** (2-3 hours)
- E2E tests for dashboard loading
- Cross-browser testing
- Accessibility validation
- Performance optimization
- Loading and error states

**Total Estimate**: 7-10 hours

## Future Enhancements (Out of Scope)

- AI-generated insights on performance trends
- Predictive analytics for revenue forecasting
- Automated alerts for underperforming locations
- Export capabilities (PDF, CSV)
- Custom metric widgets
- Mobile app view

## Approval & Sign-Off

**Specification Author**: Claude Code AI Agent
**Reviewed By**: Chris Bossio (Project Owner)
**Approved**: [Pending]
**Implementation Start Date**: [TBD]

---

**Next Steps**:
1. Review specification for completeness
2. Generate implementation plan (`/speckit.plan`)
3. Break down into tasks (`/speckit.tasks`)
4. Begin implementation (`/speckit.implement`)

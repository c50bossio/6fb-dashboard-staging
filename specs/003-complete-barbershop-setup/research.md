# Research: Complete Barbershop Setup - Database-API-UI Alignment

**Feature**: 003-complete-barbershop-setup
**Date**: 2025-01-10
**Purpose**: Document technical decisions, patterns, and best practices for implementing Database→API→UI connections

## Executive Summary

This research phase establishes architectural patterns for eliminating mock data and connecting orphaned database tables to functional endpoints and UIs. All technical choices derive from existing codebase patterns and constitution requirements. No external research needed - we're applying proven internal patterns consistently across 12 components.

**Key Findings**:
1. **API Pattern**: Existing `/api/shop/products/route.js` demonstrates correct Supabase query pattern
2. **UI Pattern**: Existing `/app/(protected)/shop/financial/page.js` demonstrates proper API integration
3. **Auth Pattern**: Existing `/lib/auth-middleware.js` provides reusable authentication logic
4. **RLS Pattern**: Existing tables show standard Row Level Security policy structure

## Decision Log

### 1. Mock Data Elimination Strategy

**Decision**: Replace ALL mock data with real Supabase queries using existing patterns

**Rationale**:
- Constitution Principle III mandates zero mock data
- Existing `/api/shop/products/route.js` (lines 6-115) successfully queries Supabase without fallbacks
- Mock data in `/api/shop/schedule/route.js` (lines 11-146) and `/api/shop/customers/route.js` (lines 12-206) violates policy
- Real database queries are faster (no generation overhead) and catch integration issues early

**Implementation Pattern** (from `/api/shop/products/route.js`):
```javascript
// Correct pattern - query Supabase directly, handle empty results gracefully
const { data: items, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('barbershop_id', shopId)
  .order('created_at', { ascending: false })

if (error) {
  console.error('Database query error:', error)
  return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
}

// Return real data or empty array - NEVER mock data
return NextResponse.json({
  items: items || [],
  total: items?.length || 0
})
```

**Alternatives Considered**:
- ❌ Keep mock data for "development convenience" - Rejected because it violates constitution and creates false assumptions
- ❌ Use environment flag to toggle mock vs real - Rejected because it adds complexity and masks integration issues
- ✅ CHOSEN: Remove all mock data, seed test database instead

**Migration Strategy**:
1. Create seed data script (`database/seeds/003_test_data.sql`)
2. Replace mock generators with Supabase queries
3. Add empty state UI handling
4. Test with real database (no mocks in tests either - use test database with seed data)

---

### 2. API Authentication Pattern

**Decision**: Reuse existing authentication middleware from `/lib/auth-middleware.js`

**Rationale**:
- Existing pattern validates Supabase session and extracts user context
- Already handles development bypass for testing (lines 9-34 in various APIs)
- Consistent error responses across all endpoints
- Supports role-based access control required by Constitution Principle IV

**Implementation Pattern** (from `/api/shop/barbers/route.js`):
```javascript
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  try {
    const supabase = await createClient()

    // Development bypass for testing
    const isDevelopment = process.env.NODE_ENV === 'development'

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (!isDevelopment && (authError || !user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile and role
    let userId = user?.id
    if (isDevelopment && !userId) {
      // Fallback to first shop owner for dev testing
      const { data: devUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'SHOP_OWNER')
        .limit(1)
        .single()
      userId = devUser?.id
    }

    // Continue with authorization checks and data queries...
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Alternatives Considered**:
- ❌ Custom JWT validation - Rejected because Supabase Auth provides secure session management
- ❌ API key authentication - Rejected because it doesn't support user context for RLS
- ✅ CHOSEN: Supabase Auth with development bypass for testing

**Authorization Levels**:
- **BARBER**: Access own data only (barber_id filter)
- **SHOP_OWNER**: Access all shop data (barbershop_id filter)
- **ENTERPRISE_OWNER**: Access organization data (organization_id filter)
- **SUPER_ADMIN**: System-wide access (no filter, audit logged)

---

### 3. Row Level Security (RLS) Implementation

**Decision**: Enforce RLS policies at database level for all tables

**Rationale**:
- Constitution Principle IV requires RLS on all tables
- Defense-in-depth: Even if application code fails, database protects data
- Supabase provides built-in RLS using PostgreSQL policies
- Existing tables already demonstrate RLS pattern (see `database/barber-operations-schema.sql`)

**RLS Policy Pattern**:
```sql
-- Enable RLS on table
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view data in their barbershop
CREATE POLICY "Users can view own barbershop data" ON table_name
  FOR SELECT
  USING (
    barbershop_id IN (
      SELECT barbershop_id
      FROM barbershop_staff
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Shop owners can insert data
CREATE POLICY "Shop owners can create data" ON table_name
  FOR INSERT
  WITH CHECK (
    barbershop_id IN (
      SELECT id
      FROM barbershops
      WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data" ON table_name
  FOR UPDATE
  USING (
    barbershop_id IN (
      SELECT barbershop_id
      FROM barbershop_staff
      WHERE user_id = auth.uid()
    )
  );
```

**Table-Specific RLS Requirements**:

| Table | SELECT Policy | INSERT/UPDATE Policy | DELETE Policy |
|-------|---------------|---------------------|---------------|
| appointments | Filter by barbershop_id | Shop owner/barber can create | Shop owner only |
| customers | Filter by barbershop_id | Staff can create | Shop owner only (soft delete) |
| products | Filter by barbershop_id | Shop owner only | Shop owner only |
| product_sales | Filter by barbershop_id | Staff who made sale + shop owner | Shop owner only |
| inventory_adjustments | Filter by barbershop_id | Staff who made adjustment + shop owner | None (audit trail) |
| barber_customizations | Barber sees own, shop owner sees all | Barber creates own, shop owner approves | Shop owner only |
| barber_services | Barber sees own, customers see active | Barber creates own | Barber/shop owner |
| barber_performance_metrics | Barber sees own, shop owner sees all | System calculated only | System only |
| organizations | Filter by owner_id or membership | Enterprise owner only | Enterprise owner only |

**Alternatives Considered**:
- ❌ Application-level filtering only - Rejected due to security risk if auth bypass occurs
- ❌ Database views for filtering - Rejected because RLS is more flexible and standard in Supabase
- ✅ CHOSEN: Row Level Security with role-based policies

---

### 4. API Response Schema Standardization

**Decision**: Use consistent response structure across all endpoints

**Rationale**:
- Existing APIs show inconsistent response formats
- Standardization improves frontend error handling and type safety
- Enables reusable API client utilities
- Supports future API versioning

**Standard Response Format**:
```javascript
// Success responses
{
  data: [...], // or single object
  meta: {
    total: 100,
    page: 1,
    limit: 20,
    // Additional metadata as needed
  },
  success: true
}

// Error responses
{
  error: 'User-friendly error message',
  code: 'ERROR_CODE', // Machine-readable code
  details: {...}, // Optional validation errors
  success: false
}

// List responses with metrics
{
  items: [...],
  metrics: {
    totalItems: 100,
    activeItems: 85,
    // Domain-specific metrics
  },
  success: true
}
```

**Implementation Example**:
```javascript
// Success with data
return NextResponse.json({
  appointments: appointments || [],
  summary: {
    total: appointments?.length || 0,
    completed: appointments?.filter(a => a.status === 'completed').length || 0,
    confirmed: appointments?.filter(a => a.status === 'confirmed').length || 0
  }
})

// Error response
return NextResponse.json({
  error: 'Failed to fetch appointments',
  code: 'APPOINTMENTS_FETCH_ERROR',
  details: error.message
}, { status: 500 })
```

**Alternatives Considered**:
- ❌ GraphQL - Rejected because existing codebase uses REST, migration cost too high
- ❌ Vary response structure by endpoint - Rejected due to inconsistency and complexity
- ✅ CHOSEN: Standardized REST responses with domain-specific extensions

---

### 5. Frontend State Management Strategy

**Decision**: Use React hooks (useState, useEffect) for local state, no global state management library

**Rationale**:
- Existing pages successfully use React hooks without Redux/Zustand
- Feature scope doesn't require cross-page state sharing
- Simpler mental model and fewer dependencies
- Supabase Realtime provides server state synchronization if needed

**State Management Pattern** (from existing pages):
```javascript
'use client'

import { useState, useEffect } from 'react'

export default function Page() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const response = await fetch('/api/endpoint')
        if (!response.ok) throw new Error('Failed to fetch')
        const json = await response.json()
        setData(json.items || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  if (data.length === 0) return <EmptyState />

  return <DataTable data={data} />
}
```

**Data Fetching Patterns**:
- Server Components: Fetch data directly in component (for static/cached data)
- Client Components: Use `useState` + `useEffect` for dynamic data
- Mutations: Use form handlers with optimistic updates
- Real-time: Optional Supabase Realtime subscriptions for live updates

**Alternatives Considered**:
- ❌ Redux/Redux Toolkit - Rejected due to overkill for feature scope
- ❌ Zustand - Rejected because no cross-page state needed
- ❌ React Query/SWR - Rejected to minimize dependencies, may revisit for future optimizations
- ✅ CHOSEN: React hooks with standard patterns

---

### 6. UI Component Architecture

**Decision**: Reuse existing components from `/components/ui/`, create domain-specific components in `/components/shop/`, `/components/barber/`, `/components/enterprise/`

**Rationale**:
- Existing UI primitives (Alert, Badge, Card, etc.) provide consistent design language
- Domain components encapsulate business logic separate from primitives
- Follows established codebase pattern (see `/components/dashboard/`)
- Enables component reusability across pages

**Component Hierarchy**:
```
/components/
├── ui/                      # Reusable primitives (no business logic)
│   ├── Alert.js             # ✅ EXISTS: Reuse for error messages
│   ├── Badge.js             # ✅ EXISTS: Reuse for status indicators
│   ├── Card.js              # ✅ EXISTS: Reuse for layout containers
│   ├── Input.js             # ✅ EXISTS: Form inputs
│   └── NuclearInput.js      # ✅ EXISTS: Critical form input (95% tested)
│
├── shop/                    # Shop owner domain components
│   ├── ProductsTable.js     # ➕ NEW: Inventory table with stock indicators
│   ├── POSInterface.js      # ➕ NEW: Transaction checkout flow
│   ├── InventoryAdjustments.js # ➕ NEW: Adjustment form with reason codes
│   └── ScheduleView.js      # ✏️ UPDATE: Remove mock data, add real API calls
│
├── barber/                  # Barber domain components
│   ├── CustomizationForm.js # ➕ NEW: Branding settings (colors, images, bio)
│   ├── ServicesManager.js   # ➕ NEW: Custom services CRUD
│   └── PerformanceCharts.js # ➕ NEW: Revenue/appointments visualization
│
└── enterprise/              # Enterprise domain components
    └── MultiLocationDash.js # ➕ NEW: Org-wide metrics aggregation
```

**Component Design Principles**:
1. **Single Responsibility**: Each component handles one domain concern
2. **Props Down, Events Up**: Parent components manage state, children emit events
3. **Composition Over Inheritance**: Build complex UIs from simple components
4. **Accessibility First**: All components have proper ARIA labels and keyboard navigation
5. **Loading/Error States**: Every component handles loading, error, and empty states

**Example Component Structure**:
```javascript
// /components/shop/ProductsTable.js
export function ProductsTable({ products, onEdit, onDelete }) {
  return (
    <Card>
      <Card.Header>
        <h2>Product Inventory</h2>
      </Card.Header>
      <Card.Body>
        <Table>
          {products.map(product => (
            <Table.Row key={product.id}>
              <Table.Cell>{product.name}</Table.Cell>
              <Table.Cell>
                <Badge variant={product.current_stock <= product.min_stock_level ? 'warning' : 'success'}>
                  {product.current_stock} units
                </Badge>
              </Table.Cell>
              <Table.Cell>${product.retail_price}</Table.Cell>
              <Table.Cell>
                <Button onClick={() => onEdit(product)}>Edit</Button>
                <Button onClick={() => onDelete(product.id)}>Delete</Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table>
      </Card.Body>
    </Card>
  )
}
```

**Alternatives Considered**:
- ❌ Monolithic page components - Rejected due to poor reusability and testability
- ❌ Separate component library package - Rejected as premature optimization
- ✅ CHOSEN: Domain-organized components with UI primitive reuse

---

### 7. Database Schema Consolidation

**Decision**: Add `customers` table to `database/complete-schema.sql` and create migration

**Rationale**:
- `customers` table exists in `database/migrations/002_add_customers_table.sql` but not in main schema
- Production deployments use `complete-schema.sql` as source of truth
- Schema fragmentation causes deployment issues
- Migration ensures existing data is preserved

**Consolidation Steps**:
1. Extract `customers` table definition from `database/migrations/002_add_customers_table.sql`
2. Add to `database/complete-schema.sql` after `barbershops` table (line 138)
3. Create migration `database/migrations/003_add_customers_to_main_schema.sql` that:
   - Checks if table exists (for environments that ran migration 002)
   - Creates table if missing (for environments using complete-schema.sql)
   - Ensures RLS policies are applied
4. Update seed data to include test customers

**Schema Integration Pattern**:
```sql
-- In database/complete-schema.sql (add after barbershops table)

-- Customers table for client management
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,

  -- Contact information
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),

  -- Visit history
  total_visits INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0.00,
  last_visit_at TIMESTAMP WITH TIME ZONE,

  -- Customer engagement
  loyalty_points INTEGER DEFAULT 0,
  preferred_barber_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'vip')),

  -- Preferences and notes
  notes TEXT,
  preferences JSONB DEFAULT '{}',

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT customers_contact_check CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_barbershop ON customers(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_last_visit ON customers(last_visit_at DESC);

-- Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view customers in their barbershop" ON customers
  FOR SELECT
  USING (
    barbershop_id IN (
      SELECT barbershop_id
      FROM barbershop_staff
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can create customers" ON customers
  FOR INSERT
  WITH CHECK (
    barbershop_id IN (
      SELECT barbershop_id
      FROM barbershop_staff
      WHERE user_id = auth.uid()
    )
  );
```

**Alternatives Considered**:
- ❌ Keep separate migration files - Rejected because complete-schema.sql is deployment source
- ❌ Remove from migrations, add to schema only - Rejected because existing environments need migration path
- ✅ CHOSEN: Add to schema AND create consolidation migration

---

### 8. Testing Strategy

**Decision**: Use triple-tool approach (Jest + Playwright + Puppeteer MCP) with 85%/95% coverage targets

**Rationale**:
- Constitution Principle V requires comprehensive testing
- Critical P1 components (schedule, customers) need 95% coverage
- E2E tests catch integration issues that unit tests miss
- Existing test infrastructure already configured (see `playwright.config.js`)

**Testing Architecture**:

```
__tests__/
├── unit/                    # Fast, isolated tests
│   ├── lib/
│   │   └── api-utils.test.js    # API client utilities
│   └── utils/
│       └── data-transform.test.js # Data transformation functions
│
├── api/                     # API route integration tests
│   ├── shop/
│   │   ├── schedule.test.js      # 95% coverage (P1 critical)
│   │   ├── customers.test.js     # 95% coverage (P1 critical)
│   │   ├── products.test.js      # 85% coverage
│   │   ├── pos.test.js           # 85% coverage
│   │   └── inventory.test.js     # 85% coverage
│   ├── barber/
│   │   ├── customization.test.js # 85% coverage
│   │   ├── services.test.js      # 85% coverage
│   │   └── performance.test.js   # 85% coverage
│   └── enterprise/
│       └── organizations.test.js # 85% coverage
│
├── components/              # Component unit tests
│   ├── shop/
│   │   ├── ProductsTable.test.js
│   │   ├── POSInterface.test.js
│   │   └── InventoryAdjustments.test.js
│   ├── barber/
│   │   ├── CustomizationForm.test.js
│   │   ├── ServicesManager.test.js
│   │   └── PerformanceCharts.test.js
│   └── enterprise/
│       └── MultiLocationDash.test.js
│
└── e2e/                     # End-to-end workflow tests (Playwright)
    ├── schedule-workflow.spec.js    # P1: 100% critical paths
    ├── customers-workflow.spec.js   # P1: 100% critical paths
    ├── products-workflow.spec.js    # P2: 80% coverage
    ├── pos-workflow.spec.js         # P2: 80% coverage
    └── barber-workflow.spec.js      # P3: 80% coverage
```

**Test Patterns**:

**API Route Tests** (Jest):
```javascript
// __tests__/api/shop/schedule.test.js
import { GET } from '@/app/api/shop/schedule/route'
import { createMocks } from 'node-mocks-http'

describe('GET /api/shop/schedule', () => {
  it('returns real appointments from database', async () => {
    const { req } = createMocks({
      method: 'GET',
      query: { date: '2025-01-10' }
    })

    const response = await GET(req)
    const json = await response.json()

    expect(json.appointments).toBeInstanceOf(Array)
    expect(json.appointments).not.toContainEqual(
      expect.objectContaining({ id: 'apt-001' }) // Mock data ID
    )
  })

  it('filters appointments by barbershop_id', async () => {
    // Test RLS policy enforcement
    const response = await GET(req)
    const json = await response.json()

    const barbershopIds = json.appointments.map(a => a.barbershop_id)
    expect(new Set(barbershopIds).size).toBe(1) // Only one barbershop
  })
})
```

**Component Tests** (React Testing Library):
```javascript
// __tests__/components/shop/ProductsTable.test.js
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductsTable } from '@/components/shop/ProductsTable'

describe('ProductsTable', () => {
  const mockProducts = [
    { id: '1', name: 'Pomade', current_stock: 5, min_stock_level: 10, retail_price: 25 },
    { id: '2', name: 'Gel', current_stock: 20, min_stock_level: 10, retail_price: 20 }
  ]

  it('highlights low-stock products', () => {
    render(<ProductsTable products={mockProducts} />)

    const pomadeBadge = screen.getByText(/5 units/)
    expect(pomadeBadge).toHaveClass('bg-yellow-100') // Warning variant

    const gelBadge = screen.getByText(/20 units/)
    expect(gelBadge).toHaveClass('bg-green-100') // Success variant
  })

  it('calls onEdit when edit button clicked', () => {
    const handleEdit = jest.fn()
    render(<ProductsTable products={mockProducts} onEdit={handleEdit} />)

    fireEvent.click(screen.getAllByText('Edit')[0])
    expect(handleEdit).toHaveBeenCalledWith(mockProducts[0])
  })
})
```

**E2E Tests** (Playwright):
```javascript
// __tests__/e2e/schedule-workflow.spec.js
import { test, expect } from '@playwright/test'

test.describe('Shop Owner Schedule Management', () => {
  test.beforeEach(async ({ page }) => {
    // Seed test database with appointments
    await page.goto('/api/test/seed-appointments')

    // Login as shop owner
    await page.goto('/auth/login')
    await page.fill('[name="email"]', 'owner@shop.com')
    await page.fill('[name="password"]', 'testpass123')
    await page.click('button[type="submit"]')
  })

  test('displays real appointments from database', async ({ page }) => {
    await page.goto('/shop/bookings')

    // Wait for appointments to load
    await page.waitForSelector('[data-testid="appointment-row"]')

    // Verify no mock data IDs (mock data uses 'apt-001' pattern)
    const appointments = page.locator('[data-testid="appointment-row"]')
    const count = await appointments.count()

    for (let i = 0; i < count; i++) {
      const id = await appointments.nth(i).getAttribute('data-appointment-id')
      expect(id).not.toMatch(/^apt-\d{3}$/) // Not mock pattern
      expect(id).toMatch(/^[a-f0-9-]{36}$/) // UUID pattern
    }
  })

  test('filters appointments by barber', async ({ page }) => {
    await page.goto('/shop/bookings')

    // Select barber filter
    await page.selectOption('[data-testid="barber-filter"]', 'barber-alex-123')

    // Verify all displayed appointments are for selected barber
    const appointments = page.locator('[data-testid="appointment-row"]')
    const count = await appointments.count()

    for (let i = 0; i < count; i++) {
      const barberId = await appointments.nth(i).getAttribute('data-barber-id')
      expect(barberId).toBe('barber-alex-123')
    }
  })
})
```

**Coverage Requirements**:
- **Unit Tests**: All functions/components, 85% minimum
- **API Tests**: All endpoints, 95% for P1, 85% for P2-P3
- **Integration Tests**: Database operations, authentication flows
- **E2E Tests**: Complete user workflows, 100% for P1, 80% for P2-P3
- **Security Tests**: RLS policy enforcement, unauthorized access attempts

**Test Data Strategy**:
- ❌ Mock data generators - Violates Constitution Principle III
- ❌ Fixtures in code - Hard to maintain, not representative
- ✅ Database seed scripts - Real data inserted into test database
- ✅ Test database per developer - Isolated environments

**Alternatives Considered**:
- ❌ Manual testing only - Rejected due to regression risk and time cost
- ❌ Unit tests only - Rejected because they don't catch integration issues
- ❌ Mock database in tests - Rejected because it doesn't test real queries
- ✅ CHOSEN: Triple-tool approach with real test database

---

### 9. Error Handling and User Feedback

**Decision**: Implement consistent error handling with user-friendly messages and proper logging

**Rationale**:
- Poor error messages frustrate users and increase support burden
- Detailed logging aids debugging production issues
- Graceful degradation maintains user experience during failures
- Security: Don't expose implementation details in error messages

**Error Handling Pattern**:
```javascript
// API Route Error Handling
export async function GET(request) {
  try {
    const supabase = await createClient()

    // Validate input
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({
        error: 'Invalid date format. Please use YYYY-MM-DD.',
        code: 'INVALID_DATE_FORMAT'
      }, { status: 400 })
    }

    // Database query
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('appointment_date', date)

    if (error) {
      // Log detailed error server-side
      console.error('[API] Schedule fetch error:', {
        error: error.message,
        code: error.code,
        details: error.details,
        timestamp: new Date().toISOString()
      })

      // Return user-friendly message
      return NextResponse.json({
        error: 'Unable to load schedule. Please try again.',
        code: 'SCHEDULE_FETCH_ERROR'
      }, { status: 500 })
    }

    return NextResponse.json({
      appointments: data || [],
      total: data?.length || 0
    })

  } catch (error) {
    // Catch unexpected errors
    console.error('[API] Unexpected error:', error)
    return NextResponse.json({
      error: 'An unexpected error occurred. Please contact support if this persists.',
      code: 'UNEXPECTED_ERROR'
    }, { status: 500 })
  }
}
```

**Frontend Error Handling**:
```javascript
// Component Error Handling
export default function SchedulePage() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchSchedule() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/shop/schedule?date=2025-01-10')

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to load schedule')
        }

        const data = await response.json()
        setAppointments(data.appointments || [])

      } catch (err) {
        console.error('[UI] Schedule fetch error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchSchedule()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
        <p className="ml-3 text-gray-600">Loading schedule...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="error">
        <Alert.Icon />
        <Alert.Title>Failed to Load Schedule</Alert.Title>
        <Alert.Description>{error}</Alert.Description>
        <Alert.Actions>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </Alert.Actions>
      </Alert>
    )
  }

  if (appointments.length === 0) {
    return (
      <Card>
        <Card.Body className="text-center py-12">
          <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No appointments scheduled
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new appointment.
          </p>
          <div className="mt-6">
            <Button href="/shop/bookings/new">
              New Appointment
            </Button>
          </div>
        </Card.Body>
      </Card>
    )
  }

  return <ScheduleTable appointments={appointments} />
}
```

**Error Categories**:
1. **Validation Errors** (400): User input issues, show specific field errors
2. **Authentication Errors** (401): Session expired, redirect to login
3. **Authorization Errors** (403): Insufficient permissions, show upgrade prompt
4. **Not Found Errors** (404): Resource doesn't exist, show search/create options
5. **Server Errors** (500): Unexpected failures, show retry option and support contact

**Logging Strategy**:
- Development: Console logs with full error details
- Production: Sentry integration with error grouping and user context
- Audit trail: Record sensitive operations (customer creation, financial transactions) in separate audit log table

**Alternatives Considered**:
- ❌ Generic "Something went wrong" everywhere - Rejected due to poor UX
- ❌ Expose stack traces to users - Rejected for security reasons
- ❌ Silent failures - Rejected because users need feedback
- ✅ CHOSEN: User-friendly messages with detailed server-side logging

---

### 10. Performance Optimization Strategies

**Decision**: Implement database query optimization, pagination, and caching where appropriate

**Rationale**:
- Performance goals require sub-2 second response times
- Large datasets (5,000 customers, 100 appointments/day) need pagination
- Supabase provides built-in query optimization features
- Early optimization prevents refactoring pain later

**Optimization Techniques**:

**1. Database Indexes** (already defined in schemas):
```sql
-- Ensure proper indexes exist for common queries
CREATE INDEX IF NOT EXISTS idx_appointments_barbershop_date
  ON appointments(barbershop_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_customers_barbershop_name
  ON customers(barbershop_id, name);

CREATE INDEX IF NOT EXISTS idx_products_barbershop_stock
  ON products(barbershop_id, current_stock);
```

**2. Pagination Pattern**:
```javascript
// API with pagination support
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  const { data, error, count } = await supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('barbershop_id', barbershopId)
    .range(offset, offset + limit - 1)
    .order('last_visit_at', { ascending: false })

  return NextResponse.json({
    customers: data || [],
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
      hasMore: offset + limit < count
    }
  })
}
```

**3. Selective Column Selection**:
```javascript
// Only fetch needed columns to reduce data transfer
const { data } = await supabase
  .from('appointments')
  .select('id, appointment_date, start_time, customer_name, service_name, status')
  .eq('barbershop_id', barbershopId)
// Instead of .select('*') which fetches all columns
```

**4. Aggregation at Database Level**:
```javascript
// Calculate metrics in database instead of application
const { data: metrics } = await supabase
  .rpc('calculate_daily_metrics', {
    shop_id: barbershopId,
    metric_date: date
  })
// Database function does aggregation efficiently
```

**5. Client-Side Caching**:
```javascript
// Cache stable data in client (with stale-while-revalidate pattern)
const [services, setServices] = useState(() => {
  // Check sessionStorage for cached services
  const cached = sessionStorage.getItem('services')
  return cached ? JSON.parse(cached) : []
})

useEffect(() => {
  async function fetchServices() {
    const response = await fetch('/api/services')
    const data = await response.json()
    setServices(data.services)
    sessionStorage.setItem('services', JSON.stringify(data.services))
  }

  if (services.length === 0) {
    fetchServices()
  }
}, [])
```

**Performance Benchmarks**:
- Schedule API: < 500ms for 100 appointments
- Customer search: < 200ms for 1,000 results
- Product inventory: < 300ms for 500 products
- POS transaction: < 1 second including commission calculation
- Analytics dashboard: < 2 seconds for month-over-month metrics

**Monitoring**:
- Log query execution times in development
- Set up Vercel Analytics for production monitoring
- Alert on 95th percentile > 2 seconds
- Track slow query patterns for optimization opportunities

**Alternatives Considered**:
- ❌ Premature caching everywhere - Rejected to avoid stale data issues
- ❌ Client-side pagination - Rejected because it doesn't reduce database load
- ❌ Denormalization for performance - Rejected due to data integrity risks
- ✅ CHOSEN: Targeted optimizations based on measured bottlenecks

---

## Technology Choices Summary

| Category | Choice | Rationale |
|----------|--------|-----------|
| **Database** | Supabase PostgreSQL | Constitution requirement, RLS built-in, real-time capabilities |
| **Backend** | Next.js API Routes | Unified codebase, serverless deployment, existing pattern |
| **Frontend** | Next.js 14 App Router | Server/client components, file-based routing, RSC support |
| **Authentication** | Supabase Auth | Integrated with database, supports OAuth, session management |
| **State Management** | React hooks | Simple, no external dependencies, sufficient for feature scope |
| **UI Components** | Headless UI + Tailwind | Accessible primitives, existing design system |
| **Testing** | Jest + Playwright + Puppeteer MCP | Comprehensive coverage, existing infrastructure |
| **Validation** | Zod | Type-safe validation, existing usage in codebase |
| **Real-time** | (Optional) Pusher | Already configured, not required for MVP |

---

## Best Practices Summary

### Database Operations
✅ **DO**:
- Always filter queries by `barbershop_id` or `organization_id`
- Use parameterized queries (Supabase handles this)
- Handle empty results gracefully (return empty arrays, not mock data)
- Log query errors with context for debugging
- Implement pagination for lists that could grow large
- Use database-level aggregation for metrics

❌ **DON'T**:
- Expose database errors directly to users
- Query without authentication checks
- Use `SELECT *` when only specific columns needed
- Generate mock data as fallback
- Perform cross-organization queries without admin role check

### API Design
✅ **DO**:
- Use consistent response format across all endpoints
- Validate input with Zod schemas
- Return appropriate HTTP status codes
- Include user-friendly error messages
- Log errors with full context server-side
- Implement development bypass for testing

❌ **DON'T**:
- Return different response structures per endpoint
- Trust client input without validation
- Expose implementation details in errors
- Skip authentication checks in development
- Return 200 status for errors

### Frontend Development
✅ **DO**:
- Show loading states during data fetching
- Display user-friendly error messages with retry options
- Handle empty states with calls-to-action
- Use existing UI components for consistency
- Implement proper ARIA labels for accessibility
- Test across browsers (Chrome, Firefox, Safari)

❌ **DON'T**:
- Assume data is always present (check for null/undefined)
- Skip error handling (all async operations can fail)
- Use inline styles (use Tailwind classes)
- Create UI components without accessibility considerations
- Ignore mobile responsiveness

### Testing
✅ **DO**:
- Write tests before implementation (TDD for critical paths)
- Use real test database with seed data
- Test RLS policies explicitly
- Cover happy path and error scenarios
- Run E2E tests across browsers
- Achieve 95% coverage for P1, 85% for P2-P3

❌ **DON'T**:
- Use mock data in tests (violates constitution)
- Skip authentication in test setup
- Test only happy paths
- Ignore accessibility in E2E tests
- Skip cross-browser testing

---

## Implementation Checklist

Before proceeding to Phase 1 (Design & Contracts), verify:

- [x] All technical decisions documented with rationale
- [x] Existing patterns identified and referenced
- [x] Constitution principles validated against approach
- [x] Performance targets established and achievable
- [x] Testing strategy comprehensive and constitution-compliant
- [x] Security considerations (RLS, auth, input validation) addressed
- [x] No unresolved technical unknowns remain

**Phase 0 Complete**: Ready to proceed to Phase 1 (Data Model & Contracts)

---

**Next Steps**:
1. Phase 1: Generate `data-model.md` with entity definitions
2. Phase 1: Generate API contracts in `/contracts/` directory
3. Phase 1: Create `quickstart.md` for developers
4. Phase 1: Update agent context with technology choices

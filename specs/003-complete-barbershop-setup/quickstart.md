# Quickstart Guide: Complete Barbershop Setup Feature

**Feature**: Database-API-UI Alignment for Production Launch
**Version**: 1.0.0
**Created**: 2025-01-10

## Overview

This guide helps developers get started with implementing the Complete Barbershop Setup feature. This feature eliminates all mock data from the application and establishes complete Database→API→UI connections for production readiness.

---

## Prerequisites

### Required Software
- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **Git**: Latest version
- **Docker**: Latest version (for containerized development)
- **Supabase Account**: Active project with credentials

### Required Environment Variables

Create a `.env.local` file in the project root:

```bash
# Core Services (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Development Settings
NODE_ENV=development

# AI Services (Optional for this feature)
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Payment Processing (Optional for this feature)
STRIPE_SECRET_KEY=your-stripe-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-publishable-key

# SMS Notifications (Optional for this feature)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-number
```

### Supabase Setup

1. **Create Tables**: Run the schema migrations in order:
   ```bash
   # Main schema (if not already created)
   psql $DATABASE_URL < database/complete-schema.sql

   # Barber operations schema
   psql $DATABASE_URL < database/barber-operations-schema.sql

   # Customer schema
   psql $DATABASE_URL < database/schemas/customers.sql
   ```

2. **Enable Row Level Security (RLS)**:
   - All tables must have RLS enabled
   - Policies are included in schema files
   - Verify RLS is active: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;`

3. **Seed Test Data** (optional for development):
   ```bash
   psql $DATABASE_URL < database/seeds/seed-barbershops.sql
   psql $DATABASE_URL < database/seeds/seed-customers.sql
   psql $DATABASE_URL < database/seeds/seed-products.sql
   ```

---

## Getting Started

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd 6FB\ AI\ Agent\ System

# Install dependencies
npm install

# Verify installation
npm run check-env  # Validates environment variables
```

### 2. Database Setup

```bash
# Test Supabase connection
node test-supabase-access.js

# Expected output:
# ✅ Successfully connected to Supabase
# ✅ Found X barbershops
# ✅ Connection verified
```

### 3. Start Development Environment

#### Option A: Docker (Recommended)

```bash
# Start all services (frontend + backend + database)
./docker-dev-start.sh

# Verify services are running
docker compose ps

# Expected output:
# NAME                 STATUS              PORTS
# frontend             Up                  0.0.0.0:9999->9999/tcp
# backend              Up                  0.0.0.0:8001->8000/tcp

# View logs
docker compose logs -f
```

#### Option B: Manual Start

```bash
# Terminal 1 - Frontend (Next.js)
npm run dev
# Access at http://localhost:9999

# Terminal 2 - Backend (FastAPI)
python fastapi_backend.py
# Access at http://localhost:8001
```

### 4. Verify Setup

```bash
# Health checks
curl http://localhost:9999/api/health  # Frontend
curl http://localhost:8001/health      # Backend

# Test database connection via API
curl http://localhost:9999/api/shop/barbers \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN"
```

---

## Architecture Overview

### Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend**: Next.js API Routes + FastAPI (Python)
- **Database**: Supabase PostgreSQL with Row Level Security
- **Authentication**: Supabase Auth
- **Testing**: Jest, React Testing Library, Playwright

### Directory Structure

```
6FB AI Agent System/
├── app/
│   ├── (protected)/shop/         # Protected shop owner pages
│   │   ├── schedule/             # Schedule management UI (needs mock data removal)
│   │   ├── customers/            # Customer management UI (needs mock data removal)
│   │   ├── products/             # Product management UI (exists, works)
│   │   ├── pos/                  # ➕ NEW: POS system UI
│   │   ├── inventory/            # ➕ NEW: Inventory management UI
│   │   └── performance/          # ➕ NEW: Performance analytics UI
│   ├── (protected)/barber/       # ➕ NEW: Barber-specific pages
│   │   ├── profile/              # ➕ NEW: Barber customization
│   │   ├── services/             # ➕ NEW: Custom services
│   │   └── analytics/            # ➕ NEW: Personal analytics
│   ├── (protected)/enterprise/   # ➕ NEW: Enterprise management
│   │   └── locations/            # ➕ NEW: Multi-location management
│   ├── api/
│   │   └── shop/
│   │       ├── schedule/         # ✏️ FIX: Remove mock data
│   │       ├── customers/        # ✏️ FIX: Remove mock data
│   │       ├── products/         # ✅ EXISTS: Working correctly
│   │       ├── pos/              # ➕ NEW: POS API
│   │       ├── inventory/        # ➕ NEW: Inventory API
│   │       ├── barber-custom/    # ➕ NEW: Barber customization API
│   │       ├── barber-services/  # ➕ NEW: Barber services API
│   │       ├── performance/      # ➕ NEW: Performance metrics API
│   │       └── organizations/    # ➕ NEW: Organizations API
│   └── [barbershop]/[barber]/    # ➕ NEW: Dynamic barber landing pages
├── components/
│   ├── pos/                      # ➕ NEW: POS components
│   ├── inventory/                # ➕ NEW: Inventory components
│   ├── barber-landing/           # ➕ NEW: Barber page components
│   └── performance/              # ➕ NEW: Performance charts
├── database/
│   ├── complete-schema.sql       # Main database schema
│   ├── barber-operations-schema.sql  # Barber-specific tables
│   └── schemas/customers.sql     # Customer table
├── specs/003-complete-barbershop-setup/
│   ├── spec.md                   # Feature specification
│   ├── plan.md                   # Implementation plan
│   ├── research.md               # Technical decisions
│   ├── data-model.md             # Data model documentation
│   ├── contracts/                # API contracts (OpenAPI specs)
│   └── quickstart.md             # This file
└── __tests__/                    # Test files

Legend:
✅ EXISTS - Already implemented and working
✏️ FIX - Needs modification (remove mock data)
➕ NEW - Needs to be created
```

---

## Development Workflow

### Working with the Feature Branch

```bash
# This feature is on branch: 003-complete-barbershop-setup
git checkout 003-complete-barbershop-setup

# Keep branch up to date with main
git fetch origin
git merge origin/main  # Resolve conflicts if any

# Make changes and commit
git add .
git commit -m "feat: implement [component name]"

# Push changes
git push origin 003-complete-barbershop-setup
```

### API Development Pattern

**Standard Pattern** (from `research.md`):

```javascript
// app/api/shop/[endpoint]/route.js
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const supabase = await createClient()

    // 1. Authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get user's barbershop (RLS filtering)
    const { data: shops, error: shopError } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (shopError || !shops) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    // 3. Query data with RLS filtering
    const { data: items, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('barbershop_id', shops.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database query error:', error)
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }

    // 4. Return data (empty array, NEVER mock data)
    return NextResponse.json({
      items: items || [],
      total: items?.length || 0
    })

  } catch (error) {
    console.error('Error in API route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Critical Rules**:
- ✅ Always use real Supabase queries
- ✅ Return empty arrays when no data exists
- ❌ NEVER return mock data or hardcoded objects
- ✅ Always filter by `barbershop_id` (RLS)
- ✅ Handle errors gracefully with user-friendly messages

### UI Development Pattern

```javascript
// app/(protected)/shop/[page]/page.js
'use client'
import { useState, useEffect } from 'react'

export default function PageName() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/shop/endpoint')
        if (!response.ok) throw new Error('Failed to fetch')

        const result = await response.json()
        setData(result.items || [])
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

  return (
    <div>
      {data.map(item => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  )
}
```

---

## Testing Strategy

### Running Tests

```bash
# Unit tests (Jest + React Testing Library)
npm test                    # Run all unit tests
npm run test:watch          # Watch mode
npm run test:coverage       # Generate coverage report

# E2E tests (Playwright)
npm run test:e2e            # Run E2E tests
npm run test:e2e:headed     # Run with browser visible
npm run test:e2e:debug      # Debug mode

# Critical component tests
npm run test:nuclear        # Nuclear Input component (95% coverage required)
```

### Test Coverage Requirements

- **Critical Components**: 95% coverage (e.g., NuclearInput, authentication)
- **Standard Components**: 85% coverage minimum
- **API Routes**: 85% coverage minimum

### Writing Tests

**API Route Test Example**:

```javascript
// __tests__/api/shop/customers.test.js
import { GET } from '@/app/api/shop/customers/route'
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server')

describe('GET /api/shop/customers', () => {
  it('returns customers for authenticated user', async () => {
    // Mock Supabase client
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null
        })
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'shop-1' },
              error: null
            })
          }))
        }))
      }))
    }

    createClient.mockResolvedValue(mockSupabase)

    const response = await GET()
    const data = await response.json()

    expect(data.customers).toBeDefined()
    expect(Array.isArray(data.customers)).toBe(true)
  })
})
```

**Component Test Example**:

```javascript
// __tests__/components/CustomerList.test.jsx
import { render, screen, waitFor } from '@testing-library/react'
import CustomerList from '@/components/CustomerList'

global.fetch = jest.fn()

describe('CustomerList', () => {
  it('displays customers when loaded', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        customers: [
          { id: '1', name: 'John Smith', total_visits: 10 }
        ]
      })
    })

    render(<CustomerList />)

    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument()
    })
  })

  it('displays empty state when no customers', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ customers: [] })
    })

    render(<CustomerList />)

    await waitFor(() => {
      expect(screen.getByText(/no customers/i)).toBeInTheDocument()
    })
  })
})
```

---

## Common Issues & Troubleshooting

### Issue: "Unauthorized" Error from API

**Cause**: Missing or invalid Supabase auth token

**Solution**:
```bash
# 1. Verify Supabase credentials in .env.local
cat .env.local | grep SUPABASE

# 2. Check user is logged in
# Navigate to /login and sign in

# 3. Verify token in browser console
localStorage.getItem('supabase.auth.token')
```

### Issue: "No shop found for user"

**Cause**: User's profile doesn't have an associated barbershop

**Solution**:
```sql
-- Check user's profile
SELECT * FROM profiles WHERE id = 'user-id';

-- Check barbershop ownership
SELECT * FROM barbershops WHERE owner_id = 'user-id';

-- If missing, create a test barbershop
INSERT INTO barbershops (id, name, owner_id, address, city, state, zip_code)
VALUES (
  gen_random_uuid(),
  'Test Barbershop',
  'user-id',
  '123 Main St',
  'New York',
  'NY',
  '10001'
);
```

### Issue: RLS Policy Blocking Queries

**Cause**: Row Level Security policies not allowing access

**Solution**:
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'your_table';

-- View existing policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- Test query with service role (bypasses RLS)
-- Use SUPABASE_SERVICE_ROLE_KEY in API for testing
```

### Issue: Mock Data Still Appearing

**Cause**: API route hasn't been updated or is falling back to mock data

**Solution**:
```bash
# 1. Check API route file
cat app/api/shop/[route]/route.js | grep -i "mock"

# 2. Ensure no mock data arrays exist
# Look for: const mockData = [...], const MOCK_ = [...]

# 3. Restart development server
npm run dev  # or ./docker-dev-start.sh
```

### Issue: Database Connection Timeouts

**Cause**: Supabase connection issues or rate limiting

**Solution**:
```bash
# 1. Check Supabase project status
# Visit: https://app.supabase.com/project/[your-project]

# 2. Verify connection pooling
# Supabase has built-in pooling, but check for:
# - Too many open connections
# - Long-running queries

# 3. Test connection
node test-supabase-access.js
```

---

## API Reference

All API contracts are documented in OpenAPI 3.0 format in the `/contracts/` directory:

- **Schedule API**: `contracts/schedule-api.yaml`
- **Customers API**: `contracts/customers-api.yaml`
- **POS API**: `contracts/pos-api.yaml`
- **Inventory API**: `contracts/inventory-api.yaml`
- **Barber Customization API**: `contracts/barber-custom-api.yaml`
- **Barber Services API**: `contracts/barber-services-api.yaml`
- **Performance API**: `contracts/performance-api.yaml`
- **Organizations API**: `contracts/organizations-api.yaml`

### Viewing API Docs

```bash
# Install Swagger UI (optional)
npm install -g swagger-ui-watcher

# View any contract
swagger-ui-watcher specs/003-complete-barbershop-setup/contracts/schedule-api.yaml
```

---

## Data Model Reference

Complete data model documentation is available in:
```
specs/003-complete-barbershop-setup/data-model.md
```

**Key Entities**:
1. Appointment - Schedule management
2. Customer - Customer profiles and loyalty
3. Product - Product catalog
4. Product Sale - POS transactions
5. Inventory Adjustment - Inventory tracking
6. Barber Customization - Individual barber branding
7. Barber Service - Custom services per barber
8. Barber Performance Metrics - Performance tracking
9. Organization - Multi-location enterprises
10. Financial Arrangement - Payment arrangements

---

## Performance Guidelines

### API Response Times
- **Target**: <2 seconds for typical daily load
- **Search/Filter**: <1 second
- **POS Transaction**: <60 seconds complete workflow

### Optimization Strategies

1. **Pagination**: Implement for lists with >50 items
   ```javascript
   const { data, error } = await supabase
     .from('table_name')
     .select('*')
     .range(start, end)  // e.g., .range(0, 19) for first 20
   ```

2. **Selective Columns**: Only fetch needed columns
   ```javascript
   .select('id, name, email')  // Not .select('*')
   ```

3. **Indexes**: Ensure database indexes exist
   ```sql
   CREATE INDEX idx_customers_barbershop ON customers(barbershop_id);
   CREATE INDEX idx_appointments_date ON appointments(appointment_date);
   ```

4. **Client-Side Caching**: Cache API responses
   ```javascript
   // Use React Query or SWR
   import useSWR from 'swr'

   const { data, error } = useSWR('/api/shop/customers', fetcher, {
     revalidateOnFocus: false,
     dedupingInterval: 60000  // 1 minute
   })
   ```

---

## Next Steps

1. **Review Feature Specification**: Read `spec.md` for complete requirements
2. **Review Implementation Plan**: Read `plan.md` for architecture decisions
3. **Review Data Model**: Read `data-model.md` for entity relationships
4. **Run `/speckit.tasks`**: Generate numbered implementation tasks
5. **Start Implementation**: Follow task order from tasks.md

### Recommended Implementation Order

**Phase 1: Critical Mock Data Removal (P1)**
1. Fix `/api/shop/schedule` - Remove ALL mock data
2. Fix `/api/shop/customers` - Remove ALL mock data
3. Fix `/api/services` - Remove mock fallback

**Phase 2: POS System (P1)**
4. Create `/api/shop/pos` API
5. Create POS UI components
6. Integrate with inventory

**Phase 3: Inventory Management (P1)**
7. Create `/api/shop/inventory` API
8. Create inventory UI
9. Implement low stock alerts

**Phase 4: Barber Features (P2)**
10. Create barber customization API & UI
11. Create barber services API & UI
12. Create performance metrics API & UI

**Phase 5: Enterprise Features (P3)**
13. Create organizations API & UI
14. Implement cross-location analytics

---

## Additional Resources

- **Project Documentation**: `/docs/`
- **Constitution**: `.specify/memory/constitution.md` (7 core principles)
- **Full-Stack Protocol**: `FULLSTACK_DEVELOPMENT_PROTOCOL.md`
- **Supabase Production Rule**: `SUPABASE_PRODUCTION_RULE.md`
- **Claude Code Instructions**: `CLAUDE.md`

---

## Support & Questions

For questions or issues:
1. Check this quickstart guide
2. Review `plan.md` for technical decisions
3. Check `research.md` for implementation patterns
4. Review API contracts in `/contracts/` directory

---

**Last Updated**: 2025-01-10
**Feature Branch**: `003-complete-barbershop-setup`
**Status**: Phase 1 Complete - Ready for Implementation

# Implementation Plan: Complete Barbershop Setup - Database-API-UI Alignment

**Branch**: `003-complete-barbershop-setup` | **Date**: 2025-01-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-complete-barbershop-setup/spec.md`

## Summary

This feature eliminates critical mock data violations and establishes complete Database→API→UI connections for 12 barbershop management components. Primary requirement: Replace mock data in schedule and customer APIs with real Supabase queries, then systematically connect 7 orphaned database tables to functional API endpoints and UI pages. Technical approach follows strict Supabase-only architecture with Next.js 14 App Router for frontend, Next.js API Routes for primary backend, and comprehensive RLS policies for multi-tenant data isolation.

**Critical Production Blockers (P1)**:
- `/api/shop/schedule` returns exclusively mock data - must query `appointments` table
- `/api/shop/customers` returns exclusively mock data - must query `customers` table
- `/api/services` has mock fallback - must remove and query `services` table only

**Missing Full-Stack Implementations (P2-P3)**:
- Products management UI (`/shop/products/page.js`)
- Point-of-sale system (API + UI for `product_sales` table)
- Inventory adjustments (API + UI for `inventory_adjustments` table)
- Barber customizations (API + UI for `barber_customizations` table)
- Barber services (API + UI for `barber_services` table)
- Barber performance metrics (API connecting to `barber_performance_metrics` table)
- Enterprise organizations (API + UI for `organizations` table)

## Technical Context

**Language/Version**: JavaScript ES2022+ (Next.js 14, Node.js 18+)

**Primary Dependencies**:
- **Frontend**: Next.js 14.0+ (App Router), React 18.2+, Tailwind CSS 3.3+, Headless UI 1.7+
- **Backend**: Next.js API Routes, @supabase/supabase-js 2.38+, Zod 3.22+ (validation)
- **Authentication**: Supabase Auth with session management
- **Real-time**: Pusher (optional for live updates, not required for this feature)

**Storage**:
- Supabase PostgreSQL (ONLY database - no SQLite, no JSON files)
- Existing tables: `appointments`, `services`, `products`, `product_sales`, `inventory_adjustments`, `barber_customizations`, `barber_services`, `barber_performance_metrics`, `organizations`, `barbershop_staff`, `financial_arrangements`
- Missing table: `customers` (exists in migrations but not in `database/complete-schema.sql`)
- All tables MUST have Row Level Security (RLS) policies enforced

**Testing**:
- Jest 29.7+ with React Testing Library for unit tests
- Playwright 1.40+ for E2E tests (primary)
- Puppeteer MCP (debugging support)
- Target coverage: 85% minimum, 95% for critical components

**Target Platform**:
- Web application (responsive design for desktop + mobile browsers)
- Browsers: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Mobile: Chrome Mobile, Safari Mobile

**Project Type**: Web application (frontend + backend in unified Next.js 14 App Router project)

**Performance Goals**:
- API response times < 2 seconds (95th percentile) for typical loads
- Schedule page load < 2 seconds for 50 appointments
- Customer search < 1 second for 5,000 customer databases
- Product inventory view < 1 second for 100 products
- POS transaction completion < 60 seconds end-to-end

**Constraints**:
- ZERO mock data allowed (Constitution Principle III)
- ALL data operations MUST query Supabase (Constitution Principle I)
- MUST implement complete Database→API→UI stack for each feature (Constitution Principle II)
- MUST use Row Level Security on all tables (Constitution Principle IV)
- MUST achieve 85%+ test coverage (Constitution Principle V)
- Existing UI component patterns must be followed (reuse from `/components/`)
- Existing authentication middleware must be reused (`/lib/auth-middleware.js`)

**Scale/Scope**:
- Target users: 10-50 barbershops initially, scale to 500+ shops
- Database: 5,000-10,000 customers per shop, 50-100 appointments per day per shop
- API endpoints: 12 new routes + 3 critical fixes to existing routes
- UI pages: 6 new dashboard pages + updates to 3 existing pages
- Total functional requirements: 67 (prioritized P1-P3)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ **Principle I: Database-First Architecture**

**Status**: PASS - Feature enforces Supabase PostgreSQL exclusively

- All mock data removal directly supports this principle
- Feature creates/updates Supabase queries only
- No SQLite, no JSON files, no in-memory storage introduced
- Row Level Security required on all new/updated queries
- Supabase Auth integration maintained throughout

**Action Required**: Consolidate `customers` table schema from migrations into `database/complete-schema.sql`

### ✅ **Principle II: Full-Stack Completeness**

**Status**: PASS - Feature explicitly addresses incomplete implementations

- Primary goal is to connect orphaned database tables to APIs and UIs
- Every new API endpoint paired with corresponding UI page
- Existing APIs with missing UIs get UI implementations (products, barber services)
- Existing UIs with mock data get real API connections (schedule, customers)
- Dashboard visibility included for all features

**Validation**:
- FR-001 to FR-005: Schedule API + existing UI integration
- FR-006 to FR-012: Customer API + existing UI integration
- FR-013 to FR-019: Existing products API + NEW products UI
- FR-020 to FR-028: NEW POS API + NEW POS UI
- FR-029 to FR-036: NEW inventory API + NEW inventory UI
- FR-037 to FR-045: NEW barber customization API + NEW barber customization UI
- FR-046 to FR-052: NEW barber services API + connect to existing UI
- FR-053 to FR-059: NEW performance API + connect to existing analytics UI
- FR-060 to FR-064: NEW organizations API + NEW enterprise UI

### ✅ **Principle III: Zero Mock Data Policy**

**Status**: PASS - Feature eliminates all mock data violations

- **P1 Critical Fixes**:
  - FR-001: Replace mock data in `/api/shop/schedule/route.js` with real `appointments` queries
  - FR-006: Replace mock data in `/api/shop/customers/route.js` with real `customers` queries
  - FR-065-067: Remove mock data fallback from `/api/services/route.js`

- **Prevention Measures**:
  - All new API endpoints query Supabase tables directly
  - Empty states handled with proper UI messaging (not mock arrays)
  - Loading states shown during database queries
  - Error states handled gracefully with user feedback

**Enforcement**: Code reviews MUST reject any PR containing:
- `generateMock*()` function patterns
- Hardcoded fallback data arrays
- Conditional mock data based on environment
- Placeholder data objects

### ✅ **Principle IV: Multi-Tenant Security**

**Status**: PASS - All queries respect organization boundaries

- **RLS Policy Requirements**:
  - All queries MUST filter by `barbershop_id` or `organization_id`
  - User authentication verified before data access
  - Role-based filtering: BARBER sees own data, SHOP_OWNER sees shop data, ENTERPRISE_OWNER sees org data

- **Implementation Pattern** (applied to all endpoints):
  ```javascript
  // 1. Authenticate user
  const { data: { user }, error } = await supabase.auth.getUser()

  // 2. Get user's barbershop/organization context
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, barbershop_id, organization_id')
    .eq('id', user.id)
    .single()

  // 3. Query with proper filters
  const { data } = await supabase
    .from('table_name')
    .select('*')
    .eq('barbershop_id', profile.barbershop_id) // RLS enforces this
  ```

- **Table-Specific Security**:
  - `appointments`: Filter by barbershop_id
  - `customers`: Filter by barbershop_id
  - `products`: Filter by barbershop_id
  - `product_sales`: Filter by barbershop_id, link to barber for commission visibility
  - `barber_customizations`: Barbers see own, shop owners see all in shop
  - `barber_services`: Barbers see own, used in booking availability
  - `barber_performance_metrics`: Barbers see own metrics only
  - `organizations`: Enterprise owners see own organization only

### ✅ **Principle V: Test-Driven Quality**

**Status**: PASS - Comprehensive testing strategy defined

- **Coverage Targets**:
  - Schedule/Customer APIs (P1 critical): 95% coverage required
  - All other APIs: 85% minimum coverage
  - UI components: 85% minimum coverage
  - E2E workflows: 100% coverage for P1, 80% for P2-P3

- **Test Categories Required**:
  - **Unit Tests**: All API route handlers, data transformation functions
  - **Integration Tests**: Database queries, API endpoint contracts
  - **E2E Tests**: Complete workflows (shop owner views schedule, processes POS sale, etc.)
  - **Contract Tests**: API responses match expected schemas
  - **Security Tests**: RLS policies enforced, unauthorized access blocked

- **Testing Infrastructure**:
  - Jest + React Testing Library for unit/component tests
  - Playwright for E2E (Chrome, Firefox, Safari)
  - Supabase test database with seed data
  - Mock Supabase auth for isolated tests
  - Test data factories (no mock generators, actual DB inserts)

### ✅ **Principle VI: AI-Native Development**

**Status**: NOT APPLICABLE - Feature does not involve AI agents

This feature focuses on data infrastructure and UI connections. No AI agent integration required. Future features may add AI insights to analytics dashboards.

### ✅ **Principle VII: Barber Operations Hierarchy**

**Status**: PASS - Feature respects existing hierarchy

- **Individual Barber Features**:
  - FR-037-045: Barber customizations for personal landing pages
  - FR-046-052: Barber-specific services with custom pricing
  - FR-053-059: Barber performance analytics (own data only)

- **Shop Owner Features**:
  - FR-001-005: Schedule management (all barbers in shop)
  - FR-006-012: Customer management (shop-wide database)
  - FR-013-019: Product inventory management
  - FR-020-028: POS system with barber commission tracking
  - FR-029-036: Inventory adjustments with audit trail
  - View switching capability maintained (shop owner can view barber dashboards read-only)

- **Enterprise Owner Features**:
  - FR-060-064: Organizations API for multi-location management
  - Aggregated metrics across all shops in organization
  - Cross-location reporting capabilities

- **Financial Model Support**:
  - Commission calculation uses existing `financial_arrangements` table
  - POS transactions record barber commissions based on arrangement type
  - Supports commission, booth rent, and hybrid models

**Hierarchy Enforcement**:
- RLS policies prevent data leakage between levels
- API queries filtered by appropriate scope (barber_id, barbershop_id, organization_id)
- UI displays data appropriate to user role

### Summary

**GATE RESULT: ✅ PASS**

All seven constitution principles are satisfied. No violations require justification.

**Pre-Implementation Requirements**:
1. Consolidate `customers` table schema into `database/complete-schema.sql`
2. Verify all existing tables have RLS policies defined
3. Set up test database with seed data for development
4. Document API authentication patterns for consistency

**Post-Implementation Validation**:
- Zero mock data in codebase (automated grep check)
- All 12 components have functional Database→API→UI stacks
- Test coverage meets 85%/95% thresholds
- RLS policies tested for all new/updated tables
- Cross-browser E2E tests passing

## Project Structure

### Documentation (this feature)

```
specs/003-complete-barbershop-setup/
├── spec.md                  # Feature specification (complete)
├── plan.md                  # This file (in progress)
├── research.md              # Phase 0 output (next step)
├── data-model.md            # Phase 1 output
├── quickstart.md            # Phase 1 output
├── contracts/               # Phase 1 output
│   ├── schedule-api.yaml    # Schedule API contract
│   ├── customers-api.yaml   # Customers API contract
│   ├── products-api.yaml    # Products API contract
│   ├── pos-api.yaml         # POS API contract
│   ├── inventory-api.yaml   # Inventory API contract
│   ├── barber-custom-api.yaml   # Barber customizations API
│   ├── barber-services-api.yaml # Barber services API
│   ├── performance-api.yaml     # Performance metrics API
│   └── organizations-api.yaml   # Organizations API
├── checklists/
│   └── requirements.md      # Spec quality checklist (complete)
└── tasks.md                 # Phase 2 output (/speckit.tasks command - NOT created yet)
```

### Source Code (repository root)

```
# Web Application Structure (Next.js 14 App Router)

app/
├── api/                     # Backend API Routes
│   ├── shop/
│   │   ├── schedule/route.js        # ✏️ FIX: Remove mock data, query appointments
│   │   ├── customers/route.js       # ✏️ FIX: Remove mock data, query customers
│   │   ├── products/route.js        # ✅ EXISTS: Already queries products table
│   │   ├── products/[id]/route.js   # ✅ EXISTS: Product CRUD operations
│   │   ├── pos/route.js             # ➕ NEW: POS transaction API
│   │   ├── inventory/route.js       # ➕ NEW: Inventory adjustments API
│   │   └── financial/
│   │       └── arrangements/route.js # ✅ EXISTS: Financial arrangements
│   ├── barber/
│   │   ├── customization/route.js   # ➕ NEW: Barber customizations API
│   │   ├── services/route.js        # ➕ NEW: Barber-specific services API
│   │   └── performance/route.js     # ➕ NEW: Performance metrics API
│   ├── enterprise/
│   │   └── organizations/route.js   # ➕ NEW: Multi-location management API
│   └── services/route.js            # ✏️ FIX: Remove mock fallback
│
├── (protected)/             # Protected dashboard routes
│   ├── shop/
│   │   ├── dashboard/page.js        # ✅ EXISTS: Shop dashboard
│   │   ├── products/page.js         # ➕ NEW: Products management UI
│   │   ├── pos/page.js              # ➕ NEW: Point-of-sale UI
│   │   ├── inventory/page.js        # ➕ NEW: Inventory adjustments UI
│   │   ├── bookings/page.js         # ✏️ UPDATE: Connect to real schedule API
│   │   ├── services/page.js         # ✅ EXISTS: Services management
│   │   ├── financial/page.js        # ✅ EXISTS: Financial arrangements
│   │   └── analytics/page.js        # ✅ EXISTS: Analytics dashboard
│   ├── barber/
│   │   ├── customize/page.js        # ➕ NEW: Barber customization UI
│   │   ├── services/page.js         # ✏️ UPDATE: Connect to barber services API
│   │   └── analytics/page.js        # ✏️ UPDATE: Connect to performance API
│   ├── enterprise/
│   │   └── dashboard/page.js        # ➕ NEW: Multi-location dashboard
│   └── dashboard/
│       └── customers-enhanced/page.js # ✏️ UPDATE: Connect to real customers API
│
components/
├── shop/                    # Shop-specific components
│   ├── ProductsTable.js     # ➕ NEW: Product inventory table
│   ├── POSInterface.js      # ➕ NEW: POS transaction interface
│   ├── InventoryAdjustments.js # ➕ NEW: Inventory adjustment form
│   └── ScheduleView.js      # ✏️ UPDATE: Remove mock data assumptions
├── barber/                  # Barber-specific components
│   ├── CustomizationForm.js # ➕ NEW: Branding settings form
│   ├── ServicesManager.js   # ➕ NEW: Custom services management
│   └── PerformanceCharts.js # ➕ NEW: Analytics visualization
├── enterprise/              # Enterprise components
│   └── MultiLocationDash.js # ➕ NEW: Org-wide metrics
└── ui/                      # Reusable UI primitives
    └── [existing components] # ✅ REUSE: Alert, Badge, Card, etc.

lib/
├── supabase/
│   ├── server.js            # ✅ EXISTS: Server-side client initialization
│   └── client.js            # ✅ EXISTS: Client-side initialization
├── auth-middleware.js       # ✅ EXISTS: Authentication checks
└── api.js                   # ✅ EXISTS: Frontend API client utilities

database/
├── complete-schema.sql      # ✏️ UPDATE: Add customers table schema
├── barber-operations-schema.sql # ✅ EXISTS: Barber tables already defined
├── migrations/              # Supabase migrations
│   └── 003_add_customers_to_main_schema.sql # ➕ NEW: Consolidation migration
└── seeds/
    └── 003_test_data.sql    # ➕ NEW: Seed data for testing

__tests__/
├── api/
│   ├── shop/
│   │   ├── schedule.test.js         # ➕ NEW: Schedule API tests (95% coverage)
│   │   ├── customers.test.js        # ➕ NEW: Customers API tests (95% coverage)
│   │   ├── products.test.js         # ➕ NEW: Products API tests
│   │   ├── pos.test.js              # ➕ NEW: POS API tests
│   │   └── inventory.test.js        # ➕ NEW: Inventory API tests
│   ├── barber/
│   │   ├── customization.test.js    # ➕ NEW: Customization API tests
│   │   ├── services.test.js         # ➕ NEW: Services API tests
│   │   └── performance.test.js      # ➕ NEW: Performance API tests
│   └── enterprise/
│       └── organizations.test.js    # ➕ NEW: Organizations API tests
├── components/
│   └── [component tests]    # ➕ NEW: Component unit tests (85% coverage)
└── e2e/
    ├── schedule-workflow.spec.js    # ➕ NEW: Schedule E2E tests
    ├── customers-workflow.spec.js   # ➕ NEW: Customers E2E tests
    ├── products-workflow.spec.js    # ➕ NEW: Products E2E tests
    ├── pos-workflow.spec.js         # ➕ NEW: POS E2E tests
    └── barber-workflow.spec.js      # ➕ NEW: Barber features E2E tests
```

**Structure Decision**:

Selected **Web Application Structure** because:
1. Feature involves both frontend and backend modifications
2. Next.js 14 App Router provides unified structure (not separate frontend/backend folders)
3. API Routes colocated with pages in `/app` directory
4. Existing project already uses this structure

**Key Patterns**:
- ✅ **EXISTS**: Component/API already implemented, reuse as-is
- ✏️ **FIX/UPDATE**: Component/API needs modification (remove mock data, add real queries)
- ➕ **NEW**: Component/API needs to be created from scratch

**File Creation Summary**:
- New API routes: 9
- API routes to fix: 3
- New UI pages: 6
- UI pages to update: 4
- New React components: 9
- New test files: ~25
- Database migrations: 1

## Complexity Tracking

*No violations of Constitution principles require justification. This section intentionally left empty.*

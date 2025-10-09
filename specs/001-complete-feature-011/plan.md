# Implementation Plan: Complete Feature 011 - Public Booking & Staff Onboarding

**Branch**: `001-complete-feature-011` | **Date**: 2025-10-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-complete-feature-011/spec.md`

## Summary

Complete the missing frontend components for Feature 011 (Holistic Staff Management) to bridge the gap between existing backend infrastructure and user-facing functionality. The backend already has database migrations, API routes, and business logic utilities implemented. This plan focuses on creating:

1. **Staff Onboarding Wizard** - 4-step admin interface to add new barbers and generate booking links
2. **Public Booking Pages** - Unauthenticated pages at `/book/[staffSlug]` with real-time availability and Stripe payment
3. **Staff Analytics Dashboard** - Performance metrics with RBAC enforcement
4. **Migration Wizard** - Tool to migrate existing barbers from `[barberId]` to `[staffSlug]` system

**Technical Approach**: Leverage existing Feature 011 API endpoints (`/api/book/[staffSlug]/*`) and utilities (`lib/slug-generator.ts`, `lib/availability-calculator.ts`). Build React components that integrate with Supabase for data and Stripe for payments, following full-stack completeness principles.

## Technical Context

**Language/Version**: JavaScript/TypeScript (Next.js 14 App Router, React 18)
**Primary Dependencies**:
- Next.js 14 with App Router
- React 18 (client/server components)
- Tailwind CSS + Headless UI
- FullCalendar.io Premium (booking calendar)
- Stripe React SDK (payment processing)
- Supabase JavaScript SDK (database client)

**Storage**: Supabase PostgreSQL with existing Feature 011 schema:
- Tables: `profiles` (with `booking_slug`, `bio`, `specialties`), `bookings` (with `booking_source`), `staff_availability`, `cancellation_policies`
- All tables have Row Level Security (RLS) policies implemented

**Testing**:
- Playwright for E2E tests (primary)
- Jest + React Testing Library for unit tests
- Puppeteer MCP for debugging
- Triple-tool validation approach

**Target Platform**: Web (Next.js server + client components), responsive design for mobile web
**Project Type**: Web application (frontend + backend API routes)

**Performance Goals**:
- Onboarding wizard completion: < 5 minutes
- Public booking flow: < 3 minutes
- Availability calculation: < 500ms for 30-day range
- Page load time: < 2 seconds (First Contentful Paint)

**Constraints**:
- MUST use existing Feature 011 API routes (no new backend endpoints required)
- MUST prevent double-bookings with row-level locking
- MUST enforce RBAC (barbers see only their bookings, admins see all)
- MUST integrate with Stripe (no test mode shortcuts in production)
- MUST work with existing Supabase schema (no migration changes)

**Scale/Scope**:
- Expected users: 50-100 barbershops initially, scaling to 1000+
- Concurrent bookings: Up to 100 simultaneous users during peak hours
- Barbers per shop: 1-50 (typical 5-10)
- Components to build: ~8 major components, ~15 sub-components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. Database-First Architecture
- **STATUS**: PASS - All data operations use existing Supabase tables
- **EVIDENCE**: No new tables needed, all queries use `profiles`, `bookings`, `staff_availability` tables
- **NO VIOLATIONS**: No SQLite, no local JSON, no in-memory storage

### ✅ II. Full-Stack Completeness
- **STATUS**: PASS - This plan completes the missing frontend for existing backend
- **EVIDENCE**:
  - Backend API endpoints exist (`/api/book/[staffSlug]/*`)
  - This plan creates corresponding UI components
  - Integration points clearly defined in spec
- **NO VIOLATIONS**: Every API endpoint will have UI representation after completion

### ✅ III. Zero Mock Data Policy
- **STATUS**: PASS - All components will query real Supabase data
- **EVIDENCE**:
  - Spec explicitly requires real database operations (FR-007)
  - No mock data generators in requirements
  - Loading/empty states specified for zero-data scenarios
- **NO VIOLATIONS**: No `generateMock*()` functions planned

### ✅ IV. Multi-Tenant Security
- **STATUS**: PASS - RBAC enforcement required throughout
- **EVIDENCE**:
  - FR-011 enforces RBAC permissions
  - Existing RLS policies on database tables
  - Barber-only and admin-only views specified
- **NO VIOLATIONS**: All queries will respect `organization_id` and RLS

### ✅ V. Test-Driven Quality
- **STATUS**: PASS - Comprehensive E2E tests required
- **EVIDENCE**:
  - All 4 user stories have independent test scenarios
  - Success criteria include specific test coverage
  - Triple-tool testing approach specified
- **COVERAGE TARGETS**:
  - Critical: StaffOnboardingWizard component (95%)
  - Other components: 85% minimum

### ✅ VI. AI-Native Development
- **STATUS**: N/A - No AI agent integration required for this feature
- **REASON**: This is a booking/admin UI feature, not business intelligence

### ✅ VII. Barber Operations Hierarchy
- **STATUS**: PASS - Implements individual barber layer
- **EVIDENCE**:
  - Personal booking pages at `/book/[staffSlug]`
  - Custom branding via bio/photo/specialties
  - RBAC for barber-level data isolation
  - Shop owner can onboard/manage barbers

**GATE RESULT**: ✅ ALL GATES PASSED - Proceed to Phase 0 Research

## Project Structure

### Documentation (this feature)

```
specs/001-complete-feature-011/
├── spec.md                    # Feature specification (COMPLETE)
├── checklists/
│   └── requirements.md        # Validation checklist (COMPLETE)
├── plan.md                    # This file (/speckit.plan output)
├── research.md                # Phase 0 output (PENDING)
├── data-model.md              # Phase 1 output (PENDING)
├── quickstart.md              # Phase 1 output (PENDING)
├── contracts/                 # Phase 1 output (PENDING)
│   ├── staff-onboarding-api.yaml
│   ├── public-booking-api.yaml
│   └── staff-analytics-api.yaml
└── tasks.md                   # Phase 2 output (/speckit.tasks - NOT created yet)
```

### Source Code (repository root)

```
# Next.js 14 App Router structure (web application)

app/
├── (protected)/                              # Authenticated routes
│   ├── admin/
│   │   └── staff/
│   │       ├── onboard/
│   │       │   └── page.js                   # NEW: Onboarding wizard page
│   │       ├── analytics/
│   │       │   └── page.js                   # NEW: Staff analytics page
│   │       └── migrate/
│   │           └── page.js                   # NEW: Migration wizard page
│   └── shop/
│       └── settings/
│           └── staff/
│               └── page.js                   # EXISTS: Staff permissions (extend for onboarding)
│
├── book/
│   ├── [barberId]/                           # EXISTS: Old booking system
│   │   ├── page.js                           # Keep for backward compatibility
│   │   └── layout.js
│   └── [staffSlug]/                          # NEW: Feature 011 booking pages
│       ├── page.js                           # NEW: Main booking page
│       ├── layout.js                         # NEW: Public layout
│       └── loading.js                        # NEW: Loading state
│
└── api/
    └── book/
        └── [staffSlug]/                      # EXISTS: Feature 011 API routes
            ├── route.ts                      # Staff profile API (COMPLETE)
            ├── services/route.ts             # Services list API (COMPLETE)
            ├── availability/route.ts         # Availability API (COMPLETE)
            └── create/route.ts               # Booking creation API (COMPLETE)

components/
├── staff/                                    # NEW: Staff management components
│   ├── StaffOnboardingWizard.js             # NEW: 4-step wizard
│   ├── OnboardingStep1BasicInfo.js          # NEW: Step 1 - Basic info
│   ├── OnboardingStep2Services.js           # NEW: Step 2 - Service assignment
│   ├── OnboardingStep3Financial.js          # NEW: Step 3 - Commission config
│   ├── OnboardingStep4Review.js             # NEW: Step 4 - Review & generate
│   ├── StaffAnalyticsCard.js                # NEW: Analytics summary
│   ├── StaffMigrationWizard.js              # NEW: Migration tool
│   └── BookingSourceBreakdown.js            # NEW: Source analytics
│
├── booking/                                  # NEW: Public booking components
│   ├── PublicBookingPage.js                 # NEW: Main booking interface
│   ├── StaffProfileCard.js                  # NEW: Barber bio/photo display
│   ├── ServiceSelector.js                   # NEW: Service selection UI
│   ├── AvailabilityCalendar.js              # NEW: Calendar with slots
│   ├── BookingForm.js                       # NEW: Customer info form
│   ├── StripePaymentForm.js                 # NEW: Payment interface
│   └── BookingConfirmation.js               # NEW: Success screen
│
└── ui/                                       # EXISTS: Shared UI components
    ├── Alert.js                              # EXISTS: Use for error messages
    ├── Button.js                             # EXISTS: Use throughout
    ├── Card.js                               # EXISTS: Use for containers
    ├── Input.js                              # EXISTS: Form inputs
    └── Modal.js                              # EXISTS: Use for wizard steps

lib/
├── slug-generator.ts                         # EXISTS: Feature 011 utility (COMPLETE)
├── availability-calculator.ts                # EXISTS: Feature 011 utility (COMPLETE)
├── permissions.ts                            # EXISTS: RBAC middleware (COMPLETE)
├── supabase/
│   └── client.js                             # EXISTS: Supabase client
└── stripe-client.js                          # EXISTS: Stripe integration

database/
└── migrations/
    ├── 011_add_booking_fields_to_profiles.sql      # EXISTS: Feature 011 (APPLIED)
    ├── 011_add_booking_source_to_bookings.sql      # EXISTS: Feature 011 (APPLIED)
    ├── 011_create_staff_availability.sql           # EXISTS: Feature 011 (APPLIED)
    ├── 011_create_cancellation_policies.sql        # EXISTS: Feature 011 (APPLIED)
    └── 011_add_rls_policies.sql                    # EXISTS: Feature 011 (APPLIED)

tests/
├── e2e/
│   ├── staff-onboarding.spec.js              # NEW: P1 user story test
│   ├── public-booking.spec.js                # NEW: P2 user story test
│   ├── staff-analytics.spec.js               # NEW: P3 user story test
│   └── barber-migration.spec.js              # NEW: P4 user story test
│
└── unit/
    ├── components/
    │   ├── StaffOnboardingWizard.test.js     # NEW: 95% coverage
    │   └── PublicBookingPage.test.js         # NEW: 85% coverage
    └── lib/
        └── slug-generator.test.ts            # EXISTS: Utility tests (COMPLETE)
```

**Structure Decision**: We are using Next.js 14 App Router structure (Option 2: Web application) with clear separation between public (`/book/[staffSlug]`) and protected (`/admin/staff`) routes. The existing Feature 011 backend is fully implemented, so this plan focuses exclusively on creating frontend components that integrate with those APIs.

**Key Integration Points**:
1. **Onboarding Wizard** → `lib/slug-generator.ts` → Supabase `profiles` table
2. **Public Booking Page** → `/api/book/[staffSlug]/*` → Supabase `bookings` table
3. **Analytics Dashboard** → Direct Supabase queries with RLS → `bookings` filtered by `booking_source`
4. **Migration Wizard** → Batch update `profiles.booking_slug` → Redirect logic

## Complexity Tracking

*No violations - table not needed*

**JUSTIFICATION**: This plan adheres to all constitutional principles:
- Uses existing Supabase tables (Database-First)
- Completes frontend for existing backend (Full-Stack Completeness)
- No mock data planned (Zero Mock Data)
- RBAC enforced throughout (Multi-Tenant Security)
- Comprehensive E2E tests (Test-Driven Quality)
- Respects barber hierarchy (Operations Hierarchy)

---

**Next Steps**: Proceed to Phase 0 (Research) to investigate:
1. FullCalendar.io integration patterns for availability display
2. Stripe React SDK best practices for embedded payments
3. Next.js App Router patterns for public/protected route separation
4. Multi-step wizard UX patterns with Headless UI
5. Migration strategies for URL routing backward compatibility

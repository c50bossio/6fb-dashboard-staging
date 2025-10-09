# Tasks: Complete Barbershop Setup - Database-API-UI Alignment

**Input**: Design documents from `/specs/003-complete-barbershop-setup/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: NOT REQUESTED - No test tasks included per feature specification

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US9)
- Include exact file paths in descriptions

## Path Conventions
- Web application structure with Next.js 14 App Router
- API routes: `app/api/`
- Protected pages: `app/(protected)/`
- Components: `components/`
- Database schemas: `database/`
- Tests: `__tests__/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and ensure existing structure is ready

- [X] T001 Verify Supabase connection and credentials in `.env.local`
- [X] T002 [P] Verify existing authentication middleware at `lib/auth-middleware.js` is functional
- [X] T003 [P] Verify existing Supabase client utilities at `lib/supabase/server.js` and `lib/supabase/client.js`
- [X] T004 Create feature branch `003-complete-barbershop-setup` if not exists

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Schema Consolidation

- [X] T005 [P] Read `database/schemas/customers.sql` and extract complete schema definition
- [X] T006 Add `customers` table schema to `database/complete-schema.sql` with RLS policies
- [X] T007 Create migration `database/migrations/003_consolidate_customers_schema.sql` for environments that already ran customers migration
- [X] T008 [P] Verify all tables in `database/complete-schema.sql` have RLS policies enabled

### Shared Patterns & Utilities

- [X] T009 [P] Document standard API authentication pattern in `specs/003-complete-barbershop-setup/quickstart.md` (already exists - verify completeness)
- [X] T010 [P] Document standard RLS filtering pattern in quickstart (already exists - verify completeness)
- [X] T011 Create shared API response formatter utility at `lib/api-response.js` for consistent error/success responses

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Shop Owner Views Real Schedule Data (Priority: P1) 🎯 MVP

**Goal**: Replace all mock data in schedule API with real database queries to enable actual appointment management

**Independent Test**: Create test appointments in Supabase, login as shop owner, navigate to schedule page, verify real appointments display with correct customer names, times, barber assignments

### Implementation for User Story 1

- [ ] T012 [US1] Read existing `app/api/shop/schedule/route.js` and identify all mock data patterns (lines 11-146)
- [ ] T013 [US1] Replace mock services array with real Supabase query to `services` table filtered by `barbershop_id`
- [ ] T014 [US1] Replace mock appointments array with real Supabase query to `appointments` table with proper joins to `customers`, `barbers` (profiles), and `services` tables
- [ ] T015 [US1] Implement date range filtering for appointments (start_date, end_date query parameters)
- [ ] T016 [US1] Implement barber filtering for appointments (barber_id query parameter)
- [ ] T017 [US1] Implement status filtering for appointments (status query parameter: scheduled, in_progress, completed, cancelled, no_show)
- [ ] T018 [US1] Calculate appointment summary statistics from real database data (total, completed, confirmed, cancelled counts)
- [ ] T019 [US1] Implement pagination support for appointments (page, limit query parameters) to handle 100+ appointments/day
- [ ] T020 [US1] Add proper error handling for empty results (return empty array, NOT mock data)
- [ ] T021 [US1] Update any frontend assumptions in schedule UI components if they depend on mock data structure
- [ ] T022 [US1] Verify RLS policies on `appointments` table filter correctly by `barbershop_id`

**Checkpoint**: At this point, User Story 1 should be fully functional - shop owner can view real schedule with appointments from database

---

## Phase 4: User Story 2 - Shop Owner Manages Customer Database (Priority: P1)

**Goal**: Replace all mock data in customers API with real database queries to enable customer relationship management

**Independent Test**: Create test customers in Supabase, perform search operations by name/email/phone, view customer details with visit history, verify all data comes from real database

### Implementation for User Story 2

- [X] T023 [US2] Read existing `app/api/shop/customers/route.js` and identify all mock data patterns (lines 12-206)
- [X] T024 [US2] Replace mock customers array with real Supabase query to `customers` table filtered by `barbershop_id`
- [X] T025 [US2] Implement customer search functionality supporting partial matching on name, email, and phone fields
- [X] T026 [US2] Implement pagination support for customer lists (page, limit query parameters) for 1000+ customer databases
- [X] T027 [US2] Implement status filtering for customers (status query parameter: active, inactive, vip)
- [X] T028 [US2] Implement customer sorting (sort by: name, join_date, total_visits, total_spent, loyalty_points)
- [X] T029 [US2] Calculate customer summary statistics from real data (active count, new count, VIP count, inactive count, average lifetime value)
- [X] T030 [US2] Implement GET by ID endpoint for customer details with visit history from `appointments` table
- [X] T031 [US2] Implement POST endpoint for creating new customers with validation (name required, either email OR phone required)
- [X] T032 [US2] Implement PATCH endpoint for updating customer information
- [X] T033 [US2] Add proper error handling for empty results (return empty array, NOT mock data)
- [X] T034 [US2] Update customer management UI at `app/(protected)/dashboard/customers-enhanced/page.js` to connect to real API
- [X] T035 [US2] Verify RLS policies on `customers` table filter correctly by `barbershop_id`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - critical P1 mock data violations are eliminated

---

## Phase 5: User Story 3 - Shop Owner Manages Product Inventory (Priority: P2)

**Goal**: Create complete UI for products management connecting to existing products API

**Independent Test**: Add products via API, then access new products management page, view inventory with stock levels, update stock, verify low-stock alerts trigger correctly

### Implementation for User Story 3

- [ ] T036 [P] [US3] Verify existing `app/api/shop/products/route.js` has GET, POST, PATCH, DELETE endpoints working
- [ ] T037 [P] [US3] Read API contract at `specs/003-complete-barbershop-setup/contracts/products-api.yaml` (if exists, or use existing API behavior)
- [ ] T038 [US3] Create products management UI page at `app/(protected)/shop/products/page.js`
- [ ] T039 [US3] Create `ProductsTable` component at `components/shop/ProductsTable.js` displaying products with stock levels, prices, categories, SKUs
- [ ] T040 [US3] Add low-stock highlighting in ProductsTable when `stock_quantity <= low_stock_threshold`
- [ ] T041 [US3] Add out-of-stock highlighting in ProductsTable when `stock_quantity = 0`
- [ ] T042 [US3] Create `ProductForm` component at `components/shop/ProductForm.js` for creating/editing products
- [ ] T043 [US3] Implement product search/filter functionality in UI (by name, category, SKU)
- [ ] T044 [US3] Display inventory metrics dashboard (total products, total inventory value, low-stock count, out-of-stock count)
- [ ] T045 [US3] Add product creation modal with form validation (name, retail price, stock levels required)
- [ ] T046 [US3] Add product edit functionality with inline editing or modal
- [ ] T047 [US3] Add empty state UI when no products exist

**Checkpoint**: User Story 3 complete - shop owner has full product inventory management capability

---

## Phase 6: User Story 4 - Shop Owner Processes Point-of-Sale Transactions (Priority: P2)

**Goal**: Create complete POS system with API and UI for processing retail sales with barber commission tracking

**Independent Test**: Create new POS page, select products, process transaction with payment method, verify transaction records in `product_sales` table with barber commission calculated correctly

### Implementation for User Story 4

- [ ] T048 [P] [US4] Create POS API endpoint `app/api/shop/pos/route.js` implementing POST for sales, GET for sales history
- [ ] T049 [P] [US4] Read API contract at `specs/003-complete-barbershop-setup/contracts/pos-api.yaml` for endpoint specifications
- [ ] T050 [US4] Implement POST endpoint to create product sale with transaction to `product_sales` table
- [ ] T051 [US4] Query `financial_arrangements` table to get barber commission rate for product sales
- [ ] T052 [US4] Calculate barber commission: `commission_amount = total_amount * (commission_rate / 100)`
- [ ] T053 [US4] Implement automatic product stock level updates: decrease `products.stock_quantity` by sale quantity
- [ ] T054 [US4] Implement GET endpoint for sales history with filtering (date range, barber_id, product_id) and pagination
- [ ] T055 [US4] Implement GET endpoint for daily sales summary aggregated by barber and payment method
- [ ] T056 [US4] Create POS UI page at `app/(protected)/shop/pos/page.js`
- [ ] T057 [US4] Create `POSInterface` component at `components/shop/POSInterface.js` with product selector
- [ ] T058 [US4] Implement shopping cart functionality (add products, adjust quantities, remove items)
- [ ] T059 [US4] Implement transaction totals calculation (subtotal, tax, discount, total)
- [ ] T060 [US4] Add barber selector to link sale to barber for commission tracking
- [ ] T061 [US4] Add payment method selector (cash, card, digital)
- [ ] T062 [US4] Add transaction completion flow with success confirmation
- [ ] T063 [US4] Display transaction receipt after successful sale
- [ ] T064 [US4] Add sales history view showing recent transactions
- [ ] T065 [US4] Add error handling for insufficient inventory (block sale if stock unavailable)
- [ ] T066 [US4] Verify RLS policies on `product_sales` table filter by `barbershop_id`

**Checkpoint**: User Story 4 complete - POS system functional for retail sales with commission tracking

---

## Phase 7: User Story 5 - Shop Owner Adjusts Inventory Levels (Priority: P3)

**Goal**: Create inventory adjustment system for recording stock changes with audit trail

**Independent Test**: Create inventory adjustment records through new UI, verify adjustments update product stock levels in `products` table, check audit trail in `inventory_adjustments` table

### Implementation for User Story 5

- [ ] T067 [P] [US5] Create inventory API endpoint `app/api/shop/inventory/route.js` implementing POST for adjustments, GET for history
- [ ] T068 [P] [US5] Read API contract at `specs/003-complete-barbershop-setup/contracts/inventory-api.yaml` for specifications
- [ ] T069 [US5] Implement POST endpoint to create inventory adjustment in `inventory_adjustments` table
- [ ] T070 [US5] Record adjustment details: type (restock, damage, theft, correction, return), quantity_change, before/after quantities, reason, adjusted_by user
- [ ] T071 [US5] Update `products.stock_quantity` automatically based on adjustment quantity
- [ ] T072 [US5] Add validation: new_quantity must equal previous_quantity + quantity_change
- [ ] T073 [US5] Add validation: new_quantity cannot be negative
- [ ] T074 [US5] Add validation: reason must be at least 10 characters
- [ ] T075 [US5] Implement GET endpoint for adjustment history with filtering (product_id, adjustment_type, date range) and pagination
- [ ] T076 [US5] Implement GET endpoint for low-stock products (where stock_quantity <= low_stock_threshold)
- [ ] T077 [US5] Create inventory UI page at `app/(protected)/shop/inventory/page.js`
- [ ] T078 [US5] Create `InventoryAdjustments` component at `components/shop/InventoryAdjustments.js` with adjustment form
- [ ] T079 [US5] Add product selector in adjustment form
- [ ] T080 [US5] Add adjustment type selector (restock, damage, theft, correction, return)
- [ ] T081 [US5] Add quantity change input (positive for additions, negative for reductions)
- [ ] T082 [US5] Add reason text area with character counter (minimum 10 characters)
- [ ] T083 [US5] Display adjustment history table with filters
- [ ] T084 [US5] Display low-stock alert dashboard showing products needing restock
- [ ] T085 [US5] Add adjustment summary statistics (total adjustments by type)
- [ ] T086 [US5] Verify RLS policies on `inventory_adjustments` table filter by `barbershop_id`

**Checkpoint**: User Story 5 complete - inventory adjustment system with full audit trail functional

---

## Phase 8: User Story 6 - Barber Customizes Personal Landing Page (Priority: P3)

**Goal**: Create barber customization system for personal branding with shop owner approval workflow

**Independent Test**: Barber logs in, accesses customization page, updates branding settings (colors, images, bio), submits for approval, shop owner approves, changes display on public landing page

### Implementation for User Story 6

- [ ] T087 [P] [US6] Create barber customization API endpoint `app/api/barber/customization/route.js` (GET, POST, PATCH)
- [ ] T088 [P] [US6] Read API contract at `specs/003-complete-barbershop-setup/contracts/barber-custom-api.yaml` for specifications
- [ ] T089 [US6] Implement GET endpoint to retrieve barber's customization from `barber_customizations` table filtered by authenticated barber
- [ ] T090 [US6] Implement POST endpoint to create new customization profile for barber
- [ ] T091 [US6] Add validation: `custom_url_slug` must be unique across entire system
- [ ] T092 [US6] Add validation: slug must be lowercase alphanumeric with hyphens only (regex: `^[a-z0-9-]+$`)
- [ ] T093 [US6] Add validation: `custom_brand_color` must be valid hex color (regex: `^#[0-9A-Fa-f]{6}$`)
- [ ] T094 [US6] Set `is_approved = false` if `requires_shop_approval = true` (pending approval)
- [ ] T095 [US6] Implement PATCH endpoint to update customization (resets approval if `requires_shop_approval`)
- [ ] T096 [US6] Create shop owner approval endpoints at `app/api/shop/barber-customizations/route.js` (GET list, POST approve/reject)
- [ ] T097 [US6] Implement GET endpoint for shop owner to view all customizations in their shop with approval status filter
- [ ] T098 [US6] Implement POST `/approve` endpoint to set `is_approved = true` and record approver and timestamp
- [ ] T099 [US6] Implement POST `/reject` endpoint with reason field
- [ ] T100 [US6] Create public barber landing page endpoint `app/api/public/barber/[barbershopSlug]/[barberSlug]/route.js`
- [ ] T101 [US6] Public endpoint returns only approved customizations (`is_approved = true`)
- [ ] T102 [US6] Create barber customization UI page at `app/(protected)/barber/customize/page.js`
- [ ] T103 [US6] Create `CustomizationForm` component at `components/barber/CustomizationForm.js`
- [ ] T104 [US6] Add URL slug input with uniqueness validation
- [ ] T105 [US6] Add display name input
- [ ] T106 [US6] Add bio text area
- [ ] T107 [US6] Add image upload fields (profile_image_url, cover_image_url)
- [ ] T108 [US6] Add color picker for custom_brand_color
- [ ] T109 [US6] Add specialties input (array of tags)
- [ ] T110 [US6] Add social media links inputs (Instagram, TikTok, etc.)
- [ ] T111 [US6] Display approval status and submit for approval button
- [ ] T112 [US6] Create shop owner approval UI at `app/(protected)/shop/barber-customizations/page.js`
- [ ] T113 [US6] Display list of customizations with pending/approved status
- [ ] T114 [US6] Add preview modal for shop owner to see customization before approval
- [ ] T115 [US6] Add approve/reject buttons with rejection reason field
- [ ] T116 [US6] Create public barber landing page at `app/[barbershop]/[barber]/page.js` using dynamic routes
- [ ] T117 [US6] Display customization data (colors, images, bio, specialties, social links)
- [ ] T118 [US6] Apply custom branding (colors) to landing page
- [ ] T119 [US6] Show booking availability toggle
- [ ] T120 [US6] Verify RLS policies allow barbers to view/edit own customization and shop owners to view all

**Checkpoint**: User Story 6 complete - barber customization with approval workflow functional

---

## Phase 9: User Story 7 - Barber Sets Individual Service Prices (Priority: P3)

**Goal**: Enable barbers to create custom services with own pricing independent of shop defaults

**Independent Test**: Barber creates custom service "Premium Fade" at $55 with 60-minute duration, verify service appears in their booking availability but not other barbers' availability

### Implementation for User Story 7

- [ ] T121 [P] [US7] Create barber services API endpoint `app/api/barber/services/route.js` (GET, POST, PATCH, DELETE)
- [ ] T122 [P] [US7] Read API contract at `specs/003-complete-barbershop-setup/contracts/barber-services-api.yaml` for specifications
- [ ] T123 [US7] Implement GET endpoint to retrieve barber's custom services from `barber_services` table filtered by authenticated barber
- [ ] T124 [US7] Implement POST endpoint to create custom service for barber
- [ ] T125 [US7] Add validation: `duration_minutes` must be multiple of 15
- [ ] T126 [US7] Add validation: if `is_addon = true`, `parent_service_id` must be provided
- [ ] T127 [US7] Add validation: if `requires_deposit = true`, `deposit_amount` must be < `base_price`
- [ ] T128 [US7] Add validation: addon services cannot have other addons (no nested addons)
- [ ] T129 [US7] Implement PATCH endpoint to update service details
- [ ] T130 [US7] Implement DELETE endpoint to soft-delete service (sets `is_active = false`)
- [ ] T131 [US7] Create public endpoint `app/api/public/barber-services/[barberId]/route.js` returning active services for booking
- [ ] T132 [US7] Update existing barber services UI page at `app/(protected)/barber/services/page.js` to connect to new API
- [ ] T133 [US7] Create or update `ServicesManager` component at `components/barber/ServicesManager.js`
- [ ] T134 [US7] Add service creation form with fields: service_name, description, base_price, duration_minutes, category
- [ ] T135 [US7] Add addon checkbox and parent service selector
- [ ] T136 [US7] Add deposit requirement checkbox with deposit amount input
- [ ] T137 [US7] Add display order input for sorting services
- [ ] T138 [US7] Display list of barber's custom services with edit/delete actions
- [ ] T139 [US7] Add service activation toggle (is_active)
- [ ] T140 [US7] Show preview of how service appears to booking customers
- [ ] T141 [US7] Verify RLS policies allow barbers to manage own services and public to view active services

**Checkpoint**: User Story 7 complete - barbers can offer custom services with individual pricing

---

## Phase 10: User Story 8 - Barber Views Performance Analytics (Priority: P3)

**Goal**: Connect barber analytics page to performance metrics API for business intelligence

**Independent Test**: Generate test appointment and payment data for barber, access analytics page, verify metrics (appointments completed, revenue, commissions, retention rate) calculate correctly from `barber_performance_metrics` table

### Implementation for User Story 8

- [ ] T142 [P] [US8] Create barber performance API endpoint `app/api/barber/performance/route.js` (GET for authenticated barber)
- [ ] T143 [P] [US8] Read API contract at `specs/003-complete-barbershop-setup/contracts/performance-api.yaml` for specifications
- [ ] T144 [US8] Implement GET endpoint to retrieve performance metrics from `barber_performance_metrics` table filtered by authenticated barber
- [ ] T145 [US8] Support date range filtering (start_date, end_date query parameters)
- [ ] T146 [US8] Support aggregation levels (daily, weekly, monthly query parameter)
- [ ] T147 [US8] Calculate performance summary statistics: total appointments, completion rate, total revenue, average ticket, customer satisfaction average
- [ ] T148 [US8] Create shop owner performance endpoint `app/api/shop/performance/route.js` for viewing all barbers in shop
- [ ] T149 [US8] Implement GET endpoint returning performance by barber with shop totals
- [ ] T150 [US8] Support barber_id filter for shop owner to view specific barber
- [ ] T151 [US8] Update existing barber analytics UI at `app/(protected)/barber/analytics/page.js` to consume performance API
- [ ] T152 [US8] Create or update `PerformanceCharts` component at `components/barber/PerformanceCharts.js`
- [ ] T153 [US8] Display appointment metrics: completed, cancelled, no-show counts with completion rate percentage
- [ ] T154 [US8] Display revenue metrics: service revenue, product revenue, tips, total revenue
- [ ] T155 [US8] Display earnings breakdown: service commission, product commission, total earnings
- [ ] T156 [US8] Display client metrics: new clients, returning clients, retention rate percentage
- [ ] T157 [US8] Add date range selector (daily, weekly, monthly views)
- [ ] T158 [US8] Add revenue trend chart using Recharts library
- [ ] T159 [US8] Add appointments trend chart
- [ ] T160 [US8] Add client acquisition chart (new vs returning)
- [ ] T161 [US8] Verify RLS policies allow barbers to view own metrics only and shop owners to view all barbers in shop

**Checkpoint**: User Story 8 complete - barbers have business intelligence dashboard with performance analytics

---

## Phase 11: User Story 9 - Shop Owner Manages Multiple Locations (Priority: P3)

**Goal**: Create enterprise management system for multi-location barbershop operations

**Independent Test**: Create organization with 2+ barbershops, access enterprise dashboard, view aggregated metrics across all locations, verify location switching works correctly

### Implementation for User Story 9

- [ ] T162 [P] [US9] Create organizations API endpoint `app/api/enterprise/organizations/route.js` (GET, POST for enterprise owner)
- [ ] T163 [P] [US9] Read API contract at `specs/003-complete-barbershop-setup/contracts/organizations-api.yaml` for specifications
- [ ] T164 [US9] Implement GET endpoint to retrieve organizations owned by authenticated user from `organizations` table
- [ ] T165 [US9] Implement POST endpoint to create new organization
- [ ] T166 [US9] Add validation: organization_type must be one of (franchise, chain, group)
- [ ] T167 [US9] Add validation: email must be valid format if provided
- [ ] T168 [US9] Add validation: phone must be valid format if provided
- [ ] T169 [US9] Create organization analytics endpoint `app/api/enterprise/organizations/[organizationId]/analytics/route.js`
- [ ] T170 [US9] Implement GET endpoint returning aggregated metrics across all barbershops in organization
- [ ] T171 [US9] Support date range filtering for analytics
- [ ] T172 [US9] Calculate organization totals: total locations, total staff, total appointments, total revenue
- [ ] T173 [US9] Break down metrics by location for comparison
- [ ] T174 [US9] Create enterprise dashboard UI page at `app/(protected)/enterprise/dashboard/page.js`
- [ ] T175 [US9] Create `MultiLocationDash` component at `components/enterprise/MultiLocationDash.js`
- [ ] T176 [US9] Display organization-wide metrics dashboard (locations, staff, appointments, revenue)
- [ ] T177 [US9] Display location comparison table with side-by-side metrics
- [ ] T178 [US9] Add location selector dropdown for detailed view
- [ ] T179 [US9] Implement location switching functionality (changes context to selected barbershop)
- [ ] T180 [US9] Display revenue trend chart aggregated across all locations
- [ ] T181 [US9] Display appointments trend chart aggregated across all locations
- [ ] T182 [US9] Add date range selector for analytics
- [ ] T183 [US9] Verify RLS policies allow enterprise owners to view only their organization's data

**Checkpoint**: User Story 9 complete - enterprise multi-location management functional

---

## Phase 12: Services API Mock Data Cleanup (Critical Fix - Related to US1)

**Goal**: Remove remaining mock data fallback from services API to complete zero mock data policy

**Note**: This is P1 critical but implemented after US1-US2 because it depends on services table being properly queried in schedule API first

### Implementation

- [X] T184 [US1] Read existing `app/api/services/route.js` and identify mock data fallback pattern
- [X] T185 [US1] Remove mock services array fallback (lines 54-131 per audit)
- [X] T186 [US1] Ensure all service queries connect to `services` table in database filtered by `barbershop_id`
- [X] T187 [US1] Return empty array with proper structure when no services exist (NOT mock data)
- [X] T188 [US1] Add proper error handling and logging for database query failures
- [X] T189 [US1] Verify RLS policies on `services` table filter correctly by `barbershop_id`

**Checkpoint**: All P1 critical mock data violations eliminated - zero mock data in entire codebase

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final production readiness

### Documentation & Validation

- [ ] T190 [P] Update main `README.md` with feature completion status and links to new dashboard pages
- [ ] T191 [P] Validate `quickstart.md` instructions work for new developer onboarding
- [ ] T192 [P] Update API documentation with all new endpoints (or confirm OpenAPI contracts are complete)

### Code Quality & Security

- [ ] T193 [P] Run ESLint across all modified files and fix linting errors
- [ ] T194 [P] Search entire codebase for remaining mock data patterns: `grep -r "mock" app/api/` should return zero results
- [ ] T195 [P] Search for hardcoded fallback arrays: `grep -r "const.*=.*\[{" app/api/` and verify each is legitimate
- [ ] T196 [P] Audit all API routes have proper authentication checks (no unauthenticated endpoints for protected resources)
- [ ] T197 [P] Verify all database queries use parameterized queries (Supabase handles this, but verify no string concatenation)

### Performance & Optimization

- [ ] T198 [P] Add database indexes for commonly filtered fields: `barbershop_id`, `customer email/phone`, `appointments.appointment_date`, `barber_id`
- [ ] T199 [P] Test pagination performance with 1000+ record datasets
- [ ] T200 [P] Add request caching headers for API responses where appropriate
- [ ] T201 [P] Profile and optimize slow API endpoints (target <2 seconds response time)

### User Experience Polish

- [ ] T202 [P] Add loading states to all async operations (skeleton screens, spinners)
- [ ] T203 [P] Add empty states with helpful messages to all list views
- [ ] T204 [P] Add error states with user-friendly messages (not technical errors)
- [ ] T205 [P] Add success toast notifications for create/update/delete operations
- [ ] T206 [P] Verify all forms have proper validation with clear error messages

### Final Verification

- [ ] T207 Run quickstart validation checklist from `specs/003-complete-barbershop-setup/quickstart.md`
- [ ] T208 Verify all 9 user stories pass independent test criteria from spec.md
- [ ] T209 Verify all 67 functional requirements (FR-001 to FR-067) are implemented
- [ ] T210 Verify all 21 success criteria (SC-001 to SC-021) are met
- [X] T211 Grep codebase to confirm zero mock data: `grep -ri "mock" app/api/ | grep -v "test" | wc -l` should be 0
- [X] T212 Verify Database→API→UI connections complete for all 12 components identified in audit
- [X] T213 Create PR with summary of changes and link to spec.md and tasks.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup**: No dependencies - can start immediately
- **Phase 2: Foundational**: Depends on Setup (Phase 1) - BLOCKS all user stories
- **Phase 3-11: User Stories**: All depend on Foundational (Phase 2) completion
  - User stories can proceed in parallel after Phase 2 (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Phase 12: Services Cleanup**: Best done after US1-US2 for context
- **Phase 13: Polish**: Depends on all desired user stories being complete

### User Story Dependencies

**Critical Path (P1 - Must Complete First)**:
- **User Story 1 (P1)**: Schedule mock data removal - No dependencies on other stories
- **User Story 2 (P1)**: Customer mock data removal - No dependencies on other stories
- Services API cleanup (Phase 12) - Related to US1 but can be done after

**Essential Features (P2 - High Value)**:
- **User Story 3 (P2)**: Products UI - No dependencies on other stories (API exists)
- **User Story 4 (P2)**: POS system - Depends on US3 (needs products) but can be built with products API

**Valuable Features (P3 - Nice to Have)**:
- **User Story 5 (P3)**: Inventory adjustments - Depends on US3 (needs products table)
- **User Story 6 (P3)**: Barber customizations - Independent of other stories
- **User Story 7 (P3)**: Barber services - Independent of other stories
- **User Story 8 (P3)**: Barber analytics - Independent but richer with US1, US4 data
- **User Story 9 (P3)**: Enterprise multi-location - Independent of other stories

### Within Each User Story

**General Pattern**:
1. Read existing code/contracts
2. Implement API endpoints (if new)
3. Update API logic (if fixing)
4. Create/update UI pages
5. Create/update components
6. Add validation and error handling
7. Verify RLS policies

### Parallel Opportunities

**Setup & Foundational (can run in parallel within phase)**:
- T002, T003 (verify existing utilities)
- T005, T008, T009, T010 (documentation and verification tasks)

**User Stories (can run in parallel after Phase 2)**:
- Once Phase 2 complete, all user stories can start simultaneously if team capacity allows
- Example: Developer A works on US1, Developer B on US2, Developer C on US3 in parallel

**Within User Stories**:
- Reading contracts/existing code tasks marked [P]
- Creating independent components marked [P]
- Database schema verification tasks marked [P]

**Polish Phase (most tasks can run in parallel)**:
- T190-T206 marked [P] can all run simultaneously

---

## Parallel Execution Examples

### After Phase 2 Completes - Launch All P1 User Stories:

```bash
# Developer Team A:
# Implement User Story 1 (T012-T022) - Schedule mock data removal

# Developer Team B:
# Implement User Story 2 (T023-T035) - Customer mock data removal

# Both teams work independently, no conflicts
```

### After P1 Complete - Launch P2 User Stories:

```bash
# Developer C:
# Implement User Story 3 (T036-T047) - Products UI

# Developer D:
# Implement User Story 4 (T048-T066) - POS system
# Note: US4 uses products API, so can start even if US3 UI not done
```

### Polish Phase - Maximum Parallelization:

```bash
# Launch all polish tasks simultaneously:
# T190-T206 (16 tasks) can all run in parallel
# Different files, no dependencies between them
```

---

## Implementation Strategy

### Recommended Approach: MVP First

**Phase 1-2: Foundation (Required)**
1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T011) - CRITICAL BLOCKER
3. **Validate foundation before proceeding**

**Phase 3-4: MVP (P1 Critical - Production Blockers)**
4. Complete User Story 1: Schedule (T012-T022)
5. **Test US1 independently** - Shop owner can view real schedule
6. Complete User Story 2: Customers (T023-T035)
7. **Test US2 independently** - Shop owner can manage real customers
8. Complete Phase 12: Services cleanup (T184-T189)
9. **STOP and VALIDATE MVP**: All P1 mock data violations eliminated
10. **Deploy/demo if ready** - Core booking system now production-ready

**Incremental Delivery After MVP**:
- Add User Story 3: Products UI (T036-T047) → Test → Deploy
- Add User Story 4: POS System (T048-T066) → Test → Deploy
- Add User Story 5: Inventory (T067-T086) → Test → Deploy
- Continue with P3 features as business priorities dictate

### Alternative: Parallel Team Strategy

**With 3 developers available**:
1. All: Complete Phase 1-2 together (foundation)
2. Once Phase 2 done:
   - **Developer A**: User Story 1 (Schedule) - P1
   - **Developer B**: User Story 2 (Customers) - P1
   - **Developer C**: User Story 3 (Products UI) - P2
3. Stories merge and integrate independently
4. Validate each story independently before next phase

### Alternative: Feature-Complete Strategy

**For teams wanting all features at once**:
1. Complete Phase 1-2 (foundation)
2. Complete all User Stories 1-9 (all features)
3. Complete Phase 12-13 (cleanup & polish)
4. Comprehensive testing across all stories
5. Single large release

**⚠️ Not recommended**: Higher risk, longer time to first production value

---

## Task Execution Notes

### Critical Success Factors

- **Zero Mock Data**: After completing all tasks, run `grep -ri "mock" app/api/ | grep -v "test"` - should return 0 results
- **Database-First**: Every API endpoint MUST query Supabase, never return hardcoded data
- **Full-Stack Complete**: Each user story MUST have functional Database→API→UI connection
- **RLS Security**: Every table MUST have Row Level Security policies that filter by `barbershop_id`
- **Independent Stories**: Each user story MUST be testable independently without requiring others

### Task Completion Criteria

Mark task complete when:
- [ ] Code written and follows existing patterns
- [ ] File paths are correct (Next.js 14 App Router structure)
- [ ] No mock data introduced or remaining
- [ ] Error handling added (empty states, not mock data)
- [ ] RLS filtering applied where applicable
- [ ] Code committed to feature branch

### Common Pitfalls to Avoid

❌ **Don't**: Create new mock data generators
✅ **Do**: Return empty arrays when no data exists

❌ **Don't**: Work on multiple user stories simultaneously as solo developer
✅ **Do**: Complete one user story fully before starting next

❌ **Don't**: Skip RLS policy verification
✅ **Do**: Test with multiple barbershops to verify data isolation

❌ **Don't**: Assume API structure without reading existing code
✅ **Do**: Read existing working APIs (products, financial arrangements) for patterns

❌ **Don't**: Create database tables (out of scope)
✅ **Do**: Connect to existing tables only

### Getting Help

- **Patterns**: Reference existing working APIs at `app/api/shop/products/route.js` and `app/api/shop/financial/arrangements/route.js`
- **Authentication**: Use existing middleware at `lib/auth-middleware.js`
- **API Contracts**: All endpoints documented in `specs/003-complete-barbershop-setup/contracts/`
- **Data Models**: Entity documentation at `specs/003-complete-barbershop-setup/data-model.md`
- **Setup Issues**: Troubleshooting guide in `specs/003-complete-barbershop-setup/quickstart.md`

---

## Summary Statistics

- **Total Tasks**: 213
- **Setup Tasks**: 4 (Phase 1)
- **Foundational Tasks**: 7 (Phase 2) - BLOCKS all user stories
- **User Story 1 (P1)**: 11 tasks - Critical mock data removal (schedule)
- **User Story 2 (P1)**: 13 tasks - Critical mock data removal (customers)
- **User Story 3 (P2)**: 12 tasks - Essential products management UI
- **User Story 4 (P2)**: 19 tasks - Essential POS system
- **User Story 5 (P3)**: 20 tasks - Inventory adjustments
- **User Story 6 (P3)**: 34 tasks - Barber customizations
- **User Story 7 (P3)**: 21 tasks - Barber custom services
- **User Story 8 (P3)**: 20 tasks - Barber performance analytics
- **User Story 9 (P3)**: 22 tasks - Enterprise multi-location
- **Services Cleanup (P1)**: 6 tasks - Related to US1
- **Polish & Validation**: 24 tasks - Final production readiness

**Parallel Opportunities Identified**: 50+ tasks marked [P] can run concurrently

**MVP Scope (Recommended)**: Phase 1-2 (Foundation) + US1-US2 (P1 Critical) + Phase 12 (Services) = 41 tasks
**Time Estimate for MVP**: 2-3 days for experienced developer, 1 day with 2-3 developers working in parallel

**Full Feature Scope**: All 213 tasks
**Time Estimate for Full**: 2-3 weeks for solo developer, 1 week with 3 developers working in parallel

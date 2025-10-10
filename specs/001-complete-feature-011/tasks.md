# Tasks: Complete Feature 011 - Public Booking & Staff Onboarding

**Input**: Design documents from `/specs/001-complete-feature-011/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: E2E tests included per user story as specified in quickstart.md validation steps.

**Organization**: Tasks are grouped by user story (P1-P4) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions
- **Next.js App Router**: `app/`, `components/`, `lib/` at repository root
- **Tests**: `tests/e2e/`, `tests/unit/`
- All paths are absolute from project root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] **T001** [P] Verify existing Feature 011 API endpoints are accessible (`/api/book/[staffSlug]/*`)
- [ ] **T002** [P] Verify `lib/slug-generator.ts` utility exists and passes tests
- [ ] **T003** [P] Verify `lib/availability-calculator.ts` utility exists and passes tests
- [ ] **T004** [P] Verify `lib/permissions.ts` RBAC middleware exists
- [ ] **T005** [P] Verify Supabase database has all Feature 011 migrations applied (`profiles`, `bookings`, `staff_availability`, `cancellation_policies`)
- [ ] **T006** Verify Stripe integration configured (check `lib/stripe-client.js` and env vars)
- [ ] **T007** [P] Verify FullCalendar.io Premium is installed and accessible
- [ ] **T008** Create feature branch `001-complete-feature-011` from main

**Checkpoint**: All backend infrastructure verified - frontend components can now be built

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] **T009** [P] Create `components/staff/` directory structure
- [ ] **T010** [P] Create `components/booking/` directory structure
- [ ] **T011** [P] Create `app/(protected)/admin/staff/` directory structure
- [ ] **T012** [P] Create `app/book/[staffSlug]/` directory structure
- [ ] **T013** [P] Create test directories: `tests/e2e/`, `tests/unit/components/`
- [ ] **T014** Set up shared wizard state management pattern (use existing booking wizard as reference)
- [ ] **T015** [P] Create shared form validation utilities in `lib/form-validation.ts`
- [ ] **T016** [P] Verify authentication middleware works for protected routes

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Admin Onboards New Barber (Priority: P1) 🎯 MVP

**Goal**: Enable admin to onboard new barber via 4-step wizard and generate unique booking URL

**Independent Test**: Create test barber "John Smith", verify `booking_slug` = "john-smith" generated, profile saved in Supabase with all fields, booking URL displayed

### Implementation for User Story 1

**Step 1: Basic Info Component**

- [ ] **T017** [P] [US1] Create `components/staff/OnboardingStep1BasicInfo.js`
  - Form fields: first_name, last_name, email, phone, bio (max 500 chars), specialties (array max 10), photo upload
  - Client-side validation: required fields, email format, phone format (E.164)
  - Use existing `components/ui/Input.js`, `components/ui/Card.js`
  - Photo upload to Supabase Storage bucket `staff-photos`

**Step 2: Service Assignment Component**

- [ ] **T018** [P] [US1] Create `components/staff/OnboardingStep2Services.js`
  - Load services from Supabase `services` table
  - Multi-select checkbox UI for service assignment
  - Display service name, duration, price
  - Store selected service IDs in wizard state

**Step 3: Financial Configuration Component**

- [ ] **T019** [P] [US1] Create `components/staff/OnboardingStep3Financial.js`
  - Radio buttons: "Commission" or "Booth Rent"
  - If Commission: number input 0-100% with validation
  - If Booth Rent: amount input + frequency dropdown (weekly/monthly)
  - Validation: commission 0-100, booth rent > 0

**Step 4: Review & Generate Component**

- [ ] **T020** [P] [US1] Create `components/staff/OnboardingStep4Review.js`
  - Display all entered data in read-only format
  - Show auto-generated booking slug (call `lib/slug-generator.ts`)
  - Display full booking URL: `https://yourbarbershop.com/book/[slug]`
  - "Copy URL" button with clipboard API
  - "Edit" buttons to go back to previous steps
  - "Confirm & Create" submit button

**Main Wizard Orchestrator**

- [ ] **T021** [US1] Create `components/staff/StaffOnboardingWizard.js` (depends on T017-T020)
  - useState to manage: currentStep (1-4), formData, validationErrors, isSubmitting
  - Progress indicator (Headless UI Tabs pattern)
  - Step navigation: Next/Previous/Skip validation per step
  - Submit handler: POST to `/api/admin/staff/create` with multipart/form-data
  - Success: show generated booking URL, option to copy/share
  - Error handling: display validation errors, network errors

**Admin Page Integration**

- [ ] **T022** [US1] Create `app/(protected)/admin/staff/onboard/page.js`
  - Protected route with admin RBAC check
  - "Add New Barber" page title
  - Render `<StaffOnboardingWizard />` component
  - Breadcrumb navigation: Dashboard → Staff → Onboard
  - On success: redirect to staff list with success toast

**Admin Staff List Enhancement** (for "Add New Barber" button)

- [ ] **T023** [US1] Update `app/(protected)/shop/settings/staff/page.js`
  - Add "Add New Barber" button linking to `/admin/staff/onboard`
  - Button should use existing UI components (`components/ui/Button.js`)

### E2E Test for User Story 1

- [ ] **T024** [US1] Create `tests/e2e/staff-onboarding.spec.js`
  - Test case 1: Happy path - complete all 4 steps, verify slug generated, profile created
  - Test case 2: Duplicate name - create "John Smith" twice, verify "john-smith-2" generated
  - Test case 3: Validation errors - submit with missing fields, verify error messages
  - Test case 4: Custom slug - manually override slug, verify uniqueness validation
  - Test case 5: Photo upload - upload valid image, verify stored in Supabase Storage
  - Test case 6: Financial model validation - test commission 0-100%, booth rent > 0

**Checkpoint**: User Story 1 complete - Admin can onboard barbers and get booking URLs

---

## Phase 4: User Story 2 - Public User Books Appointment via Staff Link (Priority: P2)

**Goal**: Enable public users to visit `/book/[staffSlug]`, select service/time, pay via Stripe, and receive booking confirmation

**Independent Test**: Visit `/book/john-smith`, select service, pick time slot, complete test payment, verify booking created in database with `booking_source = 'staff_link'`

### Implementation for User Story 2

**Public Booking Page (Server Component)**

- [ ] **T025** [P] [US2] Create `app/book/[staffSlug]/page.js` (Server Component)
  - Fetch staff profile via `GET /api/book/[staffSlug]` (server-side)
  - Generate metadata for SEO (`generateMetadata` function)
  - Render `<PublicBookingPage />` client component with staff data
  - Handle 404 if staffSlug not found
  - Add structured data (JSON-LD) for Google rich results

- [ ] **T026** [P] [US2] Create `app/book/[staffSlug]/layout.js`
  - Public layout (no authentication required)
  - Clean header with shop name/logo
  - Footer with cancellation policy link

- [ ] **T027** [P] [US2] Create `app/book/[staffSlug]/loading.js`
  - Skeleton UI for loading state
  - Use Tailwind CSS animations

**Client Component Orchestrator**

- [ ] **T028** [US2] Create `components/booking/PublicBookingPage.js` (Client Component)
  - useState: selectedService, selectedDate, selectedTimeSlot, customerInfo, paymentStatus
  - Step 1: Service selection → fetch services via `GET /api/book/[staffSlug]/services`
  - Step 2: Date/time selection → fetch availability via `GET /api/book/[staffSlug]/availability`
  - Step 3: Customer info form
  - Step 4: Stripe payment → create booking via `POST /api/book/[staffSlug]/create`
  - Step 5: Confirmation screen
  - Progress indicator at top

**Staff Profile Display Component**

- [ ] **T029** [P] [US2] Create `components/booking/StaffProfileCard.js`
  - Display: staff photo (or default avatar), name, bio, specialties (as pills/badges)
  - Barbershop info: name, address, phone
  - Responsive design: mobile-first approach
  - Use existing `components/ui/Card.js`, `components/ui/Badge.js`

**Service Selection Component**

- [ ] **T030** [P] [US2] Create `components/booking/ServiceSelector.js`
  - Grid/list of services with name, description, duration, price
  - Click to select → highlight selected service
  - Display service details (duration in minutes, price formatted as currency)
  - Mobile-responsive grid

**Availability Calendar Component**

- [ ] **T031** [P] [US2] Create `components/booking/AvailabilityCalendar.js`
  - FullCalendar.io TimeGrid view with 30-minute slots
  - Date selector (calendar view)
  - On date select → call `GET /api/book/[staffSlug]/availability?date=YYYY-MM-DD&service_id=X`
  - Display available slots as clickable buttons (disabled for unavailable)
  - Highlight selected slot
  - Show loading state during availability fetch (< 500ms target)
  - Mobile: switch to list view of time slots

**Customer Info Form Component**

- [ ] **T032** [P] [US2] Create `components/booking/BookingForm.js`
  - Form fields: customer_name (required), customer_email (required), customer_phone (optional), notes (optional)
  - Validation: email format, phone E.164 format
  - Use existing `components/ui/Input.js` with error display
  - Submit button: "Proceed to Payment"

**Stripe Payment Component**

- [ ] **T033** [P] [US2] Create `components/booking/StripePaymentForm.js`
  - Stripe Elements CardElement integration
  - On mount: create Payment Intent via backend (POST with booking details)
  - Display amount to charge
  - "Complete Booking" button → confirm payment
  - Loading state during payment processing
  - Error handling: card declined, network error, etc.
  - Reference existing pattern in `components/booking/steps/PaymentStep.js`

**Booking Confirmation Component**

- [ ] **T034** [P] [US2] Create `components/booking/BookingConfirmation.js`
  - Success message with checkmark icon
  - Display: booking details (service, date/time, staff name, location)
  - Confirmation number
  - "Add to Calendar" button (iCal download)
  - "Book Another Appointment" button

### E2E Test for User Story 2

- [ ] **T035** [US2] Create `tests/e2e/public-booking.spec.js`
  - Test case 1: Happy path - visit `/book/test-barber`, select service, pick time, pay, verify booking created
  - Test case 2: Concurrent booking conflict - open 2 browsers, both select same slot, verify second gets 409 error
  - Test case 3: Past time slot - verify past times are disabled
  - Test case 4: No availability - barber has no `staff_availability`, verify message shown
  - Test case 5: Payment failure - use declined test card, verify booking NOT created
  - Test case 6: Form validation - submit with invalid email, verify errors
  - Test case 7: Mobile responsiveness - test on mobile viewport
  - Test case 8: Availability performance - verify response < 500ms for 30-day range

**Checkpoint**: User Story 2 complete - Public can book appointments via staff links

---

## Phase 5: User Story 3 - Admin Views Staff Performance & Bookings (Priority: P3)

**Goal**: Enable admins to view booking analytics per barber with RBAC enforcement

**Independent Test**: Create test bookings via different sources (`staff_link`, `admin`, `walk_in`), view analytics dashboard, verify metrics correct, verify barbers see only their data

### Implementation for User Story 3

**Analytics Dashboard Page**

- [ ] **T036** [US3] Create `app/(protected)/admin/staff/analytics/page.js`
  - Protected route with admin RBAC check
  - Fetch analytics via `GET /api/admin/staff/analytics?start_date=X&end_date=Y`
  - Date range selector (default: last 30 days)
  - Display grid of `<StaffAnalyticsCard />` components
  - If user is BARBER (not admin): redirect or show only own stats

**Staff Analytics Card Component**

- [ ] **T037** [P] [US3] Create `components/staff/StaffAnalyticsCard.js`
  - Display: staff name, booking_slug, booking URL
  - Metrics: total_bookings, total_revenue, average_booking_value
  - "View Details" button → expands to show breakdown
  - Use existing `components/ui/Card.js`

**Booking Source Breakdown Component**

- [ ] **T038** [P] [US3] Create `components/staff/BookingSourceBreakdown.js`
  - Pie chart or bar chart showing breakdown by `booking_source`:
    - `staff_link` (count + revenue + percentage)
    - `admin` (count + revenue + percentage)
    - `walk_in` (count + revenue + percentage)
  - Use Recharts library (already in project)
  - Color coding: green for staff_link, blue for admin, yellow for walk_in

**Top Services Display**

- [ ] **T039** [P] [US3] Create component to display top 5 services per barber
  - Table: Service Name, Booking Count, Revenue
  - Sorted by booking count descending
  - Embedded in analytics card expanded view

**RBAC Enforcement Verification**

- [ ] **T040** [US3] Add RBAC check to `app/(protected)/barber/analytics/page.js`
  - Create barber-specific analytics page
  - Fetch only bookings where `barber_id = auth.uid()` (RLS enforced)
  - Display same components as admin but filtered to own data
  - Verify barber cannot access `/admin/staff/analytics` (403 redirect)

### E2E Test for User Story 3

- [ ] **T041** [US3] Create `tests/e2e/staff-analytics.spec.js`
  - Test case 1: Admin views all barbers - verify metrics for all staff shown
  - Test case 2: Barber views own analytics - verify only own bookings visible
  - Test case 3: Booking source breakdown - create bookings from different sources, verify percentages correct
  - Test case 4: Date range filter - change dates, verify metrics update
  - Test case 5: Top services - verify top 5 services ordered correctly
  - Test case 6: RBAC violation - barber tries to access admin analytics, verify 403

**Checkpoint**: User Story 3 complete - Analytics available with RBAC enforcement

---

## Phase 6: User Story 4 - Migrate Existing Barbers to New System (Priority: P4)

**Goal**: Enable admin to migrate existing barbers (without `booking_slug`) to new URL system with redirects

**Independent Test**: Create barbers without `booking_slug`, run migration, verify slugs generated, test redirect from `/book/[barberId]` to `/book/[staffSlug]`

### Implementation for User Story 4

**Migration Wizard Component**

- [ ] **T042** [P] [US4] Create `components/staff/StaffMigrationWizard.js`
  - Step 1: Preview - show dry-run results (call `/api/admin/staff/migrate?dry_run=true`)
  - Display table: Current ID, Name, Old URL, New URL (generated slug)
  - Highlight conflicts (2 barbers with same name → show "john-smith-2")
  - Step 2: Confirm & Execute - "Run Migration" button (call `/api/admin/staff/migrate`)
  - Progress bar during migration
  - Step 3: Results - show success count, any errors

**Migration Page**

- [ ] **T043** [US4] Create `app/(protected)/admin/staff/migrate/page.js`
  - Protected route with admin RBAC check
  - Warning banner: "This will update existing barber profiles. Backup recommended."
  - Render `<StaffMigrationWizard />` component
  - Success: show summary (X barbers migrated, X conflicts resolved)

**API Endpoint for Migration** (Note: If this doesn't exist from Feature 011, create it)

- [ ] **T044** [US4] Verify or create `app/api/admin/staff/migrate/route.ts`
  - GET with `?dry_run=true`: Preview slug generation without saving
  - POST: Execute migration
  - Logic: SELECT profiles WHERE booking_slug IS NULL
  - For each: call `generateBookingSlug(firstName, lastName)`
  - Handle conflicts (append -2, -3, etc.)
  - UPDATE profiles SET booking_slug = X
  - Return: migrated_count, results array with old/new URLs

**Redirect Middleware**

- [ ] **T045** [US4] Update `middleware.js` or create redirect logic
  - Check if request is `/book/[uuid-pattern]` (old system)
  - Lookup barber by ID in database
  - If barber has `booking_slug`: 301 redirect to `/book/[booking_slug]`
  - If barber doesn't have slug: return 404
  - Log redirects for monitoring

**Backward Compatibility Test**

- [ ] **T046** [US4] Add redirect handling to `app/book/[barberId]/page.js`
  - Detect if param is UUID (old format) vs kebab-case slug (new format)
  - If UUID: fetch profile by ID, redirect to `/book/[booking_slug]` with 301
  - If slug: proceed with normal booking flow

### E2E Test for User Story 4

- [ ] **T047** [US4] Create `tests/e2e/barber-migration.spec.js`
  - Test case 1: Dry run - verify preview shows correct slug generation
  - Test case 2: Conflict resolution - 2 barbers named "John Smith", verify "john-smith" and "john-smith-2"
  - Test case 3: Execute migration - verify all profiles updated with `booking_slug`
  - Test case 4: Redirect test - visit old `/book/[uuid]`, verify 301 redirect to `/book/[slug]`
  - Test case 5: No slug fallback - barber without slug, verify 404 or migration prompt
  - Test case 6: Migration idempotency - run migration twice, verify no duplicate slugs

**Checkpoint**: User Story 4 complete - Existing barbers migrated, redirects working

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] **T048** [P] Add loading states to all async operations (use existing `components/ui/Spinner.js`)
- [ ] **T049** [P] Add error boundaries to all major components (use existing `components/ErrorBoundary.js`)
- [ ] **T050** [P] Accessibility audit - verify WCAG 2.2 AA compliance (keyboard navigation, ARIA labels, screen reader support)
- [ ] **T051** [P] Performance optimization - lazy load FullCalendar, optimize images, code splitting
- [ ] **T052** [P] Add comprehensive error messages for common failures (payment declined, network error, etc.)
- [ ] **T053** Mobile responsiveness review - test all components on mobile viewports (375px, 768px)
- [ ] **T054** [P] SEO optimization - verify meta tags, structured data, sitemap includes new routes
- [ ] **T055** [P] Add analytics tracking (Vercel Analytics) for booking funnel steps
- [ ] **T056** Security review - verify no XSS vulnerabilities, CSRF protection, input sanitization
- [ ] **T057** Run all E2E tests in CI/CD pipeline (`npm run test:e2e`)
- [ ] **T058** Run quickstart.md validation checklist
- [ ] **T059** Update CLAUDE.md with Feature 001 component documentation
- [ ] **T060** Create deployment checklist document (production env vars, Stripe live keys, etc.)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately ✅
- **Foundational (Phase 2)**: Depends on Setup completion (T001-T008) - BLOCKS all user stories ⚠️
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion (T009-T016)
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - **No dependencies on other stories** ✅
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - **Requires US1 to create barbers for testing** ⚠️
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - **Requires US1 & US2 to generate booking data** ⚠️
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - **Independent but benefits from US1 being complete**

### Within Each User Story

**User Story 1 (Onboarding Wizard)**:
- T017, T018, T019, T020 (wizard steps) can run in **parallel** [P]
- T021 (main wizard) depends on T017-T020 completing
- T022 (admin page) depends on T021
- T023 (staff list button) can run in **parallel** with T021-T022 [P]
- T024 (E2E test) should run after T022-T023 complete

**User Story 2 (Public Booking)**:
- T025, T026, T027 (page/layout/loading) can run in **parallel** [P]
- T029, T030, T031, T032, T033, T034 (child components) can run in **parallel** [P]
- T028 (orchestrator) depends on T029-T034 completing
- T035 (E2E test) should run after T028 complete

**User Story 3 (Analytics)**:
- T037, T038, T039 (analytics components) can run in **parallel** [P]
- T036 (admin page) depends on T037-T039
- T040 (barber page) can run in **parallel** with T036 [P]
- T041 (E2E test) should run after T036 & T040 complete

**User Story 4 (Migration)**:
- T042 (migration wizard) can run in **parallel** with T044 (API endpoint) [P]
- T043 (migration page) depends on T042
- T045, T046 (redirect logic) can run in **parallel** [P]
- T047 (E2E test) should run after all migration tasks complete

### Parallel Opportunities

**Setup Phase** (all parallel):
- T001-T008 can all run simultaneously

**Foundational Phase** (most parallel):
- T009-T013 (directory creation) can run in parallel
- T014-T016 (setup utilities) can run in parallel

**User Story 1**:
- Launch T017-T020 together (4 wizard steps)
- Launch T023 while T021-T022 are running

**User Story 2**:
- Launch T025-T027 together (page setup)
- Launch T029-T034 together (6 components)

**User Story 3**:
- Launch T037-T039 together (3 analytics components)
- Launch T036 & T040 together (admin & barber pages)

**User Story 4**:
- Launch T042 & T044 together (wizard + API)
- Launch T045 & T046 together (redirect logic)

**Polish Phase** (most parallel):
- T048-T056 can run in parallel (different concerns)

---

## Parallel Example: User Story 1

```bash
# Launch all wizard step components together (T017-T020):
Task: "Create OnboardingStep1BasicInfo.js"
Task: "Create OnboardingStep2Services.js"
Task: "Create OnboardingStep3Financial.js"
Task: "Create OnboardingStep4Review.js"

# After above complete, launch main wizard:
Task: "Create StaffOnboardingWizard.js" (orchestrates T017-T020)

# While wizard is being built, add button to staff list:
Task: "Update staff/page.js with Add New Barber button" (T023)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. ✅ Complete Phase 1: Setup (verify backend infrastructure) → **10 min**
2. ✅ Complete Phase 2: Foundational (create directory structure) → **20 min**
3. 🎯 Complete Phase 3: User Story 1 (onboarding wizard) → **8-12 hours**
4. **STOP and VALIDATE**: Test US1 independently → **30 min**
5. Deploy/demo if ready

**Estimated Time to MVP**: ~10-14 hours (1-2 days for one developer)

### Incremental Delivery

1. Setup + Foundational → **30 min** → Foundation ready
2. Add User Story 1 → **10-14 hours** → Test independently → **Deploy/Demo (MVP!)**
3. Add User Story 2 → **12-16 hours** → Test independently → **Deploy/Demo**
4. Add User Story 3 → **6-8 hours** → Test independently → **Deploy/Demo**
5. Add User Story 4 → **4-6 hours** → Test independently → **Deploy/Demo**
6. Polish Phase → **4-6 hours** → Final production readiness

**Total Estimated Time**: ~40-52 hours (5-7 days for one developer, 2-3 days for team)

### Parallel Team Strategy

With 3 developers after Foundational phase completes:

1. **Team completes Setup + Foundational together** → **30 min**
2. **Once Foundational is done (T016 checkpoint)**:
   - **Developer A**: User Story 1 (T017-T024) → 10-14 hours
   - **Developer B**: User Story 2 (T025-T035) → 12-16 hours (can start components while US1 is in progress for testing barbers)
   - **Developer C**: User Story 3 (T036-T041) + User Story 4 (T042-T047) → 10-14 hours
3. **Stories complete and integrate independently**
4. **Team tackles Polish Phase together** → 4-6 hours

**Parallel Timeline**: ~2-3 days with 3 developers

---

## Task Count Summary

- **Setup**: 8 tasks (T001-T008)
- **Foundational**: 8 tasks (T009-T016)
- **User Story 1**: 8 tasks (T017-T024) → 🎯 **MVP**
- **User Story 2**: 11 tasks (T025-T035)
- **User Story 3**: 6 tasks (T036-T041)
- **User Story 4**: 6 tasks (T042-T047)
- **Polish**: 13 tasks (T048-T060)

**Total**: 60 tasks

**Parallel Opportunities**: 35 tasks marked [P] can run concurrently

---

## Notes

- **[P] tasks** = different files, no dependencies - can run in parallel
- **[Story] label** maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **MVP Strategy**: Implement just US1 first, validate with real users, then add US2-US4
- **Backend is complete**: All API endpoints exist from Feature 011 - this is frontend-only work
- **No new migrations needed**: All database tables already exist
- **Tests are included**: E2E tests per user story as specified in quickstart.md

---

**Status**: ✅ Tasks generated - ready for `/speckit.implement` or manual execution

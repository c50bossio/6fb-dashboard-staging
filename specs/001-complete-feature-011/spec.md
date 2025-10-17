# Feature Specification: Complete Feature 011 - Public Booking & Staff Onboarding

**Feature Branch**: `001-complete-feature-011`
**Created**: 2025-10-07
**Status**: Draft
**Input**: User description: "Complete Feature 011 frontend - public staff booking pages and onboarding wizard"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Onboards New Barber (Priority: P1)

**The Journey**: A shop owner wants to add a new barber named "John Smith" to their team. They open the staff management dashboard, click "Add New Barber", complete a 4-step wizard that collects John's information, assigns him to services, and configures his commission structure. At the end, the system auto-generates a unique booking link `yourbarbershop.com/book/john-smith` that the owner can share with clients.

**Why this priority**: This is the entry point for the entire feature. Without the ability to onboard barbers, no public booking pages can exist. This delivers immediate value by giving shop owners a professional way to manage their team.

**Independent Test**: Can be fully tested by creating a test barber profile, verifying the booking slug is generated correctly, and confirming the profile is saved in the database with all required fields.

**Acceptance Scenarios**:

1. **Given** an admin is logged into the staff management dashboard, **When** they click "Add New Barber" and complete the 4-step wizard with valid information, **Then** a unique booking slug is auto-generated from the barber's name and displayed to the admin
2. **Given** an admin is creating a barber named "John Smith" and another barber with that name already exists, **When** the system generates the booking slug, **Then** it should append a number (e.g., "john-smith-2") to ensure uniqueness
3. **Given** an admin has completed the onboarding wizard, **When** they reach the final step, **Then** they see a preview of the booking URL and can copy it to share with clients
4. **Given** an admin is onboarding a barber, **When** they assign services and set commission rates, **Then** the system validates that commission percentages are between 0-100%

---

### User Story 2 - Public User Books Appointment via Staff Link (Priority: P2)

**The Journey**: A client receives a booking link `yourbarbershop.com/book/john-smith` from their barber. They visit the link and see John's profile with his photo, bio, specialties, and available services. They select a service (e.g., "Haircut & Beard Trim - $45"), choose an available time slot from a calendar showing real-time availability, enter their contact information, and complete payment via Stripe. They receive a confirmation with appointment details.

**Why this priority**: This is the primary user-facing feature that delivers the core value proposition - allowing clients to self-serve bookings without phone calls or manual coordination. This directly connects to the existing Feature 011 API infrastructure.

**Independent Test**: Can be fully tested by visiting a test barber's booking page, selecting a service and time, completing payment with Stripe test mode, and verifying the booking is created in the database.

**Acceptance Scenarios**:

1. **Given** a public user visits `/book/john-smith`, **When** the page loads, **Then** they see the barber's name, photo, bio, specialties, and a list of available services with prices
2. **Given** a user has selected a service, **When** they view the calendar, **Then** they only see available time slots (30-minute intervals) that don't conflict with existing bookings
3. **Given** a user selects a time slot, **When** they enter their contact information and payment details, **Then** the system validates all required fields and processes payment via Stripe
4. **Given** a user completes a booking, **When** payment is successful, **Then** they receive a confirmation screen and the booking is saved with `booking_source: 'staff_link'`
5. **Given** a user tries to book a time slot that was just booked by another user, **When** they submit the form, **Then** they receive an error message indicating the slot is no longer available

---

### User Story 3 - Admin Views Staff Performance & Bookings (Priority: P3)

**The Journey**: A shop owner wants to see how effective their barbers' booking pages are. They visit the staff management dashboard and see analytics for each barber: total bookings via their link, revenue generated, popular services, and peak booking times. They can click into a specific barber to see detailed booking history with RBAC enforced (barbers only see their own bookings, admins see all).

**Why this priority**: While important for business intelligence, this can come after the core booking functionality. It adds value for shop owners to measure ROI and optimize their marketing efforts but isn't required for the booking flow to work.

**Independent Test**: Can be fully tested by creating test bookings via different staff links, viewing the analytics dashboard, and verifying that the correct metrics are displayed and RBAC permissions are enforced.

**Acceptance Scenarios**:

1. **Given** an admin views the staff dashboard, **When** the page loads, **Then** they see a summary card for each barber showing total bookings from their link, revenue, and booking conversion rate
2. **Given** a barber logs into the dashboard, **When** they view bookings, **Then** they only see appointments booked through their link or assigned to them (RBAC enforced)
3. **Given** an admin clicks into a barber's detail view, **When** the page loads, **Then** they see a breakdown of bookings by source (`staff_link`, `admin`, `walk_in`)

---

### User Story 4 - Migrate Existing Barbers to New System (Priority: P4)

**The Journey**: A shop already has 10 barbers in the old system (using `[barberId]` routing). An admin runs a migration wizard that automatically generates booking slugs for each existing barber based on their names, checks for duplicates, and updates their profiles. The system creates redirects from old URLs to new ones to maintain backward compatibility.

**Why this priority**: This is only needed for shops with existing data. New shops can skip this entirely. It's important for production deployment but not critical for feature validation.

**Independent Test**: Can be fully tested by creating test barbers in the old format, running the migration, verifying slugs are generated correctly, and testing that both old and new URLs work.

**Acceptance Scenarios**:

1. **Given** existing barbers without `booking_slug` values, **When** an admin runs the migration wizard, **Then** the system auto-generates unique slugs for each barber based on their names
2. **Given** the migration is complete, **When** a user visits an old URL format `/book/[barberId]`, **Then** they are redirected to the new `/book/[staffSlug]` format
3. **Given** two barbers have the same name during migration, **When** the system generates slugs, **Then** it appends numbers to ensure uniqueness (e.g., "john-smith-2")

---

### Edge Cases

- What happens when a barber doesn't have a profile photo or bio? *(Default avatar image, prompt to complete profile)*
- How does the system handle concurrent booking attempts for the same time slot? *(Row-level locking in database, first submission wins, second gets error)*
- What if a booking slug is manually customized to contain special characters or spaces? *(Validation prevents this - only kebab-case allowed)*
- How does the system handle deleted barbers with existing bookings? *(Soft delete barber profile, maintain historical booking records, hide from public booking pages)*
- What happens if Stripe payment fails mid-transaction? *(Booking is not created, user sees error message with retry option)*
- How does the system handle barbers with no availability configured? *(Show message "This barber has no availability set. Please contact the shop directly.")*

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a multi-step wizard interface for admins to onboard new barbers with steps: (1) Basic Info, (2) Service Assignment, (3) Financial Configuration, (4) Review & Generate Link
- **FR-002**: System MUST auto-generate unique booking slugs from barber first and last names in kebab-case format (e.g., "john-smith")
- **FR-003**: System MUST detect slug conflicts and append numbers for uniqueness (e.g., "john-smith-2")
- **FR-004**: System MUST allow admins to manually customize booking slugs with validation (3-100 characters, kebab-case only)
- **FR-005**: System MUST create public booking pages accessible at `/book/[staffSlug]` without authentication
- **FR-006**: Public booking pages MUST display barber profile information: name, photo, bio, specialties, available services
- **FR-007**: System MUST integrate with existing Feature 011 API endpoints: `/api/book/[staffSlug]/`, `/api/book/[staffSlug]/services`, `/api/book/[staffSlug]/availability`, `/api/book/[staffSlug]/create`
- **FR-008**: System MUST calculate real-time availability showing only non-conflicting time slots in 30-minute intervals
- **FR-009**: System MUST process payments via Stripe integration before creating bookings
- **FR-010**: System MUST tag bookings with `booking_source: 'staff_link'` to track origin
- **FR-011**: System MUST enforce RBAC permissions - barbers see only their own bookings, admins see all
- **FR-012**: System MUST prevent duplicate bookings for the same time slot using database row-level locking
- **FR-013**: System MUST send confirmation notifications to clients after successful booking via both email and SMS by default
- **FR-013a**: System MUST provide settings interface for users to configure notification preferences (email only, SMS only, both, or none)
- **FR-013b**: System MUST respect user notification preferences when sending booking confirmations
- **FR-014**: System MUST provide analytics showing per-barber metrics: total bookings, revenue, popular services
- **FR-015**: System MUST support migration of existing barbers from old `[barberId]` system to new `[staffSlug]` system
- **FR-016**: System MUST store user notification preferences (email_enabled, sms_enabled) in user profile
- **FR-017**: Admin interface MUST allow shop owners to configure default notification settings for their shop

### Key Entities

- **Staff Onboarding Wizard**: Multi-step form component that collects barber information, assigns services, configures commission structure, and generates booking link
- **Public Booking Page**: Unauthenticated page at `/book/[staffSlug]` displaying barber profile, available services, real-time calendar, and payment form
- **Booking Slug**: Unique URL-safe identifier for each barber (e.g., "john-smith") stored in `profiles.booking_slug` column
- **Staff Analytics**: Dashboard component showing booking metrics, revenue, and performance data per barber with RBAC enforcement

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admins can complete the full barber onboarding process in under 5 minutes
- **SC-002**: System generates unique booking slugs with zero collisions (100% uniqueness guarantee)
- **SC-003**: Public users can complete a booking from viewing staff profile to payment confirmation in under 3 minutes
- **SC-004**: Real-time availability calculation completes in under 500ms for a 30-day date range
- **SC-005**: Concurrent booking attempts for the same time slot are prevented with 100% accuracy (no double-bookings)
- **SC-006**: 95% of public bookings via staff links result in successful payment and database record creation
- **SC-007**: Barbers can only access their own bookings (RBAC enforcement) with 100% isolation rate
- **SC-008**: Migration wizard successfully processes existing barbers and generates slugs with 100% success rate
- **SC-009**: Both old URLs (`/book/[barberId]`) and new URLs (`/book/[staffSlug]`) work during transition period with automatic redirects
- **SC-010**: Users can configure notification preferences and receive confirmations via their chosen channel(s) with 100% accuracy

## Out of Scope

- Advanced calendar features (recurring appointments, blocking time off) - already handled by existing availability system
- Multi-language support for booking pages - future enhancement
- Custom branding per barber (colors, logos) - future enhancement
- Review/rating system on booking pages - reviews are handled via Google My Business integration
- Automated reminder system - handled by separate auto-reminders feature
- Gift card/package sales - separate feature
- Mobile app booking - web-first approach, mobile web will work responsively

## Assumptions

- Stripe integration is already configured and working in the codebase
- Feature 011 database migrations have been applied to production
- Existing barbers have `first_name` and `last_name` fields available for slug generation
- Email notification system exists and can be triggered post-booking
- SMS provider (Twilio or similar) will need to be configured for text notifications
- Notification costs (especially SMS) should be considered in pricing model
- Shop owners have admin access level in the system
- Barbers have profile photos uploaded or can use default avatars
- Services are already configured in the database with pricing
- Commission structure uses existing financial model (commission percentage or booth rent)

## Dependencies

- Existing Feature 011 API endpoints must remain stable (no breaking changes)
- `lib/slug-generator.ts` utility must be tested and production-ready
- `lib/availability-calculator.ts` must handle 30-day ranges efficiently (< 500ms)
- Stripe API must be accessible and configured with live/test keys
- Database migrations 011_*.sql must be applied to target environment
- RBAC permissions system (`lib/permissions.ts`) must be functional

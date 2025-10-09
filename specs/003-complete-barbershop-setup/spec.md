# Feature Specification: Complete Barbershop Setup - Database-API-UI Alignment

**Feature Branch**: `003-complete-barbershop-setup`
**Created**: 2025-01-10
**Status**: Draft
**Input**: User description: "Comprehensive audit revealed critical gaps in barbershop management system: mock data violations in schedule/customer APIs, missing UI for products/inventory/POS, orphaned database tables lacking API endpoints, and incomplete full-stack implementations violating the Database→API→UI protocol."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Shop Owner Views Real Schedule Data (Priority: P1)

A shop owner needs to view today's appointment schedule to manage daily operations and ensure proper barber assignments.

**Why this priority**: CRITICAL - Currently returns mock data only. Real barbershop launches soon and needs actual appointment data for operations. This is a production blocker.

**Independent Test**: Can be fully tested by creating test appointments in database, logging in as shop owner, navigating to schedule page, and verifying real appointments display correctly. Delivers immediate operational value for managing daily bookings.

**Acceptance Scenarios**:

1. **Given** shop owner has 5 appointments in database for today, **When** they view schedule page, **Then** all 5 real appointments display with correct customer names, times, and barber assignments
2. **Given** shop owner filters schedule by specific barber, **When** they select barber from dropdown, **Then** only that barber's appointments display
3. **Given** shop owner has no appointments for selected date, **When** they view that date's schedule, **Then** system displays empty state message, not mock data

---

### User Story 2 - Shop Owner Manages Customer Database (Priority: P1)

A shop owner needs to search, view, and manage customer records to track visit history, preferences, and contact information.

**Why this priority**: CRITICAL - Currently returns mock data only. Customer data is core to barbershop operations for appointment booking, marketing, and relationship management. Production blocker.

**Independent Test**: Can be fully tested by creating test customers in database, performing search operations, viewing customer details, and verifying all data comes from real database. Delivers customer relationship management capability.

**Acceptance Scenarios**:

1. **Given** shop has 50 customers in database, **When** shop owner searches by name "John", **Then** system returns all customers with "John" in first or last name from database
2. **Given** shop owner views customer profile, **When** they check visit history, **Then** system displays actual appointment count and last visit date from database
3. **Given** shop owner creates new customer, **When** they save customer information, **Then** customer appears in database and in subsequent searches

---

### User Story 3 - Shop Owner Manages Product Inventory (Priority: P2)

A shop owner needs to view current product inventory, track stock levels, and receive low-stock alerts to ensure products are available for retail sales.

**Why this priority**: Essential for retail operations but not blocking core booking functionality. Products table exists with GET/POST APIs but completely missing UI.

**Independent Test**: Can be fully tested by adding products via API, then accessing new products management page to view inventory, update stock levels, and verify low-stock alerts trigger. Delivers retail inventory management capability.

**Acceptance Scenarios**:

1. **Given** shop has 25 products in inventory, **When** shop owner opens products page, **Then** all products display with current stock levels, retail prices, and categories
2. **Given** product stock falls below minimum threshold, **When** shop owner views inventory dashboard, **Then** system highlights low-stock products with warning indicators
3. **Given** shop owner updates product stock quantity, **When** they save changes, **Then** new stock level persists in database and reflects immediately in inventory view

---

### User Story 4 - Shop Owner Processes Point-of-Sale Transactions (Priority: P2)

A shop owner or staff member needs to ring up product sales at checkout, apply discounts, and track which barber made the sale for commission purposes.

**Why this priority**: Essential for retail revenue but secondary to core booking operations. Database table exists but completely missing API and UI.

**Independent Test**: Can be fully tested by creating new POS page, selecting products, applying payment, and verifying transaction records in product_sales table with correct barber commission tracking. Delivers retail transaction capability.

**Acceptance Scenarios**:

1. **Given** customer purchases 3 products, **When** staff processes POS transaction, **Then** system calculates subtotal, tax, total, and records transaction in product_sales table
2. **Given** barber sells product, **When** transaction completes, **Then** system calculates barber commission based on financial arrangement and links sale to barber record
3. **Given** staff applies discount to sale, **When** they complete transaction, **Then** system records discount amount and adjusts barber commission accordingly

---

### User Story 5 - Shop Owner Adjusts Inventory Levels (Priority: P3)

A shop owner needs to record inventory adjustments for reasons like damage, theft, returns, or stock recounts to maintain accurate inventory records.

**Why this priority**: Important for inventory accuracy but not blocking daily operations. Can manually track temporarily.

**Independent Test**: Can be fully tested by creating inventory adjustment records through new UI, verifying adjustments update product stock levels, and checking audit trail in inventory_adjustments table. Delivers inventory audit capability.

**Acceptance Scenarios**:

1. **Given** product damaged during use, **When** shop owner records damage adjustment, **Then** system reduces stock count and logs adjustment with reason and timestamp
2. **Given** shop owner performs stock recount, **When** they adjust quantity to match physical count, **Then** system updates stock level and records before/after quantities for audit
3. **Given** shop owner views adjustment history, **When** they filter by product or date range, **Then** system displays all adjustments with reasons, quantities, and who made changes

---

### User Story 6 - Barber Customizes Personal Landing Page (Priority: P3)

An individual barber needs to customize their personal booking page with branding, bio, portfolio images, and service offerings to attract clients.

**Why this priority**: Valuable for barber marketing but not blocking core operations. Database table exists but missing API and UI.

**Independent Test**: Can be fully tested by barber logging in, accessing customization page, updating branding settings, and verifying changes persist and display on public booking page. Delivers barber personalization capability.

**Acceptance Scenarios**:

1. **Given** barber wants custom branding, **When** they set primary color, logo, and background image, **Then** changes apply to their public booking page immediately
2. **Given** barber adds portfolio images, **When** they upload before/after photos, **Then** images display in gallery on their landing page
3. **Given** shop owner reviews customization, **When** barber submits page for approval, **Then** shop owner can preview and approve/reject changes

---

### User Story 7 - Barber Sets Individual Service Prices (Priority: P3)

A barber needs to offer services at their own pricing that may differ from shop defaults, supporting both commission and booth rental business models.

**Why this priority**: Important for flexible pricing models but not critical for initial launch. Can use shop default pricing temporarily.

**Independent Test**: Can be fully tested by barber creating custom service with price override, then verifying custom service appears in their booking availability and shop default services remain unchanged. Delivers pricing flexibility.

**Acceptance Scenarios**:

1. **Given** barber has specialty service, **When** they create custom service "Premium Fade" at $55, **Then** service appears only in their booking options at specified price
2. **Given** barber overrides default service price, **When** they set "Classic Cut" to $40 instead of shop default $35, **Then** their booking shows $40 while other barbers show $35
3. **Given** barber deactivates custom service, **When** they toggle service inactive, **Then** service no longer appears in booking options but remains in database

---

### User Story 8 - Barber Views Performance Analytics (Priority: P3)

A barber needs to view their performance metrics including appointments completed, revenue generated, client retention, and commission earned to track their business growth.

**Why this priority**: Valuable for barber insights but not blocking operations. Table exists but needs API connection to existing analytics page.

**Independent Test**: Can be fully tested by generating test appointment/payment data for barber, then accessing analytics page and verifying metrics calculate correctly from barber_performance_metrics table. Delivers business intelligence capability.

**Acceptance Scenarios**:

1. **Given** barber completed 45 appointments this month, **When** they view monthly analytics, **Then** system displays 45 appointments with revenue breakdown by service type
2. **Given** barber has 30% client retention rate, **When** they view client metrics, **Then** system shows percentage of returning vs new clients
3. **Given** barber earns commission on sales, **When** they view earnings report, **Then** system displays service commission, product commission, and tip totals

---

### User Story 9 - Shop Owner Manages Multiple Locations (Priority: P3)

An enterprise owner needs to view and manage multiple barbershop locations including cross-location analytics, staff transfers, and consolidated reporting.

**Why this priority**: Only relevant for enterprise tier customers. Can defer until multi-location clients onboard.

**Independent Test**: Can be fully tested by creating organization with 2+ barbershops, then accessing enterprise dashboard to view aggregated metrics and switch between locations. Delivers multi-location management.

**Acceptance Scenarios**:

1. **Given** enterprise owns 3 locations, **When** they view enterprise dashboard, **Then** system displays aggregated revenue, appointments, and client counts across all locations
2. **Given** enterprise wants location comparison, **When** they access performance report, **Then** system shows side-by-side metrics for each location
3. **Given** enterprise transfers staff between locations, **When** they update staff barbershop assignment, **Then** staff access changes to new location dashboard

---

### Edge Cases

- What happens when shop owner views schedule for date with 50+ appointments (pagination/performance)?
- How does system handle customer search with special characters in names (O'Brien, José)?
- What happens when product sale occurs but inventory insufficient (should block sale or allow negative stock)?
- How does system handle barber customization approval workflow when shop owner is offline?
- What happens when enterprise owner has 10+ locations (UI scalability for location selector)?
- How does system handle commission calculation when barber switches from commission to booth rent mid-month?
- What happens when customer has duplicate records in database (merge functionality needed)?
- How does system handle inventory adjustment that would result in negative stock?

## Requirements *(mandatory)*

### Functional Requirements

**Schedule/Appointment Management (P1 - Critical)**

- **FR-001**: System MUST replace mock data in `/api/shop/schedule/route.js` with real queries to `appointments` table
- **FR-002**: System MUST support filtering appointments by date, barber, and status
- **FR-003**: System MUST implement pagination for appointment lists to handle high-volume shops (100+ appointments/day)
- **FR-004**: System MUST calculate appointment summary statistics (total, completed, confirmed, cancelled) from database
- **FR-005**: Shop owner MUST be able to view appointment details including customer contact, service, duration, price, and payment status

**Customer Management (P1 - Critical)**

- **FR-006**: System MUST replace mock data in `/api/shop/customers/route.js` with real queries to `customers` table
- **FR-007**: System MUST add `customers` table schema to main `complete-schema.sql` file for production deployments
- **FR-008**: System MUST support customer search by name, email, and phone with partial matching
- **FR-009**: System MUST implement pagination for customer lists to handle large customer databases (1000+ customers)
- **FR-010**: System MUST display customer visit history, total spent, loyalty points, and preferred barber
- **FR-011**: Shop owner MUST be able to create new customers with required fields (name, contact info)
- **FR-012**: System MUST calculate customer summary statistics (active, new, VIP, inactive counts, lifetime value) from database

**Product Inventory Management (P2 - Essential)**

- **FR-013**: System MUST create UI page at `/shop/products/page.js` connecting to existing `/api/shop/products` endpoint
- **FR-014**: Shop owner MUST be able to view all products with stock levels, prices, categories, and SKUs
- **FR-015**: System MUST highlight low-stock products when current stock ≤ minimum stock level
- **FR-016**: System MUST highlight out-of-stock products when current stock = 0
- **FR-017**: Shop owner MUST be able to create new products with required fields (name, retail price, stock levels)
- **FR-018**: Shop owner MUST be able to update product information and stock quantities
- **FR-019**: System MUST calculate inventory metrics (total products, total value, low-stock count, out-of-stock count) from database

**Point-of-Sale (P2 - Essential)**

- **FR-020**: System MUST create API endpoint `/api/shop/pos/route.js` connecting to `product_sales` table
- **FR-021**: System MUST create UI page at `/shop/pos/page.js` for transaction processing
- **FR-022**: Staff MUST be able to add multiple products to transaction with quantities
- **FR-023**: System MUST calculate subtotal, tax amount, discount amount, and total for transaction
- **FR-024**: System MUST link transaction to barber who made sale for commission tracking
- **FR-025**: System MUST calculate barber commission based on product commission rate from `financial_arrangements` table
- **FR-026**: System MUST support multiple payment methods (card, cash, check, appointment checkout)
- **FR-027**: System MUST record line items with product details, quantities, prices, and commission amounts
- **FR-028**: System MUST update product stock levels automatically after successful transaction

**Inventory Adjustments (P3 - Important)**

- **FR-029**: System MUST create API endpoint `/api/shop/inventory/route.js` connecting to `inventory_adjustments` table
- **FR-030**: System MUST create UI page at `/shop/inventory/page.js` for adjustment management
- **FR-031**: Shop owner MUST be able to record inventory adjustments with type (sale, return, damage, theft, recount, received)
- **FR-032**: System MUST update product stock levels automatically based on adjustment quantity
- **FR-033**: System MUST record before/after stock levels for audit trail
- **FR-034**: System MUST link adjustment to user who made change for accountability
- **FR-035**: System MUST support adding reason/notes to explain adjustment
- **FR-036**: Shop owner MUST be able to view adjustment history filtered by product, date, or type

**Barber Customizations (P3 - Valuable)**

- **FR-037**: System MUST create API endpoint `/api/barber/customization/route.js` connecting to `barber_customizations` table
- **FR-038**: System MUST create UI page at `/barber/customize/page.js` for branding settings
- **FR-039**: Barber MUST be able to set custom URL path for their landing page (e.g., /chris-bossio)
- **FR-040**: Barber MUST be able to upload logo, background image, and portfolio images
- **FR-041**: Barber MUST be able to set primary, secondary, and accent colors for branding
- **FR-042**: Barber MUST be able to add bio, years experience, specialties, and certifications
- **FR-043**: Barber MUST be able to set contact info, social media handles, and business settings
- **FR-044**: System MUST require shop owner approval before customization goes live
- **FR-045**: Shop owner MUST be able to preview and approve/reject barber customizations

**Barber Services (P3 - Valuable)**

- **FR-046**: System MUST create API endpoint `/api/barber/services/route.js` connecting to `barber_services` table
- **FR-047**: Barber MUST be able to create custom services with own pricing that override shop defaults
- **FR-048**: Barber MUST be able to specify service duration, category, and whether online booking enabled
- **FR-049**: Barber MUST be able to add addon options (e.g., beard trim +$10) to services
- **FR-050**: System MUST show barber's custom services only in their booking availability
- **FR-051**: Barber MUST be able to activate/deactivate services without deleting them
- **FR-052**: System MUST link custom services to barber for commission calculation

**Barber Performance Metrics (P3 - Valuable)**

- **FR-053**: System MUST create API endpoint `/api/barber/performance/route.js` connecting to `barber_performance_metrics` table
- **FR-054**: System MUST update existing `/barber/analytics/page.js` to consume performance API
- **FR-055**: Barber MUST be able to view appointment metrics (completed, cancelled, no-show counts)
- **FR-056**: Barber MUST be able to view revenue metrics (service revenue, product revenue, tips, total)
- **FR-057**: Barber MUST be able to view earnings breakdown (service commission, product commission, total earnings)
- **FR-058**: Barber MUST be able to view client metrics (new clients, returning clients, retention rate)
- **FR-059**: System MUST support filtering performance metrics by date range (daily, weekly, monthly)

**Enterprise Multi-Location (P3 - Valuable)**

- **FR-060**: System MUST create API endpoint `/api/enterprise/organizations/route.js` connecting to `organizations` table
- **FR-061**: Enterprise owner MUST be able to view all barbershops within their organization
- **FR-062**: Enterprise owner MUST be able to view aggregated metrics across all locations
- **FR-063**: Enterprise owner MUST be able to switch context between locations for detailed views
- **FR-064**: System MUST support cross-location reporting (consolidated revenue, appointments, clients)

**Services Mock Data Cleanup (P1 - Critical)**

- **FR-065**: System MUST remove mock data fallback from `/api/services/route.js`
- **FR-066**: System MUST ensure all service queries connect to `services` table in database
- **FR-067**: System MUST return empty array with proper structure when no services exist, not mock data

### Key Entities

- **Appointment**: Scheduled booking linking customer, barber, service, and time slot with status tracking (pending, confirmed, completed, cancelled, no-show) and payment information
- **Customer**: Client profile with contact information, visit history, spending totals, loyalty points, preferred barber, and notification preferences
- **Product**: Retail item with inventory tracking including stock levels (current, reserved, minimum, reorder, maximum), pricing (cost, retail, wholesale), and category/SKU identification
- **Product Sale**: Point-of-sale transaction recording multiple line items with quantities, prices, discounts, tax, payment method, and barber commission tracking
- **Inventory Adjustment**: Audit trail for stock changes recording adjustment type (sale, return, damage, theft, recount, received), quantity delta, before/after levels, and reason
- **Barber Customization**: Individual barber branding and settings for personal landing page including colors, images, bio, portfolio, social links, and shop owner approval status
- **Barber Service**: Custom service offerings by individual barber with own pricing, duration, addons, and booking rules that may override shop defaults
- **Barber Performance Metrics**: Time-series analytics aggregating barber appointment counts, revenue totals, commission earnings, client acquisition, and retention rates by period (daily, weekly, monthly)
- **Organization**: Enterprise entity grouping multiple barbershop locations for consolidated management and cross-location reporting
- **Financial Arrangement**: Contract between shop and barber defining payment model (commission, booth rent, hybrid) with rates, tiers, rent amounts, frequencies, and payout settings

## Success Criteria *(mandatory)*

### Measurable Outcomes

**Data Integrity & Production Readiness (P1)**

- **SC-001**: Zero mock data returned from any API endpoint - 100% of responses come from real database queries
- **SC-002**: Shop owner can view actual schedule with real appointments within 2 seconds of page load for typical daily load (50 appointments)
- **SC-003**: Shop owner can search customer database and retrieve accurate results in under 1 second for databases up to 5,000 customers
- **SC-004**: All existing database tables have corresponding API endpoints that allow CRUD operations where applicable
- **SC-005**: System passes full-stack integration tests verifying Database→API→UI connection for all 14 identified components

**Inventory & Retail Operations (P2)**

- **SC-006**: Shop owner can view complete product inventory status and identify low-stock items in single page view
- **SC-007**: Staff can complete product sale transaction from selection to payment confirmation in under 60 seconds
- **SC-008**: System accurately calculates and records barber commissions on 100% of product sales
- **SC-009**: Product stock levels update immediately after sales or adjustments with full audit trail maintained
- **SC-010**: Shop owner can track inventory value and out-of-stock rate reducing stockouts by 40%

**Barber Features & Analytics (P3)**

- **SC-011**: Barber can customize personal landing page and see changes reflected on public booking page within 5 seconds
- **SC-012**: Barber can create custom services with individual pricing in under 3 minutes
- **SC-013**: Barber can access performance analytics showing revenue, appointments, and client metrics for any date range
- **SC-014**: System calculates barber performance metrics with 100% accuracy compared to source transactions
- **SC-015**: 90% of barbers successfully customize their landing page within first week of feature availability

**Enterprise & Multi-Location (P3)**

- **SC-016**: Enterprise owner can view consolidated metrics across all locations in single dashboard load
- **SC-017**: System supports managing organizations with up to 20 locations without performance degradation
- **SC-018**: Enterprise owner can switch between location views in under 2 seconds

**System Quality**

- **SC-019**: 95% of shop owners complete primary management tasks (view schedule, search customers, check inventory) on first attempt
- **SC-020**: System maintains sub-2 second response times for 95th percentile of API requests under normal load
- **SC-021**: Zero data loss during transition from mock data to real database connections

## Assumptions *(mandatory)*

### Technical Environment

- Supabase PostgreSQL database is primary data store for all environments (no SQLite, no local databases)
- Existing database schemas in `database/complete-schema.sql` and `database/barber-operations-schema.sql` are authoritative
- Next.js 14 App Router architecture with API routes at `/app/api/` paths
- Authentication handled via Supabase Auth with session-based access control
- Row-level security (RLS) policies enforce data access permissions at database level

### Business Rules & Defaults

- Shop owner approval required for barber customizations before going live (protects brand consistency)
- Default commission rate of 60% for services, 10% for products if not specified in financial arrangement
- Inventory adjustments immediately update stock levels (no batch processing delay)
- Customer loyalty points calculated at 2 points per dollar spent (industry standard)
- Tax rate calculated based on shop location (to be configured per barbershop)
- Product sale without sufficient stock blocks transaction (prevents negative inventory)
- Barber performance metrics calculated daily at midnight for previous day

### User Roles & Permissions

- Shop Owner: Full access to all shop data, staff management, inventory, financial arrangements
- Barber: Access to own schedule, customers, services, customizations, and performance analytics
- Enterprise Owner: Access to all shops in organization plus consolidated reporting
- Super Admin: System-wide access for platform management

### Data Integrity & Migration

- Existing appointments and customers data (if any) will be migrated before removing mock data fallbacks
- Customer table schema from migrations will be merged into main complete-schema.sql
- All orphaned database tables currently have no conflicting data (safe to connect APIs)
- Product sales prior to POS implementation tracked manually and not in system (no historical import required)

### Scope Boundaries

- OUT OF SCOPE: Creating new database tables - this feature connects existing tables only
- OUT OF SCOPE: Modifying appointment booking flow - focus is backend data connectivity
- OUT OF SCOPE: Payment processing integration - assumes payment status tracked separately
- OUT OF SCOPE: Real-time notifications for low stock - simple dashboard indicators only
- OUT OF SCOPE: Barber availability/schedule table (identified as missing but deferred to future feature)
- OUT OF SCOPE: Advanced inventory features like purchase orders, supplier management
- OUT OF SCOPE: Customer merge functionality for duplicates (manual process acceptable initially)

## Dependencies *(mandatory)*

### External Systems

- **Supabase PostgreSQL**: All database queries depend on Supabase connection and credentials
- **Supabase Auth**: User authentication and session management for permission checks
- **Environment Variables**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### Internal Systems

- **Existing API Routes**: New endpoints follow same patterns as `/api/shop/products` and `/api/shop/financial/arrangements`
- **Authentication Middleware**: Reuse existing auth checks in `/lib/auth-middleware.js`
- **Supabase Client**: Utilize existing client initialization in `/lib/supabase/server`
- **Protected Route Components**: Reuse `ProtectedRoute` wrapper for securing new pages

### Data Dependencies

- **Database Schema Files**:
  - `database/complete-schema.sql` - core tables (appointments, services, products, etc.)
  - `database/barber-operations-schema.sql` - barber-specific tables (customizations, services, metrics)
  - `database/schemas/customers.sql` - customer table definition
- **Financial Arrangements**: POS commission calculation depends on existing `financial_arrangements` records
- **Shop/Barber Relationships**: All features depend on user belonging to barbershop via `barbershop_staff` table
- **Existing UI Components**: Reuse components from `/components/` directory for consistent interface

### Development Dependencies

- **FULLSTACK_DEVELOPMENT_PROTOCOL.md**: All implementations must follow Database→API→UI pattern
- **SUPABASE_PRODUCTION_RULE.md**: Absolute requirement to use Supabase for all data operations (no mock data, no SQLite)
- **NO_MOCK_DATA_POLICY.md**: Zero tolerance for mock data generation or fallback mock data in APIs

### Acceptance Blockers

- Cannot proceed to production until:
  - All P1 mock data violations eliminated (schedule, customers, services APIs)
  - Database schemas consolidated (customers table added to main schema file)
  - Full-stack integration tests pass for critical paths (schedule view, customer search, inventory management)
  - Performance benchmarks met (< 2 second load times for primary pages)

## Out of Scope *(mandatory)*

### Explicitly Excluded

1. **New Database Tables**: This feature connects existing tables only. Creating new tables (e.g., barber_availability) is deferred to separate features.

2. **Appointment Booking Modifications**: Focus is backend data connectivity and management views, not changing how customers book appointments.

3. **Payment Gateway Integration**: Assumes payment status is tracked but actual payment processing (Stripe, etc.) is separate concern.

4. **Real-time Features**: No WebSocket/Pusher integration for live updates. Standard request/response pattern sufficient.

5. **Advanced Inventory**: No purchase orders, supplier management, automatic reordering, or multi-warehouse support.

6. **Customer Communication**: No email/SMS marketing, appointment reminders, or notification sending within this feature.

7. **Reviews & Ratings**: Continues using Google Reviews only per CLAUDE.md architecture decision.

8. **Calendar Sync**: No Google Calendar or Outlook integration changes - separate existing feature.

9. **Mobile App**: Web application only - native mobile apps are separate products.

10. **Reporting & Exports**: Basic dashboard metrics only, no PDF reports or CSV exports in this phase.

11. **Multi-Currency**: Single currency per shop, no international currency support.

12. **Barber Availability Management**: Identified as missing table/feature but requires full Database→API→UI implementation in separate feature.

13. **Customer Merge Utility**: Manual process acceptable for handling duplicate customer records initially.

14. **Historical Data Migration**: Only current data - no import of historical transactions from manual records.

15. **Franchise-Specific Features**: Multi-location support covers basic organization grouping only, no franchise fees, royalties, or territory management.

### Future Enhancements

These are valuable but deferred to maintain focus on core Database→API→UI alignment:

- Advanced inventory forecasting and automatic reorder points
- Bulk product import via CSV
- Customer segments and targeted marketing campaigns
- Staff performance comparison and leaderboards
- Integration with accounting software (QuickBooks, etc.)
- Multi-language support for international locations
- Advanced reporting with custom date ranges and metrics
- Customer self-service portal for managing appointments and loyalty points

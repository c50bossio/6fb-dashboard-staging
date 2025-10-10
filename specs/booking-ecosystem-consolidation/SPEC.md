# Booking Ecosystem Consolidation Specification

**Project**: 6FB AI Agent System
**Feature**: Booking Ecosystem Consolidation
**Status**: In Progress
**Created**: 2025-10-10
**Owner**: Chris Bossio

---

## Problem Statement

The 6FB AI Agent System currently has **duplicate tables and inconsistent terminology** causing data fragmentation, API confusion, and app instability:

1. **TWO booking tables**: `appointments` and `bookings` with different schemas
2. **TWO staff tables**: `barbers` (TEXT ids) and `barbershop_staff` (UUID ids)
3. **Inconsistent terminology**: "appointments" vs "bookings", "clients" vs "customers"
4. **Column naming conflicts**: `shop_id` vs `barbershop_id` in services table

This violates the **"Single Source of Truth"** principle and causes:
- Data inconsistency across pages
- API endpoints querying different tables
- Components breaking due to schema mismatches
- Difficulty maintaining and debugging the booking flow

---

## Goals

1. **Establish ONE canonical table** for each entity (appointments, staff, customers, services)
2. **Migrate all data** from deprecated tables without loss
3. **Standardize terminology** throughout the codebase
4. **Update all API endpoints** to query canonical tables
5. **Refactor all components** to use consistent data sources
6. **Maintain backward compatibility** during transition
7. **Zero downtime** for production environment

---

## Single Source of Truth Mapping

### 1. Appointments/Bookings → `appointments` ✓

**Canonical Table**: `appointments`
**Deprecated Table**: `bookings`

**Rationale**:
- `appointments` has 26 columns with full relationship support
- Proper UUID foreign keys to customers, barbers, services
- Used by main booking APIs (`/api/bookings/route.js`)
- Has payment tracking, recurring appointments, walk-in support

**Migration Strategy**:
- Copy all data from `bookings` to `appointments`
- Map `bookings.customer_name` → create customer record if missing
- Map `bookings.barber_name` → lookup barber in `barbershop_staff`
- Map `bookings.service_name` → lookup service in `services`
- Preserve `bookings` as view temporarily for backward compatibility

### 2. Staff/Barbers → `barbershop_staff` ✓

**Canonical Table**: `barbershop_staff`
**Deprecated Table**: `barbers`

**Rationale**:
- `barbershop_staff` uses UUID primary keys (system standard)
- Supports multi-tenant architecture with proper `barbershop_id`
- Has role-based permissions (`role`, `permissions` columns)
- Tracks financial arrangements (`commission_rate`)
- Links to user profiles via `user_id` foreign key

**Migration Strategy**:
- Create UUID mapping for `barbers.id` (TEXT) → `barbershop_staff.id` (UUID)
- Copy barber data to `profiles` table (name, email, phone, specialties)
- Link via `barbershop_staff.user_id` → `profiles.id`
- Create backward-compatible view `barbers` for transition period
- Update all foreign key references to use UUIDs

### 3. Customers/Clients → `customers` ✓

**Canonical Table**: `customers`
**Deprecated Terminology**: "clients" in code

**Rationale**:
- Dedicated `customers` table already exists with proper schema
- Tracks customer history (visits, spending, preferences)
- Supports both registered users and walk-in customers
- Has marketing consent and referral tracking

**Standardization Strategy**:
- Use "customer" terminology consistently in all code
- Update API parameter names: `client_id` → `customer_id`
- Update component prop names: `clientId` → `customerId`
- Keep database column `appointments.customer_id` (already correct)

### 4. Services → `services` ✓

**Canonical Table**: `services` (already singular)

**Cleanup Strategy**:
- Remove `shop_id` column (redundant with `barbershop_id`)
- Standardize all queries to use `barbershop_id`
- Update foreign keys and indexes
- Ensure pricing always stored in `price` column

---

## Database Schema Changes

### Appointments Table (Canonical)

```sql
-- appointments table (KEEP - this is canonical)
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID REFERENCES barbershops(id),
    customer_id UUID REFERENCES customers(id),
    barber_id UUID REFERENCES profiles(id),
    service_id UUID REFERENCES services(id),

    -- Scheduling
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 30,

    -- Status tracking
    status TEXT DEFAULT 'PENDING', -- PENDING, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW

    -- Pricing
    price NUMERIC(10,2),
    tip_amount NUMERIC(10,2) DEFAULT 0,
    total_amount NUMERIC(10,2),
    service_price NUMERIC(10,2),

    -- Customer info (for walk-ins without customer_id)
    client_name VARCHAR(255),
    client_phone VARCHAR(20),
    client_email VARCHAR(255),

    -- Notes
    notes TEXT,
    client_notes TEXT,
    barber_notes TEXT,

    -- Recurring appointments
    recurrence_rule TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_pattern JSONB,
    parent_appointment_id UUID REFERENCES appointments(id),

    -- Metadata
    booking_source VARCHAR(50) DEFAULT 'online', -- online, phone, walk_in
    is_walk_in BOOLEAN DEFAULT FALSE,
    is_test BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Barbershop Staff Table (Canonical)

```sql
-- barbershop_staff table (KEEP - this is canonical)
CREATE TABLE barbershop_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID REFERENCES barbershops(id),
    user_id UUID REFERENCES profiles(id),

    -- Role and permissions
    role TEXT, -- BARBER, SHOP_OWNER, MANAGER, etc.
    permissions JSONB,

    -- Financial
    commission_rate NUMERIC(5,2),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Deprecated Tables (TO BE REMOVED)

```sql
-- bookings table (DEPRECATED - migrate to appointments)
DROP TABLE IF EXISTS bookings CASCADE;

-- barbers table (DEPRECATED - migrate to barbershop_staff)
DROP TABLE IF EXISTS barbers CASCADE;
```

---

## API Endpoint Standardization

### Before (Inconsistent)

```
GET  /api/bookings              → queries appointments table
GET  /api/appointments          → queries appointments table (duplicate)
POST /api/bookings/create       → creates in appointments table
GET  /api/calendar/appointments → queries appointments table
```

### After (Consistent)

```
GET    /api/appointments              → CANONICAL endpoint
POST   /api/appointments              → Create appointment
GET    /api/appointments/:id          → Get single appointment
PUT    /api/appointments/:id          → Update appointment
DELETE /api/appointments/:id          → Cancel appointment

GET    /api/bookings → REDIRECT to /api/appointments (legacy support)
```

### Query Parameters Standardization

**Before**:
- `client_id`, `customer_id` (both used)
- `barber_id` (correct)
- `barbershop_id`, `shop_id` (both used)

**After**:
- `customer_id` (standard)
- `barber_id` (unchanged)
- `barbershop_id` (standard)

---

## Component Refactoring Plan

### Pages to Update

1. `/app/(protected)/bookings/page.js`
   - Currently calls `/api/appointments`
   - Update to use standardized `/api/appointments` endpoint
   - Change "bookings" terminology to "appointments"
   - Update prop names: `booking` → `appointment`

2. `/app/(protected)/dashboard/bookings/page.js`
   - Currently redirects to `/dashboard/calendar`
   - Convert to full appointments list page
   - Show all appointments with filtering

3. `/app/bookings/[id]/page.js`
   - Public booking confirmation page
   - Update to query `/api/appointments/:id`

### Components to Update

1. `components/booking/BookingWizard.js`
   - Update to POST to `/api/appointments`
   - Standardize parameter names

2. `components/booking/BookingPaymentModal.js`
   - Update to use `appointment` props instead of `booking`

3. `components/calendar/AppointmentBookingModal.js`
   - Already uses appointments (no change needed)

4. `components/booking/steps/*`
   - All step components use appointments (verify)

---

## Migration Execution Plan

### Phase 1: Database Consolidation

**Step 1.1**: Create migration script
- File: `database/consolidate-booking-ecosystem.sql`
- Migrate `bookings` → `appointments`
- Migrate `barbers` → `barbershop_staff` + `profiles`
- Create backward-compatible views

**Step 1.2**: Data validation queries
- Count records before/after migration
- Verify no NULL foreign keys
- Check for orphaned records

**Step 1.3**: Execute migration
- Backup database first
- Run migration script
- Validate data integrity
- Test API endpoints

### Phase 2: API Standardization

**Step 2.1**: Update `/api/bookings/route.js`
- Add deprecation notice
- Redirect to `/api/appointments`

**Step 2.2**: Standardize query parameters
- Update all endpoints to use `customer_id`, `barbershop_id`

**Step 2.3**: Update API documentation
- Document canonical endpoints
- Mark deprecated endpoints

### Phase 3: Component Refactoring

**Step 3.1**: Update booking pages
- Refactor terminology
- Update API calls
- Test user flows

**Step 3.2**: Update booking components
- Standardize prop names
- Update state management

**Step 3.3**: Update calendar components
- Verify using appointments table
- Test event creation/updates

### Phase 4: Testing & Validation

**Step 4.1**: Run test suite
- Unit tests for APIs
- Integration tests for booking flow
- E2E tests for calendar

**Step 4.2**: Manual testing
- Create appointment
- Update appointment
- Cancel appointment
- Payment flow

**Step 4.3**: Performance validation
- Check query performance
- Verify indexes used
- Monitor Supabase dashboard

### Phase 5: Cleanup & Documentation

**Step 5.1**: Remove deprecated code
- Drop `bookings` table
- Drop `barbers` table
- Remove compatibility views

**Step 5.2**: Update documentation
- Update API docs
- Update developer guide
- Document migration history

**Step 5.3**: Monitor production
- Check Sentry for errors
- Monitor API response times
- Validate data consistency

---

## Acceptance Criteria

### Database Layer
- [ ] Only `appointments` table exists (no `bookings`)
- [ ] Only `barbershop_staff` table exists (no `barbers`)
- [ ] All foreign keys use UUIDs consistently
- [ ] Zero data loss from migration
- [ ] RLS policies updated and functional

### API Layer
- [ ] `/api/appointments` is canonical endpoint
- [ ] `/api/bookings` redirects to `/api/appointments`
- [ ] All query parameters standardized
- [ ] Response schemas consistent
- [ ] All endpoints return appointments data

### Component Layer
- [ ] No "booking" terminology in active code
- [ ] All components use "appointment" terminology
- [ ] Calendar uses appointments table exclusively
- [ ] Payment flows functional
- [ ] Customer flows functional

### Testing
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] All E2E tests passing
- [ ] Manual testing completed
- [ ] No console errors

### Documentation
- [ ] Database schema documented
- [ ] API endpoints documented
- [ ] Migration history documented
- [ ] CLAUDE.md updated if needed

---

## Risk Mitigation

### Backup Strategy
1. Export Supabase database before migration
2. Take snapshot of codebase
3. Document rollback procedures

### Rollback Plan
1. Keep migration scripts reversible
2. Maintain backward compatibility views for 1 week
3. Monitor for issues during transition
4. Have rollback SQL ready

### Monitoring
1. Sentry error tracking
2. Supabase query performance monitoring
3. User feedback channels
4. API response time metrics

---

## Timeline

| Phase | Task | Duration | Owner |
|-------|------|----------|-------|
| 1 | Database Consolidation | 2-3 hours | Claude |
| 2 | API Standardization | 2 hours | Claude |
| 3 | Component Refactoring | 3-4 hours | Claude |
| 4 | Testing & Validation | 2 hours | Claude |
| 5 | Cleanup & Documentation | 1 hour | Claude |

**Total Estimated Time**: 10-12 hours

---

## References

- **CLAUDE.md**: Project constitution and principles
- **FULLSTACK_DEVELOPMENT_PROTOCOL.md**: Full-stack requirements
- **SUPABASE_PRODUCTION_RULE.md**: Database usage enforcement
- **GetSquire.com**: Industry best practices for barbershop booking systems

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-10-10 | Initial specification created | Claude Code |
| 2025-10-10 | Research completed, plan approved | Claude Code |

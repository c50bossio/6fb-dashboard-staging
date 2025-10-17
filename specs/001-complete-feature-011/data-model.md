# Data Model: Complete Feature 011 - Public Booking & Staff Onboarding

**Feature**: 001-complete-feature-011
**Date**: 2025-10-07
**Status**: Phase 1 Design

## Overview

This feature leverages **existing Supabase tables** created in Feature 011. No new database migrations are required - all data operations use the already-applied schema. This document describes how the frontend components will interact with these existing tables.

## Existing Database Schema (Feature 011)

### Table: `profiles`

**Purpose**: Stores user/staff information with booking slug for public pages

**Columns Added by Feature 011**:
- `booking_slug` VARCHAR(100) UNIQUE - URL-safe identifier (e.g., "john-smith")
- `bio` TEXT - Staff member biography/description
- `specialties` TEXT[] - Array of specialties (e.g., ["Fades", "Beard Trim"])
- `role` VARCHAR(20) - User role (ADMIN, MANAGER, BARBER, RECEPTIONIST)

**Existing Columns**:
- `id` UUID PRIMARY KEY
- `email` VARCHAR(255)
- `name` VARCHAR(255)
- `first_name` VARCHAR(100)
- `last_name` VARCHAR(100)
- `phone` VARCHAR(20)
- `image` TEXT (URL to profile photo)
- `barbershop_id` UUID (FK to barbershops)
- `created_at` TIMESTAMP
- `updated_at` TIMESTAMP

**Indexes**:
- `idx_profiles_booking_slug` - Unique index for fast URL lookups
- `idx_profiles_specialties` - GIN index for array searches
- `idx_profiles_role` - For role-based filtering

**RLS Policies**:
- Public SELECT where `role = 'BARBER'` and `booking_slug IS NOT NULL`
- Authenticated users can SELECT their own profile
- ADMIN can SELECT/UPDATE all profiles in their organization

**Usage in Feature 001**:
- **Onboarding Wizard**: INSERTs new barber profile with auto-generated `booking_slug`
- **Public Booking Page**: SELECTs profile by `booking_slug` (unauthenticated query)
- **Analytics Dashboard**: SELECTs profiles with booking metrics (RBAC filtered)
- **Migration Wizard**: UPDATEs existing profiles to add `booking_slug`

---

### Table: `bookings`

**Purpose**: Stores appointment bookings with source tracking

**Column Added by Feature 011**:
- `booking_source` VARCHAR(20) - Origin of booking ("staff_link", "admin", "walk_in")

**Existing Columns**:
- `id` UUID PRIMARY KEY
- `customer_id` UUID (FK to customers)
- `barber_id` UUID (FK to profiles)
- `barbershop_id` UUID (FK to barbershops)
- `service_id` UUID (FK to services)
- `start_time` TIMESTAMP
- `end_time` TIMESTAMP
- `status` VARCHAR(20) ("pending", "confirmed", "completed", "cancelled")
- `total_price` DECIMAL(10,2)
- `notes` TEXT
- `created_at` TIMESTAMP
- `updated_at` TIMESTAMP

**Indexes**:
- `idx_bookings_barber_id_start_time` - For availability queries
- `idx_bookings_booking_source` - For analytics filtering
- `idx_bookings_barbershop_id` - For shop-level queries

**RLS Policies**:
- BARBERs can SELECT only bookings where `barber_id = auth.uid()`
- ADMINs can SELECT all bookings in their organization
- Public INSERT allowed only with valid payment confirmation

**Usage in Feature 001**:
- **Public Booking Page**: INSERTs new booking with `booking_source = 'staff_link'`
- **Availability Calculator**: SELECTs bookings to determine free slots
- **Analytics Dashboard**: SELECTs bookings grouped by `booking_source` for metrics
- **RBAC Filtering**: Barbers see only `barber_id = auth.uid()`, admins see all

---

### Table: `staff_availability`

**Purpose**: Defines weekly recurring availability for barbers

**Columns**:
- `id` UUID PRIMARY KEY
- `barber_id` UUID (FK to profiles)
- `day_of_week` INTEGER (0=Sunday, 6=Saturday)
- `start_time` TIME
- `end_time` TIME
- `is_active` BOOLEAN
- `created_at` TIMESTAMP
- `updated_at` TIMESTAMP

**Indexes**:
- `idx_staff_availability_barber_id` - For barber-specific queries
- `idx_staff_availability_day_of_week` - For day-based filtering

**RLS Policies**:
- BARBERs can SELECT/UPDATE only their own availability
- ADMINs can SELECT/UPDATE all staff availability in their organization
- Public SELECT allowed for availability calculation

**Usage in Feature 001**:
- **Onboarding Wizard**: Can optionally INSERT default availability (e.g., Mon-Fri 9am-5pm)
- **Availability Calculator**: SELECTs to determine which days/times barber is available
- **Public Booking Page**: Reads availability to show only bookable slots

---

### Table: `cancellation_policies`

**Purpose**: Defines refund policies for barbershops

**Columns**:
- `id` UUID PRIMARY KEY
- `barbershop_id` UUID (FK to barbershops)
- `hours_before` INTEGER - Hours before appointment for refund eligibility
- `refund_percentage` INTEGER - Percentage refunded (0-100)
- `requires_approval` BOOLEAN - Whether admin must approve refund
- `created_at` TIMESTAMP
- `updated_at` TIMESTAMP

**Indexes**:
- `idx_cancellation_policies_barbershop_id` - For shop-specific queries

**RLS Policies**:
- Public SELECT allowed (displayed on booking page)
- Only ADMINs can INSERT/UPDATE policies

**Usage in Feature 001**:
- **Public Booking Page**: Displays cancellation policy to users before payment
- **Booking Confirmation**: References policy in confirmation message

---

## New Data Entities (Frontend State Only)

These are **not** database tables - they are React component state structures that aggregate data from the existing tables above.

### Entity: `OnboardingWizardState`

**Purpose**: Manages state across 4-step onboarding wizard

**Structure** (React useState):
```typescript
interface OnboardingWizardState {
  // Step 1: Basic Info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio: string;
  specialties: string[]; // e.g., ["Fades", "Hot Towel"]
  photo: File | null;
  customSlug?: string; // Optional manual override

  // Step 2: Service Assignment
  selectedServices: string[]; // Array of service IDs

  // Step 3: Financial Configuration
  financialModel: "commission" | "booth_rent";
  commissionPercentage?: number; // 0-100 if commission model
  boothRentAmount?: number; // Fixed amount if booth rent model
  boothRentFrequency?: "weekly" | "monthly"; // If booth rent model

  // Step 4: Generated Results (read-only)
  generatedSlug: string; // Auto-generated from name
  bookingUrl: string; // Full URL for sharing

  // Wizard metadata
  currentStep: number; // 1-4
  validationErrors: Record<string, string>;
  isSubmitting: boolean;
}
```

**Validation Rules**:
- `firstName`, `lastName`, `email`: Required
- `phone`: Optional but validated if provided (E.164 format)
- `bio`: Max 500 characters
- `specialties`: Max 10 items, each max 50 characters
- `commissionPercentage`: 0-100 if model is "commission"
- `boothRentAmount`: > 0 if model is "booth_rent"

**State Transitions**:
1. Initialize → Step 1 (Basic Info)
2. Step 1 validated → Generate slug → Step 2 (Services)
3. Step 2 validated → Step 3 (Financial)
4. Step 3 validated → Step 4 (Review & Generate)
5. Step 4 confirmed → Submit to database → Success

---

### Entity: `PublicBookingState`

**Purpose**: Manages state for public booking flow

**Structure** (React useState):
```typescript
interface PublicBookingState {
  // Staff profile (loaded from API)
  staffProfile: {
    id: string;
    name: string;
    bio: string;
    specialties: string[];
    image: string;
    barbershop: {
      name: string;
      address: string;
      phone: string;
    };
  } | null;

  // Available services (loaded from API)
  services: Array<{
    id: string;
    name: string;
    duration: number; // minutes
    price: number;
  }>;

  // Selected service
  selectedService: {
    id: string;
    name: string;
    duration: number;
    price: number;
  } | null;

  // Selected date/time
  selectedDate: Date | null;
  selectedTimeSlot: string | null; // ISO timestamp

  // Available time slots for selected date
  availableSlots: string[]; // Array of ISO timestamps

  // Customer information
  customerName: string;
  customerEmail: string;
  customerPhone: string;

  // Payment state
  paymentIntent: string | null; // Stripe Payment Intent ID
  paymentStatus: "idle" | "processing" | "succeeded" | "failed";

  // Flow state
  currentStep: "select_service" | "select_time" | "enter_details" | "payment" | "confirmation";
  isLoading: boolean;
  error: string | null;
}
```

**Validation Rules**:
- `selectedService`: Required before showing calendar
- `selectedDate`, `selectedTimeSlot`: Required before customer info
- `customerName`, `customerEmail`: Required before payment
- `customerPhone`: Optional but validated if provided
- Payment must succeed before booking creation

**State Transitions**:
1. Load staff profile → Display profile + services
2. Select service → Load availability → Show calendar
3. Select date/time → Enter customer details form
4. Customer details validated → Create Payment Intent → Show Stripe form
5. Payment succeeded → Create booking → Show confirmation

---

### Entity: `StaffAnalytics`

**Purpose**: Aggregated booking metrics for analytics dashboard

**Structure** (Computed from database):
```typescript
interface StaffAnalytics {
  staffId: string;
  staffName: string;
  bookingSlug: string;

  // Aggregate metrics
  totalBookings: number;
  totalRevenue: number;
  averageBookingValue: number;

  // Booking source breakdown
  sourceBreakdown: {
    staff_link: { count: number; revenue: number };
    admin: { count: number; revenue: number };
    walk_in: { count: number; revenue: number };
  };

  // Popular services
  topServices: Array<{
    serviceId: string;
    serviceName: string;
    bookingCount: number;
    revenue: number;
  }>;

  // Booking trends
  bookingsLast7Days: number;
  bookingsLast30Days: number;
  conversionRate: number; // (bookings / page views) * 100

  // Time period
  dateRange: {
    start: Date;
    end: Date;
  };
}
```

**SQL Query Pattern** (example for total bookings):
```sql
SELECT
  p.id as staff_id,
  p.name as staff_name,
  p.booking_slug,
  COUNT(b.id) as total_bookings,
  SUM(b.total_price) as total_revenue,
  AVG(b.total_price) as average_booking_value
FROM profiles p
LEFT JOIN bookings b ON b.barber_id = p.id
WHERE p.booking_slug IS NOT NULL
  AND b.created_at >= $start_date
  AND b.created_at <= $end_date
GROUP BY p.id, p.name, p.booking_slug
ORDER BY total_bookings DESC;
```

---

## Data Flow Diagrams

### Onboarding Wizard Data Flow

```
Admin → OnboardingWizard Component
  ↓
Step 1: Basic Info
  → generateBookingSlug(firstName, lastName)
  → Check uniqueness in profiles table
  → Generate slug (e.g., "john-smith" or "john-smith-2")
  ↓
Step 2: Services
  → Load services from API
  → Admin selects services
  ↓
Step 3: Financial
  → Admin configures commission/booth rent
  ↓
Step 4: Review
  → Display generated booking URL
  → Admin confirms
  ↓
Submit → POST /api/admin/staff/create
  → INSERT INTO profiles (with booking_slug)
  → Upload photo to storage
  → INSERT INTO staff_services (service assignments)
  → Return success + booking URL
```

### Public Booking Data Flow

```
User visits /book/john-smith
  ↓
GET /api/book/john-smith
  → SELECT FROM profiles WHERE booking_slug = 'john-smith'
  → Return staff profile + services
  ↓
User selects service + date
  ↓
GET /api/book/john-smith/availability?date=2025-10-15&service_id=123
  → SELECT FROM staff_availability WHERE barber_id = X
  → SELECT FROM bookings WHERE barber_id = X AND date = 2025-10-15
  → Calculate free slots (30-min intervals)
  → Return available time slots
  ↓
User selects time + enters details
  ↓
POST /api/book/john-smith/create
  → Create Stripe Payment Intent
  → Return client_secret
  ↓
User completes payment
  ↓
POST /api/book/john-smith/confirm
  → Verify payment with Stripe
  → INSERT INTO bookings (booking_source = 'staff_link')
  → Send confirmation email/SMS
  → Return booking confirmation
```

### Analytics Data Flow

```
Admin opens /admin/staff/analytics
  ↓
GET /api/admin/staff/analytics?date_range=last_30_days
  → Check auth.uid() is ADMIN role (RLS)
  → SELECT FROM bookings GROUP BY barber_id, booking_source
  → JOIN with profiles to get staff names
  → Calculate aggregates (count, sum, avg)
  → Return analytics data
  ↓
Component renders:
  → Staff cards with metrics
  → Booking source pie charts
  → Revenue trend graphs
```

---

## Validation Rules Summary

### Profile Creation (Onboarding)
- ✅ `booking_slug` must be unique (database constraint)
- ✅ `booking_slug` must be kebab-case (3-100 characters)
- ✅ `bio` max 500 characters
- ✅ `specialties` max 10 items, each max 50 characters
- ✅ `role` must be valid enum value
- ✅ `photo` must be valid image format (jpg, png, webp)

### Booking Creation (Public)
- ✅ `selectedTimeSlot` must be in available slots (not double-booked)
- ✅ `selectedTimeSlot` must be in future (not past)
- ✅ `customerEmail` must be valid email format
- ✅ `customerPhone` must be E.164 format (if provided)
- ✅ Payment must be confirmed before booking creation

### Analytics Queries (RBAC)
- ✅ BARBERs can only query `bookings.barber_id = auth.uid()`
- ✅ ADMINs can query all bookings in `organization_id`
- ✅ Date range must be reasonable (max 1 year)

---

## Notes for Developers

1. **No new migrations needed**: All database tables already exist from Feature 011
2. **Use existing utilities**: `lib/slug-generator.ts` handles slug creation/validation
3. **RLS is enforced**: Database-level security prevents unauthorized access
4. **Real-time not required**: This feature uses REST APIs, not Supabase Realtime
5. **Image upload**: Use Supabase Storage for profile photos (bucket: `staff-photos`)
6. **Stripe integration**: Existing `lib/stripe-client.js` provides helper functions
7. **Availability calculation**: Use `lib/availability-calculator.ts` for slot generation
8. **Performance**: All queries are indexed for < 100ms response time (p95)

---

**Status**: ✅ Data model complete - proceed to API contracts

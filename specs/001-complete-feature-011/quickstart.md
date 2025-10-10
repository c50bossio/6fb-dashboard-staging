# Quickstart: Complete Feature 011 - Public Booking & Staff Onboarding

**Feature**: 001-complete-feature-011
**Date**: 2025-10-07
**Status**: Ready for Implementation

## Purpose

This guide validates the Feature 001 implementation plan and provides developers with step-by-step instructions to build and test the missing frontend components for Feature 011.

## Prerequisites

✅ **Backend Infrastructure** (already complete from Feature 011):
- Database migrations applied to Supabase
- API routes at `/api/book/[staffSlug]/*`
- Utilities: `lib/slug-generator.ts`, `lib/availability-calculator.ts`, `lib/permissions.ts`
- RLS policies enforced on all tables

✅ **Development Environment**:
```bash
# Verify Node.js version
node --version  # Should be v18.x or v20.x

# Verify dependencies installed
npm list next react tailwindcss @stripe/stripe-js @supabase/supabase-js

# Verify Supabase connection
npm run test:supabase-access

# Verify Docker running (for local development)
docker compose ps
```

## Implementation Checklist

### Phase 1: Staff Onboarding Wizard (P1 - Critical)

**Files to Create**:
```
components/staff/
├── StaffOnboardingWizard.js        (main orchestrator)
├── OnboardingStep1BasicInfo.js     (name, email, bio, photo)
├── OnboardingStep2Services.js      (service assignment)
├── OnboardingStep3Financial.js     (commission/booth rent)
└── OnboardingStep4Review.js        (preview & generate booking URL)

app/(protected)/admin/staff/onboard/
└── page.js                         (admin page for launching wizard)
```

**Validation Steps**:
1. ✅ Click "Add New Barber" button in admin dashboard
2. ✅ Complete all 4 wizard steps with valid data
3. ✅ Verify booking slug is auto-generated (e.g., "john-smith")
4. ✅ Verify conflict handling (if "john-smith" exists, generates "john-smith-2")
5. ✅ Verify final step shows full booking URL
6. ✅ Submit form and verify profile created in Supabase `profiles` table
7. ✅ Verify `booking_slug` field is populated correctly
8. ✅ Test error handling (duplicate email, invalid phone, etc.)

**E2E Test**:
```bash
npm run test:e2e -- staff-onboarding.spec.js
```

**Expected Result**:
- Wizard completes in < 5 minutes
- Profile created with `booking_slug`, `bio`, `specialties`
- Admin sees generated booking URL to share

---

### Phase 2: Public Booking Pages (P2 - Core Value)

**Files to Create**:
```
app/book/[staffSlug]/
├── page.js                     (main booking page - server component)
├── layout.js                   (public layout)
└── loading.js                  (loading state)

components/booking/
├── PublicBookingPage.js        (client component orchestrator)
├── StaffProfileCard.js         (bio, photo, specialties display)
├── ServiceSelector.js          (service selection UI)
├── AvailabilityCalendar.js     (FullCalendar integration)
├── BookingForm.js              (customer info form)
├── StripePaymentForm.js        (Stripe Elements integration)
└── BookingConfirmation.js      (success screen)
```

**Validation Steps**:
1. ✅ Visit `/book/john-smith` (replace with actual slug)
2. ✅ Verify staff profile displays (photo, bio, specialties)
3. ✅ Verify services list shows with prices
4. ✅ Select a service and verify calendar appears
5. ✅ Verify calendar shows only available slots (not past times, not booked slots)
6. ✅ Select date/time and verify customer info form appears
7. ✅ Enter customer details and verify Stripe payment form appears
8. ✅ Complete test payment with card `4242 4242 4242 4242`
9. ✅ Verify booking created in Supabase with `booking_source = 'staff_link'`
10. ✅ Verify confirmation screen shows appointment details
11. ✅ Test concurrent booking conflict (open 2 browsers, try to book same slot)
12. ✅ Verify second user gets "slot no longer available" error

**E2E Test**:
```bash
npm run test:e2e -- public-booking.spec.js
```

**Expected Result**:
- Booking flow completes in < 3 minutes
- Availability calculation returns in < 500ms
- Payment processes successfully
- Booking created with proper RLS enforcement

---

### Phase 3: Staff Analytics Dashboard (P3 - Business Intelligence)

**Files to Create**:
```
app/(protected)/admin/staff/analytics/
└── page.js                         (analytics dashboard page)

components/staff/
├── StaffAnalyticsCard.js           (summary metrics card)
└── BookingSourceBreakdown.js       (pie chart for sources)
```

**Validation Steps**:
1. ✅ Admin opens `/admin/staff/analytics`
2. ✅ Verify list of all barbers with metrics:
   - Total bookings
   - Total revenue
   - Avg booking value
3. ✅ Verify booking source breakdown shows:
   - `staff_link` count & revenue
   - `admin` count & revenue
   - `walk_in` count & revenue
4. ✅ Click on a barber to see detailed view
5. ✅ Verify top services listed with counts
6. ✅ Login as barber (not admin) and verify RBAC:
   - Barber sees only their own bookings
   - Barber cannot access admin analytics page

**E2E Test**:
```bash
npm run test:e2e -- staff-analytics.spec.js
```

**Expected Result**:
- Metrics display accurately from real database
- RBAC enforced (barbers see only their data)
- Page loads in < 2 seconds

---

### Phase 4: Barber Migration Wizard (P4 - Production Deployment)

**Files to Create**:
```
app/(protected)/admin/staff/migrate/
└── page.js                          (migration wizard)

components/staff/
└── StaffMigrationWizard.js          (batch slug generation)
```

**Validation Steps**:
1. ✅ Create test barbers WITHOUT `booking_slug` values
2. ✅ Admin opens `/admin/staff/migrate`
3. ✅ Run "Dry Run" to preview slug generation
4. ✅ Verify preview shows old URLs → new URLs mapping
5. ✅ Verify conflict detection (2 barbers named "John Smith")
6. ✅ Confirm migration execution
7. ✅ Verify all profiles updated with `booking_slug`
8. ✅ Test URL redirect: visit old `/book/[barberId]` → redirects to `/book/[staffSlug]`
9. ✅ Verify redirect is 301 (permanent) for SEO

**E2E Test**:
```bash
npm run test:e2e -- barber-migration.spec.js
```

**Expected Result**:
- All existing barbers get unique slugs
- Redirects work for backward compatibility
- No data loss during migration

---

## Integration Testing

### Full User Flow Test (P1 → P2 Combined)

**Scenario**: Admin onboards new barber → Public user books appointment

```bash
# 1. Admin onboards barber "Jane Doe"
# Expected: booking_slug = "jane-doe", URL = /book/jane-doe

# 2. Public user visits /book/jane-doe
# Expected: See Jane's profile, services, calendar

# 3. User selects "Haircut - $35" for tomorrow at 2pm
# Expected: Calendar shows slot available

# 4. User enters name "Bob Smith", email "bob@example.com"
# Expected: Stripe form appears

# 5. User pays with test card 4242424242424242
# Expected: Payment succeeds, booking created

# 6. Verify database:
SELECT * FROM bookings WHERE barber_id = (
  SELECT id FROM profiles WHERE booking_slug = 'jane-doe'
) AND booking_source = 'staff_link';

# Expected: 1 booking found with customer "Bob Smith"
```

### RBAC Test (P3)

**Scenario**: Verify barbers can't see other barbers' data

```bash
# 1. Login as barber "john-smith"
# 2. Visit /admin/staff/analytics
# Expected: 403 Forbidden OR only see own metrics

# 3. Try direct API call:
curl -H "Authorization: Bearer $JOHN_TOKEN" \
  https://localhost:9999/api/admin/staff/analytics

# Expected: Only returns bookings where barber_id = john's UUID
```

### Performance Test

**Scenario**: Verify availability calculation performance

```bash
# 1. Seed database with 100 existing bookings for a barber
# 2. Call availability API:
time curl "http://localhost:9999/api/book/john-smith/availability?date=2025-10-15&service_id=xyz"

# Expected: Response in < 500ms
```

---

## Common Issues & Solutions

### Issue: Booking slug already exists

**Solution**: The wizard should auto-increment (e.g., "john-smith-2"). Verify `lib/slug-generator.ts` is being called correctly.

### Issue: Calendar not showing available slots

**Solution**:
1. Verify barber has `staff_availability` records
2. Check `lib/availability-calculator.ts` is filtering out existing bookings
3. Ensure date is in future (not past)

### Issue: Stripe payment failing

**Solution**:
1. Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set correctly
2. Use test card `4242 4242 4242 4242` in test mode
3. Check Payment Intent is created before showing Stripe form

### Issue: RBAC not enforced

**Solution**:
1. Verify RLS policies applied to database tables
2. Check `lib/permissions.ts` middleware is being used
3. Ensure Supabase JWT token is being passed correctly

### Issue: Migration not generating slugs

**Solution**:
1. Verify existing barbers have `first_name` and `last_name` populated
2. Check for null values in name fields
3. Manually run `generateBookingSlug()` for problem records

---

## Environment Variables Required

```bash
# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Stripe (verify these exist)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Optional: SMS provider (if implementing notifications)
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890
```

---

## Success Criteria Validation

| Criterion | Test Command | Expected Result |
|-----------|--------------|-----------------|
| SC-001: Onboarding < 5 min | Manual timing | User completes wizard in < 5 min |
| SC-002: Slug uniqueness | Unit test | 100% unique slugs generated |
| SC-003: Booking < 3 min | Manual timing | User books in < 3 min |
| SC-004: Availability < 500ms | `time curl /availability` | Response < 500ms |
| SC-005: No double-bookings | Concurrent test | Second booking fails with 409 |
| SC-006: 95% success rate | E2E test suite | 95%+ tests pass |
| SC-007: RBAC isolation | RBAC test | Barbers see only own data |
| SC-008: Migration success | Migration test | 100% barbers migrated |
| SC-009: URL redirects work | Redirect test | 301 redirects to new URLs |
| SC-010: Notification prefs | Settings test | Users can configure email/SMS |

---

## Deployment Checklist

Before deploying to production:

- [ ] All E2E tests passing (`npm run test:e2e`)
- [ ] Unit tests at 95% coverage for `StaffOnboardingWizard`
- [ ] Unit tests at 85% coverage for `PublicBookingPage`
- [ ] Cross-browser testing complete (Chrome, Firefox, Safari)
- [ ] Mobile responsiveness verified
- [ ] Accessibility audit passed (WCAG 2.2 AA)
- [ ] Performance audit passed (Lighthouse score > 90)
- [ ] Security review complete (no XSS, CSRF, SQL injection)
- [ ] RLS policies tested in production Supabase
- [ ] Stripe live keys configured (not test keys)
- [ ] Error tracking configured (Sentry)
- [ ] Analytics configured (Vercel Analytics)
- [ ] Documentation updated (README, API docs)
- [ ] Migration plan reviewed (for existing barbers)
- [ ] Rollback plan documented (in case of issues)

---

## Next Steps

After completing this quickstart:

1. **Generate Tasks**: Run `/speckit.tasks` to break down into executable tasks
2. **Implement**: Follow task order (P1 → P2 → P3 → P4)
3. **Test**: Run E2E tests after each phase
4. **Review**: Code review with focus on RBAC and payment security
5. **Deploy**: Gradual rollout (staging → 10% production → 100%)

**Questions?** Refer to:
- [spec.md](./spec.md) - Feature requirements
- [plan.md](./plan.md) - Implementation plan
- [data-model.md](./data-model.md) - Database schema
- [contracts/](./contracts/) - API contracts

---

**Status**: ✅ Quickstart guide complete - ready for `/speckit.tasks`

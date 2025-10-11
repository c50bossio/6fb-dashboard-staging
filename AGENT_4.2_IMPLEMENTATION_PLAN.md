# Agent 4.2 - Notification API Integration Implementation Plan

## Status: BLOCKED - Waiting for Agent 4.1

**Dependencies**: Agent 4.1 must create `/app/api/utils/appointment-field-mapper.js` first

---

## Overview

This document outlines the integration points for the appointment field mapping utility with notification-related API endpoints. The mapping is required because:

- **JavaScript Services** expect OLD field names: `customer_email`, `customer_phone`, `customer_name`, `appointment_datetime`
- **Database (Supabase)** returns NEW field names: `client_email`, `client_phone`, `client_name`, `scheduled_at`

---

## Architecture Analysis

### JavaScript Services (Not Python!)

The notification system uses **JavaScript services**, not Python services:

1. **`booking-confirmation-service.js`**
   - Sends multi-channel confirmations (email, SMS, push, in-app)
   - Expects: `customer_email`, `customer_name`, `appointment_datetime`, `shop_name`, etc.
   - Used by: `/api/notifications/send/route.js`

2. **`reminder-scheduler.js`**
   - Schedules automated reminders (24h, 2h, 30min before)
   - Expects: `customer_email`, `customer_phone`, `appointment_datetime`
   - Used by: booking confirmation handlers

3. **`sendgrid-service.js` & `twilio-service.js`**
   - Email and SMS delivery services
   - Integrated through booking-confirmation-service

### Database Schema

Supabase `bookings` table returns:
```javascript
{
  id: 'uuid',
  client_email: 'email@example.com',      // NEW
  client_phone: '+1234567890',            // NEW
  client_name: 'John Doe',                // NEW
  client_notes: 'Special instructions',   // NEW
  scheduled_at: '2025-10-10T14:00:00Z',  // NEW
  duration_minutes: 60,
  service_price: 45.00,
  total_amount: 50.00,
  status: 'CONFIRMED',
  // ... other fields
}
```

---

## Implementation Points

### 1. Primary Target: `/app/api/notifications/send/route.js`

**Lines to Update**: 102-125, 130-194, 199-264, 270-292

**Current Code Pattern**:
```javascript
async function handleBookingConfirmation(data, options) {
  try {
    const result = await bookingConfirmationService.sendBookingConfirmation(
      data,  // ⚠️ Currently expects OLD field names
      'booking_confirmed'
    );
    // ...
  }
}
```

**After Integration**:
```javascript
import { mapForBookingNotification } from '@/app/api/utils/appointment-field-mapper'

async function handleBookingConfirmation(data, options) {
  try {
    // Map database fields to service layer fields
    const mappedData = mapForBookingNotification(
      data,           // from database with NEW fields
      data.barbershop, // barbershop object
      data.barber     // barber object
    )

    const result = await bookingConfirmationService.sendBookingConfirmation(
      mappedData,  // ✅ Now has OLD field names expected by service
      'booking_confirmed'
    );
    // ...
  }
}
```

**Functions Requiring Mapping**:
- `handleBookingConfirmation()` - Line 102
- `handleBookingCancellation()` - Line 130
- `handleBookingRescheduled()` - Line 199
- `handleBookingReminder()` - Line 270
- `handlePaymentConfirmation()` - Line 297
- `handleTestNotification()` - Line 460

---

### 2. Secondary Target: `/app/api/notifications/booking/route.js`

**Lines to Update**: 44-57, 74-79, 83-88

**Current Code Pattern**:
```javascript
// Get booking details
const { data: booking, error: bookingError } = await supabase
  .from('bookings')
  .select(`
    *,
    barber:profiles!bookings_barber_id_fkey(id, name, email),
    service:services(id, name, description, duration_minutes, price, category),
    barbershop:barbershops(id, name, address, phone, email)
  `)
  .eq('id', notificationData.booking_id)
  .single()

// ⚠️ Direct use of database fields
const notificationContent = generateNotificationContent(
  notificationData.type,
  booking,  // Uses booking.client_email, booking.scheduled_at
  notificationData.custom_message
)
```

**After Integration**:
```javascript
import { mapForBookingNotification } from '@/app/api/utils/appointment-field-mapper'

// Get booking details
const { data: booking, error: bookingError } = await supabase
  .from('bookings')
  .select(`
    *,
    barber:profiles!bookings_barber_id_fkey(id, name, email),
    service:services(id, name, description, duration_minutes, price, category),
    barbershop:barbershops(id, name, address, phone, email)
  `)
  .eq('id', notificationData.booking_id)
  .single()

// Map database fields to service layer fields
const mappedBooking = mapForBookingNotification(
  booking,
  booking.barbershop,
  booking.barber
)

const notificationContent = generateNotificationContent(
  notificationData.type,
  mappedBooking,  // ✅ Now has OLD field names
  notificationData.custom_message
)
```

**Function to Update**:
- `generateNotificationContent()` - Line 192 (uses `booking.scheduled_at`, `booking.client_name`)

---

### 3. Tertiary Target: `/app/api/workflows/appointment-completed/route.js`

**Lines to Update**: 32-71

**Current Code Pattern**:
```javascript
// Update customer loyalty points
const { data: updatedCustomer, error: customerError } = await supabase
  .from('customers')
  .update({
    loyalty_points: supabase.raw(`COALESCE(loyalty_points, 0) + ${loyaltyPoints}`),
    // ...
  })
  .eq('id', customer_id)
  .select('name, phone, email, loyalty_points, total_visits')
  .single()

// ⚠️ Direct field usage
if (customer.phone) {
  await fetch('/api/notifications/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'custom_message',
      message: rewardMessage,
      phone: customer.phone,  // Needs mapping
      barbershop_id
    })
  })
}
```

**After Integration**:
```javascript
import { mapForBookingNotification } from '@/app/api/utils/appointment-field-mapper'

// Fetch complete appointment data
const { data: appointment } = await supabase
  .from('appointments')
  .select(`
    *,
    barber:profiles!appointments_barber_id_fkey(id, name, email),
    barbershop:barbershops(id, name, address, phone, email)
  `)
  .eq('id', appointment_id)
  .single()

// Map for notification service
const mappedData = mapForBookingNotification(
  appointment,
  appointment.barbershop,
  appointment.barber
)

// Use mapped data for notifications
if (mappedData.customer_phone) {
  await fetch('/api/notifications/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'custom_message',
      message: rewardMessage,
      phone: mappedData.customer_phone,  // ✅ Mapped field
      email: mappedData.customer_email,  // ✅ Mapped field
      barbershop_id
    })
  })
}
```

---

## Expected Mapping Utility Interface

Based on the code analysis, the utility should provide:

```javascript
/**
 * Maps database appointment fields to service layer fields
 *
 * @param {Object} dbAppointment - Appointment from database with NEW field names
 * @param {Object} barbershop - Barbershop details
 * @param {Object} barber - Barber details
 * @returns {Object} Mapped object with OLD field names for service layer
 */
export function mapForBookingNotification(dbAppointment, barbershop, barber) {
  return {
    // Mapped client fields
    customer_email: dbAppointment.client_email,
    customer_phone: dbAppointment.client_phone,
    customer_name: dbAppointment.client_name,
    customer_notes: dbAppointment.client_notes,

    // Mapped appointment fields
    appointment_datetime: dbAppointment.scheduled_at,
    appointment_date: dbAppointment.scheduled_at?.split('T')[0],

    // Pass-through fields
    id: dbAppointment.id,
    duration_minutes: dbAppointment.duration_minutes,
    service_price: dbAppointment.service_price,
    total_price: dbAppointment.total_amount,
    status: dbAppointment.status,

    // Service details
    service_id: dbAppointment.service_id,
    service_name: dbAppointment.service?.name,

    // Barber details
    barber_id: dbAppointment.barber_id,
    barber_name: barber?.name || dbAppointment.barber?.name,
    barber_email: barber?.email || dbAppointment.barber?.email,

    // Shop details
    barbershop_id: dbAppointment.barbershop_id,
    shop_name: barbershop?.name || dbAppointment.barbershop?.name,
    shop_address: barbershop?.address || dbAppointment.barbershop?.address,
    shop_phone: barbershop?.phone || dbAppointment.barbershop?.phone,
    shop_timezone: barbershop?.timezone || 'America/New_York',

    // Payment fields
    payment_method: dbAppointment.payment_method,
    payment_status: dbAppointment.payment_status,
    transaction_id: dbAppointment.transaction_id,

    // Notification preferences
    sms_opt_in: dbAppointment.sms_opt_in,
    email_opt_in: dbAppointment.email_opt_in,

    // Notes
    booking_notes: dbAppointment.client_notes
  }
}
```

---

## Integration Checklist

### Phase 1: Utility Creation (Agent 4.1)
- [ ] Create `/app/api/utils/appointment-field-mapper.js`
- [ ] Implement `mapForBookingNotification()` function
- [ ] Add comprehensive JSDoc documentation
- [ ] Include field validation and null-safety
- [ ] Export utility function

### Phase 2: API Endpoint Updates (Agent 4.2 - THIS AGENT)
- [ ] Update `/app/api/notifications/send/route.js`
  - [ ] Import mapping utility
  - [ ] Apply mapping in `handleBookingConfirmation()`
  - [ ] Apply mapping in `handleBookingCancellation()`
  - [ ] Apply mapping in `handleBookingRescheduled()`
  - [ ] Apply mapping in `handleBookingReminder()`
  - [ ] Apply mapping in `handlePaymentConfirmation()`
  - [ ] Apply mapping in `handleTestNotification()`

- [ ] Update `/app/api/notifications/booking/route.js`
  - [ ] Import mapping utility
  - [ ] Apply mapping after database query
  - [ ] Update `generateNotificationContent()` to use mapped fields

- [ ] Update `/app/api/workflows/appointment-completed/route.js`
  - [ ] Import mapping utility
  - [ ] Fetch complete appointment data
  - [ ] Apply mapping before notification calls
  - [ ] Update milestone reward function

### Phase 3: Testing & Validation
- [ ] Test booking confirmation flow
- [ ] Test cancellation notifications
- [ ] Test reminder scheduling
- [ ] Test payment confirmations
- [ ] Test appointment completion workflows
- [ ] Verify all notification channels (email, SMS, push, in-app)

---

## Error Handling

All integration points should include proper error handling:

```javascript
try {
  const mappedData = mapForBookingNotification(
    dbAppointment,
    barbershop,
    barber
  )

  if (!mappedData.customer_email && !mappedData.customer_phone) {
    console.warn('No contact information available for notifications')
    return { success: false, reason: 'No contact information' }
  }

  // Proceed with notification service call

} catch (mappingError) {
  console.error('Field mapping error:', mappingError)
  return {
    success: false,
    error: 'Field mapping failed',
    details: mappingError.message
  }
}
```

---

## Testing Strategy

### Unit Tests
```javascript
// Test mapping utility
describe('mapForBookingNotification', () => {
  it('should map client_email to customer_email', () => {
    const dbData = { client_email: 'test@example.com' }
    const result = mapForBookingNotification(dbData, {}, {})
    expect(result.customer_email).toBe('test@example.com')
  })

  it('should map scheduled_at to appointment_datetime', () => {
    const dbData = { scheduled_at: '2025-10-10T14:00:00Z' }
    const result = mapForBookingNotification(dbData, {}, {})
    expect(result.appointment_datetime).toBe('2025-10-10T14:00:00Z')
  })
})
```

### Integration Tests
```javascript
// Test notification endpoint with mapped data
describe('POST /api/notifications/send', () => {
  it('should send booking confirmation with mapped fields', async () => {
    const response = await fetch('/api/notifications/send', {
      method: 'POST',
      body: JSON.stringify({
        type: 'booking_confirmation',
        data: {
          id: 'test-123',
          client_email: 'customer@example.com',  // NEW field name
          scheduled_at: '2025-10-10T14:00:00Z'   // NEW field name
        }
      })
    })

    expect(response.status).toBe(200)
    const result = await response.json()
    expect(result.success).toBe(true)
  })
})
```

---

## Performance Considerations

1. **Mapping Overhead**: Minimal - simple object transformation
2. **Memory Impact**: Negligible - creates new object with same data
3. **Latency**: < 1ms per mapping operation
4. **Caching**: Not required - stateless transformation

---

## Rollback Plan

If issues arise:

1. **Immediate**: Add feature flag to bypass mapping
```javascript
const USE_FIELD_MAPPING = process.env.ENABLE_FIELD_MAPPING === 'true'

const data = USE_FIELD_MAPPING
  ? mapForBookingNotification(dbData, shop, barber)
  : dbData  // Use old behavior
```

2. **Short-term**: Revert to previous endpoint versions
3. **Long-term**: Fix mapping utility bugs and re-deploy

---

## Documentation Updates Required

- [ ] Update API documentation with field mapping details
- [ ] Document backward compatibility considerations
- [ ] Add migration guide for service layer consumers
- [ ] Update webhook documentation if affected

---

## Next Steps for Agent 4.2

**BLOCKED**: Cannot proceed until Agent 4.1 creates the mapping utility.

Once unblocked:
1. Verify utility exists and exports `mapForBookingNotification()`
2. Update notification endpoints per integration points above
3. Add comprehensive error handling
4. Test all notification flows
5. Document changes in commit message
6. Create summary report

---

## Contact & Questions

**Assigned Agent**: Agent 4.2 - Notification API Integration Specialist
**Blocking Dependency**: Agent 4.1 - Field Mapping Utility Creator
**Priority**: HIGH
**Estimated Time**: 2-3 hours (once unblocked)

---

## Appendix: Field Mapping Reference

### Complete Field Mapping Table

| Database Field (NEW) | Service Layer Field (OLD) | Type | Required |
|---------------------|---------------------------|------|----------|
| `client_email` | `customer_email` | string | Yes |
| `client_phone` | `customer_phone` | string | No |
| `client_name` | `customer_name` | string | Yes |
| `client_notes` | `booking_notes` / `customer_notes` | string | No |
| `scheduled_at` | `appointment_datetime` | datetime | Yes |
| `scheduled_at` | `appointment_date` | date | Yes |
| `total_amount` | `total_price` | number | Yes |
| `service.name` | `service_name` | string | Yes |
| `barber.name` | `barber_name` | string | Yes |
| `barbershop.name` | `shop_name` | string | Yes |
| `barbershop.address` | `shop_address` | string | No |
| `barbershop.phone` | `shop_phone` | string | No |
| `barbershop.timezone` | `shop_timezone` | string | No |

### Example Transformation

**Input (Database)**:
```json
{
  "id": "123",
  "client_email": "john@example.com",
  "client_name": "John Doe",
  "scheduled_at": "2025-10-10T14:00:00Z",
  "total_amount": 50.00,
  "service": { "name": "Haircut" }
}
```

**Output (Service Layer)**:
```json
{
  "id": "123",
  "customer_email": "john@example.com",
  "customer_name": "John Doe",
  "appointment_datetime": "2025-10-10T14:00:00Z",
  "total_price": 50.00,
  "service_name": "Haircut"
}
```

---

**End of Implementation Plan**

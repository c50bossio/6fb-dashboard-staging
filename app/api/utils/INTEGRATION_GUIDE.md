# Appointment Field Mapper - Integration Guide

Quick guide for integrating the appointment field mapper into existing API endpoints.

## Quick Integration Examples

### 1. Booking Confirmation Endpoint

**Before** (Manual Mapping):
```javascript
// app/api/appointments/[id]/confirm/route.js
export async function POST(req, { params }) {
  const { id } = params;

  const { data: appointment } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single();

  // ❌ Manual mapping - error-prone
  const notificationData = {
    booking_id: appointment.id,
    customer_name: appointment.client_name || 'Walk-in',
    customer_email: appointment.client_email || '',
    appointment_date: new Date(appointment.scheduled_at),
    // ... many more fields to map manually
  };

  await sendNotification(notificationData);

  return Response.json({ success: true });
}
```

**After** (Using Mapper):
```javascript
// app/api/appointments/[id]/confirm/route.js
import { mapForBookingNotification, validateAppointmentForMapping } from '@/app/api/utils/appointment-field-mapper';

export async function POST(req, { params }) {
  const { id } = params;

  const { data: appointment } = await supabase
    .from('appointments')
    .select('*, client:users(*), service:services(*), barber:users(*), barbershop:barbershops(*)')
    .eq('id', id)
    .single();

  // ✅ Validate first
  const validation = validateAppointmentForMapping(appointment);
  if (!validation.valid) {
    return Response.json(
      { error: 'Invalid appointment', details: validation.errors },
      { status: 400 }
    );
  }

  // ✅ Map with one function call
  const notificationData = mapForBookingNotification(appointment);

  // Send to Python notification service
  await fetch('http://localhost:8001/api/v1/booking-notifications/booking-confirmed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notificationData)
  });

  return Response.json({ success: true });
}
```

### 2. Webhook Handler

**Before**:
```javascript
// app/api/webhooks/booking-wizard/route.js
export async function POST(req) {
  const payload = await req.json();

  // ❌ Manual transformation - lots of room for errors
  const appointment = {
    customer_name: payload.customerInfo?.name || 'Unknown',
    customer_email: payload.customerInfo?.email,
    appointment_date: new Date(payload.dateTime),
    // Missing end_time calculation
    // Missing fallbacks
    // etc.
  };

  await sendNotification(appointment);
  return Response.json({ success: true });
}
```

**After**:
```javascript
// app/api/webhooks/booking-wizard/route.js
import { mapForBookingNotification, validateAppointmentForMapping } from '@/app/api/utils/appointment-field-mapper';

export async function POST(req) {
  const payload = await req.json();

  // Transform webhook to appointment format
  const appointment = {
    id: payload.bookingId,
    client_name: payload.customerInfo.name,
    client_email: payload.customerInfo.email,
    client_phone: payload.customerInfo.phone,
    scheduled_at: payload.dateTime,
    duration_minutes: payload.duration || 30,
    total_amount: payload.price,
    status: 'CONFIRMED',
    service_name: payload.serviceName,
    barber_name: payload.barberName,
    barbershop_name: payload.shopName
  };

  // ✅ Validate
  const validation = validateAppointmentForMapping(appointment);
  if (!validation.valid) {
    return Response.json({ error: validation.errors }, { status: 400 });
  }

  // ✅ Map with proper fallbacks and calculations
  const notificationData = mapForBookingNotification(appointment);

  await sendNotification(notificationData);
  return Response.json({ success: true });
}
```

### 3. Batch Processing for Reports

**Before**:
```javascript
// app/api/reports/appointments/route.js
export async function POST(req) {
  const { startDate, endDate } = await req.json();

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .gte('scheduled_at', startDate)
    .lte('scheduled_at', endDate);

  // ❌ Manual loop with error-prone mapping
  const mapped = [];
  for (const apt of appointments) {
    try {
      mapped.push({
        customer_name: apt.client_name,
        // ... manual field by field
      });
    } catch (error) {
      // Lost track of which appointment failed
    }
  }

  return Response.json({ appointments: mapped });
}
```

**After**:
```javascript
// app/api/reports/appointments/route.js
import { batchMapAppointments } from '@/app/api/utils/appointment-field-mapper';

export async function POST(req) {
  const { startDate, endDate } = await req.json();

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .gte('scheduled_at', startDate)
    .lte('scheduled_at', endDate);

  // ✅ Batch map with automatic error handling
  const result = batchMapAppointments(appointments, {
    skipInvalid: true,
    includeValidation: true
  });

  return Response.json({
    appointments: result.mapped.map(m => m.data),
    errors: result.failed,
    stats: {
      total: appointments.length,
      mapped: result.mapped.length,
      failed: result.failed.length
    }
  });
}
```

## Common Integration Patterns

### Pattern 1: API Route with Validation

```javascript
import { mapForBookingNotification, validateAppointmentForMapping } from '@/app/api/utils/appointment-field-mapper';

export async function POST(req) {
  try {
    const appointment = await getAppointment(appointmentId);

    // Validate
    const validation = validateAppointmentForMapping(appointment);
    if (!validation.valid) {
      return Response.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Log warnings
    if (validation.warnings.length > 0) {
      console.warn('[Mapper] Warnings:', validation.warnings);
    }

    // Map
    const data = mapForBookingNotification(appointment);

    // Send
    await sendToPythonService(data);

    return Response.json({ success: true });

  } catch (error) {
    console.error('[Mapper] Error:', error.message);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### Pattern 2: Background Task Processing

```javascript
import { batchMapAppointments } from '@/app/api/utils/appointment-field-mapper';

async function processAppointmentReminders() {
  // Get appointments scheduled for tomorrow
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('status', 'CONFIRMED')
    .gte('scheduled_at', tomorrow)
    .lt('scheduled_at', dayAfterTomorrow);

  // Batch map
  const result = batchMapAppointments(appointments, { skipInvalid: true });

  // Send reminders
  await Promise.all(
    result.mapped.map(({ data }) =>
      sendReminder(data)
    )
  );

  // Log failures
  if (result.failed.length > 0) {
    console.error('[Reminders] Failed to process:', result.failed);
  }
}
```

### Pattern 3: Error Recovery

```javascript
import { mapAppointmentForPythonService } from '@/app/api/utils/appointment-field-mapper';

function safeMapAppointment(appointment) {
  try {
    return {
      success: true,
      data: mapAppointmentForPythonService(appointment)
    };
  } catch (error) {
    // Handle specific errors
    if (error.message.includes('scheduled_at is required')) {
      // Try to recover from missing scheduled_at
      return {
        success: false,
        error: 'MISSING_SCHEDULED_AT',
        recovery: 'Schedule appointment first'
      };
    }

    return {
      success: false,
      error: error.message
    };
  }
}
```

## Migration Checklist

When migrating existing endpoints:

- [ ] Import mapper functions
- [ ] Replace manual field mapping with mapper calls
- [ ] Add validation before mapping
- [ ] Handle validation errors appropriately
- [ ] Log validation warnings
- [ ] Test with walk-in appointments
- [ ] Test with missing optional fields
- [ ] Test error cases
- [ ] Update tests to use mapper
- [ ] Remove old manual mapping code

## Testing Your Integration

```javascript
// __tests__/api/your-endpoint.test.js
import { mapForBookingNotification } from '@/app/api/utils/appointment-field-mapper';

describe('Your API Endpoint', () => {
  it('should map appointment correctly', () => {
    const appointment = {
      id: 'test-123',
      client_name: 'Test User',
      scheduled_at: '2025-10-15T14:00:00Z',
      duration_minutes: 30,
      // ... other fields
    };

    const mapped = mapForBookingNotification(appointment);

    expect(mapped.customer_name).toBe('Test User');
    expect(mapped.appointment_date).toBeInstanceOf(Date);
    expect(mapped.booking_id).toBe('test-123');
  });
});
```

## Performance Tips

1. **Batch Processing**: Use `batchMapAppointments` for multiple appointments
2. **Validation Once**: Validate before mapping, not after
3. **Skip Invalid**: Use `skipInvalid: true` for non-critical operations
4. **Minimal Queries**: Only fetch fields you need from database

## Common Pitfalls

### ❌ Don't: Map then Validate
```javascript
const mapped = mapForBookingNotification(appointment); // Might throw!
const validation = validateAppointmentForMapping(appointment);
```

### ✅ Do: Validate then Map
```javascript
const validation = validateAppointmentForMapping(appointment);
if (!validation.valid) {
  // Handle error
}
const mapped = mapForBookingNotification(appointment);
```

### ❌ Don't: Ignore Validation Warnings
```javascript
const validation = validateAppointmentForMapping(appointment);
if (validation.valid) {
  // Proceed, ignoring warnings
}
```

### ✅ Do: Log Validation Warnings
```javascript
const validation = validateAppointmentForMapping(appointment);
if (validation.warnings.length > 0) {
  console.warn('[Data Quality]', validation.warnings);
}
if (validation.valid) {
  // Proceed
}
```

### ❌ Don't: Manual Batch Processing
```javascript
const mapped = [];
for (const apt of appointments) {
  try {
    mapped.push(mapAppointmentForPythonService(apt));
  } catch (e) {
    // Lost error context
  }
}
```

### ✅ Do: Use Batch Mapper
```javascript
const result = batchMapAppointments(appointments, { skipInvalid: true });
// Automatic error tracking with context
```

## Need Help?

1. Check the test file: `__tests__/utils/appointment-field-mapper.test.js`
2. Review examples: `app/api/utils/appointment-field-mapper.example.js`
3. Read full docs: `app/api/utils/README.md`
4. Check error messages - they include helpful context

---

**Remember**: The mapper handles all edge cases, date calculations, and fallbacks automatically. Trust the mapper, validate first, and handle errors gracefully.

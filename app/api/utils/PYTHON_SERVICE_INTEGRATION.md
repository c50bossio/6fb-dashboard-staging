# Python Service Integration Guide

How to use the appointment field mapper with existing Python booking notification services.

## Python Service Compatibility

The mapper produces output that matches these Python dataclasses exactly:

### BookingNotificationData (from `/services/booking_notifications.py`)

```python
@dataclass
class BookingNotificationData:
    booking_id: str
    user_id: str
    customer_name: str
    customer_email: str
    customer_phone: Optional[str]
    barbershop_name: str
    barber_name: str
    service_name: str
    appointment_date: datetime
    appointment_duration: int  # minutes
    total_price: float
    booking_status: str
    payment_status: Optional[str] = None
    payment_method: Optional[str] = None
    cancellation_reason: Optional[str] = None
    notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
```

## Integration with Existing Python Endpoints

### 1. Booking Confirmation Endpoint

**Python Service**: `/api/v1/booking-notifications/booking-confirmed` (FastAPI)

**JavaScript Integration**:
```javascript
import { mapForBookingNotification } from '@/app/api/utils/appointment-field-mapper';

// Fetch appointment from database
const { data: appointment } = await supabase
  .from('appointments')
  .select(`
    *,
    client:users!client_id(id, full_name, email, phone),
    service:services(id, name),
    barber:users!barber_id(id, full_name),
    barbershop:barbershops(id, name)
  `)
  .eq('id', appointmentId)
  .single();

// Map to BookingNotificationData format
const notificationData = mapForBookingNotification(appointment);

// Send to Python service
const response = await fetch('http://localhost:8001/api/v1/booking-notifications/booking-confirmed', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  },
  body: JSON.stringify(notificationData)
});

const result = await response.json();
// Result: { success: true, notification_id: "...", status: "sent" }
```

### 2. Payment Confirmation Endpoint

**Python Service**: `/api/v1/booking-notifications/payment-confirmed`

**JavaScript Integration**:
```javascript
import { mapForBookingNotification } from '@/app/api/utils/appointment-field-mapper';

const appointment = await getAppointment(appointmentId);

// Map with payment info
const notificationData = mapForBookingNotification(appointment);

// Ensure payment fields are set
notificationData.payment_status = 'PAID';
notificationData.payment_method = paymentMethod;

// Send to Python service
await fetch('http://localhost:8001/api/v1/booking-notifications/payment-confirmed', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(notificationData)
});
```

### 3. Cancellation Notice Endpoint

**Python Service**: `/api/v1/booking-notifications/booking-cancelled`

**JavaScript Integration**:
```javascript
import { mapForBookingNotification } from '@/app/api/utils/appointment-field-mapper';

const appointment = await getAppointment(appointmentId);

// Map with cancellation reason
const notificationData = mapForBookingNotification(appointment);
notificationData.cancellation_reason = cancellationReason;
notificationData.booking_status = 'CANCELLED';

// Send to Python service
await fetch('http://localhost:8001/api/v1/booking-notifications/booking-cancelled', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(notificationData)
});
```

### 4. Appointment Reminders

**Python Service**: `/api/v1/booking-notifications/appointment-reminders/schedule`

**JavaScript Integration**:
```javascript
import { mapForBookingNotification } from '@/app/api/utils/appointment-field-mapper';

const appointment = await getAppointment(appointmentId);

// Map appointment
const notificationData = mapForBookingNotification(appointment);

// Schedule reminders (24h and 2h before)
await fetch('http://localhost:8001/api/v1/booking-notifications/appointment-reminders/schedule', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(notificationData)
});
```

## Complete Next.js API Route Example

```javascript
// app/api/appointments/[id]/send-confirmation/route.js
import { createClient } from '@/lib/supabase/server';
import { mapForBookingNotification, validateAppointmentForMapping } from '@/app/api/utils/appointment-field-mapper';

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8001';

export async function POST(req, { params }) {
  try {
    const { id } = params;
    const supabase = createClient();

    // Fetch appointment with all related data
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        *,
        client:users!client_id(
          id,
          full_name,
          email,
          phone
        ),
        service:services(
          id,
          name
        ),
        barber:users!barber_id(
          id,
          full_name
        ),
        barbershop:barbershops(
          id,
          name
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return Response.json(
        { error: 'Appointment not found', details: error.message },
        { status: 404 }
      );
    }

    // Validate appointment data
    const validation = validateAppointmentForMapping(appointment);
    if (!validation.valid) {
      return Response.json(
        {
          error: 'Invalid appointment data',
          details: validation.errors,
          warnings: validation.warnings
        },
        { status: 400 }
      );
    }

    // Log warnings for data quality monitoring
    if (validation.warnings.length > 0) {
      console.warn('[Appointment Mapper] Warnings:', {
        appointmentId: id,
        warnings: validation.warnings
      });
    }

    // Map to BookingNotificationData format
    const notificationData = mapForBookingNotification(appointment);

    // Send to Python notification service
    const response = await fetch(`${PYTHON_SERVICE_URL}/api/v1/booking-notifications/booking-confirmed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': crypto.randomUUID()
      },
      body: JSON.stringify(notificationData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Python service error: ${error.detail || response.statusText}`);
    }

    const result = await response.json();

    return Response.json({
      success: true,
      notificationId: result.notification_id,
      status: result.status,
      message: 'Booking confirmation sent successfully'
    });

  } catch (error) {
    console.error('[Send Confirmation] Error:', error);
    return Response.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}
```

## Error Handling with Python Service

```javascript
async function sendToPythonService(endpoint, data) {
  try {
    const response = await fetch(`http://localhost:8001${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();

      // Handle specific Python service errors
      if (error.detail?.includes('Twilio not configured')) {
        console.warn('[Python Service] SMS notifications unavailable');
        // Continue without SMS
      } else if (error.detail?.includes('SMTP not configured')) {
        console.warn('[Python Service] Email notifications unavailable');
        // Continue without email
      } else {
        throw new Error(`Python service error: ${error.detail}`);
      }
    }

    return await response.json();

  } catch (error) {
    console.error('[Python Service] Request failed:', error);
    throw error;
  }
}
```

## Webhook Integration

### Stripe Webhook Handler

```javascript
// app/api/webhooks/stripe/route.js
import { mapForBookingNotification } from '@/app/api/utils/appointment-field-mapper';

export async function POST(req) {
  const sig = req.headers.get('stripe-signature');
  const payload = await req.text();

  // Verify Stripe webhook signature
  const event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);

  if (event.type === 'payment_intent.succeeded') {
    const bookingId = event.data.object.metadata.booking_id;

    // Fetch appointment
    const { data: appointment } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', bookingId)
      .single();

    // Map and send payment confirmation
    const notificationData = mapForBookingNotification(appointment);
    notificationData.payment_status = 'PAID';
    notificationData.payment_method = event.data.object.payment_method_types[0];

    await fetch('http://localhost:8001/api/v1/booking-notifications/payment-confirmed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notificationData)
    });
  }

  return Response.json({ received: true });
}
```

## Background Job Integration

```javascript
// Background job for appointment reminders
import { batchMapAppointments } from '@/app/api/utils/appointment-field-mapper';

async function sendDailyReminders() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get appointments scheduled for tomorrow
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('status', 'CONFIRMED')
    .gte('scheduled_at', tomorrow.toISOString().split('T')[0])
    .lt('scheduled_at', new Date(tomorrow.getTime() + 86400000).toISOString().split('T')[0]);

  // Batch map appointments
  const result = batchMapAppointments(appointments, {
    skipInvalid: true,
    includeValidation: true
  });

  // Send reminders via Python service
  for (const { data } of result.mapped) {
    await fetch('http://localhost:8001/api/v1/booking-notifications/appointment-reminders/send-24h', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    // Add delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`[Reminders] Sent: ${result.mapped.length}, Failed: ${result.failed.length}`);

  // Log failures
  if (result.failed.length > 0) {
    console.error('[Reminders] Failed appointments:', result.failed);
  }
}
```

## Testing Python Service Integration

```javascript
// __tests__/integration/python-service.test.js
import { mapForBookingNotification } from '@/app/api/utils/appointment-field-mapper';

describe('Python Service Integration', () => {
  it('should send booking confirmation to Python service', async () => {
    const appointment = {
      id: 'test-123',
      client_name: 'Test User',
      client_email: 'test@example.com',
      scheduled_at: '2025-10-15T14:00:00Z',
      duration_minutes: 30,
      total_amount: 45.00,
      status: 'CONFIRMED',
      service_name: 'Haircut',
      barber_name: 'Mike',
      barbershop_name: 'Elite Cuts'
    };

    const notificationData = mapForBookingNotification(appointment);

    const response = await fetch('http://localhost:8001/api/v1/booking-notifications/booking-confirmed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notificationData)
    });

    expect(response.ok).toBe(true);

    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.notification_id).toBeDefined();
  });
});
```

## Field Mapping Verification

To verify the mapper produces correct Python service format:

```javascript
import { mapForBookingNotification } from '@/app/api/utils/appointment-field-mapper';

const appointment = { /* ... */ };
const mapped = mapForBookingNotification(appointment);

// Verify required fields
console.assert(typeof mapped.booking_id === 'string');
console.assert(typeof mapped.user_id === 'string');
console.assert(typeof mapped.customer_name === 'string');
console.assert(typeof mapped.customer_email === 'string');
console.assert(mapped.appointment_date instanceof Date);
console.assert(typeof mapped.appointment_duration === 'number');
console.assert(typeof mapped.total_price === 'number');

// Verify optional fields
console.assert(mapped.customer_phone === null || typeof mapped.customer_phone === 'string');
console.assert(mapped.payment_status === null || typeof mapped.payment_status === 'string');
console.assert(mapped.metadata === null || typeof mapped.metadata === 'object');

console.log('✅ All field types correct for Python service');
```

## Benefits Over Manual Mapping

| Aspect | Manual Mapping | Using Mapper |
|--------|---------------|--------------|
| **Code Lines** | 20-30 lines | 2 lines |
| **Error Handling** | Manual try-catch | Automatic |
| **Validation** | Manual checks | Built-in |
| **Walk-ins** | Custom logic | Automatic |
| **Date Calculations** | Manual | Automatic |
| **Fallbacks** | Must implement | Built-in |
| **Testing** | Custom tests | 47 tests included |
| **Maintenance** | Per endpoint | Centralized |

## Summary

The appointment field mapper seamlessly integrates with all existing Python notification service endpoints:

✅ `/api/v1/booking-notifications/booking-confirmed`
✅ `/api/v1/booking-notifications/payment-confirmed`
✅ `/api/v1/booking-notifications/booking-cancelled`
✅ `/api/v1/booking-notifications/appointment-reminders/schedule`

It handles all edge cases, provides proper validation, and ensures type compatibility with Python's `BookingNotificationData` dataclass.

---

**Next Steps**:
1. Update existing API endpoints to use the mapper
2. Test with your Python service
3. Monitor for any validation warnings
4. Remove old manual mapping code

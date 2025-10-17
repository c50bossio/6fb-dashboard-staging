# Appointment Data Quick Reference

**Status**: ✅ 625 appointments ready for use
**Last Generated**: October 11, 2025

---

## Quick Stats

```
Total Appointments: 625
├── Tomb45 Channelside: 231 appointments (2 barbers)
├── Tomb45 GasWorx: 120 appointments (2 barbers)
└── Elite Cuts LA: 274 appointments (3 barbers)

Time Distribution:
├── Past: 336 appointments (53.8%)
├── Today: 12 appointments (1.9%)
└── Future: 277 appointments (44.3%)

Status Distribution:
├── COMPLETED: 302 appointments (48.3%)
├── CONFIRMED: 251 appointments (40.2%)
├── PENDING: 41 appointments (6.6%)
└── CANCELLED: 31 appointments (5.0%)
```

---

## Useful SQL Queries

### Get Today's Appointments
```sql
SELECT
  a.id,
  a.scheduled_at,
  a.client_name,
  a.status,
  p.full_name as barber_name,
  s.name as service_name,
  a.duration_minutes,
  a.total_amount
FROM appointments a
JOIN profiles p ON a.barber_id = p.id
JOIN services s ON a.service_id = s.id
WHERE a.scheduled_at::date = CURRENT_DATE
  AND a.barbershop_id = 'c5a58548-8f23-426c-bedc-49a83d238724'
ORDER BY a.scheduled_at;
```

### Get Barber's Schedule for a Date Range
```sql
SELECT
  a.scheduled_at,
  a.client_name,
  a.status,
  s.name as service,
  a.duration_minutes
FROM appointments a
JOIN services s ON a.service_id = s.id
WHERE a.barber_id = 'barber-uuid-here'
  AND a.scheduled_at >= CURRENT_DATE
  AND a.scheduled_at < CURRENT_DATE + INTERVAL '7 days'
ORDER BY a.scheduled_at;
```

### Get Upcoming Appointments (Next 7 Days)
```sql
SELECT
  a.scheduled_at,
  a.client_name,
  a.client_phone,
  a.status,
  p.full_name as barber,
  s.name as service
FROM appointments a
JOIN profiles p ON a.barber_id = p.id
JOIN services s ON a.service_id = s.id
WHERE a.barbershop_id = 'location-uuid'
  AND a.scheduled_at >= CURRENT_DATE
  AND a.scheduled_at < CURRENT_DATE + INTERVAL '7 days'
  AND a.status IN ('CONFIRMED', 'PENDING')
ORDER BY a.scheduled_at;
```

### Get Walk-in Appointments
```sql
SELECT
  a.scheduled_at,
  a.client_name,
  a.status,
  s.name as service
FROM appointments a
JOIN services s ON a.service_id = s.id
WHERE a.client_id IS NULL
  AND (a.client_name IS NULL OR a.client_name LIKE '%Walk-in%')
ORDER BY a.scheduled_at DESC;
```

### Daily Schedule Summary
```sql
SELECT
  a.scheduled_at::date as date,
  COUNT(*) as total_appointments,
  SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN a.status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmed,
  SUM(CASE WHEN a.status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
  SUM(a.duration_minutes) / 60.0 as total_service_hours,
  SUM(a.total_amount) as total_revenue
FROM appointments a
WHERE a.barbershop_id = 'location-uuid'
  AND a.scheduled_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY a.scheduled_at::date
ORDER BY date DESC;
```

### Busiest Time Slots
```sql
SELECT
  EXTRACT(HOUR FROM scheduled_at) as hour,
  COUNT(*) as appointment_count
FROM appointments
WHERE barbershop_id = 'location-uuid'
  AND scheduled_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY EXTRACT(HOUR FROM scheduled_at)
ORDER BY appointment_count DESC;
```

### Barber Performance Summary
```sql
SELECT
  p.full_name as barber,
  COUNT(*) as total_appointments,
  SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN a.status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
  SUM(a.duration_minutes) / 60.0 as total_hours,
  SUM(CASE WHEN a.status = 'COMPLETED' THEN a.total_amount ELSE 0 END) as revenue
FROM appointments a
JOIN profiles p ON a.barber_id = p.id
WHERE a.barbershop_id = 'location-uuid'
  AND a.scheduled_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.full_name
ORDER BY revenue DESC;
```

---

## Node.js / JavaScript Queries

### Get Today's Appointments (Supabase Client)
```javascript
const { data: appointments } = await supabase
  .from('appointments')
  .select(`
    *,
    profiles:barber_id(full_name),
    services:service_id(name, duration_minutes)
  `)
  .eq('barbershop_id', barbershopId)
  .gte('scheduled_at', new Date().toISOString().split('T')[0])
  .lt('scheduled_at', new Date(Date.now() + 86400000).toISOString().split('T')[0])
  .order('scheduled_at');
```

### Get Barber's Schedule
```javascript
const { data: schedule } = await supabase
  .from('appointments')
  .select(`
    id,
    scheduled_at,
    duration_minutes,
    status,
    client_name,
    client_phone,
    services(name, price)
  `)
  .eq('barber_id', barberId)
  .gte('scheduled_at', startDate.toISOString())
  .lte('scheduled_at', endDate.toISOString())
  .order('scheduled_at');
```

### Check Time Slot Availability
```javascript
async function isTimeSlotAvailable(barberId, scheduledAt, durationMinutes) {
  const endTime = new Date(scheduledAt.getTime() + durationMinutes * 60000);

  const { data: conflicts } = await supabase
    .from('appointments')
    .select('id, scheduled_at, duration_minutes')
    .eq('barber_id', barberId)
    .in('status', ['CONFIRMED', 'PENDING'])
    .gte('scheduled_at', scheduledAt.toISOString())
    .lt('scheduled_at', endTime.toISOString());

  return conflicts.length === 0;
}
```

---

## Location IDs

```javascript
const LOCATIONS = {
  CHANNELSIDE: 'c5a58548-8f23-426c-bedc-49a83d238724',
  GASWORX: '9306d931-7ab0-45b7-88d5-599678085526',
  ELITE_CUTS_LA: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
};
```

---

## Common Tasks

### 1. Display Calendar for a Location
```javascript
// Fetch appointments for date range
const { data: appointments } = await supabase
  .from('appointments')
  .select(`
    id,
    scheduled_at,
    duration_minutes,
    status,
    client_name,
    notes,
    profiles:barber_id(id, full_name),
    services:service_id(name, price)
  `)
  .eq('barbershop_id', locationId)
  .gte('scheduled_at', startDate.toISOString())
  .lte('scheduled_at', endDate.toISOString())
  .order('scheduled_at');

// Transform for FullCalendar
const events = appointments.map(apt => ({
  id: apt.id,
  title: `${apt.client_name || 'Walk-in'} - ${apt.services.name}`,
  start: apt.scheduled_at,
  end: new Date(new Date(apt.scheduled_at).getTime() + apt.duration_minutes * 60000),
  resourceId: apt.profiles.id,
  backgroundColor: getStatusColor(apt.status),
  extendedProps: {
    status: apt.status,
    client_name: apt.client_name,
    service: apt.services.name,
    price: apt.services.price,
    notes: apt.notes
  }
}));
```

### 2. Create New Appointment
```javascript
const { data, error } = await supabase
  .from('appointments')
  .insert({
    barbershop_id: locationId,
    barber_id: barberId,
    service_id: serviceId,
    scheduled_at: appointmentTime.toISOString(),
    duration_minutes: serviceDuration,
    status: 'CONFIRMED',
    client_id: null, // or userId if registered
    client_name: clientName,
    client_email: clientEmail,
    client_phone: clientPhone,
    price: servicePrice,
    service_price: servicePrice,
    total_amount: servicePrice,
    tip_amount: 0,
    notes: notes,
    is_test: false,
    is_recurring: false
  })
  .select()
  .single();
```

### 3. Update Appointment Status
```javascript
const { data, error } = await supabase
  .from('appointments')
  .update({
    status: 'COMPLETED',
    updated_at: new Date().toISOString()
  })
  .eq('id', appointmentId)
  .select()
  .single();
```

### 4. Cancel Appointment
```javascript
const { data, error } = await supabase
  .from('appointments')
  .update({
    status: 'CANCELLED',
    notes: `${existingNotes}\nCancelled: ${reason}`,
    updated_at: new Date().toISOString()
  })
  .eq('id', appointmentId)
  .select()
  .single();
```

---

## Status Colors (for UI)

```javascript
function getStatusColor(status) {
  const colors = {
    COMPLETED: '#10b981',   // green
    CONFIRMED: '#3b82f6',   // blue
    PENDING: '#f59e0b',     // amber
    CANCELLED: '#ef4444'    // red
  };
  return colors[status] || '#6b7280'; // gray default
}
```

---

## Testing Scenarios

### Scenario 1: Full Day Schedule
- Location: Tomb45 Channelside
- Date: Check any date in the next 7 days
- Expected: Multiple appointments spread throughout business hours

### Scenario 2: Walk-in Customer
- Look for appointments with `client_name` containing "Walk-in"
- These should have `client_id = null`

### Scenario 3: Busy Afternoon
- Query afternoon slots (12 PM - 3 PM)
- Channelside should show highest density

### Scenario 4: Past Appointments (Completed)
- Query past 30 days
- Most should have status = 'COMPLETED'

---

## Regenerate Appointments

```bash
# Run the generation script
cd "/Users/bossio/6FB AI Agent System"
node database/generate-realistic-appointments.js

# Will add 175 more appointments (configurable in script)
```

---

## Files Reference

- **Generation Script**: `/database/generate-realistic-appointments.js`
- **Full Summary**: `/database/APPOINTMENT_GENERATION_SUMMARY.md`
- **This Guide**: `/database/APPOINTMENT_QUICK_REFERENCE.md`

---

**Updated**: October 11, 2025
**Total Appointments**: 625 across 3 locations
**Ready for**: Calendar UI, Analytics, Reporting, Testing

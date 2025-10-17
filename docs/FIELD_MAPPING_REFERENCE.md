# Field Mapping Quick Reference Guide

**Purpose**: Quick lookup for developers working with appointments/bookings in the 6FB system
**Last Updated**: October 10, 2025
**Related**: [Complete Migration Documentation](/docs/MIGRATION_BOOKING_CONSOLIDATION_COMPLETE.md)

---

## Quick Reference Table

| What You Want | Old Way (WRONG ❌) | Correct Way (RIGHT ✅) | Notes |
|---------------|-------------------|----------------------|-------|
| **Client name** | `appointment.customer_name` | `appointment.client_name \|\| appointment.client?.full_name` | Supports walk-ins + registered |
| **Client phone** | `appointment.customer_phone` | `appointment.client_phone \|\| appointment.client?.phone` | Check both sources |
| **Client email** | `appointment.customer_email` | `appointment.client_email \|\| appointment.client?.email` | Check both sources |
| **Client ID (FK)** | `appointment.customer_id` | `appointment.client_id` | FK to profiles, not customers! |
| **Appointment time** | `appointment.start_time` | `appointment.scheduled_at` | TIMESTAMP field |
| **Barber name** | `appointment.barber.name` | `appointment.barber?.full_name` | From profiles join |
| **Barber avatar** | `appointment.barber.image_url` | `appointment.barber?.avatar_url` | From profiles join |
| **Service name** | `appointment.service_name` | `appointment.service?.name` | Prefer joined data |
| **Service duration** | `appointment.duration` | `appointment.duration_minutes` | Integer (minutes) |

---

## Copy-Paste Code Patterns

### Pattern 1: Display Client Name

```javascript
// ✅ SAFE - Handles all cases
const clientName = appointment.client_name ||
                   appointment.client?.full_name ||
                   'Walk-in Customer'

// Display
<span>{clientName}</span>
```

### Pattern 2: Display Client Contact

```javascript
// ✅ SAFE - Checks both sources
const clientPhone = appointment.client_phone || appointment.client?.phone
const clientEmail = appointment.client_email || appointment.client?.email

// Display with conditional
{clientPhone && (
  <a href={`tel:${clientPhone}`}>
    {clientPhone}
  </a>
)}
```

### Pattern 3: Display Barber Info

```javascript
// ✅ SAFE - Prefers joined data
const barberName = appointment.barber?.full_name ||
                   appointment.barber_name ||
                   'Unassigned'

const barberAvatar = appointment.barber?.avatar_url ||
                     '/default-avatar.png'

// Display
<div>
  <img src={barberAvatar} alt={barberName} />
  <span>{barberName}</span>
</div>
```

### Pattern 4: Display Service Info

```javascript
// ✅ SAFE - Handles missing service
const serviceName = appointment.service?.name ||
                    appointment.service_name ||
                    'General Service'

const duration = appointment.service?.duration_minutes ||
                 appointment.duration_minutes ||
                 30

// Display
<span>{serviceName} ({duration} min)</span>
```

### Pattern 5: Fetch Appointments from API

```javascript
// ✅ CORRECT - Use appointments table with proper joins
const { data, error } = await supabase
  .from('appointments')  // NOT 'bookings'!
  .select(`
    *,
    client:profiles!appointments_client_id_fkey(
      id,
      full_name,
      email,
      phone,
      avatar_url
    ),
    barber:profiles!appointments_barber_id_fkey(
      id,
      full_name,
      email,
      avatar_url
    ),
    service:services(
      id,
      name,
      description,
      duration_minutes,
      price,
      category
    ),
    barbershop:barbershops(
      id,
      name,
      address,
      phone
    )
  `)
  .eq('barbershop_id', barbershopId)
  .gte('scheduled_at', startDate)  // NOT start_time!
  .order('scheduled_at', { ascending: true })
```

### Pattern 6: Filter Appointments

```javascript
// ✅ CORRECT field names for filtering
const filters = {
  barbershop: (query, id) => query.eq('barbershop_id', id),
  barber: (query, id) => query.eq('barber_id', id),
  client: (query, id) => query.eq('client_id', id),  // NOT customer_id!
  status: (query, status) => query.eq('status', status),
  dateRange: (query, start, end) => query
    .gte('scheduled_at', start)  // NOT start_time!
    .lte('scheduled_at', end)
}

// Apply filters
let query = supabase.from('appointments').select('*')
query = filters.barbershop(query, shopId)
query = filters.dateRange(query, startDate, endDate)
```

### Pattern 7: Create New Appointment

```javascript
// ✅ CORRECT field names for insert
const newAppointment = {
  barbershop_id: shopId,
  barber_id: barberId,
  service_id: serviceId,
  client_id: clientId,           // If registered client
  client_name: walkInName,       // If walk-in (no client_id)
  client_phone: walkInPhone,     // Optional for walk-ins
  client_email: walkInEmail,     // Optional for walk-ins
  scheduled_at: appointmentTime, // NOT start_time!
  duration_minutes: duration,
  status: 'PENDING',
  price: servicePrice,
  notes: clientNotes
}

const { data, error } = await supabase
  .from('appointments')
  .insert(newAppointment)
  .select()
  .single()
```

### Pattern 8: Update Appointment

```javascript
// ✅ CORRECT field names for update
const updates = {
  scheduled_at: newTime,        // NOT start_time!
  barber_id: newBarberId,
  service_id: newServiceId,
  status: 'CONFIRMED',
  notes: updatedNotes,
  updated_at: new Date().toISOString()
}

const { data, error } = await supabase
  .from('appointments')
  .update(updates)
  .eq('id', appointmentId)
  .select()
  .single()
```

### Pattern 9: Contact Action Buttons

```javascript
// ✅ CORRECT - Works with both phone sources
function ContactButtons({ appointment }) {
  const phone = appointment.client_phone || appointment.client?.phone
  const email = appointment.client_email || appointment.client?.email

  return (
    <div>
      <button
        onClick={() => window.open(`tel:${phone}`, '_self')}
        disabled={!phone}
        title="Call client"
      >
        Call
      </button>

      <button
        onClick={() => window.open(`sms:${phone}`, '_self')}
        disabled={!phone}
        title="Text client"
      >
        Text
      </button>

      <button
        onClick={() => window.open(`mailto:${email}`, '_self')}
        disabled={!email}
        title="Email client"
      >
        Email
      </button>
    </div>
  )
}
```

### Pattern 10: Calendar Event Transformation

```javascript
// ✅ CORRECT - FullCalendar event format
function transformToCalendarEvent(appointment) {
  return {
    id: appointment.id,
    title: `${appointment.client_name || appointment.client?.full_name} - ${appointment.service?.name}`,
    start: appointment.scheduled_at,  // NOT start_time!
    end: new Date(
      new Date(appointment.scheduled_at).getTime() +
      appointment.duration_minutes * 60000
    ),
    resourceId: appointment.barber_id,
    backgroundColor: appointment.service?.category?.color || '#3B82F6',
    borderColor: appointment.service?.category?.color || '#3B82F6',
    extendedProps: {
      appointmentId: appointment.id,
      clientName: appointment.client_name || appointment.client?.full_name,
      clientPhone: appointment.client_phone || appointment.client?.phone,
      barberName: appointment.barber?.full_name,
      serviceName: appointment.service?.name,
      status: appointment.status,
      price: appointment.price
    }
  }
}
```

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Using Old Table Name

```javascript
// ❌ WRONG
.from('bookings')

// ✅ CORRECT
.from('appointments')
```

### ❌ Mistake 2: Using Wrong Field Names

```javascript
// ❌ WRONG
appointment.customer_name
appointment.start_time
appointment.customer_id

// ✅ CORRECT
appointment.client_name || appointment.client?.full_name
appointment.scheduled_at
appointment.client_id
```

### ❌ Mistake 3: Wrong Foreign Key in Joins

```javascript
// ❌ WRONG
client:customers!appointments_customer_id_fkey(...)

// ✅ CORRECT
client:profiles!appointments_client_id_fkey(...)
```

### ❌ Mistake 4: Using Wrong Profile Fields

```javascript
// ❌ WRONG
barber:profiles(name, image_url)

// ✅ CORRECT
barber:profiles(full_name, avatar_url)
```

### ❌ Mistake 5: Not Handling Both Data Sources

```javascript
// ❌ WRONG - Only checks direct field
disabled={!appointment.client_phone}

// ✅ CORRECT - Checks both sources
disabled={!appointment.client_phone && !appointment.client?.phone}
```

### ❌ Mistake 6: Hardcoded Defaults

```javascript
// ❌ WRONG - Loses context
{appointment.client_name || 'N/A'}

// ✅ CORRECT - Descriptive default
{appointment.client_name || appointment.client?.full_name || 'Walk-in Customer'}
```

---

## Database Schema Reference

### appointments Table (Canonical)

```sql
CREATE TABLE appointments (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign Keys
  barbershop_id UUID REFERENCES barbershops(id),
  client_id UUID REFERENCES profiles(id),      -- NOT customers!
  barber_id UUID REFERENCES profiles(id),
  service_id UUID REFERENCES services(id),

  -- Timing
  scheduled_at TIMESTAMP WITH TIME ZONE,       -- NOT start_time!
  duration_minutes INTEGER,

  -- Walk-in Support (when no client_id)
  client_name VARCHAR(255),
  client_phone VARCHAR(20),
  client_email VARCHAR(255),

  -- Status & Pricing
  status TEXT,  -- PENDING, CONFIRMED, COMPLETED, CANCELLED
  price NUMERIC(10,2),

  -- Additional Fields
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- ... 26 total columns
)
```

### Foreign Key Constraints

```sql
-- Client FK points to profiles, NOT customers!
appointments_client_id_fkey → profiles.id

-- Barber FK points to profiles
appointments_barber_id_fkey → profiles.id

-- Service FK points to services
appointments_service_id_fkey → services.id

-- Barbershop FK points to barbershops
appointments_barbershop_id_fkey → barbershops.id
```

### profiles Table (Important Fields)

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,        -- NOT 'name'!
  avatar_url TEXT,       -- NOT 'image_url'!
  email TEXT,
  phone TEXT,
  -- ... other fields
)
```

---

## Testing Checklist

When updating a component, verify:

- [ ] **Walk-in appointments** display correctly (using `client_name`)
- [ ] **Registered client appointments** display correctly (using `client.full_name`)
- [ ] **Client phone** displays from both sources
- [ ] **Client email** displays from both sources
- [ ] **Barber name** displays correctly (`barber.full_name`)
- [ ] **Barber avatar** displays correctly (`barber.avatar_url`)
- [ ] **Service name** displays correctly (`service.name`)
- [ ] **Contact buttons** work with both phone sources
- [ ] **No console errors** when rendering appointments
- [ ] **No undefined warnings** in console
- [ ] **Terminology** uses "client" not "customer"
- [ ] **All queries** use `appointments` table (not `bookings`)
- [ ] **All filters** use correct field names
- [ ] **Date/time** uses `scheduled_at` (not `start_time`)

---

## Troubleshooting Guide

### Problem: Client name shows as undefined

**Symptom**: Display shows "undefined" instead of client name

**Cause**: Only checking `appointment.customer_name` (old field)

**Fix**:
```javascript
// Add fallback chain
const clientName = appointment.client_name ||
                   appointment.client?.full_name ||
                   'Walk-in Customer'
```

### Problem: Phone/email buttons don't work for some appointments

**Symptom**: Contact buttons disabled for registered clients

**Cause**: Only checking direct fields, not joined data

**Fix**:
```javascript
// Check both sources
const phone = appointment.client_phone || appointment.client?.phone
const email = appointment.client_email || appointment.client?.email

disabled={!phone && !appointment.client?.phone}
```

### Problem: Barber name shows as null

**Symptom**: Barber name displays as "null" or blank

**Cause**: Using `appointment.barber.name` (wrong field)

**Fix**:
```javascript
// Use correct field name
const barberName = appointment.barber?.full_name ||
                   appointment.barber_name ||
                   'Unassigned'
```

### Problem: Database query returns no results

**Symptom**: API returns empty array even though data exists

**Cause**: Querying wrong table or using wrong field names

**Fix**:
```javascript
// Use correct table and fields
const { data, error } = await supabase
  .from('appointments')  // NOT bookings
  .select('*')
  .eq('client_id', id)   // NOT customer_id
  .gte('scheduled_at', startDate)  // NOT start_time
```

### Problem: Foreign key constraint error

**Symptom**: Database error about constraint violation

**Cause**: Using wrong FK name in join

**Fix**:
```javascript
// Use correct FK constraint name
client:profiles!appointments_client_id_fkey(...)
// NOT customers!appointments_customer_id_fkey
```

### Problem: Calendar events don't display

**Symptom**: Calendar shows blank or events missing

**Cause**: Using wrong time field or missing data transformation

**Fix**:
```javascript
// Correct event transformation
const events = appointments.map(apt => ({
  start: apt.scheduled_at,  // NOT start_time
  end: new Date(
    new Date(apt.scheduled_at).getTime() +
    apt.duration_minutes * 60000
  )
}))
```

---

## API Endpoints Reference

### GET /api/bookings

**Returns**: All appointments with pagination

**Query Parameters**:
- `barbershop_id` - Filter by shop
- `barber_id` - Filter by barber
- `client_id` - Filter by client (NOT customer_id!)
- `start_date` - Date range start
- `end_date` - Date range end
- `status` - Filter by status
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 50)

**Response**:
```json
{
  "bookings": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 81,
    "pages": 2
  }
}
```

### POST /api/bookings

**Creates**: New appointment

**Body**:
```json
{
  "barbershop_id": "uuid",
  "barber_id": "uuid",
  "service_id": "uuid",
  "client_id": "uuid",           // Optional (if registered)
  "client_name": "John Doe",     // Required if no client_id
  "client_phone": "555-1234",    // Optional
  "client_email": "john@email.com", // Optional
  "scheduled_at": "2025-10-15T14:00:00Z",
  "duration_minutes": 30,
  "service_price": 25.00,
  "notes": "First time client"
}
```

### GET /api/bookings/calendar

**Returns**: FullCalendar-compatible events

**Query Parameters**:
- `start` - Calendar view start date (required)
- `end` - Calendar view end date (required)
- `barbershop_id` - Filter by shop
- `barber_id` - Filter by barber

**Response**:
```json
[
  {
    "id": "uuid",
    "title": "John Doe - Haircut",
    "start": "2025-10-15T14:00:00Z",
    "end": "2025-10-15T14:30:00Z",
    "resourceId": "barber-uuid",
    "backgroundColor": "#3B82F6"
  }
]
```

### GET /api/bookings/[id]

**Returns**: Single appointment details

**Response**:
```json
{
  "id": "uuid",
  "client_name": "John Doe",
  "client_phone": "555-1234",
  "scheduled_at": "2025-10-15T14:00:00Z",
  "duration_minutes": 30,
  "status": "CONFIRMED",
  "barber": {
    "full_name": "Jane Smith",
    "avatar_url": "/avatars/jane.jpg"
  },
  "service": {
    "name": "Haircut",
    "duration_minutes": 30,
    "price": 25.00
  }
}
```

### PUT /api/bookings/[id]

**Updates**: Existing appointment

**Body**: (same as POST, all fields optional)

### DELETE /api/bookings/[id]

**Cancels**: Appointment (soft delete, sets status to CANCELLED)

---

## Component Refactoring Workflow

### Step-by-Step Process

1. **Open component file**

2. **Search for old patterns** (Cmd/Ctrl + F):
   - `customer_name`
   - `customer_phone`
   - `customer_email`
   - `customer_id`
   - `start_time`
   - `barber.name`
   - `barber.image_url`

3. **Replace with safe patterns** (copy from this doc):
   - Use fallback chains
   - Check both direct fields and joined data
   - Add default values

4. **Update terminology**:
   - "customer" → "client"
   - "Customer" → "Client"

5. **Test component**:
   - Run in development
   - Check console for errors
   - Test with walk-in data
   - Test with registered client data
   - Verify all buttons work

6. **Mark complete**:
   - Update Phase 3 progress tracking
   - Commit with clear message

---

## Additional Resources

- **Complete Migration Doc**: `/docs/MIGRATION_BOOKING_CONSOLIDATION_COMPLETE.md`
- **Phase 3 Refactoring Guide**: `/specs/booking-ecosystem-consolidation/PHASE3_COMPONENT_REFACTORING_GUIDE.md`
- **Database Schema**: `/database/appointment-system-schema.sql`
- **Project Guidelines**: `/CLAUDE.md`

---

**Quick Tip**: Bookmark this page for fast reference while refactoring!

**Last Updated**: October 10, 2025
**Maintained By**: 6FB Development Team

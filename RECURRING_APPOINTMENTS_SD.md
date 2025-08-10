# Recurring Appointments System Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Current Architecture](#current-architecture)
3. [Data Model](#data-model)
4. [API Endpoints](#api-endpoints)
5. [Component Structure](#component-structure)
6. [Data Flow](#data-flow)
7. [Known Issues](#known-issues)
8. [Migration Plan](#migration-plan)

## System Overview

The recurring appointments system is built on top of FullCalendar.io with the RRule plugin to handle complex recurrence patterns. It integrates with a PostgreSQL database (via Supabase) and uses Next.js for the frontend and API layer.

### Technology Stack
- **Frontend**: Next.js 14, React 18, FullCalendar 6.1.18
- **Calendar**: FullCalendar with RRule plugin
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (Supabase)
- **Recurrence**: RRule (rrule.js library)

## Current Architecture

### High-Level Architecture
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                 │     │                  │     │                 │
│  React Frontend │────▶│  Next.js API     │────▶│  Supabase DB    │
│  (FullCalendar) │     │  Routes          │     │  (PostgreSQL)   │
│                 │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                         │
         │                       │                         │
         ▼                       ▼                         ▼
   ┌──────────┐           ┌──────────┐            ┌──────────┐
   │  RRule   │           │  Time    │            │  JSONB   │
   │  Plugin  │           │  Utils   │            │  Pattern │
   └──────────┘           └──────────┘            └──────────┘
```

### Directory Structure
```
/Users/bossio/6FB AI Agent System/
├── app/
│   ├── api/
│   │   └── calendar/
│   │       ├── appointments/
│   │       │   ├── route.js                 # Main appointments API
│   │       │   ├── [id]/
│   │       │   │   ├── route.js            # Single appointment operations
│   │       │   │   └── convert-recurring/
│   │       │   │       └── route.js        # Convert to recurring
│   │       │   └── check-conflicts/
│   │       │       └── route.js            # Conflict detection
│   │       ├── barbers/route.js            # Barber management
│   │       └── services/route.js           # Service management
│   └── (protected)/
│       └── dashboard/
│           └── calendar/
│               └── page.js                  # Calendar page component
├── components/
│   └── calendar/
│       ├── AppointmentBookingModal.js      # Booking/Edit modal
│       ├── EnhancedProfessionalCalendar.js # Main calendar component
│       └── RecurringAppointmentModal.js    # Recurring options modal
├── database/
│   ├── calendar-schema-with-test-flag.sql  # Current schema
│   └── migrations/
│       └── 001-add-recurring-fields.sql    # Recurring fields migration
└── lib/
    └── calendar-data.js                    # Calendar utilities
```

## Data Model

### Database Schema

#### bookings Table
```sql
CREATE TABLE bookings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL,
  barber_id TEXT REFERENCES barbers(id),
  customer_id TEXT REFERENCES customers(id),
  service_id TEXT REFERENCES services(id),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'confirmed',
  price DECIMAL(10, 2),
  notes TEXT,
  
  -- Recurring fields
  is_recurring BOOLEAN DEFAULT false,
  recurring_pattern JSONB,
  
  is_test BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### recurring_pattern JSONB Structure
```json
{
  "rrule": "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR;COUNT=10",
  "dtstart": "2025-08-15T14:00:00Z",
  "dtend": "2025-08-15T15:00:00Z",
  "frequency": "WEEKLY",
  "interval": 1,
  "count": 10,
  "until": null,
  "created_at": "2025-08-10T12:00:00Z",
  "created_by": "calendar_api",
  "conflict_resolution": "skip",
  "skip_dates": [],
  "exceptions": [],
  "modifications": {}
}
```

### Current Issues with Data Model

1. **Single Record Pattern**: Uses one database record to represent entire series
   - Pro: Simple storage
   - Con: Difficult to handle exceptions and modifications

2. **JSONB Storage**: All pattern data in single JSONB field
   - Pro: Flexible schema
   - Con: Hard to query and index

3. **No Parent-Child Relationships**: No way to link occurrences to series
   - Impact: Can't track individual modifications

## API Endpoints

### Current Implementation

#### GET /api/calendar/appointments
Fetches appointments with optional recurring expansion.

**Parameters:**
- `start_date`: ISO date string
- `end_date`: ISO date string
- `barber_id`: Optional filter

**Response:**
```json
{
  "appointments": [
    {
      "id": "abc123",
      "title": "John Doe - Haircut",
      "start": "2025-08-15T14:00:00Z",
      "end": "2025-08-15T15:00:00Z",
      "rrule": "FREQ=WEEKLY;BYDAY=MO",
      "extendedProps": {
        "isRecurring": true,
        "recurring_pattern": {}
      }
    }
  ]
}
```

#### POST /api/calendar/appointments
Creates new appointment (single or recurring).

**Request Body:**
```json
{
  "barber_id": "123",
  "service_id": "456",
  "scheduled_at": "2025-08-15T14:00:00Z",
  "duration_minutes": 60,
  "client_name": "John Doe",
  "is_recurring": true,
  "recurrence_rule": "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR"
}
```

**Current Issues:**
- Field mismatch: expects `start_time`/`end_time` but receives `scheduled_at`/`duration_minutes`
- Inconsistent RRule format handling

#### POST /api/calendar/appointments/[id]/convert-recurring
Converts single appointment to recurring.

**Request Body:**
```json
{
  "recurrence_rule": "FREQ=WEEKLY;INTERVAL=1;COUNT=10;BYDAY=MO"
}
```

**Current Issues:**
- Time preservation problems
- DTSTART format inconsistencies

## Component Structure

### FullCalendar Integration

#### Current Setup (EnhancedProfessionalCalendar.js)
```javascript
<FullCalendar
  ref={calendarRef}
  plugins={[
    resourceTimeGridPlugin,
    dayGridPlugin,
    timeGridPlugin,
    listPlugin,
    interactionPlugin,
    rrulePlugin  // RRule plugin for recurring events
  ]}
  timeZone='local'  // Uses browser's local timezone
  events={events}   // Array of event objects
  // ... other config
/>
```

#### Event Format Issues

**Current Implementation:**
```javascript
// Mixing formats causes issues
event.rrule = "FREQ=WEEKLY;BYDAY=MO"  // String format
// OR
event.rrule = {  // Object format
  freq: 'weekly',
  dtstart: '2025-08-15T14:00:00'
}
```

**Problem**: Inconsistent format handling leads to time display issues.

### Modal Components

#### AppointmentBookingModal.js
- Handles both single and recurring appointment creation
- Complex state management for recurrence options
- Issues with field mapping to API

#### RecurringAppointmentModal.js
- Separate modal for recurring options
- Not fully integrated with main booking flow
- UI/UX confusion with multiple modals

## Data Flow

### Current Flow for Creating Recurring Appointment

```
User Input (Modal)
    │
    ▼
Form State (React)
    │
    ▼
API Call (POST /api/calendar/appointments)
    │
    ├──► Field Transformation
    │    (scheduled_at → start_time)
    │
    ├──► RRule Enhancement
    │    (Add DTSTART if missing)
    │
    ├──► Database Insert
    │    (Single record with recurring_pattern)
    │
    ▼
Response to Frontend
    │
    ▼
Calendar Refresh
    │
    ▼
FullCalendar RRule Processing
    │
    ├──► Parse RRule
    ├──► Generate Occurrences
    └──► Display Events
```

### Issues in Current Flow

1. **Field Transformation Errors**: Mismatch between frontend and backend field names
2. **RRule Format Issues**: DTSTART not consistently applied
3. **Timezone Problems**: Local vs UTC confusion
4. **Calendar Refresh**: Not efficiently updating after changes

## Known Issues

### Critical Bugs

#### 1. Midnight Display Bug
**Description**: Recurring appointments show at 12:00 AM instead of scheduled time.

**Root Cause**: 
- RRule string doesn't include time information
- FullCalendar defaults to midnight when time not specified
- Inconsistent DTSTART formatting

**Current Attempts to Fix**:
1. Added BYHOUR/BYMINUTE to RRule ❌
2. Used DTSTART prefix format ❌
3. Switched to object format ❌
4. Kept both start/end times ❌

**Actual Solution Needed**:
- Consistent RRule format with proper RFC 5545 compliance
- Clear timezone handling
- Proper FullCalendar configuration

#### 2. Manual Creation 400 Error
**Description**: Creating recurring appointment manually fails with 400 error.

**Root Cause**:
- API expects `start_time`/`end_time`
- Frontend sends `scheduled_at`/`duration_minutes`
- Validation fails before transformation

**Fix Applied**: Added field transformation logic ✅

#### 3. Conversion Time Loss
**Description**: Converting single to recurring loses original time.

**Root Cause**:
- DTSTART not properly formatted
- Timezone conversion issues
- RRule parsing problems

### Architecture Issues

1. **Single Record Pattern Limitations**
   - Can't handle individual occurrence modifications
   - No way to track exceptions properly
   - Difficult to implement "this and future" changes

2. **Client-Side Expansion**
   - Performance issues with many recurring appointments
   - Memory usage problems
   - Slow initial load

3. **No Conflict Detection**
   - Recurring appointments can overlap
   - No warning for double-booking
   - Manual checking required

## Migration Plan

### Phase 1: Documentation & Archive

#### Files to Archive
```bash
# Create archive directory
mkdir -p /archive/recurring-system-v1/

# Move test files
mv test-*.js /archive/recurring-system-v1/
mv check-*.js /archive/recurring-system-v1/

# Move old implementations
mv app/api/calendar/appointments/route-old.js /archive/recurring-system-v1/

# Move test HTML files
mv *.html /archive/recurring-system-v1/
```

### Phase 2: New Implementation Structure

#### Proposed Architecture
```
/app/api/calendar/
├── v2/
│   ├── recurring/
│   │   ├── create.js         # Create recurring series
│   │   ├── expand.js         # Server-side expansion
│   │   ├── modify.js         # Modify series/occurrence
│   │   └── delete.js         # Delete options
│   └── appointments/
│       └── index.js          # Refactored main API
└── services/
    ├── rrule.service.js      # RRule utilities
    ├── timezone.service.js   # Timezone handling
    └── conflict.service.js   # Conflict detection
```

#### Database Schema Changes
```sql
-- Add parent_id for series tracking
ALTER TABLE bookings 
ADD COLUMN parent_id TEXT REFERENCES bookings(id);

-- Add occurrence_date for expanded events
ALTER TABLE bookings 
ADD COLUMN occurrence_date DATE;

-- Add modification_type
ALTER TABLE bookings 
ADD COLUMN modification_type VARCHAR(20); 
-- Values: 'original', 'exception', 'rescheduled'

-- Create index for performance
CREATE INDEX idx_bookings_parent_id ON bookings(parent_id);
CREATE INDEX idx_bookings_occurrence_date ON bookings(occurrence_date);
```

### Phase 3: Implementation Steps

1. **Core RRule Service**
```javascript
// services/rrule.service.js
import { RRule, RRuleSet } from 'rrule';

export class RRuleService {
  static parseRule(rruleString) {
    return RRule.fromString(rruleString);
  }
  
  static generateOccurrences(rrule, startDate, endDate) {
    const rule = this.parseRule(rrule);
    return rule.between(startDate, endDate);
  }
  
  static createRule(options) {
    return new RRule({
      freq: RRule[options.frequency.toUpperCase()],
      interval: options.interval,
      byweekday: options.daysOfWeek,
      dtstart: new Date(options.startDate),
      until: options.until ? new Date(options.until) : null,
      count: options.count || null
    });
  }
}
```

2. **Timezone Service**
```javascript
// services/timezone.service.js
import { DateTime } from 'luxon';

export class TimezoneService {
  static toUTC(dateTime, timezone) {
    return DateTime.fromISO(dateTime, { zone: timezone }).toUTC().toISO();
  }
  
  static fromUTC(dateTime, timezone) {
    return DateTime.fromISO(dateTime, { zone: 'UTC' }).setZone(timezone).toISO();
  }
  
  static handleDST(dateTime, timezone) {
    const dt = DateTime.fromISO(dateTime, { zone: timezone });
    return {
      isDST: dt.isInDST,
      offset: dt.offset,
      adjusted: dt.toISO()
    };
  }
}
```

3. **Proper FullCalendar Configuration**
```javascript
// components/calendar/CalendarView.js
const calendarConfig = {
  plugins: [rrulePlugin],
  timeZone: 'America/New_York', // Explicit timezone
  
  // Proper event handling
  eventDataTransform: (eventData) => {
    if (eventData.rrule && typeof eventData.rrule === 'string') {
      // Ensure proper format
      if (!eventData.rrule.includes('DTSTART')) {
        const dtstart = new Date(eventData.start)
          .toISOString()
          .replace(/[-:]/g, '')
          .replace(/\.\d{3}/, '');
        eventData.rrule = `DTSTART:${dtstart}\n${eventData.rrule}`;
      }
    }
    return eventData;
  },
  
  // Server-side expansion
  events: async (info) => {
    const response = await fetch('/api/calendar/v2/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start: info.start.toISOString(),
        end: info.end.toISOString(),
        expandRecurring: true
      })
    });
    return response.json();
  }
};
```

## Testing Strategy

### Unit Tests Required
```javascript
// __tests__/rrule.service.test.js
describe('RRuleService', () => {
  test('generates correct occurrences for weekly pattern', () => {
    const rrule = 'FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=10';
    const occurrences = RRuleService.generateOccurrences(
      rrule,
      new Date('2025-08-01'),
      new Date('2025-08-31')
    );
    expect(occurrences).toHaveLength(13);
    expect(occurrences[0].getHours()).toBe(14); // 2 PM
  });
});
```

### Integration Tests
```javascript
// __tests__/api/recurring.test.js
describe('Recurring Appointments API', () => {
  test('creates recurring appointment with correct times', async () => {
    const response = await request(app)
      .post('/api/calendar/v2/recurring/create')
      .send({
        start: '2025-08-15T14:00:00',
        duration: 60,
        pattern: 'FREQ=WEEKLY;BYDAY=MO'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.occurrences[0].start).toContain('14:00');
  });
});
```

## Performance Considerations

### Current Performance Issues
- Loading 100+ recurring appointments: ~5 seconds
- Client-side expansion memory usage: ~50MB for 1 year
- Database queries without proper indexing

### Optimization Strategies
1. **Server-Side Expansion Caching**
   - Cache expanded occurrences for date ranges
   - Invalidate on modification
   - Redis for cache storage

2. **Database Optimization**
   - Proper indexes on recurring fields
   - Materialized views for common queries
   - Partitioning for large datasets

3. **Frontend Optimization**
   - Virtual scrolling for large calendars
   - Lazy loading of event details
   - Progressive enhancement

## Security Considerations

### Current Vulnerabilities
1. No validation of RRule input (potential DoS with complex rules)
2. No rate limiting on expansion endpoints
3. Missing authorization checks for modifications

### Required Security Measures
```javascript
// Validate RRule input
function validateRRule(rrule) {
  const MAX_COUNT = 365;
  const MAX_INTERVAL = 12;
  
  if (rrule.includes('COUNT')) {
    const count = parseInt(rrule.match(/COUNT=(\d+)/)[1]);
    if (count > MAX_COUNT) throw new Error('Count exceeds maximum');
  }
  
  // Additional validation...
}
```

## Monitoring & Debugging

### Logging Requirements
```javascript
// Structured logging for debugging
logger.info('Recurring appointment created', {
  appointmentId: id,
  pattern: rrule,
  occurrences: count,
  timezone: tz,
  userId: user.id,
  timestamp: new Date().toISOString()
});
```

### Metrics to Track
- Time accuracy (% at correct time)
- Creation success rate
- Expansion performance (p95 latency)
- Error rates by operation type

## Rollback Strategy

### Feature Flags
```javascript
// Enable gradual rollout
const FEATURES = {
  USE_NEW_RECURRING_SYSTEM: process.env.NEW_RECURRING_ENABLED === 'true',
  SERVER_SIDE_EXPANSION: process.env.SERVER_EXPANSION === 'true',
  ENHANCED_CONFLICT_DETECTION: process.env.CONFLICT_DETECTION === 'true'
};
```

### Data Migration Rollback
```sql
-- Rollback script
ALTER TABLE bookings DROP COLUMN parent_id;
ALTER TABLE bookings DROP COLUMN occurrence_date;
ALTER TABLE bookings DROP COLUMN modification_type;
DROP INDEX idx_bookings_parent_id;
DROP INDEX idx_bookings_occurrence_date;
```

## Conclusion

The current recurring appointments system has fundamental issues with time handling, data structure, and architecture. A complete rebuild following FullCalendar best practices and proper RRule implementation is necessary to achieve reliable functionality.

Key takeaways:
1. **Must use consistent RRule format** with proper DTSTART
2. **Need server-side expansion** for performance
3. **Require parent-child relationships** for modifications
4. **Explicit timezone handling** throughout the system
5. **Comprehensive testing** especially for time accuracy

---

*For business requirements and user stories, see RECURRING_APPOINTMENTS_REQUIREMENTS.md*
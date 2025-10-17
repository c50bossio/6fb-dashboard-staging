# Staff ID Architecture - Production Solution

## Current Problem
The staff management system has an ID mismatch between frontend and backend:

### Database Structure
```sql
-- users table (Supabase Auth)
users {
  id: uuid PRIMARY KEY,  -- User's unique ID
  email: string,
  full_name: string,     -- User's display name
  ...auth fields
}

-- barbershop_staff table (Business Logic)
barbershop_staff {
  id: uuid PRIMARY KEY,          -- Staff record ID
  user_id: uuid REFERENCES users, -- Links to users table
  barbershop_id: uuid,            -- Which barbershop
  role: string,                   -- BARBER, MANAGER, etc
  is_active: boolean,
  ...business fields
}
```

### The Confusion
- Frontend passes `staff.id` to API calls
- But what IS `staff.id`? The user_id or barbershop_staff.id?
- Different parts of the code assume different things

## Proper Solution: User ID as Primary Identifier

### Why User ID?
1. **One user, multiple shops** - A barber might work at multiple locations
2. **Consistent identity** - User profile stays the same across shops
3. **Simpler lookups** - Most operations need user data anyway
4. **Auth integration** - Supabase Auth uses user.id

### API Contract
```javascript
// Staff List Response
{
  id: user_id,           // PRIMARY identifier for API calls
  user_id: user_id,      // Explicit user ID
  staff_id: staff_record_id, // barbershop_staff.id for reference
  barbershop_id: shop_id,
  // ... user fields
  // ... staff fields
}

// API Endpoints
GET    /api/staff              // List all staff
GET    /api/staff/:userId      // Get staff by user ID
PATCH  /api/staff/:userId      // Update staff by user ID
DELETE /api/staff/:userId      // Remove staff by user ID
```

### Security Model
```javascript
// Every endpoint MUST:
1. Verify authentication (user logged in)
2. Get user's barbershop from their profile/staff record
3. Verify user owns/manages the barbershop
4. Check target staff belongs to same barbershop
5. Apply role-based permissions
```

## Implementation Plan

### Phase 1: Consistent ID Usage
- Staff list returns user_id as 'id'
- All API calls use user_id in URL
- barbershop_staff.id only used internally

### Phase 2: Authorization Layer
- Middleware for ownership verification
- Role-based access control (RBAC)
- Audit logging for all changes

### Phase 3: Performance Optimization
- Database indexes on user_id
- Query optimization
- Response caching where appropriate

## Database Indexes Needed
```sql
CREATE INDEX idx_barbershop_staff_user_id ON barbershop_staff(user_id);
CREATE INDEX idx_barbershop_staff_barbershop_id ON barbershop_staff(barbershop_id);
CREATE INDEX idx_users_email ON users(email);
```

## Error Handling Strategy
- Detailed logging at each step
- User-friendly error messages
- Rollback on partial failures
- Monitoring integration (Sentry)

## Dual-Table Staff Architecture

### Overview

The 6FB AI Agent System uses a **dual-table architecture** for managing staff and barber data. This pattern provides flexibility for both authenticated users and non-authenticated service providers.

### The Two Tables

#### 1. `profiles` Table (Authenticated Users)
- **Purpose**: Users with full Supabase Auth accounts
- **Foreign Key**: `profiles.id` → `auth.users.id`
- **Row Level Security**: Enabled (RLS policies enforce data access)
- **Use Cases**:
  - Production barbers with login accounts
  - Staff members who need dashboard access
  - Users who book their own appointments

**Schema**:
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT,
  barbershop_id UUID REFERENCES barbershops(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. `barbers` Table (All Service Providers)
- **Purpose**: All barbers including those without accounts
- **Foreign Key**: `barbers.barbershop_id` → `barbershops(id)`
- **No Auth Required**: Can exist independently of auth system
- **Use Cases**:
  - Demo data and testing
  - Seeded barbers for development
  - Future barbers (before account creation)
  - Barbers who only take appointments (no dashboard access)

**Schema**:
```sql
CREATE TABLE barbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  specialties TEXT[],
  experience_years INTEGER,
  commission_rate DECIMAL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### UNION Pattern Implementation

The Staff API (`/app/api/staff/route.js`) merges data from both tables using a UNION pattern:

#### Step 1: Query Both Tables
```javascript
// Fetch authenticated users
const { data: profiles } = await supabase
  .from('profiles')
  .select('*')
  .eq('barbershop_id', barbershopId)
  .eq('is_active', true)

// Fetch all barbers
const { data: barbers } = await supabase
  .from('barbers')
  .select('*')
  .eq('barbershop_id', barbershopId)
  .eq('is_active', true)
```

#### Step 2: Deduplication Logic
```javascript
// Profiles takes precedence for deduplication
const profileIds = new Set((profiles || []).map(p => p.id))
const uniqueBarbers = (barbers || []).filter(b => !profileIds.has(b.id))
```

**Why Profiles Take Precedence**:
- Authenticated users are the source of truth
- Profile data is more complete (linked to auth system)
- Prevents duplicate staff entries in calendar/dashboard

#### Step 3: Transform to Unified Format
```javascript
// Transform profiles to staff format
const staffFromProfiles = profiles.map(profile => ({
  id: profile.id,
  user_id: profile.id,
  barbershop_id: barbershopId,
  role: profile.role || 'BARBER',
  full_name: profile.full_name,
  email: profile.email,
  // ... additional fields
}))

// Transform barbers to staff format
const staffFromBarbers = uniqueBarbers.map(barber => ({
  id: barber.id,
  user_id: null, // No user account
  barbershop_id: barbershopId,
  role: 'BARBER',
  full_name: barber.name,
  email: barber.email,
  // ... additional fields
}))
```

#### Step 4: Merge and Return
```javascript
const allStaff = [...staffFromProfiles, ...staffFromBarbers]
return allStaff
```

### Benefits of This Architecture

1. **Flexibility**: Support both authenticated and non-authenticated barbers
2. **Testing**: Easy to seed demo data without auth account creation
3. **Data Integrity**: Profiles maintain strict foreign key constraints to auth system
4. **Backward Compatibility**: Existing code works with both data sources
5. **Gradual Migration**: Can migrate barbers to profiles over time
6. **Development Speed**: Quickly add test barbers without auth setup

### When to Use Each Table

#### Use `profiles` Table When:
- Creating production user accounts
- User needs dashboard access
- User needs authentication (login/logout)
- Full OAuth integration required
- Row Level Security policies needed

#### Use `barbers` Table When:
- Seeding demo/test data
- Creating barbers for development
- Barber doesn't need account (appointment-only)
- Rapid prototyping without auth setup
- Temporary/future staff members

### Migration Path

**Current State**: Dual-table system with UNION pattern

**Future State Options**:
1. **Keep Dual-Table**: Maintain flexibility for both use cases
2. **Migrate to Profiles Only**: Move all barbers to profiles with auth accounts
3. **Hybrid**: Use barbers for non-authenticated, profiles for authenticated

**Recommendation**: Keep dual-table architecture for maximum flexibility.

### Error Handling

The Staff API handles errors gracefully:

```javascript
// Profiles query error: Fatal (system cannot function)
if (profilesError) {
  console.error('❌ Error fetching profiles:', profilesError)
  throw new Error(`Database query failed: ${profilesError.message}`)
}

// Barbers query error: Non-fatal (system continues with profiles only)
if (barbersError) {
  console.warn('⚠️  Error fetching barbers (non-fatal):', barbersError)
  // Continue with profiles only
}
```

### Performance Considerations

- **Two Queries**: UNION pattern requires two separate database queries
- **Deduplication**: O(n) operation with Set-based lookup
- **Transform**: O(n) mapping operations for both sources
- **Total Complexity**: O(n) where n = total staff members

**Optimization**: Queries run in parallel with Promise.all pattern for minimal latency.

### Related Documentation

- **Calendar Permissions**: `/lib/calendar-permissions.js`
- **Staff API**: `/app/api/staff/route.js`
- **Schema Standards**: `/docs/SCHEMA_STANDARDS.md`
- **Project Instructions**: `CLAUDE.md`

---

**Last Updated**: 2025-10-11
**Related Issues**: Seeded barbers not appearing in calendar (resolved with UNION pattern)
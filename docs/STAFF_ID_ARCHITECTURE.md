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
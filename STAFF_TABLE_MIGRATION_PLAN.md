# Staff Table Consolidation & Calendar Fix

## 🚨 CRITICAL ISSUE: Calendar Appointments Not Rendering

### Root Cause Analysis

The calendar appointments are not rendering because of an **ID mismatch** between staff resources and appointment references:

```javascript
// Staff API (app/api/staff/route.js:473) queries staff table
.from('staff')
.select('*')
.eq('barbershop_id', barbershopId)

// Returns resources with: id: member.id (staff table primary key)

// Appointments API (app/api/appointments/route.js:58) references profiles
barber:profiles!appointments_barber_id_fkey(id, email, full_name)

// Appointments have: barber_id -> profiles.id (foreign key to profiles table)

// Calendar page (line 145) tries to map:
resourceId: appointment.barber_id // points to profiles.id
// But resources have: id: staff.id // different table!
```

**Result**: Appointments can't be matched to calendar resources because the IDs are from different tables.

---

## 📊 Current Architecture (Broken)

### Three Staff-Related Tables in Use:

1. **`staff` table** (Unified table)
   - Queried by: `/api/staff/route.js`
   - Contains: All staff with `barbershop_id`, `user_id`, `role`, etc.
   - Returns: `member.id` as resource ID

2. **`barbershop_staff` table** (Linking table)
   - **328 references** throughout codebase
   - Legacy junction table
   - Links: `barbershop_id` ↔ staff members

3. **`profiles` table** (Auth users)
   - Referenced by: Appointments via `appointments_barber_id_fkey`
   - Foreign key: `appointments.barber_id` → `profiles.id`
   - Contains: Authenticated user data

### The Problem:
```
Staff API returns:         appointments table has:
resourceId: "abc-123"      barber_id: "xyz-789"
(from staff.id)            (from profiles.id)

❌ IDs don't match → Appointments can't be mapped to calendar resources
```

---

## 🎯 Solution: Two-Phase Approach

### Phase 1: **IMMEDIATE FIX** (Deploy Today) ✅

**Goal**: Make calendar work immediately without changing database schema

**Changes**:
1. Modify `/app/api/staff/route.js` line 303 to return `user_id` instead of `id`:
   ```javascript
   // BEFORE:
   return {
     id: member.id,  // ❌ This is staff table ID
     title: member.full_name || member.display_name || 'Staff Member',
     ...
   }

   // AFTER:
   return {
     id: member.user_id || member.id,  // ✅ Use user_id (matches profiles.id)
     title: member.full_name || member.display_name || 'Staff Member',
     ...
   }
   ```

2. Verify appointments reference `profiles.id` correctly
3. Test calendar rendering

**Risk**: Low - Falls back to `member.id` if `user_id` is null

**Rollback**: Revert single line change

---

### Phase 2: **LONG-TERM SOLUTION** (Schema Consolidation)

**Goal**: Consolidate to single source of truth for staff data

#### Option A: **Use `staff` table as single source** (Recommended)

**Advantages**:
- Already has all staff data in one place
- No auth requirement (supports demo/seed data)
- Clean separation from authentication

**Implementation**:
1. Add foreign key: `staff.user_id` → `profiles.id` (nullable)
2. Update appointments table: `barber_id` → `staff.id` (migrate foreign key)
3. Remove `barbershop_staff` table (328 references to update)
4. Update all queries to use `staff` table exclusively

**Migration Steps**:
```sql
-- Step 1: Verify data integrity
SELECT COUNT(*) FROM staff WHERE barbershop_id IS NULL; -- Should be 0

-- Step 2: Update appointments foreign key
ALTER TABLE appointments
  DROP CONSTRAINT appointments_barber_id_fkey;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_barber_id_fkey
  FOREIGN KEY (barber_id) REFERENCES staff(id) ON DELETE RESTRICT;

-- Step 3: Migrate barbershop_staff references
-- (Requires code changes in 328 locations)

-- Step 4: Drop legacy table
DROP TABLE barbershop_staff CASCADE;
```

**Effort**: High (328 code references to update)
**Duration**: 2-3 weeks
**Risk**: Medium (requires careful testing)

---

#### Option B: **Use `profiles` table as single source**

**Advantages**:
- Appointments already reference it
- No foreign key changes needed

**Disadvantages**:
- Requires every staff member to have auth account
- Can't support demo/seed data without accounts
- Mixing auth concerns with staff management

**Implementation**:
1. Migrate all `staff` table data to `profiles`
2. Add staff-specific columns to `profiles` (role, commission_rate, etc.)
3. Update staff API to query `profiles` instead of `staff`
4. Remove `staff` and `barbershop_staff` tables

**Effort**: High
**Duration**: 2-3 weeks
**Risk**: High (breaks demo data, requires auth for all staff)

---

## 🔥 Recommended Action Plan

### Immediate (Today):
1. ✅ Deploy Phase 1 fix (change line 303 in staff API)
2. ✅ Test calendar with existing appointments
3. ✅ Verify appointments render correctly

### Short-term (Next Week):
1. Create migration script for Phase 2 Option A
2. Test on staging environment
3. Update 328 `barbershop_staff` references gradually

### Long-term (Next Month):
1. Complete schema consolidation
2. Remove legacy `barbershop_staff` table
3. Document new single-table architecture

---

## 📝 Testing Checklist

### Phase 1 Testing:
- [ ] Calendar shows barbers in resource columns
- [ ] Appointments appear on calendar
- [ ] Appointments are in correct barber column
- [ ] Clicking appointment shows correct details
- [ ] Creating new appointment works
- [ ] Drag-and-drop reschedule works

### Phase 2 Testing:
- [ ] All API endpoints return correct staff data
- [ ] Appointments foreign key works correctly
- [ ] No broken references after removing `barbershop_staff`
- [ ] Demo data still loads correctly
- [ ] Performance is acceptable (< 200ms for staff queries)

---

## 🚨 Critical Files to Update

### Immediate Fix (Phase 1):
1. `/app/api/staff/route.js` - Line 303 (resource ID mapping)

### Schema Consolidation (Phase 2):
1. **Database Schema**:
   - `/database/complete-schema.sql`
   - Migration scripts for appointments table

2. **Staff API** (1 file):
   - `/app/api/staff/route.js`

3. **Barbershop Staff References** (328 locations):
   - See audit document for full list

4. **Service Layer**:
   - `/lib/staff-service.js`
   - `/lib/unified-staff-service.js`
   - `/lib/calendar-permissions.js`

5. **Frontend Components**:
   - `/components/calendar/EnhancedProfessionalCalendar.js`
   - `/app/(protected)/dashboard/calendar/page.js`

---

## 💡 Key Insights

1. **The actual problem**: ID mismatch between staff resources and appointment references
2. **Why it happened**: Evolution from profiles → barbershop_staff → staff table without proper migration
3. **The fix**: Use `user_id` (matches profiles.id) instead of `id` (staff table primary key)
4. **Long-term solution**: Consolidate to single staff table and update all foreign keys

---

## 📊 Estimated Impact

### Phase 1 (Immediate Fix):
- **Time**: 10 minutes
- **Risk**: Very Low
- **Benefit**: Calendar works immediately
- **Files changed**: 1

### Phase 2 (Schema Consolidation):
- **Time**: 2-3 weeks
- **Risk**: Medium
- **Benefit**: Clean architecture, single source of truth
- **Files changed**: 330+

---

## 🎯 Success Criteria

### Phase 1:
✅ Calendar renders appointments in correct barber columns
✅ All appointment operations work (create, edit, reschedule, delete)
✅ No errors in console
✅ Performance is acceptable

### Phase 2:
✅ Single staff table as source of truth
✅ No legacy `barbershop_staff` references
✅ Appointments reference staff table correctly
✅ All tests pass
✅ Demo data works
✅ Production deployment successful

---

**Status**: Ready for Phase 1 implementation
**Next Step**: Apply immediate fix to `/app/api/staff/route.js`
**Expected Result**: Calendar appointments render correctly within minutes

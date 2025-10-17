# Appointment Capabilities Migration Guide

## Overview
This migration adds appointment-taking capabilities to the profiles table to support a single-table architecture for appointment booking, following industry best practices like Square Appointments.

## Database Changes Required

### New Columns to Add to `profiles` table:
1. `can_take_appointments` - BOOLEAN, DEFAULT false
2. `is_visible_for_booking` - BOOLEAN, DEFAULT true  
3. `service_provider_since` - TIMESTAMPTZ (nullable)

## Step-by-Step Migration Instructions

### Step 1: Add Columns via Supabase Dashboard

1. **Open Supabase Dashboard**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Navigate to your project: `dfhqjdoydihajmjxniee`

2. **Navigate to Table Editor**
   - Click on "Table Editor" in the left sidebar
   - Select the `profiles` table

3. **Add the Three New Columns**

   **Column 1: can_take_appointments**
   - Click "Add Column" or the "+" button
   - Name: `can_take_appointments`
   - Type: `bool` (boolean)
   - Default Value: `false`
   - Allow Nullable: `false`
   - Click "Save"

   **Column 2: is_visible_for_booking**
   - Click "Add Column" or the "+" button  
   - Name: `is_visible_for_booking`
   - Type: `bool` (boolean)
   - Default Value: `true`
   - Allow Nullable: `false`
   - Click "Save"

   **Column 3: service_provider_since**
   - Click "Add Column" or the "+" button
   - Name: `service_provider_since`
   - Type: `timestamptz` (timestamp with timezone)
   - Default Value: (leave empty)
   - Allow Nullable: `true`
   - Click "Save"

### Step 2: Execute Data Updates

After adding the columns, run the update script:

```bash
cd "/Users/bossio/6FB AI Agent System"
node execute-migration-direct.js
```

This will:
- Set `can_take_appointments = true` for BARBER role users
- Set `can_take_appointments = true` for ENTERPRISE_OWNER and SHOP_OWNER role users  
- Specifically update Chris Bossio's profile (id: bcea9cf9-e593-4dbf-a787-1ed74e04dbf5)
- Set `service_provider_since` timestamps for enabled users

### Step 3: Add Performance Indexes (Optional but Recommended)

Execute this SQL in the Supabase SQL Editor:

```sql
-- Index for appointment booking queries (find available service providers)
CREATE INDEX IF NOT EXISTS idx_profiles_appointment_booking 
ON public.profiles(can_take_appointments, is_visible_for_booking) 
WHERE can_take_appointments = true AND is_visible_for_booking = true;

-- Index for service provider queries
CREATE INDEX IF NOT EXISTS idx_profiles_service_providers 
ON public.profiles(can_take_appointments, service_provider_since) 
WHERE can_take_appointments = true;
```

## Expected Results

### Users with Appointment Capabilities:
- **BARBER** role users: `can_take_appointments = true`
- **ENTERPRISE_OWNER** role users: `can_take_appointments = true` 
- **SHOP_OWNER** role users: `can_take_appointments = true`
- **Chris Bossio** specifically: `can_take_appointments = true`, `is_visible_for_booking = true`

### Users without Appointment Capabilities:
- **CLIENT** role users: `can_take_appointments = false` (default)
- **MANAGER** role users: `can_take_appointments = false` (can be enabled later)
- **SUPER_ADMIN** role users: `can_take_appointments = false` (admin only)

## How to Use the New Columns

### In Your Booking UI:
```sql
-- Find all available service providers for booking dropdowns
SELECT id, full_name, role, avatar_url 
FROM profiles 
WHERE can_take_appointments = true 
  AND is_visible_for_booking = true 
  AND is_active = true;
```

### For Appointment Creation:
```sql
-- Validate that a user can take appointments before creating appointment
SELECT can_take_appointments 
FROM profiles 
WHERE id = $barber_id 
  AND can_take_appointments = true;
```

### For Administrative Controls:
```sql
-- Toggle appointment capability for a user (via admin UI)
UPDATE profiles 
SET can_take_appointments = $enable_appointments,
    service_provider_since = CASE 
      WHEN $enable_appointments AND service_provider_since IS NULL 
      THEN NOW() 
      ELSE service_provider_since 
    END
WHERE id = $user_id;
```

## Verification Queries

### Check Migration Results:
```sql
-- Count users by role and appointment capability
SELECT 
  role,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE can_take_appointments = true) as can_take_appointments
FROM profiles 
WHERE role IS NOT NULL
GROUP BY role
ORDER BY role;
```

### Check Chris Bossio Specifically:
```sql
SELECT 
  full_name,
  role,
  can_take_appointments,
  is_visible_for_booking,
  service_provider_since
FROM profiles 
WHERE id = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5';
```

## Rollback Instructions

If you need to rollback this migration:

```sql
-- Remove the new columns
ALTER TABLE public.profiles DROP COLUMN IF EXISTS can_take_appointments;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_visible_for_booking;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS service_provider_since;

-- Remove the indexes
DROP INDEX IF EXISTS idx_profiles_appointment_booking;
DROP INDEX IF EXISTS idx_profiles_service_providers;
```

## Integration with Existing Code

### Update Your Booking Components:
1. Replace hardcoded barber lists with queries using `can_take_appointments = true`
2. Add filters for `is_visible_for_booking = true` in booking dropdowns
3. Consider adding UI controls for admins to toggle appointment capabilities
4. Use `service_provider_since` for experience-based sorting or filtering

### Example React Hook:
```javascript
const { data: serviceProviders } = useQuery(['serviceProviders'], async () => {
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, role, avatar_url, service_provider_since')
    .eq('can_take_appointments', true)
    .eq('is_visible_for_booking', true)
    .eq('is_active', true)
    .order('service_provider_since', { ascending: false });
  
  return data;
});
```

## Support

If you encounter any issues during migration:
1. Check the Supabase dashboard logs for errors
2. Verify column types match the specifications exactly
3. Ensure your service role key has sufficient permissions
4. Run the verification queries to confirm data integrity

---

**Created:** September 2, 2025  
**Files:** 
- `/Users/bossio/6FB AI Agent System/database/add-appointment-capabilities-columns.sql`
- `/Users/bossio/6FB AI Agent System/execute-migration-direct.js`
- `/Users/bossio/6FB AI Agent System/APPOINTMENT_CAPABILITIES_MIGRATION_GUIDE.md`
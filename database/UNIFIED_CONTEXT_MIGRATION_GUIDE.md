# Unified Context Migration Guide

## Overview
This migration fixes the AI Command Center errors by creating the missing database tables required by the UnifiedContextProvider.

## Errors Fixed
1. ✅ **HTTP 500**: Organizations table queries failing
2. ✅ **HTTP 400**: user_context_preferences table not found
3. ✅ **HTTP 403**: CSRF token missing (already fixed in code)

## Migration Steps

### Step 1: Run Database Migration
1. Open your Supabase Dashboard
2. Navigate to: **SQL Editor** tab
3. Click **New Query**
4. Copy and paste the contents of `create-unified-context-tables.sql`
5. Click **Run** to execute the migration

### Step 2: Verify Migration Success
After running the migration, you should see output showing:
- ✅ Tables created: `user_context_preferences`, `organizations`
- ✅ RLS (Row Level Security) enabled on both tables
- ✅ Policies created for user data isolation
- ✅ Triggers created for automatic timestamp updates

### Step 3: Test AI Command Center
1. Refresh your browser (hard refresh: `Cmd+Shift+R` or `Ctrl+Shift+R`)
2. Navigate to AI Command Center
3. Open browser console (F12)
4. Send a message to the AI
5. Verify:
   - ✅ No 403 Forbidden errors
   - ✅ No 500 database errors for organizations
   - ✅ No 400 database errors for user_context_preferences
   - ✅ Messages send successfully

## What Changed in Code

### AI Command Center (page.js)
**Before**:
```javascript
const response = await fetch('/api/ai/orchestrator', {
  method: 'POST',
  // ... missing CSRF token
})
```

**After**:
```javascript
import { csrfFetch } from '../../../../lib/csrf-fetch'

const response = await csrfFetch('/api/ai/orchestrator', {
  method: 'POST',
  // ... CSRF token automatically included
})
```

### Database Tables Created
1. **user_context_preferences**
   - Stores user's last selected context (organization/location/resource)
   - Persists context across sessions
   - RLS policies ensure users only access their own data

2. **organizations** (verified/fixed)
   - Stores enterprise organization data
   - Links to owner via auth.users
   - Proper RLS policies for owner-only access

## Troubleshooting

### Still Seeing 500 Errors?
Check if the organizations table has proper RLS policies:
```sql
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'organizations';
```

### Still Seeing 400 Errors?
Verify user_context_preferences table exists:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name = 'user_context_preferences';
```

### Still Seeing 403 Forbidden?
1. Hard refresh browser (clear cache)
2. Check browser console for CSRF token
3. Verify middleware.js is not blocking the endpoint

## Architecture Notes

### CSRF Protection Flow
1. **GET Request**: Middleware generates CSRF token, includes in response header
2. **Token Storage**: csrfFetch utility caches token (valid for 50 minutes)
3. **POST Request**: csrfFetch automatically includes token in X-CSRF-Token header
4. **Validation**: Middleware validates token before processing request

### Context Management Flow
1. **User Login**: UnifiedContextProvider initializes
2. **Load Contexts**: Queries organizations, locations, resources based on user role
3. **Default Context**: Sets default based on role hierarchy (ENTERPRISE_OWNER → SHOP_OWNER → BARBER)
4. **Persistence**: Saves to user_context_preferences for next session
5. **Restoration**: Loads last context on app startup

## Benefits After Migration
- ✅ AI Command Center fully functional
- ✅ Clean console (no database errors)
- ✅ User context persists across sessions
- ✅ Enterprise organizations properly managed
- ✅ CSRF protection enabled for all API calls
- ✅ Improved security posture

## Questions?
If you encounter any issues after running the migration:
1. Check Supabase SQL Editor for error messages
2. Verify your database role has proper permissions
3. Check browser console for detailed error messages
4. Ensure you're using the latest version of the codebase

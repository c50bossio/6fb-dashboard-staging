# Staff Management Testing Guide

## Prerequisites

### 1. Run the Database Migration
Before testing, you MUST run the migration in Supabase:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the entire contents of: `/database/RUN_THIS_COMPLETE_NAME_MIGRATION.sql`
4. Click "Run" to execute the migration
5. You should see a success message with migration statistics

## Testing Steps

### Step 1: Verify Database Schema
Run this query in Supabase to confirm the migration worked:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('first_name', 'last_name', 'phone');
```

You should see all three columns listed.

### Step 2: Test Staff Management Save

1. **Navigate to Staff Management**
   - Go to: http://localhost:9999/shop/settings/staff
   - Click on any existing staff member to open the detail modal

2. **Test Personal Information Save**
   - Click "Edit" button
   - Modify the following fields:
     - First Name: Enter a new first name
     - Last Name: Enter a new last name  
     - Email: Update the email address
     - Phone: Add or update phone number
   - Click "Save"
   - ✅ **Expected**: Toast notification "Staff member updated successfully"

3. **Test Financial Arrangements Save**
   - While still in edit mode, change:
     - Financial Arrangement: Switch between Commission/Booth Rental/Hybrid
     - Commission Rate: Adjust the percentage
     - Any other financial fields
   - Click "Save"
   - ✅ **Expected**: Toast notification "Staff member updated successfully"

4. **Verify Data Persistence**
   - Close the modal
   - Reopen the same staff member
   - ✅ **Expected**: All changes (both personal and financial) should be preserved

### Step 3: Use the Debug Tool

1. **Open StaffSaveDebugger**
   - The yellow debug panel should appear on staff detail modals
   - Click "Test Save" button
   - Watch the debug log for the save process

2. **Expected Success Log**:
   ```
   [INFO] Starting staff save debug test
   [INFO] Validating staff data before save...
   [INFO] Testing API endpoint: /api/staff/[id]
   [INFO] API endpoint response: 200 OK
   [INFO] Attempting to save staff data...
   [INFO] Save response: 200 OK
   [INFO] Save successful!
   ```

### Step 4: Test New User Registration

1. **Register a New User** (in an incognito window)
   - Go to registration page
   - Fill in:
     - First Name: Test
     - Last Name: User
     - Email: testuser@example.com
     - Password: (secure password)
   - Complete registration

2. **Verify Profile Creation**
   Run this query in Supabase:
   ```sql
   SELECT first_name, last_name, full_name, email 
   FROM profiles 
   WHERE email = 'testuser@example.com';
   ```
   
   ✅ **Expected**: 
   - first_name: "Test"
   - last_name: "User"
   - full_name: "Test User"

### Step 5: Test Edge Cases

1. **Single Name Entry**
   - Edit a staff member
   - Enter only first name (leave last name blank)
   - Save
   - ✅ **Expected**: Should save successfully

2. **Long Names**
   - Enter a long first and last name
   - Save
   - ✅ **Expected**: Should handle gracefully

3. **Special Characters**
   - Test names with hyphens, apostrophes (O'Brien, Smith-Jones)
   - Save
   - ✅ **Expected**: Should save correctly

## Troubleshooting

### If saves are still failing with 500 errors:

1. **Check Migration Status**
   ```sql
   SELECT COUNT(*) as has_first_name 
   FROM information_schema.columns 
   WHERE table_name = 'profiles' 
   AND column_name = 'first_name';
   ```
   Should return 1 if migration ran successfully.

2. **Check Service Role Key**
   - Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
   - This is required for the API to bypass RLS

3. **Check Browser Console**
   - Open DevTools (F12)
   - Look for detailed error messages in Console tab
   - Network tab will show the actual API response

4. **Check Server Logs**
   - Look for logs starting with:
     - `🔍 [STAFF PROFILE UPDATE]` - Shows update attempts
     - `🚨 [STAFF PROFILE UPDATE]` - Shows errors
     - `✅ [STAFF PROFILE UPDATE]` - Shows success

## Success Criteria

✅ **All tests pass when:**
1. Personal information (names, email, phone) saves without errors
2. Financial arrangements save without errors
3. Data persists after closing and reopening modals
4. New users have first_name and last_name properly populated
5. No 500 errors in the API responses
6. Toast notifications show success messages

## Next Steps

After successful testing:
1. All staff management features are fully functional
2. First/last name fields work consistently across the app
3. The system is ready for production use

---

**Note**: The migration is designed to be safe and can be run multiple times without causing issues. If you encounter any problems, you can re-run the migration script.
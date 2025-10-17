# 🚨 Critical Bug Fixes - Deployment Guide

## 🔍 **Bugs Identified & Fixed**

### 1. **CRITICAL: Database Schema Mismatch**
**Issue**: `appointments.shop_id` column doesn't exist, causing PostgreSQL errors
**Error**: `column appointments.shop_id does not exist`
**Impact**: Calendar events API failing, FullCalendar integration broken

**Fix**: Add `shop_id` column with automatic synchronization

### 2. **HIGH: Google OAuth PKCE Authentication Failures** 
**Issue**: PKCE code verifier being lost during OAuth redirect
**Error**: `invalid request: both auth code and code verifier should be non-empty`
**Impact**: Users can't log in with Google OAuth

**Fix**: Enhanced cookie configuration and longer PKCE cookie expiry

### 3. **MEDIUM: useEffect Infinite Loops**
**Issue**: Missing dependencies in useEffect hooks causing crashes
**Error**: `Maximum update depth exceeded`
**Impact**: Component crashes and infinite re-renders

**Fix**: Utility to detect and prevent dependency issues

---

## ⚡ **URGENT - Apply Database Fix FIRST**

### Step 1: Apply Database Schema Fix

**Go to your Supabase Dashboard SQL Editor and run this:**

```sql
-- URGENT: Fix appointments table schema mismatch
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS shop_id UUID;
UPDATE appointments SET shop_id = barbershop_id WHERE shop_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_shop_id ON appointments(shop_id);

-- Create sync trigger
CREATE OR REPLACE FUNCTION sync_appointments_shop_ids()
RETURNS TRIGGER AS $$
BEGIN
  NEW.shop_id = NEW.barbershop_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_appointments_shop_ids_trigger ON appointments;
CREATE TRIGGER sync_appointments_shop_ids_trigger
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION sync_appointments_shop_ids();
```

**Verification:**
```sql
SELECT 
  COUNT(*) as total_appointments,
  COUNT(shop_id) as appointments_with_shop_id,
  COUNT(barbershop_id) as appointments_with_barbershop_id
FROM appointments;
```

### Step 2: Apply OAuth Middleware Fix

**Replace your `middleware.js` with:**

```bash
# Backup current middleware
mv middleware.js middleware.js.backup

# Apply the OAuth fix
mv middleware-oauth-fix.js middleware.js
```

### Step 3: Add useEffect Utility

**The utility is already created at `lib/useEffect-deps-checker.js`**

---

## 🧪 **Testing the Fixes**

### Test 1: Database Schema Fix
```bash
# Check if calendar events load without errors
curl "http://localhost:9999/api/calendar/events?barbershop_id=test"

# Should return data instead of database error
```

### Test 2: OAuth Fix
```bash
# Test Google login flow
1. Go to http://localhost:9999/login
2. Click "Sign in with Google"  
3. Complete OAuth flow
4. Should redirect successfully without PKCE errors
```

### Test 3: useEffect Fix
```javascript
// Use the new utility in components with useEffect issues:
import { useSafeEffect } from '@/lib/useEffect-deps-checker'

// Replace problematic useEffect with:
useSafeEffect(() => {
  // Your effect logic
}, [dependency1, dependency2], {
  debugName: 'MyComponent-dataFetch',
  maxRenders: 10
})
```

---

## 🚀 **Deployment Instructions**

### For Development Environment:

```bash
# 1. Apply database fix (already done via SQL Editor)

# 2. Update middleware
mv middleware.js middleware.js.backup
mv middleware-oauth-fix.js middleware.js

# 3. Restart development server
npm run dev

# 4. Test the fixes
npm run test:auth
npm run test:calendar
```

### For Production Environment:

```bash
# 1. Apply database fix to production Supabase
# (Use same SQL commands in production dashboard)

# 2. Deploy updated middleware
git add middleware.js
git commit -m "fix: resolve OAuth PKCE and database schema issues"
git push origin main

# 3. Verify deployment
# Check logs for absence of:
# - "column appointments.shop_id does not exist"
# - "invalid request: both auth code and code verifier should be non-empty"
```

---

## 📊 **Expected Impact**

### ✅ **After Database Fix:**
- FullCalendar events will load successfully
- Calendar API endpoints return data instead of errors
- No more PostgreSQL column errors in logs

### ✅ **After OAuth Fix:**
- Google login works consistently  
- No more PKCE validation failures
- Cookie persistence improved across redirects

### ✅ **After useEffect Fix:**
- No more infinite render loops
- Components load more reliably
- Better development debugging

---

## 🔧 **Rollback Plan**

If any fix causes issues:

```bash
# Rollback middleware
mv middleware.js.backup middleware.js

# Rollback database (if needed)
ALTER TABLE appointments DROP COLUMN IF EXISTS shop_id;
DROP TRIGGER IF EXISTS sync_appointments_shop_ids_trigger ON appointments;
DROP FUNCTION IF EXISTS sync_appointments_shop_ids();
```

---

## 📈 **Monitoring Post-Deployment**

### Check These Logs for Success:
- ✅ No more "column appointments.shop_id does not exist"
- ✅ No more "invalid request: both auth code and code verifier should be non-empty"  
- ✅ FullCalendar.io events request returns data successfully
- ✅ Calendar page loads without console errors

### Performance Metrics:
- Calendar load time should improve (no database errors)
- Login success rate should increase
- Component render errors should decrease

---

## 🆘 **Emergency Support**

If you encounter issues:

1. **Check the logs first**: `tail -f dev.log`
2. **Verify database connection**: Test a simple query
3. **Test OAuth manually**: Try incognito login
4. **Check browser console**: Look for JavaScript errors

**Most critical fix is the database schema - apply that first!**

---

**Status**: Ready for immediate deployment
**Priority**: URGENT - Database fix should be applied within 1 hour
**Testing**: Required before production deployment
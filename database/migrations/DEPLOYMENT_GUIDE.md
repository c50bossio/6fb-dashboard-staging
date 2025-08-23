# Database Schema Synchronization - Deployment Guide

## Overview
This guide implements a **best practice 3-phase migration** to fix authentication errors caused by schema drift between application code and database structure.

**Problem**: Application expects subscription columns (`subscription_tier`, `subscription_status`) in `profiles` table, but they don't exist.
**Solution**: Single table architecture using only `profiles` table (no dual-table complexity).

## ✅ Best Practices Followed
- **Incremental Changes**: Each phase can be tested and rolled back independently
- **Single Source of Truth**: Eliminates dual `profiles` + `users` table complexity  
- **Supabase Native**: Uses built-in `auth.users` + single `profiles` extension
- **Production Safe**: No risky synchronization triggers or large transactions
- **Zero Downtime**: Safe column additions with defaults

---

## Phase 1: Minimal Safe Schema Update (LOW RISK)

### Purpose
Add missing columns to existing `profiles` table with safe defaults.

### Steps
1. **Apply Migration:**
   ```sql
   -- Execute in Supabase SQL Editor:
   \i database/migrations/phase1_minimal_schema.sql
   ```

2. **Verify Success:**
   ```sql
   -- Check new columns exist:
   SELECT column_name, data_type, column_default 
   FROM information_schema.columns 
   WHERE table_name = 'profiles' 
   AND column_name IN ('subscription_tier', 'subscription_status', 'onboarding_status');
   ```

3. **Expected Result:**
   - ✅ New columns added with defaults
   - ✅ Existing data preserved
   - ✅ No authentication errors

### Rollback (if needed)
```sql
-- Remove added columns:
ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_tier;
ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_status;
ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_completed;
ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_step;
ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_status;
ALTER TABLE profiles DROP COLUMN IF EXISTS barbershop_id;
```

---

## Phase 2: Application Code Update (MEDIUM RISK)

### Purpose
Update authentication provider to use only `profiles` table (eliminate dual-table queries).

### Changes Made
- ✅ Updated `components/SupabaseAuthProvider.js`
- ✅ Removed queries to separate `users` table
- ✅ Simplified authentication logic
- ✅ Added proper field defaults

### Testing Steps
1. **Restart Development Server:**
   ```bash
   npm run dev
   ```

2. **Test Authentication Flow:**
   - Open browser console and navigate to application
   - Look for authentication debug logs
   - Verify no more 406/400 errors
   - Test login/logout functionality

3. **Expected Console Output:**
   ```
   🔍 [AUTH DEBUG] Profile fetched successfully: {
     email: "user@example.com",
     role: "CLIENT", 
     subscriptionTier: "individual",
     subscriptionStatus: "active"
   }
   ```

### Rollback (if needed)
```bash
git checkout HEAD~1 -- components/SupabaseAuthProvider.js
```

---

## Phase 3: Schema Optimization (LOW RISK)

### Purpose
Add performance indexes, security policies, and data validation.

### Steps
1. **Apply Optimization:**
   ```sql
   \i database/migrations/phase3_optimization.sql
   ```

2. **Verify Performance:**
   ```sql
   -- Check indexes were created:
   SELECT indexname, tablename 
   FROM pg_indexes 
   WHERE tablename = 'profiles';
   ```

### Rollback (if needed)
See detailed rollback commands in `phase3_optimization.sql` file.

---

## Verification Checklist

### ✅ Database Schema
- [ ] `profiles` table has all required columns
- [ ] Column constraints are properly set
- [ ] Indexes exist for performance
- [ ] RLS policies are active

### ✅ Application Functionality  
- [ ] Login works without console errors
- [ ] Profile creation succeeds for new users
- [ ] Subscription tier logic functions
- [ ] Onboarding system operates correctly

### ✅ Performance
- [ ] Authentication is fast (< 500ms)
- [ ] No duplicate queries in console
- [ ] Database query plans are efficient

---

## Common Issues & Solutions

### Issue: "Could not find 'subscription_tier' column"
**Cause**: Phase 1 migration not applied
**Solution**: Run Phase 1 migration first

### Issue: "PGRST204" errors persist
**Cause**: Old browser cache or session
**Solution**: Clear browser cache, restart dev server

### Issue: Users can't access features
**Cause**: Role/subscription values not set correctly
**Solution**: Check profile data defaults in Phase 3

### Issue: Slow authentication
**Cause**: Missing indexes
**Solution**: Ensure Phase 3 optimization completed

---

## Architecture After Migration

```
✅ FINAL ARCHITECTURE:
auth.users (Supabase built-in)
     ↓ (1:1 reference)  
profiles (extended with business data)
  - subscription_tier
  - subscription_status  
  - onboarding_status
  - barbershop_id
  - role
  - ... other business fields

❌ ELIMINATED:
- Separate 'users' table
- Synchronization triggers
- Dual-table queries
- Data duplication
```

---

## Success Criteria

### ✅ Technical Success
- Authentication works without 406/400 errors
- Single table queries only (no dual-table complexity)
- Performance meets expectations (< 500ms auth)
- All rollback procedures tested and documented

### ✅ Business Success  
- Users can login and register successfully
- Subscription tiers function correctly
- Onboarding experience works as expected
- No data loss during migration

---

## Monitoring & Maintenance

### Health Checks
```sql
-- Weekly health check query:
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as active_users,
  COUNT(CASE WHEN onboarding_completed = false THEN 1 END) as pending_onboarding
FROM profiles;
```

### Performance Monitoring
```sql
-- Check query performance:
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats 
WHERE tablename = 'profiles'
ORDER BY n_distinct DESC;
```

This migration follows Supabase and PostgreSQL best practices for production systems.
# 🧪 Onboarding Persistence Test Guide

## Quick Manual Test (5 minutes)

Follow these steps to verify onboarding persistence is working correctly:

### Test 1: Progress Saves Automatically ✅

1. **Start Onboarding**
   - Go to http://localhost:9999/onboarding
   - Enter business name "Test Shop"
   - Click "Next"

2. **Check Database**
   ```bash
   # Run this in another terminal
   node -e "
   const { createClient } = require('@supabase/supabase-js');
   const supabase = createClient(
     'https://dfhqjdoydihajmjxniee.supabase.co',
     'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'
   );
   supabase.from('onboarding_progress')
     .select('*')
     .eq('user_id', 'YOUR_USER_ID')
     .then(({data}) => console.log('Saved steps:', data));
   "
   ```

3. **Expected**: You should see your business step saved in the database

### Test 2: Resume Where You Left Off 🔄

1. **Stop Mid-Onboarding**
   - Complete 2-3 steps
   - Close the browser completely
   
2. **Reopen and Check**
   - Open http://localhost:9999/onboarding again
   - You should be on the step where you left off
   - Your previous data should be pre-filled

3. **Verify in Console**
   - Open browser DevTools (F12)
   - Look for: "Resuming onboarding at step: [step_name]"

### Test 3: Completion Creates Everything 🏪

1. **Complete All Steps**
   - Fill in all onboarding steps
   - Click "Complete Setup" on the last step

2. **Verify Creation**
   ```bash
   # Check if barbershop was created
   node -e "
   const { createClient } = require('@supabase/supabase-js');
   const supabase = createClient(
     'https://dfhqjdoydihajmjxniee.supabase.co',
     'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'
   );
   
   // Check barbershop
   supabase.from('barbershops')
     .select('*')
     .eq('owner_id', 'YOUR_USER_ID')
     .single()
     .then(({data}) => console.log('Barbershop created:', data?.name));
   
   // Check profile update
   supabase.from('profiles')
     .select('shop_id, onboarding_completed')
     .eq('id', 'YOUR_USER_ID')
     .single()
     .then(({data}) => console.log('Profile updated:', data));
   "
   ```

3. **Expected Results**:
   - ✅ Barbershop record exists
   - ✅ Profile has shop_id set
   - ✅ Profile has onboarding_completed = true
   - ✅ Dashboard loads without "No barbershop" message

## Automated Test Scripts

### Run Full Test Suite
```bash
# Complete test suite with all checks
node test-onboarding-persistence.js
```

### Monitor System Health
```bash
# Check onboarding system health
node monitor-onboarding-health.js
```

## What Each Test Verifies

| Test | What It Checks | Why It's Important |
|------|---------------|-------------------|
| **Progress Saving** | Each step saves to `onboarding_progress` table | Prevents data loss if user leaves |
| **Resume Functionality** | Can close browser and continue later | Better UX, reduces abandonment |
| **Barbershop Creation** | Completion creates all required records | Core business logic works |
| **Profile Updates** | Profile gets shop_id and completion flag | User can access dashboard |

## Common Issues & Solutions

### Issue: "No barbershop associated"
**Solution**: Run this fix:
```javascript
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://dfhqjdoydihajmjxniee.supabase.co',
  'YOUR_SERVICE_KEY'
);

async function fix() {
  // Get user
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'YOUR_EMAIL')
    .single();
  
  // Check for existing barbershop
  const { data: shop } = await supabase
    .from('barbershops')
    .select('*')
    .eq('owner_id', profile.id)
    .single();
  
  if (shop && !profile.shop_id) {
    // Link existing barbershop
    await supabase
      .from('profiles')
      .update({ 
        shop_id: shop.id,
        barbershop_id: shop.id,
        onboarding_completed: true
      })
      .eq('id', profile.id);
    console.log('Fixed: Linked barbershop to profile');
  } else if (!shop) {
    // Create barbershop
    const { data: newShop } = await supabase
      .from('barbershops')
      .insert({
        name: profile.shop_name || 'My Barbershop',
        owner_id: profile.id,
        email: profile.email,
        phone: '555-0000',
        address: '123 Main St'
      })
      .select()
      .single();
    
    // Update profile
    await supabase
      .from('profiles')
      .update({ 
        shop_id: newShop.id,
        barbershop_id: newShop.id,
        onboarding_completed: true
      })
      .eq('id', profile.id);
    console.log('Fixed: Created barbershop and linked to profile');
  }
}
fix();
"
```

### Issue: Progress not saving
**Check**: 
1. Network tab in DevTools - look for `/api/onboarding/save-progress` calls
2. Should see 200 OK responses
3. Check console for any errors

### Issue: Can't resume where left off
**Check**:
1. Verify `onboarding_progress` table has your data
2. Check browser localStorage for `onboarding_step`
3. Ensure cookies are enabled (for auth)

## Best Practices for Testing

1. **Always Test with Real User**
   - Create a test account
   - Go through full flow as real user would
   - Don't skip steps

2. **Check Database After Each Step**
   - Verify `onboarding_progress` updates
   - Check `profiles` table for updates
   - Confirm `barbershops` creation

3. **Test Edge Cases**
   - Close browser mid-flow
   - Use back button
   - Refresh page during onboarding
   - Login from different device

4. **Monitor in Production**
   - Run health check daily: `node monitor-onboarding-health.js`
   - Check for abandoned onboardings
   - Verify data integrity

## API Endpoints to Test

| Endpoint | Purpose | Expected Response |
|----------|---------|------------------|
| `GET /api/onboarding/save-progress` | Get saved progress | User's completed steps |
| `POST /api/onboarding/save-progress` | Save current step | Success with step data |
| `POST /api/onboarding/complete` | Complete onboarding | Barbershop ID, success message |
| `GET /api/profile` | Get user profile | Profile with shop_id if complete |

## SQL Queries for Verification

```sql
-- Check user's onboarding progress
SELECT * FROM onboarding_progress 
WHERE user_id = 'USER_ID'
ORDER BY completed_at;

-- Check if barbershop was created
SELECT * FROM barbershops 
WHERE owner_id = 'USER_ID';

-- Check profile status
SELECT id, email, shop_id, barbershop_id, onboarding_completed 
FROM profiles 
WHERE id = 'USER_ID';

-- Find abandoned onboardings
SELECT p.email, p.created_at, 
       COUNT(op.id) as steps_completed
FROM profiles p
LEFT JOIN onboarding_progress op ON p.id = op.user_id
WHERE p.onboarding_completed = false
  AND p.created_at < NOW() - INTERVAL '1 day'
GROUP BY p.id, p.email, p.created_at;
```

## Success Criteria ✅

Your onboarding system is working correctly if:

- [ ] Each step saves automatically to database
- [ ] Users can close browser and resume exactly where they left off
- [ ] Completing onboarding creates barbershop record
- [ ] Profile gets updated with shop_id and completion flag
- [ ] Dashboard loads without "No barbershop" error
- [ ] Services and staff are saved if provided
- [ ] No console errors during onboarding flow

## When to Run These Tests

- **Before Each Deploy**: Run automated test suite
- **After Database Changes**: Verify all tables still work
- **Weekly in Production**: Run health monitor
- **After Bug Reports**: Manual test the reported flow

---

**Remember**: The onboarding system should "just work" - users shouldn't have to think about saving or losing progress. If they close the browser and come back a week later, they should pick up exactly where they left off with all their data intact.
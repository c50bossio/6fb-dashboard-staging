# shop_id → barbershop_id Quick Fix Guide

**TL;DR**: NEVER use `shop_id`. ALWAYS use `barbershop_id`.

---

## Why This Matters

**CRITICAL BUG**: Code using `shop_id` returns ZERO results because:
- customers table: 52 rows in `barbershop_id`, **0 rows in `shop_id`**
- services table: 17 rows in `barbershop_id`, **3 rows in `shop_id`**

**Real Impact**: Calendar shows no appointments, customer list empty, dashboard broken.

---

## Quick Fix Patterns

### Pattern 1: Database Queries

```javascript
// ❌ WRONG - Returns empty results
const { data } = await supabase
  .from('customers')
  .select('*')
  .eq('shop_id', shopId)  // ← BUG: shop_id column is empty

// ✅ CORRECT - Returns real data
const { data } = await supabase
  .from('customers')
  .select('*')
  .eq('barbershop_id', barbershopId)  // ← CORRECT
```

### Pattern 2: Profile Access

```javascript
// ❌ WRONG - shop_id is NULL in most profiles
const shopId = profile?.shop_id

// ⚠️ RISKY - Inconsistent fallback
const shopId = profile?.shop_id || profile?.barbershop_id

// ✅ CORRECT - barbershop_id always has data
const shopId = profile?.barbershop_id
```

### Pattern 3: Select Statements

```javascript
// ❌ WRONG - Selecting deprecated field
.select('id, shop_id, role')

// ✅ CORRECT - Only select barbershop_id
.select('id, barbershop_id, role')
```

### Pattern 4: Component Props

```javascript
// ❌ WRONG - Wrong prop name
<Calendar shopId={profile?.shop_id} />

// ✅ CORRECT - Use barbershopId
<Calendar barbershopId={profile?.barbershop_id} />
```

### Pattern 5: API Parameters

```javascript
// ❌ WRONG - Accepting shop_id parameter
const shop_id = searchParams.get('shop_id')

// ✅ CORRECT - Use barbershop_id
const barbershopId = searchParams.get('barbershop_id')
```

---

## Search & Replace Guide

### Safe Automated Replacements

```bash
# 1. Database query filters
Find:    \.eq\('shop_id',
Replace: .eq('barbershop_id',

# 2. Profile field access (simple cases)
Find:    profile\?\.shop_id(?!\s*\|\|)
Replace: profile?.barbershop_id

# 3. Variable names in function params
Find:    \bshop_id\b(?!\.)
Replace: barbershop_id
```

### Manual Review Required

```bash
# Fallback patterns - Review order carefully
Find: profile\?\.shop_id\s*\|\|\s*profile\?\.barbershop_id

# Shop selector logic - Complex state management
Files: components/navigation/ShopSelector.js

# Tenant resolution - Multi-tenant context
Files: lib/tenant-resolver.js, contexts/TenantContext.js

# Financial systems - High risk if broken
Files: app/api/stripe/**/*.js
```

---

## Common Mistakes

### Mistake 1: Wrong Column Name
```javascript
// ❌ WRONG
.eq('shop_id', id)

// ✅ CORRECT
.eq('barbershop_id', id)
```

### Mistake 2: Wrong Profile Field
```javascript
// ❌ WRONG
const id = profile?.shop_id

// ✅ CORRECT
const id = profile?.barbershop_id
```

### Mistake 3: Backwards Fallback
```javascript
// ❌ WRONG - shop_id is checked first (usually NULL)
const id = profile?.shop_id || profile?.barbershop_id

// ✅ BETTER - barbershop_id first (temporary during migration)
const id = profile?.barbershop_id || profile?.shop_id

// ✅ BEST - Remove fallback completely after migration
const id = profile?.barbershop_id
```

### Mistake 4: Selecting Both Fields
```javascript
// ❌ WRONG - shop_id returns NULL
.select('shop_id, barbershop_id, role')

// ✅ CORRECT - Only barbershop_id
.select('barbershop_id, role')
```

### Mistake 5: Wrong Request Body
```javascript
// ❌ WRONG
const { shop_id } = await request.json()

// ✅ CORRECT
const { barbershop_id } = await request.json()
```

---

## Testing Your Fix

### 1. Unit Test
```javascript
test('should query barbershop_id not shop_id', async () => {
  const result = await getCustomers(barbershopId)

  // Should return real data, not empty array
  expect(result).toHaveLength(52)  // Not 0!
})
```

### 2. Integration Test
```javascript
test('calendar shows appointments', async () => {
  const response = await fetch(`/api/calendar/appointments?barbershop_id=${id}`)
  const data = await response.json()

  // Should return appointments, not empty
  expect(data.appointments).not.toHaveLength(0)
})
```

### 3. Manual Verification
```bash
# Check database directly
psql -c "SELECT COUNT(*) FROM customers WHERE shop_id IS NOT NULL;"
# Should be 0 (or very few legacy rows)

psql -c "SELECT COUNT(*) FROM customers WHERE barbershop_id IS NOT NULL;"
# Should be 52 (or your actual customer count)
```

### 4. E2E Test
1. Navigate to `/dashboard/calendar`
2. Should see appointments (not blank calendar)
3. Navigate to `/dashboard/customers`
4. Should see customer list (not "No customers")
5. Navigate to `/dashboard`
6. Should see real metrics (not all zeros)

---

## Before Committing

Run this checklist:

- [ ] **Search for shop_id in your changes**
  ```bash
  git diff | grep -i "shop_id"
  ```
  Should only show removals (red lines), not additions (green lines)

- [ ] **Verify query correctness**
  - All `.eq('...')` use `barbershop_id` not `shop_id`
  - All `.select('...')` exclude `shop_id` field

- [ ] **Check profile access**
  - Use `profile?.barbershop_id` not `profile?.shop_id`
  - Remove fallback logic if possible

- [ ] **Test locally**
  - Calendar shows appointments
  - Customer list shows data
  - Dashboard shows metrics

- [ ] **Run tests**
  ```bash
  npm test
  npm run test:integration
  ```

---

## File-Specific Guidance

### Most Critical Files (Fix First)

1. **`/app/api/customers/route.js`**
   - Lines 26, 52, 112: Change `shop_id` → `barbershop_id`
   - Impact: Customer list empty → shows all 52 customers

2. **`/app/api/calendar/appointments/route.js`**
   - Lines 52, 270, 317, 363, 421: Change `shop_id` → `barbershop_id`
   - Impact: Calendar empty → shows appointments

3. **`/lib/dashboard-data.js`**
   - Lines 44, 50, 56: Change `shop_id` → `barbershop_id`
   - Impact: Dashboard zeros → real metrics

4. **`/components/dashboard/UnifiedDashboard.js`**
   - Lines 118, 272, 445: Use `barbershop_id` only
   - Impact: Dashboard loads correct shop data

5. **`/components/navigation/ShopSelector.js`**
   - Lines 44, 45, 51, 83, 92: Change to `barbershop_id`
   - Impact: Shop switching works reliably

### High Risk Files (Test Thoroughly)

6. **`/app/api/stripe/collect-booth-rent/route.js`**
   - Lines 68, 295, 332: Change to `barbershop_id`
   - Risk: Payment processing may fail
   - Test: Process a booth rent payment

7. **`/app/api/stripe/compensation/transfer/route.js`**
   - Lines 66, 85, 121, 136: Change to `barbershop_id`
   - Risk: Commission transfers may fail
   - Test: Calculate and transfer commission

8. **`/lib/tenant-resolver.js`**
   - Line 74: Use `barbershop_id`
   - Risk: Multi-tenant resolution broken
   - Test: Switch between shops

### Complex Files (Manual Review)

9. **`/components/FloatingAIChat.js`**
   - 13 instances of shop_id to fix
   - Risk: AI chat has no context
   - Review: Lines 155-497 carefully

10. **`/contexts/TenantContext.js`**
    - Global state management
    - Review entire file for shop_id references
    - Test: All tenant-aware features

---

## When You're Stuck

### Problem: Not sure if this is shop_id or barbershop_id?

**Solution**: Check the table schema
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'your_table' AND column_name LIKE '%shop%';
```

If both exist, **ALWAYS use barbershop_id**.

### Problem: Code works with shop_id?

**Answer**: It might work for some profiles but fail for others. The goal is 100% reliability.
- Some profiles have shop_id set (old data)
- Most profiles have shop_id = NULL (broken)
- ALL profiles should use barbershop_id

### Problem: Query returns data with shop_id?

**Answer**: You're either:
1. Testing with old profile that has shop_id set
2. Query is actually using barbershop_id (check twice)
3. Fallback logic is silently using barbershop_id

**Verify with**:
```sql
-- Check your test profile
SELECT id, shop_id, barbershop_id FROM profiles WHERE id = 'your-id';

-- If shop_id is NULL, query with shop_id will fail
```

### Problem: Breaking change in production?

**Rollback procedure**:
1. Revert code changes: `git revert <commit>`
2. Deploy immediately
3. Investigate issue
4. Fix and redeploy

**Prevention**: Test on staging 24h before production

---

## FAQ

### Q: Why not just populate shop_id with barbershop_id data?

**A**: We're removing shop_id entirely. It's deprecated and causes confusion. Single source of truth is better.

### Q: What if I need to query by old shop_id?

**A**: You don't. If you have a shop_id value, it's either:
- NULL (use barbershop_id from profile)
- Wrong/stale (still use barbershop_id)
- Same as barbershop_id (just use barbershop_id)

### Q: Will this break existing bookings/customers?

**A**: No. The data is already in barbershop_id. We're just fixing the queries to use the correct column.

### Q: What about foreign keys?

**A**: Foreign keys already reference barbershops(id), which is linked via barbershop_id, not shop_id.

### Q: How do I update API documentation?

**A**: Change all `shop_id` parameters to `barbershop_id` in API docs. Update example requests.

---

## Linting Rule (After Migration)

Add to `.eslintrc.js` to prevent future shop_id usage:

```javascript
module.exports = {
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: "MemberExpression[property.name='shop_id']",
        message: 'Use barbershop_id instead of deprecated shop_id field'
      },
      {
        selector: "Literal[value='shop_id']",
        message: 'Use barbershop_id instead of deprecated shop_id field'
      }
    ]
  }
}
```

---

## Need Help?

**Quick Reference Documents**:
- **PHASE_3_SUMMARY.md** - Executive summary
- **PHASE_3_SHOP_ID_CONSISTENCY_ANALYSIS.md** - Complete analysis (26 pages)
- **PHASE_3_FIX_CHECKLIST.md** - Step-by-step implementation plan
- **docs/SCHEMA_STANDARDS.md** - Schema standards and patterns

**Still Stuck?**:
1. Check the analysis report for your specific file
2. Review the fix checklist for exact line numbers
3. Look at similar fixes in git history
4. Ask for code review before committing

---

## Success Indicators

You've fixed it correctly when:

✅ Calendar shows appointments (not blank)
✅ Customer list shows all 52 customers (not 0)
✅ Dashboard shows real metrics (not zeros)
✅ Service list shows all 17 services (not 3)
✅ No console errors about missing data
✅ Tests pass
✅ No `shop_id` in your git diff (only removals)

---

**Remember**: When in doubt, use `barbershop_id`. Never use `shop_id`.

**Updated**: October 10, 2025
**Status**: Active Migration - Week 1 Critical Fixes in Progress

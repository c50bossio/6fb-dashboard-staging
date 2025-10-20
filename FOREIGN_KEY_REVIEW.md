# Database Foreign Key Relationship Review

## Issue Identified
The Supabase error message revealed: **"Could not embed because more than one relationship was found for 'profiles' and 'barbershops'"**

This indicates multiple foreign key relationships exist between the `profiles` and `barbershops` tables.

## Common Foreign Key Patterns

### Profiles → Barbershops Relationships
Based on the application's multi-tenant barbershop architecture, there are likely these foreign keys:

1. **`profiles.barbershop_id`** → `barbershops.id`
   - **Purpose**: Primary shop assignment for barbers and staff
   - **Used by**: All barbers, shop owners, staff members
   - **This is the one we want for booking pages** ✅

2. **`profiles.owned_barbershop_id`** → `barbershops.id` (Possible)
   - **Purpose**: Shops owned by this user (for shop owners/enterprise owners)
   - **Used by**: SHOP_OWNER, ENTERPRISE_OWNER roles

3. **Other potential relationships**:
   - `barbershops.owner_id` → `profiles.id` (reverse relationship)
   - Junction tables for many-to-many relationships

## Solution Implemented

We fixed the API query by explicitly specifying which foreign key to use:

```typescript
barbershops!barbershop_id (...)
```

This syntax tells Supabase: "Use the `barbershop_id` foreign key column to join to the barbershops table."

## Recommendation

**No database changes needed.** The multiple foreign keys are intentional for the business logic:
- Barbers need to be assigned to shops (`barbershop_id`)
- Owners need to track which shops they own (`owned_barbershop_id` or reverse FK)

The fix is to **always use explicit foreign key hints** when embedding related tables in Supabase queries.

## Best Practice Going Forward

When writing Supabase queries that join `profiles` to `barbershops`, always use:

```typescript
// ✅ Correct - Explicit FK
.select(`
  *,
  barbershops!barbershop_id (...)
`)

// ❌ Wrong - Ambiguous
.select(`
  *,
  barbershops (...)
`)
```

## Files to Review for Similar Issues

Search the codebase for similar joins that might need the same fix:

```bash
grep -r "barbershops (" app/api/
grep -r "profiles (" app/api/
```

Any query that embeds `barbershops` from `profiles` should use the explicit `!barbershop_id` syntax.

---

**Status**: ✅ No database schema changes required. Code fix applied and working.
**Date**: October 20, 2025

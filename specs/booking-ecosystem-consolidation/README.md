# Booking Ecosystem Consolidation - Migration Guide

## 📋 Overview

This migration consolidates duplicate booking and staff tables into single sources of truth:
- **`bookings` → `appointments`** (canonical booking table)
- **`barbers` → `barbershop_staff`** (canonical staff table)
- Standardize terminology (customers, barbershop_id)

## ⚠️ CRITICAL: Pre-Migration Checklist

Before running the migration, ensure:

- [ ] **Backup database** - Export from Supabase dashboard
- [ ] **Test environment** - Run migration on a test database first
- [ ] **Downtime window** - Schedule during low-traffic period
- [ ] **Rollback plan** - Have rollback script ready
- [ ] **Team notification** - Alert team members
- [ ] **Monitor ready** - Have Sentry and logs accessible

## 🚀 Migration Steps

### Step 1: Pre-Migration Backup

```bash
# Export database from Supabase dashboard
# Dashboard → Settings → Database → Backups → Export
```

Or use Supabase CLI:

```bash
supabase db dump -f backup-$(date +%Y%m%d).sql
```

### Step 2: Review Current State

Run these queries to understand your current data:

```sql
-- Count current records
SELECT 'appointments' as table_name, COUNT(*) as count FROM appointments
UNION ALL
SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL
SELECT 'barbers', COUNT(*) FROM barbers
UNION ALL
SELECT 'barbershop_staff', COUNT(*) FROM barbershop_staff;
```

### Step 3: Run Migration

**Option A: Supabase SQL Editor** (Recommended)

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `consolidate-booking-ecosystem.sql`
3. Review the SQL carefully
4. Click "Run" to execute

**Option B: psql Command Line**

```bash
psql $SUPABASE_DATABASE_URL -f specs/booking-ecosystem-consolidation/consolidate-booking-ecosystem.sql
```

**Option C: Supabase MCP Tool** (via Claude Code)

```javascript
await mcp__supabase__apply_migration({
  name: "consolidate_booking_ecosystem",
  query: fs.readFileSync('specs/booking-ecosystem-consolidation/consolidate-booking-ecosystem.sql', 'utf8')
})
```

### Step 4: Validate Migration

Run the validation script:

```bash
psql $SUPABASE_DATABASE_URL -f specs/booking-ecosystem-consolidation/validate-migration.sql
```

Or use Supabase SQL Editor with `validate-migration.sql`.

**Expected Output:**
- All validation checks show "✓ PASS"
- Record counts match expectations
- No orphaned foreign keys
- Backward-compatible views exist

### Step 5: Test Application

Test these critical flows:

1. **View appointments** - `/app/(protected)/bookings/page.js`
2. **Create appointment** - Booking wizard flow
3. **Calendar view** - `/app/(protected)/dashboard/calendar`
4. **Staff management** - Barber/staff pages
5. **Customer management** - Customer pages

### Step 6: Monitor

Monitor for 24-48 hours:
- Sentry for errors
- Supabase logs for query failures
- User feedback
- API response times

### Step 7: Code Updates (After Migration Success)

Once migration is validated, update application code:

1. **Update API endpoints** (Phase 2)
2. **Refactor components** (Phase 3)
3. **Update calendar** (Phase 4)
4. **Remove legacy references** (Phase 5)

See main `SPEC.md` for detailed code changes.

## 🔄 Rollback Procedure

If migration fails or issues arise:

### Immediate Rollback

```bash
psql $SUPABASE_DATABASE_URL -f specs/booking-ecosystem-consolidation/rollback-consolidation.sql
```

Or via Supabase SQL Editor.

### Full Database Restore

If rollback script doesn't work:

```bash
# Restore from backup
psql $SUPABASE_DATABASE_URL < backup-YYYYMMDD.sql
```

Or use Supabase Dashboard → Settings → Database → Backups → Restore

## 📊 What the Migration Does

### 1. Migrate Bookings → Appointments

- Copies all `bookings` records to `appointments`
- Creates customers for bookings without customer records
- Maps barber names/IDs to proper UUIDs
- Maps service names/IDs to proper UUIDs
- Preserves all timestamps and metadata

### 2. Migrate Barbers → Barbershop Staff

- Creates profile records for each barber
- Links profiles to barbershop_staff with proper UUIDs
- Migrates specialties to permissions JSON
- Preserves active status and metadata

### 3. Standardize Services

- Removes `shop_id` column
- Uses `barbershop_id` exclusively
- Migrates any `shop_id` data to `barbershop_id`

### 4. Create Backward-Compatible Views

Creates views for transition period:
- `bookings_legacy` - Mimics old bookings table structure
- `barbers_legacy` - Mimics old barbers table structure

### 5. Update Security

- Updates RLS policies to use customer_id
- Ensures proper multi-tenant data isolation
- Validates permissions for appointments access

### 6. Create Indexes

Ensures optimal query performance:
- Appointments: barbershop, customer, barber, service, scheduled_at, status
- Barbershop Staff: barbershop, user, role, active

## 🎯 Expected Results

### Before Migration

```
appointments: ~1000 records
bookings: ~500 records (duplicates)
barbers: ~50 records (TEXT ids)
barbershop_staff: ~30 records (UUID ids)
```

### After Migration

```
appointments: ~1500 records (combined)
bookings: ~500 records (unchanged, legacy)
barbers: ~50 records (unchanged, legacy)
barbershop_staff: ~50 records (all barbers migrated)
```

### Views Created

```
bookings_legacy: Maps to appointments
barbers_legacy: Maps to barbershop_staff
```

## 📝 Validation Checklist

After migration, verify:

- [ ] All appointments have valid barbershop_id
- [ ] All appointments have barber_id (or walk-in)
- [ ] All appointments have service_id
- [ ] No orphaned foreign keys
- [ ] Backward-compatible views work
- [ ] RLS policies functional
- [ ] Indexes created
- [ ] Sample queries return expected data
- [ ] Application pages load correctly
- [ ] Booking flow works end-to-end
- [ ] Calendar displays appointments
- [ ] No console errors
- [ ] No Sentry errors

## 🐛 Troubleshooting

### Issue: Migration fails with constraint violation

**Cause**: Existing data violates foreign key constraints

**Solution**:
```sql
-- Find problematic records
SELECT * FROM appointments WHERE barbershop_id NOT IN (SELECT id FROM barbershops);
SELECT * FROM appointments WHERE barber_id NOT IN (SELECT id FROM profiles);

-- Fix by updating to valid IDs or set to NULL for walk-ins
```

### Issue: Duplicate key violations

**Cause**: Records already exist in target tables

**Solution**: Migration script checks for existing records and skips duplicates. Check migration logs for details.

### Issue: Views not created

**Cause**: Naming conflict or permissions

**Solution**:
```sql
-- Drop existing views
DROP VIEW IF EXISTS bookings_legacy CASCADE;
DROP VIEW IF EXISTS barbers_legacy CASCADE;

-- Re-run view creation section of migration
```

### Issue: Performance degradation

**Cause**: Missing indexes

**Solution**:
```sql
-- Re-create indexes from Section 7 of migration script
CREATE INDEX CONCURRENTLY idx_appointments_barbershop ON appointments(barbershop_id);
-- ... etc
```

## 📞 Support

If issues arise during migration:

1. **Check logs**: Supabase Dashboard → Logs
2. **Check Sentry**: Look for new errors
3. **Review validation output**: All checks should PASS
4. **Contact team**: Alert if rollback needed

## 🔐 Security Notes

- Migration runs with service role permissions
- RLS policies are updated to use customer_id
- Multi-tenant isolation maintained
- No data exposure during migration
- Backward-compatible views respect RLS

## ⏱️ Timeline

Estimated migration time:
- Small dataset (<1000 appointments): 5-10 minutes
- Medium dataset (1000-10000): 10-20 minutes
- Large dataset (>10000): 20-60 minutes

Includes validation and index creation time.

## 📚 Related Documentation

- Main Specification: `SPEC.md`
- Migration Script: `consolidate-booking-ecosystem.sql`
- Validation Script: `validate-migration.sql`
- Rollback Script: `rollback-consolidation.sql`
- Project Constitution: `/CLAUDE.md`
- Database Rules: `/SUPABASE_PRODUCTION_RULE.md`

## ✅ Success Criteria

Migration is successful when:

1. ✓ All validation checks pass
2. ✓ Zero data loss (record counts match)
3. ✓ Application works without errors
4. ✓ Booking flow functional end-to-end
5. ✓ Calendar displays correctly
6. ✓ No Sentry errors for 24 hours
7. ✓ Performance metrics normal or better

---

**Last Updated**: 2025-10-10
**Version**: 1.0.0
**Status**: Ready for Execution

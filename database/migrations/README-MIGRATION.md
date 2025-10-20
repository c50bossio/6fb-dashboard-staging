# Bookings → Appointments Migration Guide

## 📋 Overview

This migration safely moves all existing data from the legacy `bookings` table to the production `appointments` table, ensuring your calendar dashboard can see and manage all historical bookings.

## 🎯 Why This Migration?

**Problem**: The codebase had two tables storing appointment data:
- `bookings` (old schema with `shop_id` text field)
- `appointments` (new schema with `barbershop_id` UUID)

Calendar reads from `appointments`, so any data in `bookings` is invisible.

**Solution**: Migrate all `bookings` data to `appointments` with proper schema conversion.

## ⚡ Quick Start

### Option 1: Run via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Navigate to SQL Editor

2. **Load Migration Script**
   - Click "New Query"
   - Copy contents of `migrate-bookings-to-appointments.sql`
   - Paste into SQL editor
   - Click "Run" or press Cmd/Ctrl + Enter

3. **Review Results**
   - Check the console output for success messages
   - Run: `SELECT * FROM migration_summary_20251020;`
   - Verify record counts match expectations

### Option 2: Run via psql Command Line

```bash
# Navigate to migrations directory
cd /Users/bossio/6FB\ AI\ Agent\ System/database/migrations

# Run migration (will prompt for password)
psql -h <your-supabase-host> \\
     -U postgres \\
     -d postgres \\
     -f migrate-bookings-to-appointments.sql
```

### Option 3: Run via Supabase MCP (if configured)

If you have Supabase MCP configured in Claude Desktop, you can execute the migration directly through MCP tools.

## 📊 What the Migration Does

### Step-by-Step Process:

1. **✅ Pre-flight Checks**
   - Verifies both tables exist
   - Validates table schemas

2. **💾 Creates Backup**
   - Full backup: `bookings_backup_20251020`
   - Preserves original data before any changes

3. **📊 Analyzes Data**
   - Counts records in both tables
   - Identifies potential ID conflicts
   - Reports data quality issues

4. **🚀 Migrates Data**
   - Converts `shop_id` (text) → `barbershop_id` (UUID)
   - Converts `barber_id` (text) → UUID format
   - Maps `service_type` → `service_name`
   - Calculates `duration_minutes` from time difference
   - Handles schema differences gracefully
   - Skips duplicates (conflict-safe)

5. **🔍 Verification**
   - Counts migrated records
   - Checks for data quality issues
   - Reports NULL values that need attention

6. **📈 Creates Summary View**
   - `migration_summary_20251020` - Easy verification

## 🛡️ Safety Features

### Automatic Backups
- **Table**: `bookings_backup_20251020`
- **Contains**: Full copy of bookings table before migration
- **Retention**: Keep until migration verified successful

### Conflict Prevention
- Uses `ON CONFLICT (id) DO NOTHING`
- Skips records that already exist in appointments
- Never overwrites existing appointment data

### Data Validation
- Validates UUID formats before conversion
- Uses safe defaults for invalid data
- Reports data quality issues without failing

### Easy Rollback
- Dedicated rollback script provided
- Restores from backup if needed
- See: `rollback-bookings-migration.sql`

## 📝 Post-Migration Checklist

### 1. Verify Migration Success

```sql
-- View migration summary
SELECT * FROM migration_summary_20251020;

-- Expected output:
-- | source                      | count |
-- |-----------------------------|-------|
-- | Original Bookings           | XX    |
-- | Current Appointments        | YY    |
-- | Newly Migrated              | ZZ    |
-- | Needs Manual Fix (NULL...)  | 0     |
```

### 2. Test Calendar Dashboard

- [ ] Open calendar dashboard
- [ ] Verify all appointments appear
- [ ] Try drag-dropping an old appointment
- [ ] Edit an old appointment's details
- [ ] Confirm changes save correctly

### 3. Check for Data Quality Issues

```sql
-- Find appointments with NULL barber_id (need fixing)
SELECT id, customer_name, scheduled_at, barbershop_id
FROM appointments
WHERE booking_source = 'legacy_migration'
  AND barber_id IS NULL;

-- Find appointments using default barbershop_id
SELECT id, customer_name, scheduled_at
FROM appointments
WHERE booking_source = 'legacy_migration'
  AND barbershop_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
```

### 4. Fix NULL Barber IDs (if any)

```sql
-- Example: Assign NULL barber appointments to a default barber
UPDATE appointments
SET barber_id = '<your-default-barber-uuid>'
WHERE booking_source = 'legacy_migration'
  AND barber_id IS NULL;
```

## 🔄 Rollback (If Needed)

If something goes wrong, you can rollback the migration:

```bash
# Run rollback script
psql -h <your-supabase-host> \\
     -U postgres \\
     -d postgres \\
     -f rollback-bookings-migration.sql
```

**What it does**:
- Removes all migrated records from appointments
- Restores bookings table from backup (if needed)
- Cleans up migration artifacts

## 🎯 Schema Mapping Reference

| Bookings Column    | Appointments Column | Conversion |
|--------------------|---------------------|------------|
| id                 | id                  | Direct copy |
| shop_id (TEXT)     | barbershop_id (UUID)| TEXT → UUID or default |
| barber_id (TEXT)   | barber_id (UUID)    | TEXT → UUID or NULL |
| customer_name      | customer_name       | Direct copy |
| customer_phone     | customer_phone      | Direct copy |
| customer_email     | customer_email      | Direct copy |
| service_type       | service_name        | Direct copy |
| start_time         | scheduled_at        | Direct copy |
| start_time         | start_time          | Direct copy |
| end_time           | end_time            | Direct copy |
| -                  | duration_minutes    | Calculated from end-start |
| price              | price               | Direct copy |
| status             | status              | Direct copy |
| notes              | notes               | Direct copy |
| created_at         | created_at          | Direct copy |
| updated_at         | updated_at          | Direct copy |
| -                  | booking_source      | Set to 'legacy_migration' |

## 🔧 Troubleshooting

### Issue: "bookings table does not exist"
**Solution**: Your system already uses appointments table exclusively. No migration needed!

### Issue: "Many records with NULL barber_id"
**Cause**: Original bookings had invalid barber_id format
**Solution**:
1. Identify the correct barber for these appointments
2. Run UPDATE query to assign proper barber_id
3. See example in Post-Migration Checklist #4

### Issue: "Migration count is 0"
**Cause**: All bookings already exist in appointments
**Result**: No action needed, migration is idempotent (safe to run multiple times)

### Issue: "Duplicate key violations"
**Solution**: The script handles this automatically with `ON CONFLICT DO NOTHING`

## 📞 Support

If you encounter any issues:

1. **Check the output logs** - Migration provides detailed status messages
2. **Run verification queries** - Use SQL examples above
3. **Review backup** - Data is safe in `bookings_backup_20251020`
4. **Use rollback if needed** - Script provided for safety

## 🎉 Success Criteria

Migration is successful when:

- ✅ Migration summary shows expected counts
- ✅ Calendar dashboard displays all appointments
- ✅ Drag-drop works on old appointments
- ✅ No NULL barber_ids (or fixed manually)
- ✅ All timestamps preserved correctly
- ✅ Customer and service data intact

---

**Migration Script**: `migrate-bookings-to-appointments.sql`
**Rollback Script**: `rollback-bookings-migration.sql`
**Date Created**: 2025-10-20

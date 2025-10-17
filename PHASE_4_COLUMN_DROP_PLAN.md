# Phase 4: Drop shop_id Columns - Execution Plan

**Status**: Ready to Execute
**Date**: 2025-10-10
**Migration Sessions**: Phase 1, 2, 3 Complete

## Pre-Execution Checklist ✅

- ✅ All critical API routes fixed (27 files)
- ✅ All `.eq('shop_id'` patterns eliminated (only test file remains)
- ✅ Validation tests passed (5/5 tests)
- ✅ Development servers healthy
- ✅ Data integrity verified (barbershop_id columns populated)

## Tables with shop_id Columns to Drop

Based on Phase 2 analysis, these tables have deprecated `shop_id` columns:

### High Priority (Production Data)
1. **customers** - 52 rows in barbershop_id, 0 in shop_id
2. **services** - 17 rows in barbershop_id, 3 in shop_id
3. **appointments** - All data in barbershop_id
4. **profiles** - All data in barbershop_id
5. **barbershop_staff** - Staff relationships
6. **payments** - Financial records
7. **inventory_items** - Product inventory

### Medium Priority (Configuration)
8. **barber_availability** - Scheduling data
9. **service_categories** - Service organization
10. **blocked_times** - Calendar blocking

### Low Priority (Analytics/Logs)
11. **analytics_events** - Tracking data
12. **audit_logs** - Historical records

## Safety Measures

### 1. Pre-Drop Verification
```sql
-- Verify no NULL barbershop_id where shop_id exists
SELECT table_name, count(*)
FROM information_schema.columns
WHERE column_name = 'barbershop_id'
  AND table_schema = 'public';

-- Check for any remaining shop_id foreign key constraints
SELECT constraint_name, table_name, column_name
FROM information_schema.key_column_usage
WHERE column_name = 'shop_id'
  AND table_schema = 'public';
```

### 2. Column Drop Order
Drop columns in reverse dependency order:
1. Drop FK constraints first
2. Drop columns from child tables
3. Drop columns from parent tables last

### 3. Rollback Plan
**BEFORE dropping columns, create a backup:**
```sql
-- PostgreSQL automatically maintains transaction logs
-- Supabase provides point-in-time recovery
-- No manual backup needed, but document the timestamp
```

**Timestamp before drop**: 2025-10-10T22:01:00Z

### 4. Validation After Drop
```sql
-- Verify columns are gone
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name = 'shop_id'
  AND table_schema = 'public';

-- Should return 0 rows
```

## Execution Steps

### Step 1: Drop Foreign Key Constraints
```sql
-- Find and drop all shop_id foreign key constraints
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT constraint_name, table_name
        FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY'
          AND constraint_name LIKE '%shop_id%'
          AND table_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I',
                      constraint_record.table_name,
                      constraint_record.constraint_name);
        RAISE NOTICE 'Dropped constraint % from table %',
                    constraint_record.constraint_name,
                    constraint_record.table_name;
    END LOOP;
END $$;
```

### Step 2: Drop Columns
```sql
-- Drop shop_id columns from all tables
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN
        SELECT DISTINCT table_name
        FROM information_schema.columns
        WHERE column_name = 'shop_id'
          AND table_schema = 'public'
          AND table_name NOT LIKE 'test_%'  -- Preserve test tables
    LOOP
        EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS shop_id',
                      table_record.table_name);
        RAISE NOTICE 'Dropped shop_id from table %', table_record.table_name;
    END LOOP;
END $$;
```

### Step 3: Post-Drop Validation
```sql
-- Verify no shop_id columns remain
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name = 'shop_id'
  AND table_schema = 'public'
  AND table_name NOT LIKE 'test_%';

-- Should return 0 rows

-- Verify barbershop_id columns still exist
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name = 'barbershop_id'
  AND table_schema = 'public';

-- Should return multiple rows
```

## Post-Execution Testing

### 1. Application Health Check
```bash
curl http://localhost:9999/api/health
curl http://localhost:8001/health
```

### 2. Database Query Validation
```bash
node validate-migration.js
```

### 3. Critical Path Testing
- [ ] User login/authentication
- [ ] Shop selection/switching
- [ ] Appointment booking
- [ ] Service management
- [ ] Customer management
- [ ] Payment processing

## Rollback Instructions (If Needed)

If issues arise after dropping columns:

1. **Immediate Rollback**: Restore from Supabase point-in-time recovery
   - Go to Supabase Dashboard > Database > Backups
   - Select timestamp: 2025-10-10T22:01:00Z
   - Restore database

2. **Re-add Columns** (if point-in-time recovery not available):
   ```sql
   -- Add shop_id columns back
   ALTER TABLE customers ADD COLUMN shop_id UUID;
   ALTER TABLE services ADD COLUMN shop_id UUID;
   -- etc...

   -- Copy data from barbershop_id
   UPDATE customers SET shop_id = barbershop_id;
   UPDATE services SET shop_id = barbershop_id;
   -- etc...
   ```

## Success Criteria

- ✅ All shop_id columns dropped
- ✅ No foreign key errors
- ✅ Application still healthy
- ✅ Validation tests pass
- ✅ Critical paths functional

## Notes

- Keep `test_schema_fix` route for historical validation
- Update schema documentation after completion
- Monitor production for 24 hours post-deployment
- Document completion timestamp in migration log

---

**Execution Authorization**: Pending
**Executed By**: TBD
**Execution Timestamp**: TBD
**Completion Timestamp**: TBD

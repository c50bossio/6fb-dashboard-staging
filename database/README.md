# Database Migration: Schema Consolidation to Single Source of Truth

This directory contains the complete database migration system to consolidate the fragmented 6FB AI Agent System schema into a unified, production-ready structure.

## 🎯 Migration Objective

**Problem**: The system currently has 50+ fragmented schema files causing:
- Hardcoded mock data in production APIs
- Inconsistent field naming (`shop_id` vs `barbershop_id`)
- Multiple authentication models causing confusion
- Subscription system fragmentation across 6+ tables

**Solution**: Consolidate into a single, authoritative schema with:
- Unified `profiles` table extending Supabase `auth.users`
- Single `barbershop_id` field eliminating naming conflicts
- Master `subscriptions` table as single source of truth
- Proper foreign key relationships and constraints

## 📁 File Structure

```
database/
├── README.md                           # This file
├── MASTER_PRODUCTION_SCHEMA.sql       # Complete unified schema
├── complete-schema.sql                 # Current fragmented schema (reference)
├── production-setup.sql               # Production setup (reference)
├── migrate.sh                          # Migration runner script
├── validate_migration.sql             # Post-migration validation
├── migrations/
│   ├── 001_consolidate_schema.sql      # Forward migration
│   └── 001_rollback_consolidate_schema.sql  # Rollback migration
└── backups/                            # Automatic backups (created during migration)
```

## 🚀 Quick Start

### 1. **CRITICAL: Create Backup First**
```bash
# The migration script automatically creates backups, but you can create an additional one:
pg_dump $DATABASE_URL > backup_pre_migration_$(date +%Y%m%d).sql
```

### 2. **Run Migration**
```bash
# Make script executable (if not already)
chmod +x ./migrate.sh

# Check current status
./migrate.sh status

# Run the migration
./migrate.sh migrate
```

### 3. **Validate Migration**
```bash
# Check migration completed successfully
./migrate.sh status

# Run comprehensive validation
psql $DATABASE_URL -f validate_migration.sql
```

### 4. **Rollback (if needed)**
```bash
# If issues are discovered, rollback safely
./migrate.sh rollback
```

## 📋 Migration Process Details

### Phase 1: Pre-Migration Safety
1. **Prerequisite checks** - Verify files exist, database connectivity
2. **Automatic backup** - Creates timestamped backup in `backups/` directory
3. **Migration logging setup** - Creates `migration_log` table for tracking

### Phase 2: Schema Creation
1. **Create new unified tables** with `_new` suffix
2. **Enable required extensions** (uuid-ossp, pgvector)
3. **Implement proper constraints** and foreign key relationships

### Phase 3: Data Migration
1. **Safe data migration** using dedicated functions
2. **Handle field name consolidation** (`shop_id` → `barbershop_id`)
3. **Error handling** with detailed logging
4. **Conflict resolution** with UPDATE on conflict

### Phase 4: Activation
1. **Create compatibility views** for backward compatibility
2. **Enable Row Level Security** with basic policies
3. **Add performance triggers** (`updated_at` auto-update)
4. **Create indexes** for optimal performance

## 🔧 Migration Script Options

### Command Reference
```bash
./migrate.sh migrate   # Run forward migration
./migrate.sh rollback  # Undo migration
./migrate.sh status    # Check migration state
./migrate.sh help      # Show usage information
```

### Environment Configuration
The script automatically detects database connection from:
1. `../.env.local` file (`SUPABASE_DB_URL`)
2. Supabase CLI local instance
3. Manual PostgreSQL connection

### Logging
- **Console output**: Color-coded status messages
- **File logging**: Detailed logs in `migration.log`
- **Database logging**: Migration history in `migration_log` table

## 🛡️ Safety Features

### Automatic Backups
- **Pre-migration backup** created automatically
- **Pre-rollback backup** created before rollback
- **Timestamped filenames** prevent overwriting
- **Full database dumps** for complete restore capability

### Error Handling
- **Transactional safety** - migration fails completely if any step fails
- **Detailed error logging** with specific error messages
- **Graceful degradation** - preserves existing data on failure
- **Manual recovery instructions** provided on failure

### Rollback Protection
- **Data reconciliation** - merges any new data back to old schema
- **Archive preservation** - new tables archived instead of dropped
- **Verification checks** - ensures rollback completed successfully
- **Backward compatibility** maintained throughout process

## 📊 Validation System

### Automated Validation Checks
1. **Row count verification** - ensures no data loss
2. **Foreign key integrity** - validates all relationships
3. **Field consolidation** - verifies `shop_id` → `barbershop_id` migration
4. **Subscription uniqueness** - ensures single source of truth
5. **Constraint validation** - verifies business rules

### Validation Report
The validation script provides:
- ✅ **Pass/Fail status** for each check
- 📊 **Summary statistics** (total/passed/failed)
- 🔍 **Sample data comparison** before/after
- 📈 **Relationship analysis** (barbershop-staff mappings)

## 🔄 Schema Changes Summary

### Unified Profiles Table
```sql
-- BEFORE (fragmented)
profiles: id, name, full_name, shop_id, barbershop_id  -- Inconsistent fields
users: various authentication fields                   -- Separate user table

-- AFTER (consolidated)
profiles: id, full_name, barbershop_id                -- Single barbershop reference
         (extends auth.users)                          -- Supabase integration
```

### Single Source Subscriptions
```sql
-- BEFORE (fragmented)
user_subscriptions: user-level subscriptions
barbershop_subscriptions: shop-level subscriptions
subscription_plans: separate plan definitions
-- + 3 more related tables

-- AFTER (consolidated)
subscriptions: unified table handling both individual and barbershop subscriptions
              with proper business logic constraints
```

### Staff Relationships
```sql
-- BEFORE
barbershop_staff: basic user-shop relationships

-- AFTER
barbershop_staff: enhanced with employment details, commissions, schedules
                 proper foreign key constraints to unified tables
```

## 🚨 Critical Considerations

### Production Safety
1. **Schedule during low-traffic hours** - migration locks tables temporarily
2. **Monitor application logs** during migration window
3. **Have rollback plan ready** if issues are detected
4. **Test application functionality** immediately after migration

### Application Code Impact
The migration maintains backward compatibility through views, but consider:
1. **Field name consolidation** - `shop_id` → `barbershop_id`
2. **Enhanced subscription model** - single source of truth
3. **Improved foreign key relationships** - better data integrity
4. **New performance indexes** - potentially faster queries

### Post-Migration Tasks
1. **Update application code** to use consolidated fields
2. **Remove deprecated API endpoints** serving mock data
3. **Update documentation** reflecting new schema
4. **Archive old migration files** after successful deployment

## 📞 Support & Troubleshooting

### Common Issues

**Migration fails with "table already exists"**
```bash
# Check migration status first
./migrate.sh status

# If partially completed, may need manual cleanup
# Contact support before manual intervention
```

**Database connection issues**
```bash
# Verify connection manually
psql $DATABASE_URL -c "SELECT 1"

# Check .env.local configuration
grep SUPABASE_DB_URL ../.env.local
```

**Validation failures**
```bash
# Run validation script for detailed report
psql $DATABASE_URL -f validate_migration.sql

# Check migration.log for specific errors
tail -50 migration.log
```

### Emergency Recovery
If migration fails catastrophically:
```bash
# Restore from automatic backup
psql $DATABASE_URL < backups/backup_before_migration_YYYYMMDD_HHMMSS.sql

# Or use rollback script (preferred)
./migrate.sh rollback
```

## 📈 Migration Timeline

### Estimated Duration
- **Small database** (< 1K records): 2-5 minutes
- **Medium database** (1K-10K records): 5-15 minutes  
- **Large database** (10K+ records): 15-30 minutes

### Maintenance Window
- **Preparation**: 15 minutes (backup, verification)
- **Migration**: 5-30 minutes (depends on data size)
- **Validation**: 5 minutes (automated checks)
- **Application testing**: 15 minutes (functionality verification)
- **Total recommended window**: 1 hour

## 🎯 Success Metrics

Migration is considered successful when:
- ✅ All validation checks pass
- ✅ Application loads without errors
- ✅ User authentication works
- ✅ Barbershop/staff relationships intact
- ✅ No mock data in production APIs
- ✅ Subscription system unified

---

**Last Updated**: 2025-01-15
**Migration Version**: 001_consolidate_schema
**Compatibility**: Supabase PostgreSQL 14+
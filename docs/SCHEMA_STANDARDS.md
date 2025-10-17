# Database Schema Standards & Field Naming Conventions

## 📋 Overview

This document serves as the **single source of truth** for database field naming conventions in the 6FB AI Agent System. It exists to prevent costly data loss bugs, query errors, and developer confusion caused by inconsistent field naming.

### Why This Document Exists

In 2025, an incomplete database migration left duplicate columns (`shop_id` and `barbershop_id`) across multiple tables. This caused **critical production issues**:

- **Data Loss**: Code queried `shop_id` (mostly empty) instead of `barbershop_id` (populated with real data)
- **Empty Calendar Views**: Appointment modal pulled no data because queries prioritized the wrong column
- **Developer Confusion**: New developers couldn't tell which field to use
- **Inconsistent Codebase**: 100+ tables used `barbershop_id`, only ~10 had legacy `shop_id`

**Result**: Hours of debugging, lost appointments data, and frustrated users.

**This document prevents that from happening again.**

---

## 🎯 Standard Field Names

### Primary Identifiers

| Entity | Standard Field Name | Type | Notes |
|--------|-------------------|------|-------|
| **Barbershop/Shop** | `barbershop_id` | UUID | ✅ **ALWAYS USE THIS** |
| **Client/Customer** | `client_id` | UUID | References `profiles.id` |
| **Barber/Staff** | `barber_id` | UUID | References `profiles.id` |
| **Service** | `service_id` | UUID | References `services.id` |
| **Appointment** | `appointment_id` | UUID | Often just `id` in appointments table |
| **Organization** | `organization_id` | UUID | For enterprise multi-shop owners |

### Time and Scheduling

| Purpose | Standard Field Name | Type | Notes |
|---------|-------------------|------|-------|
| **Appointment Time** | `scheduled_at` | TIMESTAMPTZ | ✅ **REQUIRED for all appointments** |
| **Duration** | `duration_minutes` | INTEGER | Used to calculate end time |
| **End Time** | (calculated) | - | `scheduled_at + duration_minutes`, not stored |
| **Created Timestamp** | `created_at` | TIMESTAMPTZ | Record creation time |
| **Updated Timestamp** | `updated_at` | TIMESTAMPTZ | Last modification time |

### Client Information

| Purpose | Standard Field Name | Type | Notes |
|---------|-------------------|------|-------|
| **Client Name** | `client_name` | VARCHAR(255) | Used for walk-ins without account |
| **Client Email** | `client_email` | VARCHAR(255) | Direct field (fallback to `client.email`) |
| **Client Phone** | `client_phone` | VARCHAR(50) | Direct field (fallback to `client.phone`) |
| **Client Notes** | `client_notes` | TEXT | Internal notes about client preferences |

### Profile/User Information

| Purpose | Standard Field Name | Type | Notes |
|---------|-------------------|------|-------|
| **Full Name** | `full_name` | VARCHAR(255) | ✅ **STANDARD** for profiles table |
| **Avatar/Image** | `avatar_url` | VARCHAR(500) | ✅ **STANDARD** for profile images |
| **User Role** | `role` | VARCHAR(50) | CLIENT, BARBER, SHOP_OWNER, etc. |

### Financial Fields

| Purpose | Standard Field Name | Type | Notes |
|---------|-------------------|------|-------|
| **Service Price** | `price` | DECIMAL(10,2) | Standard price field |
| **Total Amount** | `total_amount` | DECIMAL(10,2) | Final amount including tips |
| **Tip Amount** | `tip_amount` | DECIMAL(10,2) | Separate tip tracking |
| **Commission Rate** | `commission_rate` | DECIMAL(5,2) | Percentage (e.g., 60.00 = 60%) |

---

## ⚠️ Deprecated Fields - DO NOT USE

### 🚫 `shop_id` - Legacy Field (DEPRECATED)

**Status**: ❌ **DEPRECATED - DO NOT QUERY OR USE**

**Why it exists**: Incomplete 2025 migration attempted to rename `barbershop_id` → `shop_id` but was abandoned

**Current state**:
- Present in only ~10 tables (see table list below)
- Contains **stale, incomplete, or NULL data**
- Causes data loss when queried instead of `barbershop_id`
- Will be removed in future cleanup migration

**Tables with `shop_id` column**:
1. `appointment_records` (has both `shop_id` and `barbershop_id`)
2. `barbers` (legacy table, use `profiles` + `barbershop_staff` instead)
3. `customers` (has both `shop_id` and `barbershop_id`)
4. `customers_backup` (backup table)
5. `inventory` (legacy table, use `barbershop_inventory`)
6. `invoice_history` (legacy invoicing)
7. `payout_history` (legacy payouts)
8. `production_barbers` (legacy table)
9. `profiles` (has both `shop_id` and `barbershop_id`)
10. `services` (has both `shop_id` and `barbershop_id`)
11. `user_shop_access_history` (access tracking only)

**Migration Status**: See `/specs/shop-id-cleanup/` for cleanup plan

### 🚫 Other Deprecated Fields

| Deprecated Field | Replacement | Notes |
|-----------------|-------------|-------|
| `customer_id` | `client_id` | Changed during booking consolidation |
| `customer_name` | `client_name` | Changed during booking consolidation |
| `customer_email` | `client_email` | Changed during booking consolidation |
| `customer_phone` | `client_phone` | Changed during booking consolidation |
| `start_time` | `scheduled_at` | More descriptive, consistent naming |
| `end_time` | (calculated) | Calculate from `scheduled_at + duration_minutes` |
| `name` (profiles) | `full_name` | More descriptive |
| `image_url` | `avatar_url` | Consistent with modern conventions |

---

## ✅ Correct Code Patterns

### Querying Barbershop Data

**✅ CORRECT - Use barbershop_id**:
```javascript
// Query appointments for a barbershop
const { data: appointments } = await supabase
  .from('appointments')
  .select('*')
  .eq('barbershop_id', barbershopId);

// Get barbershop ID from profile
const barbershopId = profile?.barbershop_id; // ✅ CORRECT
```

**❌ WRONG - Don't use shop_id**:
```javascript
// DO NOT DO THIS - shop_id contains stale data
const { data: appointments } = await supabase
  .from('appointments')
  .select('*')
  .eq('shop_id', shopId); // ❌ WRONG - shop_id is deprecated

// DO NOT DO THIS - fallback logic is dangerous
const shopId = profile?.shop_id || profile?.barbershop_id; // ❌ WRONG
```

### Accessing Profile Information

**✅ CORRECT - Always use barbershop_id**:
```javascript
// Get user's barbershop
const { data: profile } = await supabase
  .from('profiles')
  .select('id, full_name, email, barbershop_id, avatar_url')
  .eq('id', userId)
  .single();

// Use in component
const shopId = profile.barbershop_id; // ✅ CORRECT
const barberName = profile.full_name; // ✅ CORRECT
const barberImage = profile.avatar_url; // ✅ CORRECT
```

**❌ WRONG - Don't use deprecated fields**:
```javascript
// DO NOT DO THIS
const shopId = profile.shop_id; // ❌ WRONG - deprecated
const barberName = profile.name; // ❌ WRONG - use full_name
const barberImage = profile.image_url; // ❌ WRONG - use avatar_url
```

### Querying Appointments

**✅ CORRECT - Use standard field names**:
```javascript
// Query with proper field names and joins
const { data: appointments } = await supabase
  .from('appointments')
  .select(`
    id,
    scheduled_at,
    duration_minutes,
    client_id,
    client_name,
    client_email,
    client_phone,
    barbershop_id,
    client:profiles!client_id(id, full_name, email, avatar_url),
    barber:profiles!barber_id(id, full_name, avatar_url),
    service:services(id, name, price, duration_minutes),
    barbershop:barbershops(id, name, address)
  `)
  .eq('barbershop_id', barbershopId) // ✅ CORRECT
  .gte('scheduled_at', startDate)
  .order('scheduled_at', { ascending: true });

// Access data safely with fallbacks
const clientName = appointment.client_name ||
                   appointment.client?.full_name ||
                   'Walk-in Customer';
```

**❌ WRONG - Don't query deprecated fields**:
```javascript
// DO NOT DO THIS
const { data: appointments } = await supabase
  .from('appointments')
  .select('*, customer_name, start_time') // ❌ WRONG - old field names
  .eq('shop_id', shopId); // ❌ WRONG - shop_id is empty

// DO NOT DO THIS - querying deprecated fields
.select('customer_id, customer_name, start_time') // ❌ WRONG
```

### Creating New Appointments

**✅ CORRECT - Use current schema**:
```javascript
// Insert appointment with correct field names
const { data, error } = await supabase
  .from('appointments')
  .insert({
    barbershop_id: barbershopId, // ✅ CORRECT
    client_id: clientId, // ✅ CORRECT (nullable for walk-ins)
    client_name: clientName, // ✅ CORRECT
    client_email: email,
    client_phone: phone,
    barber_id: barberId,
    service_id: serviceId,
    scheduled_at: new Date(appointmentTime).toISOString(), // ✅ CORRECT
    duration_minutes: 30, // ✅ CORRECT
    status: 'SCHEDULED',
    price: servicePrice,
    total_amount: totalAmount
  });
```

**❌ WRONG - Don't use old field names**:
```javascript
// DO NOT DO THIS
const { data, error } = await supabase
  .from('appointments')
  .insert({
    shop_id: shopId, // ❌ WRONG - use barbershop_id
    customer_id: customerId, // ❌ WRONG - use client_id
    customer_name: customerName, // ❌ WRONG - use client_name
    start_time: startTime, // ❌ WRONG - use scheduled_at
    end_time: endTime // ❌ WRONG - calculate from duration_minutes
  });
```

### Filtering and Queries

**✅ CORRECT - Filter with barbershop_id**:
```javascript
// Filter services by barbershop
query.eq('barbershop_id', id); // ✅ CORRECT

// Filter staff by barbershop
query.eq('barbershop_id', shopId); // ✅ CORRECT

// Join with barbershop
.select('*, barbershop:barbershops!barbershop_id(*)'); // ✅ CORRECT
```

**❌ WRONG - Don't filter with shop_id**:
```javascript
// DO NOT DO THIS
query.eq('shop_id', id); // ❌ WRONG - returns empty results
query.eq('shop_id', shopId); // ❌ WRONG - deprecated field
.select('*, shop:barbershops!shop_id(*)'); // ❌ WRONG - broken FK
```

---

## 📊 Tables Affected by shop_id Issue

### Tables with BOTH shop_id and barbershop_id (Cleanup Required)

These tables have **duplicate columns** from the incomplete migration:

1. **`appointment_records`** - Appointment audit trail
   - ✅ Use: `barbershop_id`
   - ❌ Avoid: `shop_id` (stale data)

2. **`customers`** - Customer profiles
   - ✅ Use: `barbershop_id`
   - ❌ Avoid: `shop_id` (incomplete)

3. **`customers_backup`** - Backup table
   - ✅ Use: `barbershop_id`
   - ❌ Avoid: `shop_id`

4. **`profiles`** - User profiles (critical!)
   - ✅ Use: `barbershop_id` (populated for all shop staff)
   - ❌ Avoid: `shop_id` (partially populated, unreliable)
   - ⚠️ **Calendar bug**: Code was using `shop_id` → empty results

5. **`services`** - Service catalog
   - ✅ Use: `barbershop_id`
   - ❌ Avoid: `shop_id`

### Tables with ONLY shop_id (Legacy Tables)

These are **legacy tables** that should be migrated or deprecated:

1. **`barbers`** - Use `profiles` + `barbershop_staff` instead
2. **`inventory`** - Use `barbershop_inventory` instead
3. **`invoice_history`** - Legacy invoicing system
4. **`payout_history`** - Legacy payout tracking
5. **`production_barbers`** - Legacy production table
6. **`user_shop_access_history`** - Access audit (shop_id OK here)

### Tables with ONLY barbershop_id (100+ Tables - Standard)

**These tables follow the standard** and use `barbershop_id` correctly:

- `ai_insights`, `ai_agents`, `business_recommendations`
- `appointments`, `barber_availability`, `barber_services`
- `business_hours`, `cancellation_policies`
- `customer_feedback`, `customer_segments`
- `loyalty_programs`, `loyalty_points`
- `notifications`, `payments`, `products`
- `team_members`, `waitlist`, `services` (after cleanup)
- ...and 90+ more tables

---

## 🔧 Migration & Cleanup Status

### Current Status (October 2025)

- ✅ **Phase 1-4 Complete**: Booking consolidation migration finished
  - `customer_*` → `client_*` fields migrated
  - `start_time` → `scheduled_at` migrated
  - Field mapping utility created and tested (47/47 tests passing)
  - 70+ components updated with safe fallback patterns

- ⏳ **Phase 5 Pending**: `shop_id` cleanup migration
  - Remove `shop_id` columns from affected tables
  - Migrate any remaining data to `barbershop_id`
  - Update any remaining code references
  - **Target**: Q1 2026

### Cleanup Plan

See **`/specs/shop-id-cleanup/`** for detailed migration plan (to be created):

1. **Analysis Phase**: Identify all `shop_id` usage in codebase
2. **Data Migration**: Copy any non-null `shop_id` values to `barbershop_id`
3. **Code Updates**: Replace all `shop_id` references with `barbershop_id`
4. **Schema Updates**: Drop `shop_id` columns from all tables
5. **Testing**: Comprehensive testing of all affected queries
6. **Deployment**: Staged rollout with monitoring

---

## 🐛 Troubleshooting Common Issues

### Issue: "My query returns empty data"

**Symptom**: Appointments/services/staff queries return no results

**Cause**: You're probably querying `shop_id` instead of `barbershop_id`

**Solution**:
```javascript
// ❌ WRONG - This returns nothing
.eq('shop_id', shopId)

// ✅ CORRECT - This works
.eq('barbershop_id', barbershopId)
```

### Issue: "Calendar shows no appointments"

**Symptom**: Calendar page loads but displays empty schedule

**Cause**: Profile query prioritizing `shop_id` over `barbershop_id`

**Solution**:
```javascript
// ❌ WRONG - Calendar uses empty shop_id
const shopId = profile?.shop_id || profile?.barbershop_id;

// ✅ CORRECT - Always use barbershop_id
const shopId = profile?.barbershop_id;
```

**Real Example**: This exact bug occurred in `/app/(protected)/dashboard/calendar/page.js` at lines 50-58. The fix was to remove the `shop_id` check entirely.

### Issue: "Cannot find barbershop for user"

**Symptom**: `barbershop_id` is NULL in profile

**Possible Causes**:
1. User is a client (clients don't have barbershop_id)
2. User is enterprise owner (use organization_id instead)
3. User profile incomplete (run onboarding again)
4. Database FK constraint issue

**Solution**:
```javascript
// Check user role first
if (profile.role === 'CLIENT') {
  // Clients don't have barbershop_id
  console.log('User is a client, not a shop staff member');
} else if (!profile.barbershop_id) {
  // Missing barbershop assignment
  console.error('Shop staff member missing barbershop_id');
  // Redirect to onboarding or admin
}
```

### Issue: "Foreign key constraint violation"

**Symptom**: `insert or update on table violates foreign key constraint "fk_shop_id"`

**Cause**: Code is using `shop_id` which doesn't have proper FK relationships

**Solution**: Always use `barbershop_id` which has proper FK to `barbershops.id`

```sql
-- ❌ WRONG - shop_id has no FK
ALTER TABLE services ADD CONSTRAINT fk_shop_id
  FOREIGN KEY (shop_id) REFERENCES barbershops(id);

-- ✅ CORRECT - barbershop_id has proper FK
ALTER TABLE services ADD CONSTRAINT fk_barbershop_id
  FOREIGN KEY (barbershop_id) REFERENCES barbershops(id);
```

### Issue: "Profile data shows old field names"

**Symptom**: API returns `customer_name`, `start_time`, etc.

**Cause**: Using old API endpoint or database view

**Solution**:
1. Check API endpoint is using new schema
2. Verify database migration completed
3. Use field mapper utility: `/app/api/utils/appointment-field-mapper.js`

---

## 📚 Related Documentation

### Migration Documentation
- **[Booking Consolidation Complete](/docs/MIGRATION_BOOKING_CONSOLIDATION_COMPLETE.md)** - Full migration history
- **[Field Mapping Reference](/docs/FIELD_MAPPING_REFERENCE.md)** - Quick reference guide
- **[Migration Final Report](/MIGRATION_FINAL_REPORT.md)** - Executive summary

### Technical Documentation
- **[Database Schema](/docs/DATABASE_SCHEMA.md)** - Full database schema reference
- **[API Documentation](/docs/API_DOCUMENTATION.md)** - API endpoints and data formats
- **[Field Mapper Utility](/app/api/utils/README.md)** - Field mapping utility docs

### Development Guides
- **[CLAUDE.md](/CLAUDE.md)** - Project overview and architecture
- **[Full-Stack Development Protocol](/FULLSTACK_DEVELOPMENT_PROTOCOL.md)** - Development guidelines

---

## 🎯 Quick Reference Summary

### ✅ DO THIS

```javascript
// Use standard field names
barbershop_id    // ✅ Barbershop identifier
client_id        // ✅ Client reference
client_name      // ✅ Client name
scheduled_at     // ✅ Appointment time
duration_minutes // ✅ Duration
full_name        // ✅ Profile name
avatar_url       // ✅ Profile image

// Query pattern
.select('barbershop_id, client_id, scheduled_at, duration_minutes')
.eq('barbershop_id', barbershopId)
```

### ❌ DON'T DO THIS

```javascript
// Avoid deprecated fields
shop_id          // ❌ DEPRECATED - empty data
customer_id      // ❌ OLD - use client_id
customer_name    // ❌ OLD - use client_name
start_time       // ❌ OLD - use scheduled_at
end_time         // ❌ OLD - calculate from duration
name             // ❌ AMBIGUOUS - use full_name
image_url        // ❌ OLD - use avatar_url

// Don't use fallback patterns with shop_id
const id = profile.shop_id || profile.barbershop_id; // ❌ DANGEROUS
```

---

## 📞 Support & Questions

### Having Issues?

1. **Check this document first** - Most issues are covered here
2. **Search migration docs** - `/docs/MIGRATION_*.md` files have detailed info
3. **Check field mapper** - `/app/api/utils/appointment-field-mapper.js` handles conversions
4. **Ask in #backend-questions** - Team can help with specific cases

### Reporting Schema Issues

If you find code still using deprecated fields:

1. Document the file path and line number
2. Note what the code is trying to do
3. Create issue with label `schema-cleanup`
4. Reference this doc: `/docs/SCHEMA_STANDARDS.md`

### Contributing Updates

This document should be updated when:

- New standard field names are established
- Migration phases complete
- New deprecated fields are identified
- Troubleshooting patterns emerge

**Document Owner**: Backend Team Lead
**Last Updated**: October 10, 2025
**Next Review**: After shop_id cleanup migration (Q1 2026)

---

## 🏆 Success Criteria

You're using the schema correctly when:

- ✅ All queries use `barbershop_id`, never `shop_id`
- ✅ Code uses `client_*` fields, not `customer_*`
- ✅ Appointments use `scheduled_at` and `duration_minutes`
- ✅ Profile queries use `full_name` and `avatar_url`
- ✅ No foreign key constraint errors
- ✅ No "empty results" bugs from wrong field names
- ✅ Calendar and dashboards show all data correctly

**Remember**: When in doubt, check this document. It's the single source of truth for field naming in the 6FB AI Agent System.

---

*Last Updated: October 10, 2025*
*Version: 1.0*
*Status: Active - Authoritative Reference*

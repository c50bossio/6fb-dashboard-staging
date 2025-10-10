# Database Migration Instructions

## 🚨 IMPORTANT: Apply Schema Migration to Supabase

To fix the database integration issues, you need to apply the migration script to your Supabase database.

### Steps:

1. **Open Supabase Dashboard**
   - Go to [supabase.com](https://supabase.com)
   - Navigate to your project: `dfhqjdoydihajmjxniee`

2. **Apply Migration Script**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"
   - Copy and paste the contents of `database/SCHEMA_MIGRATION_COMPLETE.sql`
   - Click "Run" to execute the migration

3. **Verify Migration**
   - The script will show "Database schema migration completed successfully!" if successful
   - Check the Tables section to see new tables: barbershops, barbershop_staff, business_hours, etc.
   - Verify appointments table now has `scheduled_at` column

### What This Migration Does:

✅ **Adds Missing Tables:**
- `barbershops` - Core barbershop information
- `barbershop_staff` - Staff relationships and roles
- `business_hours` - Operating hours per barbershop
- `website_sections` - Dynamic website content
- `barbershop_gallery` - Image gallery
- `team_members` - Staff profiles
- `customer_testimonials` - Customer reviews

✅ **Fixes Existing Tables:**
- Adds `barbershop_id` to `services` table
- Adds `scheduled_at` to `appointments` table (consolidates date/time)
- Adds missing columns for client info, pricing, notes
- Renames `customer_id` to `client_id` in appointments

✅ **Adds Performance Indexes:**
- Optimizes queries for appointments, services, staff
- Improves API response times

✅ **Implements Security:**
- Enables Row Level Security (RLS) on all tables
- Adds basic security policies
- Protects data based on user roles

### After Migration:

Run this test to verify everything works:

```bash
cd "/Users/bossio/6FB AI Agent System"
node test-supabase-access.js
```

The API endpoints will now work properly with real database operations instead of mock data.
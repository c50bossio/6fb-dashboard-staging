# Barber Migration Script Documentation

## Overview

This migration script transforms 5 legacy barbers from the deprecated `barbers` table into fully authenticated users with complete dashboard access. Each barber becomes an independent contractor with their own profile, authentication credentials, and staff record.

## Migration Details

### What It Does

For each of the 5 barbers, the script:

1. **Creates Auth User** (`auth.users`)
   - Email/password authentication
   - Auto-confirms email (no verification needed)
   - Sets user metadata (name, phone, avatar)
   - Default password: `TempPass2025!`

2. **Creates Profile** (`profiles`)
   - Links to auth user via matching ID
   - Sets role to `BARBER`
   - Copies all biographical data
   - Links to barbershop

3. **Creates Staff Record** (`barbershop_staff`)
   - Commission-based payment model
   - Default commission rate: 60%
   - Copies specialties and experience
   - Sets as active employee

### Barbers Being Migrated

| Name | Email | Experience | Specialties |
|------|-------|-----------|-------------|
| Marcus "The Artist" Rodriguez | marcus.rodriguez@tomb45.com | 12 years | Classic Cuts, Fades, Beard Styling, Hot Towel Shaves |
| Tony "Fade King" Johnson | tony.johnson@tomb45.com | 8 years | Fades, Tapers, Line-ups, Modern Styles |
| DeAndre Williams | deandre.williams@tomb45.com | 4 years | Textured Cuts, Natural Hair, Creative Styles, Youth Cuts |
| Carlos Martinez | carlos.martinez@tomb45.com | 6 years | Executive Styles, Traditional Cuts, Beard Grooming, Scalp Treatments |
| Jordan "J-Cut" Smith | jordan.smith@tomb45.com | 2 years | Classic Cuts, Fades, Beard Trims, Line-ups |

All barbers belong to barbershop: `c5a58548-8f23-426c-bedc-49a83d238724`

## Prerequisites

### Environment Variables Required

Ensure these are set in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Critical**: The script requires `SUPABASE_SERVICE_ROLE_KEY` for admin operations (creating auth users).

### Database Tables Required

The script assumes these tables exist:

- `auth.users` (Supabase Auth)
- `profiles`
- `barbershop_staff`

## Running the Migration

### Method 1: Using npm script (Recommended)

```bash
npm run migrate:barbers
```

### Method 2: Direct execution

```bash
node database/migrate-barbers-to-profiles.js
```

### Method 3: Make executable and run

```bash
chmod +x database/migrate-barbers-to-profiles.js
./database/migrate-barbers-to-profiles.js
```

## Expected Output

### Successful Migration

```
🚀 Starting Barber Migration Script
════════════════════════════════════════════════════════════
📊 Total barbers to migrate: 5
🔐 Default password: TempPass2025!
💰 Default commission rate: 60%
════════════════════════════════════════════════════════════

🔄 Migrating: Marcus "The Artist" Rodriguez (marcus.rodriguez@tomb45.com)
   📝 Creating auth user...
   ✅ Auth user created: abc123...
   📝 Creating profile...
   ✅ Profile created: abc123...
   📝 Creating staff record...
   ✅ Staff record created: def456...
   💰 Commission rate: 60%
   🎉 Migration successful!

[... repeated for each barber ...]

════════════════════════════════════════════════════════════
📊 Migration Summary
════════════════════════════════════════════════════════════
✅ Successful migrations: 5
⏭️  Skipped (already exists): 0
❌ Failed migrations: 0
📈 Total processed: 5

🔐 Next Steps:
   1. Barbers should login with their email and password: TempPass2025!
   2. Barbers will be prompted to reset their password on first login
   3. Barbers can access their dashboard at /barber/dashboard
   4. Barbers can customize their profile and landing pages

✨ Migration complete!
```

## Idempotency & Safety

### The script is **idempotent** - safe to run multiple times:

- **Checks before creating**: Verifies if email already exists in auth/profiles
- **Skips existing records**: Won't create duplicates
- **Graceful handling**: Reports skipped records in summary

### Rollback Protection

If any step fails, the script automatically rolls back:

1. **Auth creation fails**: No rollback needed (nothing created)
2. **Profile creation fails**: Deletes auth user (if newly created)
3. **Staff creation fails**: Deletes profile AND auth user (if newly created)

This ensures no partial/orphaned records remain in the database.

## After Migration

### 1. Barber Login Credentials

Each barber can login with:
- **Email**: Their assigned email (e.g., marcus.rodriguez@tomb45.com)
- **Password**: `TempPass2025!`
- **Login URL**: `/login`

### 2. Password Reset Flow

Barbers should reset their password immediately:

1. Login with temporary password
2. Navigate to profile settings
3. Change password to secure personal password
4. Logout and re-login with new password

### 3. Dashboard Access

After authentication, barbers can access:

- **Dashboard**: `/barber/dashboard`
- **Profile Management**: `/barber/profile`
- **Calendar/Appointments**: `/barber/calendar`
- **Personal Landing Page**: `/[barbershop]/[barber-slug]`

### 4. Commission Structure

All barbers are set up with:
- **Commission Rate**: 60% (can be adjusted by shop owner)
- **Payment Model**: Commission-based (not booth rent)
- **Tips**: Configurable split (default TBD)

## Troubleshooting

### Error: Missing environment variables

```
❌ Missing required environment variables:
   NEXT_PUBLIC_SUPABASE_URL: ✗
   SUPABASE_SERVICE_ROLE_KEY: ✗
```

**Solution**: Add required variables to `.env.local`

### Error: Auth creation failed

```
❌ Migration failed: Auth creation failed: User already exists
```

**Solution**: This is expected if running multiple times. The script will skip and continue.

### Error: Profile creation failed

```
❌ Migration failed: Profile creation failed: duplicate key value violates unique constraint
```

**Solution**: Profile already exists. Script skips automatically.

### Error: Staff creation failed

```
❌ Migration failed: Staff record creation failed: foreign key constraint
```

**Solution**: Check that `barbershop_id` exists in `barbershops` table.

## Database Schema Reference

### profiles Table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL, -- 'BARBER'
  avatar_url TEXT,
  bio TEXT,
  barbershop_id UUID REFERENCES barbershops(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### barbershop_staff Table

```sql
CREATE TABLE barbershop_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL, -- 'BARBER'
  commission_rate DECIMAL(3,2), -- 0.60 = 60%
  specialties TEXT[],
  experience_years INTEGER,
  is_active BOOLEAN DEFAULT true,
  hired_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Verification Queries

After migration, verify success:

### Check Auth Users

```sql
SELECT id, email, created_at
FROM auth.users
WHERE email LIKE '%@tomb45.com'
ORDER BY created_at DESC;
```

### Check Profiles

```sql
SELECT id, email, full_name, role, barbershop_id
FROM profiles
WHERE email LIKE '%@tomb45.com'
ORDER BY created_at DESC;
```

### Check Staff Records

```sql
SELECT
  s.id,
  s.user_id,
  p.full_name,
  p.email,
  s.commission_rate,
  s.experience_years,
  s.is_active
FROM barbershop_staff s
JOIN profiles p ON s.user_id = p.id
WHERE p.email LIKE '%@tomb45.com'
ORDER BY s.created_at DESC;
```

### Verify Complete Migration

```sql
SELECT
  au.email,
  au.created_at as auth_created,
  p.full_name,
  p.role,
  s.commission_rate,
  s.is_active
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
LEFT JOIN barbershop_staff s ON au.id = s.user_id
WHERE au.email LIKE '%@tomb45.com'
ORDER BY au.email;
```

Expected result: 5 rows with all fields populated (no NULLs).

## Production Considerations

### Before Running in Production

1. **Backup Database**: Create full backup before migration
2. **Test in Staging**: Run script in staging environment first
3. **Notify Barbers**: Send email with login credentials
4. **Monitor Logs**: Watch Supabase Auth logs during migration
5. **Schedule Downtime**: Run during low-traffic period (optional)

### Post-Migration Tasks

1. **Send Welcome Emails**: Email barbers with login instructions
2. **Password Reset Links**: Optionally send reset links instead of temp password
3. **Training Session**: Schedule onboarding for new dashboard
4. **Monitor Login Attempts**: Watch for authentication issues
5. **Collect Feedback**: Check in after 24-48 hours

## Related Files

- **Migration Script**: `database/migrate-barbers-to-profiles.js`
- **Legacy Barbers Data**: Embedded in script (source of truth)
- **Schema Files**: `database/complete-schema.sql`
- **Auth Configuration**: `lib/supabase.js`
- **Profile Management**: `app/(protected)/barber/profile/`

## Support

For issues or questions:

1. Check Supabase Auth logs: Project Settings > Auth > Logs
2. Check application logs: `npm run dev` output
3. Verify environment variables: `npm run check-env`
4. Test database connection: `node test-supabase-access.js`

## Future Enhancements

Potential improvements to the migration script:

- [ ] Email notification after successful migration
- [ ] Password reset link generation (instead of temp password)
- [ ] Bulk email sending for welcome messages
- [ ] Integration with onboarding flow
- [ ] Automated profile photo upload
- [ ] Calendar availability setup
- [ ] Service catalog initialization
- [ ] Custom landing page generation

---

**Last Updated**: 2025-10-11
**Version**: 1.0.0
**Maintainer**: 6FB AI Agent System Development Team

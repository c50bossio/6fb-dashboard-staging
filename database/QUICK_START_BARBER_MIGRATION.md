# Quick Start: Barber Migration

## TL;DR

Migrate 5 legacy barbers to authenticated users with full dashboard access.

## Run Migration

```bash
# Run migration script
npm run migrate:barbers

# Verify results
npm run verify:barbers
```

## What Happens

Creates for each barber:
- Auth user (email/password)
- Profile (role: BARBER)
- Staff record (60% commission)

## Login Credentials

**All barbers**:
- Password: `TempPass2025!`
- Must reset on first login

**Barber Emails**:
1. marcus.rodriguez@tomb45.com
2. tony.johnson@tomb45.com
3. deandre.williams@tomb45.com
4. carlos.martinez@tomb45.com
5. jordan.smith@tomb45.com

## Post-Migration

1. Send login credentials to barbers
2. Barbers login at `/login`
3. Barbers reset password
4. Access dashboard at `/barber/dashboard`

## Troubleshooting

**Environment variables missing?**
```bash
# Check .env.local has:
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

**Already migrated?**
- Script is idempotent (safe to re-run)
- Skips existing records

**Need to verify?**
```bash
npm run verify:barbers
```

## Files

- **Migration**: `database/migrate-barbers-to-profiles.js`
- **Verification**: `database/verify-barber-migration.js`
- **Full Docs**: `database/BARBER_MIGRATION_README.md`

## Support

Check Supabase Auth logs if issues:
Project Settings > Auth > Logs

# Local Development Setup Guide

## ✅ Current Status
- Login page is working
- Supabase is configured for localhost
- Authentication is ready for local development

## Setting Up Test Accounts

### 1. Create Test Users in Supabase Dashboard

Go to your Supabase project → Authentication → Users → Add User

Create these test accounts:

#### Barber Account
- Email: `dev-barber@test.com`
- Password: `TestPass123!`
- Role: BARBER

#### Shop Owner Account  
- Email: `dev-shop@test.com`
- Password: `TestPass123!`
- Role: SHOP_OWNER

#### Enterprise Account
- Email: `dev-enterprise@test.com`
- Password: `TestPass123!`
- Role: ENTERPRISE_OWNER

### 2. Set User Profiles

After creating users, add their profiles in the `profiles` table:

```sql
-- For dev-barber@test.com
INSERT INTO profiles (id, email, full_name, role, onboarding_completed)
VALUES (
  '<user-id-from-auth>',
  'dev-barber@test.com',
  'Dev Barber',
  'BARBER',
  false
);

-- For dev-shop@test.com
INSERT INTO profiles (id, email, full_name, role, shop_name, onboarding_completed)
VALUES (
  '<user-id-from-auth>',
  'dev-shop@test.com',
  'Dev Shop Owner',
  'SHOP_OWNER',
  'Dev Barbershop',
  false
);

-- For dev-enterprise@test.com
INSERT INTO profiles (id, email, full_name, role, onboarding_completed)
VALUES (
  '<user-id-from-auth>',
  'dev-enterprise@test.com',
  'Dev Enterprise',
  'ENTERPRISE_OWNER',
  false
);
```

## Testing Different Scenarios

### Test Onboarding Flow
1. Sign in with a test account where `onboarding_completed = false`
2. You'll be redirected to `/welcome` then see the onboarding overlay
3. Complete onboarding steps
4. Verify `onboarding_completed` updates to `true`

### Test Dashboard Features
1. Sign in with a test account where `onboarding_completed = true`
2. Direct access to dashboard
3. Test role-specific features

### Test API Integrations
1. Sign in with any test account
2. Your auth token will work with all API endpoints
3. Database operations will use real Row Level Security

## Why This Approach is Best

✅ **Real Authentication**: Test actual auth flows, not mocks
✅ **Real Database**: Test with actual Supabase RLS policies
✅ **Real API Tokens**: Test third-party integrations properly
✅ **Real User Context**: Test role-based features accurately
✅ **Production-Like**: Catch issues before they hit production

## Common Issues & Solutions

### "User not found in profiles table"
- The user exists in Auth but not in profiles table
- Run the INSERT statement above for that user

### "Invalid login credentials"
- Check email/password are correct
- Verify user exists in Supabase Auth → Users

### "Redirect URL not allowed"
- Already fixed! Your Supabase has localhost URLs configured

## Quick Commands

```bash
# Start development servers
npm run dev                    # Next.js on port 9999
python fastapi_backend.py      # FastAPI on port 8001

# Check if everything is running
npm run claude:health

# View logs
npm run dev | grep -E "error|warning"
```

## Next Steps

1. Create your test accounts in Supabase
2. Sign in at http://localhost:9999/login
3. Test the dashboard and onboarding flows
4. Build new features with real auth context!

---

*Note: This setup gives you a proper development environment that mirrors production, allowing you to build and test features that require real authentication, database profiles, and API integrations.*
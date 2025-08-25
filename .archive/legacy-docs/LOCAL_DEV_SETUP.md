# Local Development Setup After Production Deployment

## Important: Supabase Site URL Configuration

Since you've changed the Supabase Site URL to `https://bookedbarber.com` for production, you'll need to manage this setting when switching between local development and production.

## Option 1: Keep Production Settings (Recommended)

Keep Site URL as `https://bookedbarber.com` and use this setup:

### For Local Development:
1. Your code already handles dynamic redirect URLs
2. OAuth will redirect to production, but you can test with production URL
3. Use `https://bookedbarber.com` for full testing

### Benefits:
- No need to constantly change Supabase settings
- Production-like testing environment
- Easier team collaboration

## Option 2: Switch Between Environments

If you need true local OAuth testing:

### Before Local Development:
```
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Change Site URL to: http://localhost:9999
3. Save changes
```

### Before Production Deployment:
```
1. Go to Supabase Dashboard → Authentication → URL Configuration  
2. Change Site URL to: https://bookedbarber.com
3. Save changes
```

## Current Status

✅ **Production is LIVE and WORKING**
- Site URL: `https://bookedbarber.com`
- OAuth: Google authentication configured
- All endpoints responding correctly

## Testing Production Authentication

1. Visit: https://bookedbarber.com/login
2. Click "Sign in with Google"
3. Complete OAuth flow
4. Should redirect to welcome page for onboarding

## Quick Commands

### Check Production Status:
```bash
curl -I https://bookedbarber.com/api/health
```

### Run Local Development:
```bash
npm run dev
# Access at http://localhost:9999
```

### Monitor Production Logs:
- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: https://app.supabase.com

## Troubleshooting

### If OAuth redirects to production from localhost:
This is expected behavior with Site URL set to production. Either:
- Test on production URL
- Temporarily change Site URL to localhost (Option 2)

### If local development auth fails:
1. Check Site URL in Supabase
2. Ensure redirect URLs include both localhost and production
3. Clear browser cookies and try again

## Environment Variables

Your `.env.local` should have:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-key]
```

These work for both local and production!
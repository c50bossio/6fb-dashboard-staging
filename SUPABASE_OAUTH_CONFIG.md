# Supabase OAuth Configuration for bookedbarber.com

## Issue Identified
The Google OAuth button gets stuck on "Signing up..." because **Supabase Auth settings** don't include bookedbarber.com as an allowed redirect URL.

## Solution Required
You need to update Supabase Auth configuration in the dashboard:

### 1. Go to Supabase Dashboard
- Navigate to: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/auth/url-configuration

### 2. Add These Redirect URLs
In the "Redirect URLs" section, add:
```
https://bookedbarber.com/api/auth/callback
https://www.bookedbarber.com/api/auth/callback
http://localhost:9999/api/auth/callback
```

### 3. Set Site URL
Set the Site URL to:
```
https://bookedbarber.com
```

### 4. Additional Redirect URLs (if needed)
If there are other redirect patterns needed, also add:
```
https://6fb-ai-dashboard-*.vercel.app/api/auth/callback
```

## Why This Fixes the Issue

1. **Current Behavior**: User clicks Google OAuth → Supabase generates OAuth URL → Google redirects back → **Supabase rejects** redirect because bookedbarber.com is not in allowed URLs → Button stays loading

2. **After Fix**: User clicks Google OAuth → Supabase generates OAuth URL → Google redirects back → **Supabase accepts** redirect → User successfully authenticated → Redirected to subscription page

## Test After Configuration
1. Clear browser cache/cookies for bookedbarber.com
2. Go to https://bookedbarber.com/register  
3. Click "Sign up with Google"
4. Should now complete successfully and redirect to subscription page

## Environment Variables Status ✅
- ✅ `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Deployed to Vercel
- ✅ `GOOGLE_CLIENT_SECRET`: Deployed to Vercel  
- ✅ OAuth URL generation: Working correctly
- ❌ **Supabase redirect URL configuration**: Needs manual update in dashboard

## Next Steps
1. **Manual Step Required**: Update Supabase Auth settings in dashboard (cannot be automated)
2. Test Google OAuth flow on https://bookedbarber.com/register
3. Test complete subscription flow for OAuth users
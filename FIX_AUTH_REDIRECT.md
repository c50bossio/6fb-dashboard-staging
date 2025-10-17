# Fix Authentication Redirect Issue

## The Problem
Your Supabase Site URL is set to `https://bookedbarber.com` but you're developing on `localhost:9999`. This causes OAuth to redirect to production instead of localhost.

## Quick Fix (Choose One)

### Option 1: Change Site URL for Development
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Change **Site URL** from `https://bookedbarber.com` to:
   ```
   http://localhost:9999
   ```
3. Save changes
4. Test authentication - it should work immediately

**Note**: You'll need to change this back to `https://bookedbarber.com` when deploying to production.

### Option 2: Use Environment-Based Configuration
Keep Site URL as production and use this workaround:

1. The code has been updated to force localhost redirects during development
2. Clear your browser cookies/cache for localhost:9999
3. Try signing in again

## Testing
After applying the fix:
1. Sign out completely
2. Clear browser cache/cookies for localhost:9999
3. Go to http://localhost:9999/login
4. Click "Sign in with Google"
5. You should be redirected to:
   - Google OAuth consent
   - Back to http://localhost:9999/auth/callback
   - Then to /welcome page

## For Production Deployment
When ready to deploy:
1. Set Site URL to `https://bookedbarber.com`
2. Ensure all redirect URLs are saved
3. Deploy your application
4. Test on production domain

## Current Status
✅ Redirect URLs are correctly configured  
✅ Google OAuth is enabled  
⚠️ Site URL needs to match your current environment  

The easiest fix is Option 1 - just change the Site URL to localhost for now.
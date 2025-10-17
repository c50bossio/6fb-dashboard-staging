# Google OAuth PKCE Debugging Guide

## Issue
Getting "invalid request: both auth code and code verifier should be non-empty" error during Google OAuth login.

## Root Cause Analysis
PKCE (Proof Key for Code Exchange) validation is failing because:
1. Code verifier stored in cookies is being lost between OAuth redirect
2. Possible cookie configuration issues in development
3. Redirect URL mismatches

## Fixed Issues
✅ Enhanced auth callback error handling to redirect to login on PKCE failures
✅ Improved cookie settings for PKCE storage in development
✅ Added longer cookie expiry for PKCE-related cookies (1 hour)
✅ Enhanced debugging in server-client cookie handlers

## Supabase OAuth Configuration Required

**IMPORTANT**: Check your Supabase project authentication settings:

### 1. Site URL Configuration
- Go to Supabase Dashboard → Authentication → URL Configuration
- **Site URL**: `http://localhost:9999`
- **Redirect URLs**: `http://localhost:9999/auth/callback`

### 2. Google OAuth Provider
- Go to Supabase Dashboard → Authentication → Providers
- Ensure Google is enabled with correct Client ID/Secret
- **Redirect URI in Google Console**: `https://[your-supabase-project].supabase.co/auth/v1/callback`

## Testing Steps
1. Clear browser cookies and localStorage
2. Try Google login again
3. If PKCE error occurs, you'll now be redirected to login page instead of error page
4. Check browser developer tools → Application → Cookies for `supabase-auth-*` cookies

## Development URLs
- **Frontend**: http://localhost:9999
- **Auth Callback**: http://localhost:9999/auth/callback
- **Login Page**: http://localhost:9999/login

## Debugging Commands
```bash
# Check if server is running on correct port
lsof -i :9999

# Clear browser storage
# Developer Tools → Application → Storage → Clear Site Data

# Check Supabase environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
```

## Next Steps if Still Failing
1. Verify Supabase project redirect URLs match exactly
2. Check Google OAuth Console redirect URIs
3. Test with different browser/incognito mode
4. Enable Supabase auth debug mode to see detailed logs
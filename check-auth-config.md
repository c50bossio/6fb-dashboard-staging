# OAuth Configuration Checklist

## 1. Supabase Dashboard Settings

Go to your Supabase Dashboard → Authentication → URL Configuration

Ensure these are set:
- **Site URL**: `http://localhost:9999`
- **Redirect URLs**: Should include:
  - `http://localhost:9999/auth/callback`
  - `http://localhost:9999/**`

## 2. Google OAuth Provider Settings

Go to Supabase Dashboard → Authentication → Providers → Google

Check:
- Google OAuth is **enabled**
- Client ID and Client Secret are set

## 3. Google Cloud Console

Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

For your OAuth 2.0 Client ID, check:
- **Authorized redirect URIs** includes:
  - `https://dfhqjdoydihajmjxniee.supabase.co/auth/v1/callback`
  - Your Supabase project's callback URL

## 4. Browser Console Debug

When you click "Sign in with Google", watch for:
1. Where does Google redirect you to?
2. What's in the URL when you land back on your site?
3. Any console errors?

## Common Issues:

### Issue: Redirected back to login immediately
**Cause**: No auth token in callback URL
**Fix**: Check Supabase redirect URLs configuration

### Issue: OAuth error in URL
**Cause**: Misconfigured Google OAuth
**Fix**: Verify Google Cloud Console settings

### Issue: Code but no token
**Cause**: Supabase not exchanging code for token
**Fix**: Check Supabase API keys and configuration
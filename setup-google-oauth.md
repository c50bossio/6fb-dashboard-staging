# Google OAuth Setup Instructions

## 1. Google Cloud Console Credentials
After creating OAuth credentials in Google Cloud Console, you'll have:
- **Client ID**: (looks like: 123456789-xxxxx.apps.googleusercontent.com)
- **Client Secret**: (looks like: GOCSPX-xxxxxxxxxxxxx)

## 2. Add to Supabase Dashboard

### Go to Supabase Auth Providers:
https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/auth/providers

### Find Google Provider and Enable it:
1. Toggle "Google" to ON
2. Add your credentials:
   - **Client ID**: [Paste your Google Client ID]
   - **Client Secret**: [Paste your Google Client Secret]
3. Click "Save"

## 3. Configure Redirect URLs in Supabase

### Go to URL Configuration:
https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/auth/url-configuration

### Add these Redirect URLs:
- https://bookedbarber.com/auth/callback
- https://bookedbarber.com/login
- https://bookedbarber.com/dashboard
- https://www.bookedbarber.com/auth/callback
- https://www.bookedbarber.com/login
- https://www.bookedbarber.com/dashboard

## 4. Add to Vercel (Optional but recommended)

Run these commands after you have the credentials:

```bash
# Add Google Client ID
echo "YOUR_CLIENT_ID_HERE" | npx vercel env add GOOGLE_CLIENT_ID production

# Add Google Client Secret
echo "YOUR_CLIENT_SECRET_HERE" | npx vercel env add GOOGLE_CLIENT_SECRET production

# Add public version for frontend
echo "YOUR_CLIENT_ID_HERE" | npx vercel env add NEXT_PUBLIC_GOOGLE_CLIENT_ID production
```

## 5. Test the Integration

1. Visit: https://bookedbarber.com/login
2. Click "Continue with Google"
3. You should see Google's sign-in page
4. After signing in, you should return to your dashboard

## Common Issues:

**"redirect_uri_mismatch" error:**
- The redirect URI in Google Cloud Console must EXACTLY match what Supabase sends
- Required: `https://dfhqjdoydihajmjxniee.supabase.co/auth/v1/callback`

**"This app hasn't been verified" warning:**
- This is normal for new apps
- Users can click "Advanced" → "Go to BookedBarber (unsafe)" to proceed
- To remove this, you'll need to verify your app with Google (takes time)

**"Access blocked: This app's request is invalid":**
- Check that all redirect URIs are added correctly
- Ensure the OAuth consent screen is properly configured
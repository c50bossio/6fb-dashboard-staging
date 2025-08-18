# Google OAuth Setup for BookedBarber.com

## Required Configuration in Google Cloud Console

To enable Google sign-in on bookedbarber.com, you need to configure the following in your Google Cloud Console:

### 1. Access Google Cloud Console
- Go to [https://console.cloud.google.com](https://console.cloud.google.com)
- Select your project or create a new one

### 2. Configure OAuth Consent Screen
1. Navigate to **APIs & Services** > **OAuth consent screen**
2. Add these to **Authorized domains**:
   - `supabase.co`
   - `bookedbarber.com`

### 3. Configure OAuth 2.0 Client ID
1. Go to **APIs & Services** > **Credentials**
2. Click on your OAuth 2.0 Client ID (or create one if needed)
3. Add these **Authorized JavaScript origins**:
   ```
   https://bookedbarber.com
   https://www.bookedbarber.com
   http://localhost:9999 (for development)
   ```

4. Add these **Authorized redirect URIs**:
   ```
   https://dfhqjdoydihajmjxniee.supabase.co/auth/v1/callback
   ```

### 4. Add Credentials to Supabase Dashboard
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Authentication** > **Providers**
3. Enable **Google** provider
4. Add your Google OAuth credentials:
   - Client ID from Google Cloud Console
   - Client Secret from Google Cloud Console

### 5. Important Notes
- The primary redirect URI must be the Supabase URL, not your custom domain
- Supabase will handle the OAuth flow and then redirect to your app
- Make sure the Client ID and Secret in Supabase match exactly what's in Google Cloud Console

## Troubleshooting

If Google sign-in still doesn't work:
1. Check browser console for specific error messages
2. Verify all domains are properly added in Google Cloud Console
3. Ensure the OAuth consent screen is published (not in testing mode) for production
4. Clear browser cache and cookies
5. Try in an incognito/private window

## Code Configuration

The code has been updated to properly handle Google OAuth for production:
- `components/SupabaseAuthProvider.js` - Handles the OAuth flow
- `app/auth/callback/page.js` - Processes the OAuth callback
- `app/login/page.js` - Initiates Google sign-in
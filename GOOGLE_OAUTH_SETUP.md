# Google OAuth Setup for GMB Integration

## Current Issue
The Google OAuth client ID in your environment file (`106401305925-sbsnlgs8i87bclfoi38pqr8os519v913.apps.googleusercontent.com`) is returning "Error 401: invalid_client - The OAuth client was not found."

## Solution: Create New OAuth 2.0 Credentials

### Step 1: Access Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project or create a new one (e.g., "6FB AI Agent System")

### Step 2: Enable Google My Business API
1. Navigate to **APIs & Services** > **Library**
2. Search for "Google My Business API"
3. Click on it and press **Enable**

### Step 3: Create OAuth 2.0 Client ID
1. Go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
3. If prompted, configure the OAuth consent screen first:
   - Choose **External** user type
   - Fill in required fields:
     - App name: "6FB AI Agent System"
     - User support email: Your email
     - Developer contact: Your email
   - Add scopes: `https://www.googleapis.com/auth/business.manage`
   - Add test users if in development

### Step 4: Configure OAuth Client
1. Application type: **Web application**
2. Name: "BookedBarber GMB Integration"
3. Authorized JavaScript origins:
   ```
   http://localhost:9999
   http://localhost:3000
   https://bookedbarber.com
   https://www.bookedbarber.com
   ```
4. Authorized redirect URIs:
   ```
   http://localhost:9999/api/gmb/oauth/callback
   http://localhost:3000/api/gmb/oauth/callback
   https://bookedbarber.com/api/gmb/oauth/callback
   https://www.bookedbarber.com/api/gmb/oauth/callback
   ```
5. Click **CREATE**

### Step 5: Update Environment Variables
Copy the credentials and update your `.env.local` file:

```bash
# Replace with your new credentials
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-new-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-new-client-secret
```

### Step 6: Restart the Application
```bash
# Stop the current server (Ctrl+C) and restart
npm run dev
```

## Important Notes

### OAuth Consent Screen Requirements
- If your app is in **Testing** mode, only test users can authenticate
- For production, you'll need to submit for **Google verification**
- The Google My Business API requires business verification

### API Quotas
- Default quota: 25,000 queries per day
- Can be increased through Google Cloud Console

### Security Best Practices
1. Never commit OAuth credentials to version control
2. Use environment variables for all secrets
3. Restrict OAuth client to specific domains
4. Regularly rotate client secrets

## Testing the Integration

After setting up the credentials:

1. Navigate to http://localhost:9999/seo/dashboard
2. Click on the "Google My Business" tab
3. Click "Connect GMB Account"
4. You should be redirected to Google's OAuth consent screen
5. Authorize the application
6. You'll be redirected back to your app with access granted

## Troubleshooting

### "Error 401: invalid_client"
- Verify client ID and secret are correct
- Check that the OAuth client hasn't been deleted
- Ensure you're using the correct Google Cloud project

### "Access blocked: Authorization Error"
- Add your email to test users in OAuth consent screen
- Verify the app is in "Testing" or "Published" status
- Check that redirect URIs match exactly

### "Redirect URI mismatch"
- Ensure the redirect URI in your app matches exactly what's configured in Google Cloud Console
- Include the protocol (http/https) and port number

## Current Configuration Status

✅ **Backend Implementation**: Complete
- OAuth initialization endpoint working
- Callback handler implemented
- Token storage ready

✅ **Frontend Integration**: Complete
- GMB tab visible in SEO dashboard
- Connect button functional
- Attribution display ready

❌ **Google Cloud Setup**: Needs Configuration
- Valid OAuth 2.0 credentials required
- Google My Business API needs to be enabled
- Consent screen needs configuration

Once you complete the Google Cloud setup with valid credentials, the GMB integration will be fully functional!
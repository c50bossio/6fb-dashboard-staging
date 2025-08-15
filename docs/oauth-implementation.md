# OAuth Implementation Documentation

## Overview

This document describes the robust OAuth authentication implementation for the 6FB AI Agent System, specifically the Google OAuth integration using Supabase Auth.

## Architecture

### Client-Side OAuth Flow

The OAuth implementation uses a **client-side callback approach** to resolve PKCE (Proof Key for Code Exchange) cookie context issues inherent in Next.js App Router server components.

```
User → Google OAuth → Callback Page (Client) → Dashboard/Welcome
```

### Key Components

1. **Auth Provider** (`/components/SupabaseAuthProvider.js`)
   - Manages authentication state across the application
   - Handles OAuth initiation with security measures
   - Provides auth context to all components

2. **OAuth Callback** (`/app/auth/callback/page.js`)
   - Client-side page that handles OAuth code exchange
   - Implements retry logic and comprehensive error handling
   - Verifies CSRF state parameters for security

3. **Supabase Clients**
   - Browser client: Handles client-side auth operations
   - Server client: Simplified for server-side operations

## Security Features

### CSRF Protection
- Generates secure state parameter using `crypto.randomUUID()`
- Stores state in sessionStorage during OAuth initiation
- Verifies state parameter in callback to prevent CSRF attacks

### Error Handling
- Comprehensive error handling for all OAuth failure scenarios
- Retry logic for transient network errors (up to 3 attempts)
- User-friendly error messages with detailed logging
- Graceful fallbacks for authentication failures

### Session Management
- Secure cookie handling for authentication tokens
- Automatic session refresh and validation
- Proper cleanup of OAuth state parameters

## Implementation Details

### OAuth Initiation

```javascript
const signInWithGoogle = async (customRedirectTo) => {
  // Generate CSRF protection state
  const state = crypto.randomUUID()
  sessionStorage.setItem('oauth_state', state)
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
        state: state
      },
      scopes: 'email profile'
    }
  })
}
```

### OAuth Callback Processing

1. **Security Verification**: Verify CSRF state parameter
2. **Code Exchange**: Exchange authorization code for session
3. **User Verification**: Retrieve and verify user data
4. **Profile Loading**: Load user profile from database
5. **Routing**: Redirect based on onboarding status

### Error Recovery

The callback implements progressive error handling:

- **Provider Errors**: Handle OAuth provider errors (access_denied, etc.)
- **Network Errors**: Retry transient failures with exponential backoff
- **Code Exchange Errors**: Handle PKCE and validation failures
- **User Verification Errors**: Retry user data fetching
- **Profile Errors**: Continue gracefully if profile fetch fails

## Configuration

### Environment Variables

Required environment variables for OAuth:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase Dashboard Configuration

1. **OAuth Providers**: Configure Google OAuth in Supabase Auth settings
2. **Redirect URLs**: Add callback URLs for development and production
3. **Email Templates**: Customize auth email templates if needed

### Google Cloud Console

1. **OAuth 2.0 Client**: Create OAuth client in Google Cloud Console
2. **Authorized Domains**: Add your domains to authorized list
3. **Scopes**: Configure required scopes (email, profile)

## Troubleshooting

### Common Issues

1. **PKCE Cookie Errors**
   - **Solution**: Use client-side callback (already implemented)
   - **Symptoms**: "invalid request: both auth code and code verifier should be non-empty"

2. **State Mismatch Errors**
   - **Solution**: Check for browser extensions interfering with sessionStorage
   - **Prevention**: State verification is automatically handled

3. **Infinite Redirect Loops**
   - **Solution**: Clear browser storage and ensure callback URL is correct
   - **Prevention**: Timeout and cleanup logic prevents loops

4. **Profile Not Found**
   - **Solution**: Ensure user profile is created after successful OAuth
   - **Prevention**: Callback continues gracefully if profile doesn't exist

### Debug Mode

To enable debug logging, check browser console for:
- OAuth initiation logs
- Callback processing steps
- Error details with stack traces
- Retry attempt information

## Best Practices

### Security
- Always verify state parameters
- Use HTTPS in production
- Implement rate limiting on OAuth endpoints
- Monitor for suspicious OAuth patterns

### Performance
- Minimize auth state checks
- Cache user profiles appropriately
- Use loading states for better UX
- Implement proper error boundaries

### Maintenance
- Regularly update OAuth provider configurations
- Monitor OAuth success/failure rates
- Keep security dependencies updated
- Test OAuth flow in different browsers

## Production Checklist

- [ ] OAuth redirect URLs configured for production domain
- [ ] HTTPS enforced for all OAuth flows
- [ ] Error monitoring and alerting configured
- [ ] Rate limiting implemented
- [ ] Session timeout policies configured
- [ ] OAuth scope permissions minimized
- [ ] CSRF protection verified
- [ ] Error logging and monitoring active

## Support

For OAuth-related issues:
1. Check browser console for detailed error messages
2. Verify environment variables are correctly set
3. Ensure Supabase and Google OAuth configurations match
4. Test with incognito/private browsing to eliminate cache issues

Last updated: 2025-08-15
Version: 1.0
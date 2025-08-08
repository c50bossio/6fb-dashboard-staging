# Production Authentication Guide

## Overview
This guide covers the production-ready authentication solution implemented for the 6FB AI Agent System, designed to prevent session loss on page refresh and ensure secure, persistent authentication.

## Key Features Implemented

### 1. Enhanced Session Persistence
- **30-day session duration** with automatic refresh
- **httpOnly secure cookies** for production security
- **Automatic session refresh** before expiration
- **Fallback session validation** every 5 minutes

### 2. Middleware-Based Authentication
- **Server-side session validation** in `middleware.ts`
- **Protected route enforcement** at the edge
- **Development bypass** for local testing
- **Proper cookie management** with SSR support

### 3. Cookie Configuration
```javascript
// Production cookie settings
{
  httpOnly: true,                     // Prevents XSS attacks
  secure: true,                        // HTTPS only in production
  sameSite: 'lax',                    // CSRF protection
  path: '/',                           // Available site-wide
  maxAge: 60 * 60 * 24 * 30          // 30 days
}
```

### 4. Enhanced Auth Provider
- **Automatic session refresh** with smart scheduling
- **Development mode support** with bypass authentication
- **Error recovery** and retry logic
- **Real-time auth state synchronization**

## File Structure

```
lib/
├── auth-config.js           # Central auth configuration
├── supabase/
│   ├── client.js            # Browser client with enhanced cookies
│   ├── server.js            # Server client for SSR
│   └── middleware.js        # Middleware cookie handling
middleware.ts                # Edge middleware for auth
components/
├── EnhancedAuthProvider.js  # Production auth provider
├── ProtectedRoute.js        # Route protection wrapper
└── SupabaseAuthProvider.js  # Standard auth provider
```

## Configuration

### Environment Variables
```env
# Required for production
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Optional but recommended
NODE_ENV=production
```

### Deployment Checklist

#### Before Deployment
- [ ] Set all environment variables
- [ ] Enable Row Level Security (RLS) on all tables
- [ ] Configure Supabase auth providers
- [ ] Set production cookie domain if needed
- [ ] Test session persistence locally

#### Vercel Deployment
```bash
# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Deploy
vercel --prod
```

#### Docker Deployment
```bash
# Build production image
docker build -t 6fb-ai-system:prod .

# Run with environment variables
docker run -d \
  -e NODE_ENV=production \
  -e NEXT_PUBLIC_SUPABASE_URL=... \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  -e SUPABASE_SERVICE_ROLE_KEY=... \
  -p 3000:3000 \
  6fb-ai-system:prod
```

## Session Management

### How It Works
1. **Initial Login**: Creates session with 30-day expiration
2. **Cookie Storage**: Stores auth tokens in httpOnly cookies
3. **Middleware Validation**: Checks session on every request
4. **Automatic Refresh**: Refreshes session at 70% lifetime
5. **Fallback Check**: Validates session every 5 minutes

### Session Refresh Logic
```javascript
// Refresh triggers:
- When 70% of session time has passed
- 5 minutes before expiration (whichever is sooner)
- Manual refresh via refreshSession()
- On auth state change events
```

### Development Mode
For local development without Supabase:
1. Navigate to `/dashboard/dev-login`
2. Click "Continue as Developer"
3. Session persists for 30 days
4. Bypass authentication checks

## Security Best Practices

### 1. Cookie Security
- Always use httpOnly cookies in production
- Enable secure flag for HTTPS
- Set appropriate sameSite policy
- Never store sensitive data in localStorage

### 2. Route Protection
- Use middleware for server-side validation
- Implement client-side protection as UX enhancement
- Always validate on the backend
- Use Row Level Security in database

### 3. Session Security
- Implement session timeout
- Refresh tokens before expiration
- Clear sessions on logout
- Monitor for suspicious activity

## Troubleshooting

### Session Lost on Refresh
1. Check cookie settings in browser DevTools
2. Verify middleware is running
3. Check Supabase session in Network tab
4. Ensure cookies are not blocked

### Authentication Loops
1. Clear all cookies and localStorage
2. Check redirect URLs in middleware
3. Verify Supabase configuration
4. Check for conflicting auth providers

### Development Issues
1. Use dev-login for quick testing
2. Check Docker container logs
3. Verify environment variables
4. Test with curl commands

## Testing Authentication

### Manual Testing
```bash
# Check health endpoint
curl http://localhost:9999/api/health

# Test protected route (should redirect)
curl -I http://localhost:9999/dashboard

# Test with dev auth cookie
curl -H "Cookie: dev_auth=true" http://localhost:9999/dashboard
```

### Browser Testing
1. Open DevTools > Application > Cookies
2. Look for `sb-auth-token` cookie
3. Check cookie expiration and flags
4. Monitor Network tab for auth requests

## Monitoring

### Key Metrics to Track
- Session duration percentiles
- Refresh success rate
- Authentication errors
- Cookie rejection rate
- Middleware performance

### Logging
```javascript
// Important events logged:
- Session creation
- Session refresh
- Authentication errors
- Cookie operations
- Middleware decisions
```

## Migration from Old System

If migrating from a system without persistent auth:
1. Deploy middleware first
2. Update auth provider gradually
3. Test with subset of users
4. Monitor for issues
5. Full rollout after validation

## Support

For issues or questions:
- Check browser console for auth logs
- Review middleware logs in deployment
- Verify Supabase dashboard for auth events
- Test with development bypass mode

---

Last Updated: August 2025
Version: 1.0.0
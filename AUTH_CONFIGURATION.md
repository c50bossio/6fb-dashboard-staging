# Authentication Configuration for BookedBarber

## Supabase Dashboard Settings

### 1. URL Configuration
Go to: **Supabase Dashboard → Authentication → URL Configuration**

**Site URL** (Primary redirect after auth):
```
https://bookedbarber.com
```

**Redirect URLs** (Allowed redirect destinations):
```
http://localhost:9999/auth/callback
http://localhost:9999/**
https://bookedbarber.com/auth/callback
https://bookedbarber.com/**
https://www.bookedbarber.com/auth/callback
https://www.bookedbarber.com/**
```

### 2. Email Templates (Optional)
Update email templates to use your production domain:
- Confirmation URL: `https://bookedbarber.com/auth/confirm`
- Reset Password URL: `https://bookedbarber.com/auth/reset-password`

## Google OAuth Configuration

### 1. Google Cloud Console
Go to: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

**Authorized JavaScript origins**:
```
http://localhost:9999
http://localhost:3000
https://bookedbarber.com
https://www.bookedbarber.com
```

**Authorized redirect URIs**:
```
http://localhost:9999/auth/callback
https://bookedbarber.com/auth/callback
https://www.bookedbarber.com/auth/callback
https://dfhqjdoydihajmjxniee.supabase.co/auth/v1/callback
```

### 2. OAuth Consent Screen
- **Application name**: BookedBarber
- **Application logo**: Your logo
- **Application homepage**: https://bookedbarber.com
- **Privacy policy**: https://bookedbarber.com/privacy
- **Terms of service**: https://bookedbarber.com/terms

## Environment Variables

### Development (.env.local)
```bash
NEXT_PUBLIC_SITE_URL=http://localhost:9999
NEXT_PUBLIC_SUPABASE_URL=https://dfhqjdoydihajmjxniee.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Production (.env.production)
```bash
NEXT_PUBLIC_SITE_URL=https://bookedbarber.com
NEXT_PUBLIC_SUPABASE_URL=https://dfhqjdoydihajmjxniee.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Code Updates Needed

### 1. Dynamic Redirect URL
Update your auth code to use environment variable:

```javascript
// In your login component
const handleGoogleSignIn = async () => {
  const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`
  await signInWithGoogle(redirectUrl)
}
```

### 2. Auth Callback Handler
The callback should work for both environments:

```javascript
// In auth/callback/page.js
useEffect(() => {
  // This will work for both localhost and production
  const origin = window.location.origin
  // ... rest of callback logic
}, [])
```

## Deployment Checklist

### Before Going Live:

- [ ] Add production URLs to Supabase Redirect URLs
- [ ] Add production URLs to Google OAuth settings
- [ ] Update environment variables for production
- [ ] Test auth flow on staging/preview deployment
- [ ] Configure custom domain in hosting provider
- [ ] Set up SSL certificate (usually automatic with Vercel/Netlify)
- [ ] Update DNS records to point to hosting provider
- [ ] Test auth flow on production domain

### Testing Steps:

1. **Local Development**:
   - Sign in at `http://localhost:9999`
   - Should redirect to `http://localhost:9999/auth/callback`
   - Then to welcome/dashboard

2. **Production**:
   - Sign in at `https://bookedbarber.com`
   - Should redirect to `https://bookedbarber.com/auth/callback`
   - Then to welcome/dashboard

## Security Considerations

1. **HTTPS Only in Production**: Always use HTTPS for production
2. **Secure Cookies**: Ensure auth cookies have `Secure` flag in production
3. **CORS Settings**: Configure CORS to only allow your domains
4. **Rate Limiting**: Implement rate limiting on auth endpoints
5. **Session Management**: Set appropriate session timeouts

## Troubleshooting

### Common Issues:

**"Redirect URI mismatch" error**:
- Check that the exact URL is in both Supabase and Google settings
- Include both www and non-www versions

**"Invalid site URL" error**:
- Ensure Site URL in Supabase matches your production domain
- Don't include trailing slashes

**Auth works locally but not in production**:
- Check environment variables are set in production
- Verify DNS and SSL are properly configured
- Check browser console for CORS errors

## Domain Setup (for bookedbarber.com)

### DNS Configuration:
```
Type  Name    Value
A     @       Your-Server-IP
A     www     Your-Server-IP
```

Or for Vercel/Netlify:
```
Type  Name    Value
CNAME @       cname.vercel-dns.com
CNAME www     cname.vercel-dns.com
```

### SSL Certificate:
- Most hosting providers (Vercel, Netlify) provide automatic SSL
- For custom servers, use Let's Encrypt or Cloudflare

## Next Steps:

1. **Update Supabase Settings** with all URLs listed above
2. **Update Google OAuth** with all URLs listed above
3. **Test locally** to ensure nothing broke
4. **Deploy to staging** if available
5. **Deploy to production** at bookedbarber.com
6. **Test production auth flow**
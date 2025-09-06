# 🔐 OAuth Configuration Verification Guide

## Current Status
✅ Supabase project: `dfhqjdoydihajmjxniee`
✅ Auth endpoint: `https://dfhqjdoydihajmjxniee.supabase.co/auth/v1`
✅ Google OAuth appears configured
✅ Production domain: `bookedbarber.com`

## 1. Supabase Configuration Verification

### Quick Links:
- **Supabase Dashboard**: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee
- **Authentication Settings**: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/auth/settings

### Steps to Verify:
1. Go to Supabase Dashboard → Project `dfhqjdoydihajmjxniee`
2. Navigate to **Authentication** → **Settings**
3. Verify **Site URL**: `https://bookedbarber.com`
4. Go to **Authentication** → **Providers** 
5. Find **Google** provider and verify:
   - ✅ Enabled
   - ✅ Redirect URL includes: `https://bookedbarber.com/**`

### Expected Redirect URLs:
```
https://bookedbarber.com/**
```
OR specifically:
```
https://bookedbarber.com/api/auth/callback
```

## 2. Google Cloud Console Configuration

### Quick Access:
- **Google Cloud Console**: https://console.cloud.google.com
- **OAuth Credentials**: https://console.cloud.google.com/apis/credentials

### Steps to Verify:
1. Go to Google Cloud Console
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Find your **OAuth 2.0 Client ID** for BookedBarber
5. Click **Edit** and verify:

**Authorized JavaScript origins:**
```
https://bookedbarber.com
```

**Authorized redirect URIs:**
```
https://bookedbarber.com/api/auth/callback
https://dfhqjdoydihajmjxniee.supabase.co/auth/v1/callback
```

## 3. Test OAuth Flow

### Local Test (Development):
```bash
# Start local server
npm run dev

# Open in browser:
http://localhost:9999/login

# Try Google login - should work locally
```

### Production Test:
```bash
# Open production site:
https://bookedbarber.com/login

# Try Google login - should work without "ed" initialization error
```

## 4. Common Issues & Solutions

### Issue: "Cannot access 'ed' before initialization"
✅ **FIXED** - Code changes deployed:
- Circular dependency resolved in UNIFIED_CLIENT.js
- Callback route enhanced with error handling
- Build completed successfully

### Issue: "Invalid redirect URI"
**Solution**: Add `https://bookedbarber.com/api/auth/callback` to Google Cloud Console

### Issue: "Unauthorized domain"
**Solution**: Add `https://bookedbarber.com` to both:
- Supabase Site URL
- Google Cloud authorized origins

## 5. Verification Checklist

### Supabase Dashboard:
- [ ] Site URL: `https://bookedbarber.com`
- [ ] Google provider enabled
- [ ] Redirect URLs include production domain

### Google Cloud Console:
- [ ] JavaScript origins: `https://bookedbarber.com`
- [ ] Redirect URIs include: `https://bookedbarber.com/api/auth/callback`
- [ ] Redirect URIs include: `https://dfhqjdoydihajmjxniee.supabase.co/auth/v1/callback`

### Code Changes:
- [x] UNIFIED_CLIENT.js circular dependency fixed
- [x] Callback route error handling improved
- [x] Build completed successfully
- [x] No initialization errors

---

**Next Steps:**
1. Manually verify the configurations above
2. Test Google login on production site
3. The initialization error should be resolved
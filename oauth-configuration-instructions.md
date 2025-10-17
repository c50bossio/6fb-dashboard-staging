
# 🔐 OAuth Configuration Instructions

## ✅ Code Fixes Complete
- Circular dependency issues resolved
- Error handling improved
- Build successful (541 pages)

## 🔧 Manual Configuration Required

### 1. Supabase Configuration
📍 **URL**: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/auth/settings

**Steps:**
1. Login to Supabase Dashboard
2. Go to Authentication → Settings
3. Set Site URL: `https://bookedbarber.com`
4. Go to Authentication → Providers
5. Enable Google provider
6. Verify redirect URLs include: `https://bookedbarber.com/**`, `https://bookedbarber.com/api/auth/callback`

### 2. Google Cloud Console Configuration  
📍 **URL**: https://console.cloud.google.com/apis/credentials

**Steps:**
1. Login to Google Cloud Console
2. Select your BookedBarber project
3. Go to APIs & Services → Credentials
4. Find OAuth 2.0 Client ID
5. Edit and add:

**Authorized JavaScript origins:**
```
https://bookedbarber.com
```

**Authorized redirect URIs:**
```
https://bookedbarber.com/api/auth/callback
https://dfhqjdoydihajmjxniee.supabase.co/auth/v1/callback
```

## 🧪 Test Instructions

### Production Test:
1. Go to: https://bookedbarber.com/login
2. Click "Continue with Google"
3. Should redirect without "Cannot access 'ed'" error
4. Should complete authentication successfully

### If Still Getting Errors:
- Check browser console for specific error messages
- Verify both configurations are saved properly
- Try clearing browser cache and cookies

## 📋 Configuration Checklist

### Supabase:
- [ ] Site URL: https://bookedbarber.com
- [ ] Google provider enabled
- [ ] Redirect URLs configured

### Google Cloud:
- [ ] JavaScript origins: https://bookedbarber.com
- [ ] Redirect URIs: https://bookedbarber.com/api/auth/callback
- [ ] Redirect URIs: https://dfhqjdoydihajmjxniee.supabase.co/auth/v1/callback

---
Generated: 2025-09-06T19:04:37.903Z
Project: BookedBarber (dfhqjdoydihajmjxniee)

# Production Deployment Guide for BookedBarber

## Pre-Deployment Checklist

### 1. Supabase Configuration ✅

#### Update Site URL (CRITICAL)
1. Go to [Supabase Dashboard](https://app.supabase.com) → Authentication → URL Configuration
2. Change **Site URL** from `http://localhost:9999` to `https://bookedbarber.com`
3. Ensure **Redirect URLs** include:
   - `https://bookedbarber.com/auth/callback`
   - `https://bookedbarber.com/auth/callback/`
   - `http://localhost:9999/auth/callback` (keep for development)

#### Verify Google OAuth
1. Ensure Google OAuth is enabled in Supabase
2. Check that Google Cloud Console has correct redirect URIs:
   - `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
   - Both production and localhost URLs

### 2. Environment Variables 🔐

#### Production (.env.production)
```bash
# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://bookedbarber.com

# OpenAI (if using AI features)
OPENAI_API_KEY=[YOUR-OPENAI-KEY]

# CIN7 Integration (if configured)
CIN7_API_KEY=[YOUR-CIN7-KEY]
CIN7_API_URL=https://api.cin7.com

# Analytics (optional)
NEXT_PUBLIC_GA_ID=[YOUR-GA-ID]
```

### 3. Code Updates 📝

#### Update Authentication Timing (if needed)
The current auth flow has these timings optimized for production:
- Auth callback wait: 1.5 seconds
- Welcome page OAuth detection: 3 seconds
- Onboarding API delay: 500ms

These should work well in production, but monitor for any issues.

### 4. Database Preparation 🗄️

#### Run Production Migrations
```sql
-- Ensure profiles table has proper RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Policy for users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Policy for profile creation on signup
CREATE POLICY "Enable insert for authenticated users only" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
```

### 5. Build & Deploy Commands 🚀

#### Local Build Test
```bash
# Test production build locally
npm run build
npm run start

# Check for any build errors
```

#### Vercel Deployment
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy to production
vercel --prod

# Or use Git integration (recommended)
git push origin main
```

### 6. Post-Deployment Verification ✔️

#### Critical Tests
1. **OAuth Flow**
   - [ ] Google Sign-in works
   - [ ] Session persists after refresh
   - [ ] Welcome page loads correctly after auth
   - [ ] No console errors

2. **Onboarding Flow**
   - [ ] New users can complete onboarding
   - [ ] Progress saves correctly
   - [ ] Dashboard accessible after completion

3. **Protected Routes**
   - [ ] Unauthenticated users redirected to login
   - [ ] Authenticated users can access dashboard
   - [ ] Sign out works correctly

4. **API Endpoints**
   - [ ] All API routes return correct status codes
   - [ ] Error handling works properly
   - [ ] Rate limiting is in place

### 7. Monitoring Setup 📊

#### Essential Monitoring
1. **Vercel Analytics** - Automatic with Vercel deployment
2. **Supabase Dashboard** - Monitor auth events and database
3. **Error Tracking** - Already configured in `/api/errors`

#### Health Check Endpoint
```bash
# Test production health
curl https://bookedbarber.com/api/health
```

### 8. DNS Configuration 🌐

#### Required DNS Records
```
Type  | Name | Value
------|------|-------
A     | @    | 76.76.21.21 (Vercel IP)
CNAME | www  | cname.vercel-dns.com
```

### 9. SSL Certificate 🔒
- Automatically handled by Vercel
- Ensure force HTTPS is enabled

### 10. Performance Optimizations ⚡

#### Already Implemented
- Context window optimization
- Efficient database queries
- Proper caching strategies
- Optimized bundle size

#### Monitor Post-Launch
- Page load times
- Time to Interactive (TTI)
- Core Web Vitals

## Deployment Steps

### Step 1: Update Supabase
1. Change Site URL to `https://bookedbarber.com`
2. Verify all redirect URLs are correct
3. Test OAuth in Supabase dashboard

### Step 2: Deploy to Vercel
```bash
# Ensure you're on main branch
git checkout main

# Push latest changes
git push origin main

# Vercel will auto-deploy if connected to GitHub
# Or manually deploy:
vercel --prod
```

### Step 3: Verify Production
1. Visit https://bookedbarber.com
2. Test complete auth flow
3. Check console for errors
4. Verify all features work

### Step 4: Update Local Development
After production deployment, for local development:
1. Keep using `localhost:9999` locally
2. Switch Supabase Site URL back to `http://localhost:9999` when developing
3. Use environment variables to manage differences

## Rollback Plan 🔄

If issues occur:
1. **Vercel**: Use instant rollback in Vercel dashboard
2. **Supabase**: Revert Site URL if auth issues
3. **Database**: Restore from Supabase backups if needed

## Support Contacts 📞

- **Vercel Support**: https://vercel.com/support
- **Supabase Support**: https://supabase.com/support
- **Your Team**: Update with your contact info

## Notes

- The authentication fix we implemented handles both localhost and production
- Site URL in Supabase must match where users are accessing the site
- Always test auth flow after any Supabase configuration changes
- Keep localhost URLs in redirect list for development

---

**Last Updated**: 2025-08-15
**Status**: Ready for Production Deployment
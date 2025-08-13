# GMB Integration Deployment Checklist for BookedBarber

## 🚀 Production Deployment Checklist

### 1. Google Cloud Console Setup ✅

#### Create OAuth 2.0 Credentials:
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com)
- [ ] Create or select project: "BookedBarber Production"
- [ ] Enable **Google My Business API**
- [ ] Create OAuth 2.0 Client ID (Web application)

#### Configure OAuth Client:
- [ ] Name: "BookedBarber GMB Integration"
- [ ] Add Authorized JavaScript Origins:
  ```
  http://localhost:9999
  http://localhost:3000
  https://bookedbarber.com
  https://www.bookedbarber.com
  ```
- [ ] Add Authorized Redirect URIs:
  ```
  http://localhost:9999/api/gmb/oauth/callback
  http://localhost:3000/api/gmb/oauth/callback
  https://bookedbarber.com/api/gmb/oauth/callback
  https://www.bookedbarber.com/api/gmb/oauth/callback
  ```

### 2. OAuth Consent Screen Configuration ✅

- [ ] App name: "BookedBarber"
- [ ] User support email: support@bookedbarber.com
- [ ] App logo: Upload BookedBarber logo
- [ ] Application home page: https://bookedbarber.com
- [ ] Privacy policy: https://bookedbarber.com/privacy
- [ ] Terms of service: https://bookedbarber.com/terms
- [ ] Authorized domains: bookedbarber.com
- [ ] Scopes: `https://www.googleapis.com/auth/business.manage`

### 3. Environment Variables Setup ✅

#### Development (.env.local):
```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

#### Production (Vercel/Hosting Platform):
```bash
NODE_ENV=production
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_API_URL=https://bookedbarber.com
```

### 4. Database Setup ✅

- [ ] Run GMB schema migration in production Supabase:
  ```sql
  -- Execute the contents of database/gmb-integration-schema.sql
  ```
- [ ] Verify tables created:
  - gmb_accounts
  - gmb_reviews
  - gmb_review_attributions
  - gmb_review_responses
  - gmb_insights
  - gmb_posts
  - gmb_questions_answers
  - oauth_states

### 5. Testing Checklist ✅

#### Local Development:
- [ ] Test OAuth flow with localhost redirect
- [ ] Verify token storage in database
- [ ] Test review sync functionality
- [ ] Verify AI attribution engine

#### Staging Environment:
- [ ] Deploy to staging URL
- [ ] Test OAuth with staging domain
- [ ] Verify all API endpoints work
- [ ] Test with real GMB account

#### Production:
- [ ] Deploy to bookedbarber.com
- [ ] Test OAuth flow end-to-end
- [ ] Monitor error logs
- [ ] Verify webhook functionality

### 6. Security Checklist ✅

- [ ] OAuth credentials stored as environment variables
- [ ] HTTPS enforced on all OAuth endpoints
- [ ] CSRF protection via state parameter
- [ ] Token encryption in database
- [ ] Rate limiting on API endpoints
- [ ] Input validation on all endpoints

### 7. Monitoring Setup ✅

- [ ] Error tracking for OAuth failures
- [ ] Analytics for GMB connection success rate
- [ ] Alerts for API quota limits
- [ ] Performance monitoring for review sync

### 8. Documentation ✅

- [ ] Update user documentation
- [ ] Create admin guide for GMB management
- [ ] Document API endpoints
- [ ] Add troubleshooting guide

## 🔥 Production URLs

### Frontend Pages:
- Dashboard: https://bookedbarber.com/seo/dashboard
- GMB Tab: https://bookedbarber.com/seo/dashboard#gmb

### API Endpoints:
- OAuth Init: https://bookedbarber.com/api/gmb/oauth
- OAuth Callback: https://bookedbarber.com/api/gmb/oauth/callback
- Reviews API: https://bookedbarber.com/api/gmb/reviews
- Attribution API: https://bookedbarber.com/api/gmb/attribution

## 📝 Post-Deployment Verification

After deployment, verify these critical flows:

1. **OAuth Connection Flow:**
   - User clicks "Connect GMB Account"
   - Redirected to Google OAuth
   - Authorizes application
   - Redirected back to BookedBarber
   - GMB account connected successfully

2. **Review Sync Flow:**
   - Reviews fetched from GMB API
   - AI attribution processes reviews
   - Barbers credited in database
   - Dashboard displays attribution

3. **Auto-Response Flow:**
   - New review detected
   - AI generates response
   - Response posted to GMB
   - Tracking in database

## 🚨 Common Issues & Solutions

### Issue: "Invalid Client" Error
**Solution:** Verify OAuth client ID matches exactly in Google Console and environment variables

### Issue: "Redirect URI Mismatch"
**Solution:** Ensure exact match including protocol (https://) and no trailing slashes

### Issue: "Access Blocked"
**Solution:** Add user to test users list or submit app for Google verification

### Issue: "Quota Exceeded"
**Solution:** Request quota increase in Google Cloud Console

## 📊 Success Metrics

Track these KPIs after launch:
- GMB connection success rate: Target > 95%
- Review attribution accuracy: Target > 90%
- Auto-response engagement rate: Target > 70%
- API error rate: Target < 1%

## 🎯 Go-Live Checklist

Before announcing the feature:
- [ ] All production OAuth credentials configured
- [ ] Database migrations complete
- [ ] Error monitoring active
- [ ] Support team trained
- [ ] Documentation published
- [ ] Beta testing complete
- [ ] Performance benchmarks met
- [ ] Security audit passed

## 🔗 Useful Links

- [Google My Business API Docs](https://developers.google.com/my-business)
- [OAuth 2.0 Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [BookedBarber Admin Panel](https://bookedbarber.com/admin)
- [Supabase Dashboard](https://app.supabase.com/project/dfhqjdoydihajmjxniee)

---

**Last Updated:** August 2025
**Status:** Ready for Google Cloud Configuration
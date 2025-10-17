# Production Deployment Checklist

## 🔧 Environment Variables - Critical

These environment variables **MUST** be set in your Vercel production environment for the application to function correctly.

### Required (Application will fail without these):

```bash
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...your-service-role-key
```

**How to verify**:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Confirm all three Supabase variables are set for "Production" environment
3. Test with: `curl https://bookbarber.com/api/health`

### Optional but Recommended:

```bash
# AI Services (For AI features)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GEMINI_API_KEY=...

# Payment Processing (For billing features)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Real-time Features (For live updates)
PUSHER_APP_ID=...
NEXT_PUBLIC_PUSHER_KEY=...
PUSHER_SECRET=...
NEXT_PUBLIC_PUSHER_CLUSTER=us2

# Error Tracking (For production monitoring)
NEXT_PUBLIC_SENTRY_DSN=...

# Notifications (For customer communications)
NOVU_API_KEY=...
NEXT_PUBLIC_NOVU_APP_IDENTIFIER=...
```

---

## 🏥 Health Check Endpoints

### 1. Application Health
```bash
GET https://bookbarber.com/api/health
```

**Expected Response (200 OK)**:
```json
{
  "status": "ok",
  "services": {
    "supabase": { "status": "healthy" },
    "stripe": { "status": "configured" }
  }
}
```

**Failure Indicators**:
- Status code: 503 or 206 → Critical services are down
- `services.supabase.status: "error"` → Database connection failed
- Missing environment variables → Check Vercel settings

### 2. Database Connection Test
```bash
node scripts/test-production-db.js user@bookbarber.com
```

This script will:
- ✓ Verify all environment variables are set
- ✓ Test Supabase connection
- ✓ Query user profile
- ✓ Test location access
- ✓ Test appointments data
- ✓ Test customers data

---

## 🔍 Common Production Issues

### Issue 1: "No Location Available" on Dashboard

**Symptoms**:
- Dashboard shows "No Location Available"
- Empty data everywhere
- Console shows: \`No location selected in GlobalDashboardContext\`

**Root Causes**:
1. **Profile missing \`barbershop_id\`**: User's profile doesn't have a location assigned
   - **Fix**: Update user's profile in Supabase with correct \`barbershop_id\`

2. **Location API returning empty**: \`/api/user/locations\` returns no locations
   - **Fix**: Check RLS policies on \`barbershops\` table
   - **Fix**: Verify user has access to at least one barbershop

3. **Database connection failed**: Environment variables incorrect
   - **Fix**: Check Vercel environment variables match Supabase dashboard

**Debug Steps**:
```bash
# 1. Check user profile
node scripts/test-production-db.js user@bookbarber.com

# 2. Check health endpoint
curl https://bookbarber.com/api/health | jq .

# 3. Check if user has locations (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" \\
     https://bookbarber.com/api/user/locations | jq .
```

### Issue 2: 404 Errors in Console

**Fixed**: Created placeholder page at \`/app/(protected)/dashboard/campaigns/billing/page.js\`

### Issue 3: Data Not Loading Despite Authentication

**Symptoms**:
- User is logged in
- Dashboard loads but shows empty states
- No appointments, customers, or analytics data

**Root Causes**:
1. **RLS Policies Blocking Access**: Row Level Security policies in Supabase are too restrictive
   - **Fix**: Review RLS policies in Supabase Dashboard
   - **Fix**: Ensure authenticated users can read their own data

2. **API Endpoints Failing**: Backend APIs returning errors
   - **Fix**: Check Vercel deployment logs
   - **Fix**: Test individual API endpoints

**Debug Steps**:
```bash
# Test analytics API
curl "https://bookbarber.com/api/analytics/live-data?barbershop_id=YOUR_SHOP_ID&format=json"

# Test appointments API
curl "https://bookbarber.com/api/appointments?barbershop_id=YOUR_SHOP_ID"

# Test dashboard metrics API
curl "https://bookbarber.com/api/dashboard/metrics?mode=executive&barbershop_id=YOUR_SHOP_ID"
```

---

## 📋 Pre-Deployment Checklist

Before deploying to production, verify:

- [ ] All required environment variables are set in Vercel
- [ ] Supabase credentials are for the **production** project
- [ ] RLS policies allow authenticated users to access their data
- [ ] Health endpoint returns 200 OK
- [ ] Database test script runs successfully
- [ ] At least one test user has a valid \`barbershop_id\` in their profile
- [ ] Test user can access \`/api/user/locations\` and see their shops

---

## 🚨 Emergency Rollback

If production deployment breaks:

### Option 1: Revert to Previous Deployment
1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click "..." → "Promote to Production"

### Option 2: Enable Development Mode Bypass
1. Add to Vercel environment variables:
   ```bash
   NEXT_PUBLIC_DEV_MODE=true
   ```
2. This will use fallback mock data if database fails
3. **DO NOT** leave this enabled long-term

---

## 📞 Support Contacts

**Database Issues**: Check Supabase Dashboard → Logs
**Deployment Issues**: Check Vercel Dashboard → Deployment Logs
**API Errors**: Check Sentry (if configured)

---

## 🔗 Related Documentation

- [API Reference](/docs/API_REFERENCE.md)
- [Staff ID Architecture](/docs/STAFF_ID_ARCHITECTURE.md)
- [Schema Standards](/docs/SCHEMA_STANDARDS.md)
- [Supabase Production Rule](/SUPABASE_PRODUCTION_RULE.md)

---

**Last Updated**: 2025-10-11
**Deployment Target**: bookbarber.com (Vercel Production)

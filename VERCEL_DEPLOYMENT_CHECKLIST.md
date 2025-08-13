# Vercel Deployment Checklist

## ✅ Git Push Complete
**Commit**: `d790cd2` - feat: Complete enhanced onboarding system with custom domain support
**Repository**: https://github.com/c50bossio/6fb-dashboard-staging.git
**Branch**: main

## 🚀 Vercel Auto-Deployment Status

### 1. Check Deployment Progress
Visit your Vercel dashboard to monitor the deployment:
- **URL**: https://vercel.com/dashboard
- **Project**: 6fb-dashboard-staging
- **Expected Build Time**: 2-5 minutes

### 2. Environment Variables to Verify/Add

⚠️ **CRITICAL**: Add these in Vercel Dashboard → Settings → Environment Variables

```bash
# Required for Onboarding System
NEXT_PUBLIC_SUPABASE_URL=https://dfhqjdoydihajmjxniee.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Your anon key]
SUPABASE_SERVICE_ROLE_KEY=[Your service role key]

# Required for Email Features (Domain Setup)
SENDGRID_API_KEY=[Your SendGrid key]
SENDGRID_FROM_EMAIL=support@yourdomain.com

# Required for Domain Purchase (Optional)
STRIPE_SECRET_KEY=[Your Stripe secret key]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[Your Stripe publishable key]

# Optional - Domain Registrar APIs
NAMECHEAP_API_KEY=[Optional]
GODADDY_API_KEY=[Optional]
```

### 3. Database Migration - REQUIRED

Copy and run this in your Supabase SQL Editor:

```sql
-- Onboarding System Database Migration
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Add onboarding fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS user_goals TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS business_size VARCHAR(50);

-- 2. Add custom domain fields to barbershops table
ALTER TABLE barbershops
ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255),
ADD COLUMN IF NOT EXISTS domain_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS domain_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS business_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS business_hours_template VARCHAR(50);

-- 3. Create onboarding progress tracking table
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step_name VARCHAR(100) NOT NULL,
  step_data JSONB,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, step_name)
);

-- 4. Create domain purchases table (for domain management)
CREATE TABLE IF NOT EXISTS domain_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending_payment',
  price DECIMAL(10,2),
  registration_years INTEGER DEFAULT 1,
  auto_renew BOOLEAN DEFAULT TRUE,
  stripe_session_id VARCHAR(255),
  registered_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create domain setup emails tracking
CREATE TABLE IF NOT EXISTS domain_setup_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  provider VARCHAR(50),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_barbershops_custom_domain ON barbershops(custom_domain);
CREATE INDEX IF NOT EXISTS idx_domain_purchases_user ON domain_purchases(user_id);

-- Success message
SELECT 'Migration completed successfully!' as message;
```

### 4. Post-Deployment Testing

Once deployment is complete, test these endpoints:

```bash
# 1. Health Check
curl https://[your-vercel-domain].vercel.app/api/health

# 2. Onboarding API (requires auth)
curl https://[your-vercel-domain].vercel.app/api/onboarding/save-progress \
  -H "Authorization: Bearer [token]"

# 3. Domain Check API
curl https://[your-vercel-domain].vercel.app/api/domains/check-status?domain=test.com

# 4. Welcome Page
open https://[your-vercel-domain].vercel.app/welcome
```

### 5. Monitoring Checklist

- [ ] Build succeeded in Vercel
- [ ] No errors in function logs
- [ ] Database migration applied
- [ ] Environment variables set
- [ ] OAuth login working
- [ ] Onboarding flow accessible
- [ ] API endpoints responding

### 6. Quick Rollback (if needed)

If issues occur:
1. Go to Vercel Dashboard → Deployments
2. Find the previous successful deployment
3. Click "..." menu → "Promote to Production"
4. Deployment rolls back in ~30 seconds

### 7. Success Criteria

✅ **Deployment is successful when:**
- Build completes without errors
- All API endpoints return 200 status
- OAuth login works
- Welcome/onboarding page loads
- No JavaScript errors in browser console

## 📊 Expected Improvements

After this deployment, you should see:
- **3-5 minute onboarding** (vs 15+ minutes before)
- **Custom domain options** for all users
- **Automated email support** reducing support tickets
- **Better user retention** with progressive disclosure

## 🎉 Next Steps After Deployment

1. **Test the full onboarding flow** as a new user
2. **Monitor analytics** for completion rates
3. **Check email delivery** for domain setup instructions
4. **Gather team feedback** on the new flow
5. **Plan gradual rollout** if using feature flags

---

**Deployment Initiated**: January 13, 2025
**Expected Completion**: ~5 minutes
**Support Contact**: [Your support channel]
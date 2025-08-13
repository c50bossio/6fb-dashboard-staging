# 🚀 Vercel Deployment Setup - Complete Configuration

## Current Setup Status

### ✅ What's Already Configured
- **Vercel Project**: `bookedbarber-app` 
- **Project ID**: `prj_KIHvAYXDWJViEh8lF7yLSAxIs8mB`
- **Team**: `6fb`
- **GitHub Repo**: `c50bossio/6fb-dashboard-staging` (linked)
- **Staging Branch**: `staging` (exists)
- **Current Deployment**: https://bookedbarber-k7n0wgcz0-6fb.vercel.app

### 🔧 Manual Configuration Required

## Step 1: Configure Production Domain (URGENT)

### A. Add Domain in Vercel Dashboard
1. Go to: https://vercel.com/6fb/bookedbarber-app/settings/domains
2. Click "Add Domain"
3. Enter: `bookedbarber.com`
4. Click "Add"
5. Repeat for: `www.bookedbarber.com`

### B. DNS Configuration (Domain Provider)
Add these DNS records to your domain provider:

```dns
# For bookedbarber.com
Type: A
Name: @
Value: 76.76.21.21

# For www.bookedbarber.com  
Type: CNAME
Name: www
Value: cname.vercel-dns.com

# For staging.bookedbarber.com
Type: CNAME
Name: staging  
Value: cname.vercel-dns.com
```

## Step 2: Configure GitHub Auto-Deployment

### A. Add GitHub Secrets
Go to: https://github.com/c50bossio/6fb-dashboard-staging/settings/secrets/actions

Add these secrets:
```
VERCEL_TOKEN=<get_from_vercel_account_tokens>
VERCEL_ORG_ID=team_EWNbQ0KmQeOpej81bL7TINVY
VERCEL_PROJECT_ID=prj_KIHvAYXDWJViEh8lF7yLSAxIs8mB
```

### B. Get Vercel Token
1. Go to: https://vercel.com/account/tokens
2. Create new token: "GitHub Actions Deploy"
3. Copy token and add as `VERCEL_TOKEN` secret

## Step 3: Environment Variables Setup

### A. Production Environment
Go to: https://vercel.com/6fb/bookedbarber-app/settings/environment-variables

Add these for **Production**:
```
NEXT_PUBLIC_ENV=production
NEXT_PUBLIC_API_URL=https://api.bookedbarber.com
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=<your_production_supabase_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_production_supabase_key>
SUPABASE_SERVICE_ROLE_KEY=<your_production_service_key>
STRIPE_SECRET_KEY=<your_production_stripe_key>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your_production_stripe_public_key>
SENDGRID_API_KEY=<your_sendgrid_key>
```

### B. Preview Environment  
Add these for **Preview** (staging):
```
NEXT_PUBLIC_ENV=staging
NEXT_PUBLIC_API_URL=https://staging-api.bookedbarber.com
NODE_ENV=production
# Use same keys as production for now, or create staging-specific ones
```

## Step 4: Git Branch Configuration

### A. Production Branch Setup
In Vercel Dashboard → Settings → Git:
1. **Production Branch**: `main`
2. **Auto-deploy**: ✅ Enabled
3. **Ignore Build Step**: ❌ Disabled

### B. Staging Branch Setup
1. **Preview Deployments**: ✅ Enabled for all branches
2. **Staging Branch**: `staging` → will auto-deploy to preview URL

## Step 5: Deployment Flow Configuration

### Current Workflow After Setup:
```bash
# Development → Preview
git checkout -b feature/new-feature
git push origin feature/new-feature
# → Creates: https://feature-new-feature-bookedbarber.vercel.app

# Staging → Staging Environment  
git checkout staging
git merge feature/new-feature
git push origin staging
# → Deploys to: https://staging-bookedbarber.vercel.app (or similar preview URL)

# Production → Live Site
git checkout main  
git merge staging
git push origin main
# → Deploys to: https://bookedbarber.com
```

## Step 6: Test the Setup

### A. Test Production Deployment
```bash
# Make a small change and push to main
echo "# Production Test" >> test-deploy.md
git add test-deploy.md
git commit -m "test: production deployment"
git push origin main
```

### B. Verify Deployment
1. Check Vercel Dashboard for deployment status
2. Visit https://bookedbarber.com (after DNS propagation)
3. Test all functionality

## Step 7: Monitoring & Alerts

### A. Vercel Integrations
1. Go to: https://vercel.com/6fb/bookedbarber-app/settings/integrations
2. Add Slack integration for deployment notifications
3. Add GitHub integration for automatic PR deployments

### B. Performance Monitoring
1. Enable Vercel Analytics
2. Set up Lighthouse CI
3. Configure performance budgets

## Current Deployment URLs

### ✅ Active Deployments
- **Latest**: https://bookedbarber-k7n0wgcz0-6fb.vercel.app
- **Production** (pending DNS): https://bookedbarber.com
- **Staging** (on staging branch push): https://staging-bookedbarber.vercel.app

### 🔧 Manual Actions Required

#### Immediate (Critical):
1. **Add domains in Vercel Dashboard** 
2. **Configure DNS records**
3. **Add GitHub secrets**
4. **Set environment variables**

#### Next (Important):
1. **Test staging deployment**
2. **Test production deployment**  
3. **Set up monitoring**
4. **Configure alerts**

## Quick Setup Commands

```bash
# 1. Run the setup script
./scripts/setup-vercel-deployment.sh

# 2. Deploy to staging
git checkout staging
git push origin staging

# 3. Deploy to production  
git checkout main
git push origin main

# 4. Check deployment status
vercel inspect
```

## Troubleshooting

### Domain Not Working
- Check DNS propagation: https://dnschecker.org
- Verify DNS records are correct
- Wait up to 48 hours for global propagation

### Build Failures
- Check build logs in Vercel Dashboard
- Verify environment variables are set
- Test build locally: `npm run build`

### GitHub Integration Issues
- Verify GitHub secrets are correct
- Check repository permissions
- Re-link GitHub integration in Vercel

## Support Resources

- **Vercel Dashboard**: https://vercel.com/6fb/bookedbarber-app
- **GitHub Repository**: https://github.com/c50bossio/6fb-dashboard-staging
- **DNS Checker**: https://dnschecker.org
- **Vercel Documentation**: https://vercel.com/docs

---

## Next Steps Summary

1. ✅ **Complete Vercel project setup** (Done)
2. 🔧 **Add production domain manually** (Required)
3. 🔧 **Configure DNS records** (Required)  
4. 🔧 **Add GitHub secrets** (Required)
5. 🔧 **Set environment variables** (Required)
6. ✅ **Create staging branch** (Done)
7. 🔧 **Test deployments** (After manual setup)

**Status**: Ready for manual configuration in Vercel Dashboard
**ETA to Live**: 30 minutes after DNS configuration
**Automatic Deployments**: Will work after GitHub secrets are added
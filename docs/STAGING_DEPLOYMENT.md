# 🚀 Staging Deployment Guide

## 6FB AI Agent System - Staging Environment Setup

This guide will help you deploy the 6FB AI Agent System to a staging environment for final validation before production launch.

## 📋 Prerequisites

- [x] Production database schema created
- [x] Row Level Security policies configured
- [x] Environment variables template ready
- [x] All critical bugs fixed and tested locally

## 🎯 Deployment Options

### Option 1: Vercel (Recommended)

#### Step 1: Prepare Repository
```bash
# Ensure clean git state
git add .
git commit -m "feat: staging deployment preparation"
git push origin main
```

#### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project" 
3. Import your GitHub repository
4. Configure as follows:
   - **Framework**: Next.js
   - **Root Directory**: `/` (default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (default)

#### Step 3: Configure Environment Variables
Copy from `.env.production.example` and set:

**Required Variables:**
```env
# Database
NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-staging-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-staging-service-key

# Application  
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://your-app-staging.vercel.app
NEXTAUTH_URL=https://your-app-staging.vercel.app
NEXTAUTH_SECRET=your-secure-staging-secret-32-chars

# Stripe (TEST MODE)
STRIPE_SECRET_KEY=sk_test_...your-stripe-test-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...your-stripe-test-key

# Email (optional for staging)
SENDGRID_API_KEY=SG.your-sendgrid-key
FROM_EMAIL=staging@yourdomain.com
```

#### Step 4: Deploy
```bash
# Or deploy via CLI
npm install -g vercel
vercel login
vercel --prod
```

### Option 2: Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and initialize
railway login
railway init

# Deploy
railway up

# Set environment variables
railway variables set NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
railway variables set NEXTAUTH_SECRET=your-secure-secret
# ... set all required variables
```

### Option 3: Netlify

```bash
# Install Netlify CLI  
npm install -g netlify-cli

# Login and deploy
netlify login
netlify init
netlify deploy --prod

# Set environment variables in Netlify dashboard
```

## 🗄️ Database Setup

### Create Staging Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project: `6fb-staging`
3. Choose same region as production
4. Set strong database password

### Run Database Schema
```sql
-- In Supabase SQL Editor, run:
-- Copy contents of database/production-setup.sql
-- Execute the complete script
```

### Verify Database
```sql
-- Check tables created
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Check RLS enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- Test basic queries
SELECT count(*) FROM profiles;
SELECT count(*) FROM barbershops;
```

## ✅ Validation Checklist

### Pre-Deployment
- [ ] Git repository is clean and pushed
- [ ] Staging Supabase project created
- [ ] Database schema deployed
- [ ] Environment variables configured
- [ ] Stripe test keys configured

### Post-Deployment  
- [ ] Application loads without errors
- [ ] Health check endpoint responds
- [ ] Database connection working
- [ ] API endpoints responding correctly
- [ ] Public booking flow testable

### Automated Validation
```bash
# Run staging validation script
cd "/path/to/6FB AI Agent System"
STAGING_API_URL=https://your-staging-url.vercel.app node scripts/staging-deployment-validation.js
```

## 🧪 Testing Staging Environment

### Manual Testing Checklist

#### 1. System Health
- [ ] Visit staging URL loads correctly
- [ ] No JavaScript console errors
- [ ] All CSS styles loading
- [ ] Mobile responsive design working

#### 2. Public Booking Flow
- [ ] Can access booking page
- [ ] Service selection works
- [ ] Date/time picker functional  
- [ ] Customer info form validates
- [ ] Booking submission attempts work (may show validation errors without test data)

#### 3. Authentication
- [ ] Login page loads
- [ ] Registration form works
- [ ] Proper auth redirects
- [ ] Protected routes secured

#### 4. Dashboard (if accessible)
- [ ] Analytics page loads
- [ ] No critical JavaScript errors
- [ ] Real-time data connections work
- [ ] Mobile dashboard functional

### Automated Testing
```bash
# Run comprehensive test suite
npm run test:staging

# Performance testing
npm run test:performance:staging

# Security testing  
npm run test:security:staging
```

## 🔧 Common Issues & Solutions

### Issue: "Failed to load resource"
**Solution**: Check environment variables are set correctly in deployment platform

### Issue: Database connection errors
**Solution**: Verify Supabase URL and keys, ensure RLS policies allow access

### Issue: Slow API responses
**Solution**: Check database indexes, verify Supabase region matches deployment

### Issue: Build failures
**Solution**: Ensure all dependencies in package.json, check build logs

## 📊 Success Criteria

### Performance Targets
- ✅ Page load time < 3 seconds
- ✅ API response time < 500ms 
- ✅ Zero critical JavaScript errors
- ✅ 95%+ successful health checks

### Functional Requirements
- ✅ Database connectivity working
- ✅ Authentication flow functional
- ✅ Public booking endpoints responding
- ✅ Error handling graceful
- ✅ Mobile experience optimized

## 🚀 Next Steps After Staging

Once staging validation passes:

1. **Document any issues found** and their solutions
2. **Update production deployment plan** based on staging experience  
3. **Prepare production database** with real configurations
4. **Schedule production deployment** at low-traffic time
5. **Notify team** of go-live timeline

## 📞 Staging URLs

Update these with your actual staging URLs:

- **Frontend**: https://your-app-staging.vercel.app
- **API Health**: https://your-app-staging.vercel.app/api/health  
- **Database**: Staging Supabase dashboard
- **Logs**: Deployment platform logs

## ⚠️ Important Notes

### Security Considerations
- Use separate Supabase project for staging
- Use Stripe test keys only
- Don't use production API keys in staging
- Limit access to staging environment

### Data Management
- Use test data only in staging
- Don't sync production data to staging
- Clear staging data regularly
- Monitor staging usage and costs

---

## 🎉 Staging Deployment Complete!

Your staging environment is now ready for comprehensive testing. Run the validation script and address any issues before proceeding to production deployment.

**Next**: Once staging validation passes, proceed with production deployment following the Production Deployment Guide.
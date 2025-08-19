# 🚀 Production Deployment Checklist

## Pre-Deployment Verification ✅

### 1. Environment Variables
- [ ] Copy `.env.production.template` to `.env.production`
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL` (from Supabase dashboard)
- [ ] Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from Supabase dashboard)
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` (from Supabase dashboard)
- [ ] Set AI API keys (OpenAI, Anthropic, Google)
- [ ] Set Stripe keys for payments
- [ ] Set email/SMS service keys (SendGrid, Twilio)

### 2. Supabase Configuration
- [ ] Enable Row Level Security on all tables
- [ ] Verify RLS policies are active
- [ ] Check database connection pooling is enabled
- [ ] Confirm authentication providers are configured
- [ ] Test Google OAuth in production settings

### 3. Build Verification
```bash
# Run these commands before deploying
npm run lint          # Should pass with warnings only
npm run build         # Should generate 220+ static pages
npm run test:basic    # Basic tests should pass
```

### 4. Security Checklist (Simplified)
- [ ] ✅ Using Supabase authentication (JWT tokens)
- [ ] ✅ RLS policies enabled on all tables
- [ ] ✅ HTTPS enforced (handled by hosting provider)
- [ ] ✅ Stripe handling payment security
- [ ] ❌ NO CSRF tokens (intentionally removed - see SECURITY-GUIDELINES.md)
- [ ] ❌ NO complex CSP headers (they break OAuth)

## Deployment Options

### Option 1: Vercel (Recommended for Next.js)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod

# Set environment variables in Vercel dashboard
# https://vercel.com/dashboard/[your-project]/settings/environment-variables
```

**Pros:**
- Automatic HTTPS
- Global CDN for static pages
- Automatic deployments from GitHub
- Built for Next.js

### Option 2: Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and initialize
railway login
railway init

# Deploy
railway up

# Set environment variables
railway variables set KEY=value
```

**Pros:**
- Includes database hosting
- Simple deployment process
- Good for full-stack apps

### Option 3: Docker + Cloud Provider

```bash
# Build Docker image
docker build -t barbershop-app .

# Run locally to test
docker-compose up

# Deploy to cloud provider (AWS, GCP, Azure)
# See provider-specific instructions
```

## Post-Deployment Checklist

### Immediate Verification (First 5 Minutes)
- [ ] Homepage loads without errors
- [ ] Login with email/password works
- [ ] Google OAuth authentication works
- [ ] Database connection confirmed (check Supabase dashboard)
- [ ] No CSRF token errors in console

### Functional Testing (First Hour)
- [ ] Create a test booking
- [ ] Test payment flow with Stripe test card (4242 4242 4242 4242)
- [ ] Verify email notifications sent
- [ ] Check barber dashboard loads
- [ ] Test customer search functionality
- [ ] Verify AI chat features work

### Monitoring Setup
- [ ] Check Vercel/Railway logs for errors
- [ ] Monitor Supabase dashboard for database errors
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure error alerts (email/Slack)

## Common Deployment Issues & Solutions

### Issue: "CSRF token mismatch"
**Solution:** This should not happen anymore. If it does, check that CSRF code wasn't accidentally re-added.

### Issue: "Cannot connect to Supabase"
**Solution:** 
1. Verify environment variables are set correctly
2. Check Supabase project is not paused
3. Confirm service role key is correct

### Issue: "OAuth redirect mismatch"
**Solution:**
1. Add production URL to Supabase Auth settings
2. Update Google OAuth authorized redirect URIs
3. Format: `https://your-domain.com/auth/callback`

### Issue: "Build fails on Vercel"
**Solution:**
1. Ensure all environment variables are set in Vercel
2. Check Node version matches local (18.x or 20.x)
3. Clear build cache and retry

## Production Environment Variables

### Required for Launch
```env
# Core Configuration
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI Services (at least one)
OPENAI_API_KEY=sk-...
# OR
ANTHROPIC_API_KEY=sk-ant-...

# Payments
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Optional but Recommended
```env
# Email/SMS
SENDGRID_API_KEY=SG...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...

# Monitoring
SENTRY_DSN=https://...@sentry.io/...

# Analytics
NEXT_PUBLIC_GA_ID=G-...
```

## Quick Deployment Commands

### Vercel One-Line Deploy
```bash
vercel --prod --env-file .env.production
```

### Railway One-Line Deploy
```bash
railway up --service barbershop-app
```

### Manual Node.js Deploy
```bash
npm run build && npm start
```

## Final Pre-Launch Checklist

### Technical Requirements ✅
- [ ] Build completes without errors
- [ ] All environment variables set
- [ ] Database migrations applied
- [ ] RLS policies active
- [ ] OAuth providers configured

### Business Requirements ✅
- [ ] Payment processing tested
- [ ] Email notifications working
- [ ] Terms of service and privacy policy pages live
- [ ] Contact information updated
- [ ] Demo data removed

### Security Requirements ✅
- [ ] Production passwords set (not defaults)
- [ ] API keys are production keys (not test)
- [ ] HTTPS enforced
- [ ] Admin routes protected
- [ ] No console.log statements in production code

## Launch Command 🚀

Once all checks are complete:

```bash
# Deploy to production
npm run deploy:production

# Or with Vercel
vercel --prod

# Or with Railway  
railway up --environment production
```

## Post-Launch Monitoring

### First 24 Hours
- Monitor error logs every 2 hours
- Check database performance
- Verify no memory leaks
- Monitor API rate limits
- Check user signups and bookings

### First Week
- Daily error log review
- Performance metrics review
- User feedback collection
- Database optimization if needed
- Cost monitoring (hosting, APIs)

## Support Contacts

- **Supabase Issues**: https://supabase.com/dashboard/support
- **Vercel Support**: https://vercel.com/support
- **Railway Support**: https://railway.app/help
- **Stripe Support**: https://support.stripe.com

---

## 🎉 Launch Day!

Remember: Your security is appropriately simplified for a barbershop booking app. Don't let anyone convince you to add complex security that breaks authentication. 

The app is ready to ship with:
- ✅ Supabase authentication
- ✅ Row Level Security
- ✅ Basic input validation
- ✅ HTTPS everywhere
- ✅ Stripe payment security

Good luck with your launch! 🚀
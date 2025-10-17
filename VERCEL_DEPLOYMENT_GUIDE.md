# Vercel Production Deployment Guide

## 🔍 Current Status

**DISCOVERY**: The production site `bookbarber.com` is NOT deployed yet!

- ❌ `bookbarber.com` → Parked GoDaddy domain (not connected to Vercel)
- ❌ `6fb-ai-staging.vercel.app` → No deployment found
- ✅ Local development → Working perfectly (database tests pass)
- ✅ Code → Production-ready with enhanced error handling

**Good News**: There's nothing broken! You just need to deploy the application.

---

## 📋 Deployment Checklist

### Step 1: Deploy to Vercel (First Time)

If you haven't deployed yet, run:

```bash
# Install Vercel CLI if you haven't already
npm i -g vercel

# Deploy to Vercel
cd "/Users/bossio/6FB AI Agent System"
vercel

# Follow the prompts:
# - Link to existing project? Yes → Select: 6fb-ai-staging
# - Which scope? Your team/account
# - Found project settings? Yes
```

This will deploy to: `https://6fb-ai-staging-[random].vercel.app`

### Step 2: Set Production Environment Variables

**CRITICAL**: Go to Vercel Dashboard and set these for Production:

1. Visit: https://vercel.com/dashboard
2. Click your project: **6fb-ai-staging**
3. Go to: **Settings** → **Environment Variables**
4. Add these variables (set to **Production** environment):

```bash
# Required - Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://dfhqjdoydihajmjxniee.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Your anon key from .env.local]
SUPABASE_SERVICE_ROLE_KEY=[Your service role key from .env.local]

# Optional - AI Services
OPENAI_API_KEY=[Your OpenAI key]
ANTHROPIC_API_KEY=[Your Anthropic key]
GOOGLE_GEMINI_API_KEY=[Your Google key]

# Optional - Payment Processing
STRIPE_SECRET_KEY=[Your Stripe secret]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[Your Stripe public key]

# Optional - Real-time Features
PUSHER_APP_ID=[Your Pusher app ID]
NEXT_PUBLIC_PUSHER_KEY=[Your Pusher key]
PUSHER_SECRET=[Your Pusher secret]
NEXT_PUBLIC_PUSHER_CLUSTER=us2
```

**How to get your keys from .env.local:**
```bash
# View your local environment variables
cat .env.local | grep SUPABASE
cat .env.local | grep OPENAI
cat .env.local | grep STRIPE
```

### Step 3: Deploy to Production

```bash
# Deploy to production environment
vercel --prod
```

This creates: `https://6fb-ai-staging.vercel.app` (production URL)

### Step 4: Test the Deployment

```bash
# Test health endpoint
curl https://6fb-ai-staging.vercel.app/api/health

# Expected response:
{
  "status": "ok",
  "services": {
    "supabase": { "status": "healthy" }
  }
}
```

### Step 5: Configure Custom Domain (bookbarber.com)

#### In Vercel Dashboard:

1. Go to: **Settings** → **Domains**
2. Click: **Add Domain**
3. Enter: `bookbarber.com`
4. Vercel will show DNS records you need to add

#### In GoDaddy (or your DNS provider):

1. Go to: **DNS Management** for bookbarber.com
2. Add the A/CNAME records that Vercel provided

**Typical Vercel DNS Records:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com

Type: A
Name: @
Value: 76.76.21.21
```

3. Wait 24-48 hours for DNS propagation (usually faster)

### Step 6: Verify Custom Domain

```bash
# Test once DNS propagates
curl https://bookbarber.com/api/health

# Should return the same healthy response as Step 4
```

---

## 🚀 Quick Deploy Commands

If you've already deployed once, just run:

```bash
# Deploy preview (for testing)
vercel

# Deploy to production
vercel --prod

# Check deployment status
vercel ls
```

---

## 🔧 Troubleshooting

### Issue: "No deployment found"
**Solution**: Run `vercel` first to create initial deployment

### Issue: Environment variables not working
**Solution**:
1. Check they're set for **Production** environment (not just Preview/Development)
2. Redeploy after adding variables: `vercel --prod`

### Issue: Custom domain not working
**Solution**:
1. Check DNS records are correct in GoDaddy
2. Wait for DNS propagation (can take 24-48 hours)
3. Verify with: `nslookup bookbarber.com`

### Issue: Health endpoint returns 404
**Solution**:
1. Check the deployment actually succeeded: `vercel ls`
2. Check build logs in Vercel dashboard
3. Verify Next.js build completed successfully

---

## 📊 Verify Successful Deployment

After deployment, check these URLs:

```bash
# 1. Health endpoint
curl https://6fb-ai-staging.vercel.app/api/health

# 2. Dashboard (should redirect to login)
curl -I https://6fb-ai-staging.vercel.app/dashboard

# 3. Check Vercel deployment status
vercel ls

# 4. View deployment logs
vercel logs [deployment-url]
```

---

## 🎯 Success Criteria

You'll know the deployment worked when:

- ✅ `vercel ls` shows recent production deployment
- ✅ Health endpoint returns `{"status": "ok"}`
- ✅ Can access dashboard at deployment URL
- ✅ Environment variables are set in Vercel
- ✅ (Optional) Custom domain points to Vercel

---

## 📞 Need Help?

**Vercel Documentation**: https://vercel.com/docs
**Custom Domains Guide**: https://vercel.com/docs/concepts/projects/custom-domains
**Environment Variables**: https://vercel.com/docs/concepts/projects/environment-variables

**Project Details**:
- Project ID: `prj_AshPgvg4OcgIRaO3tyUwyGKk3qqP`
- Project Name: `6fb-ai-staging`
- Expected URL: `https://6fb-ai-staging.vercel.app`

---

**Last Updated**: 2025-10-11
**Status**: Ready to deploy - all code is production-ready!

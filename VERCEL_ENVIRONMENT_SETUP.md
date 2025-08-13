# Vercel Environment Variables Setup Guide

## 🔗 Quick Access
**Vercel Dashboard**: https://vercel.com/dashboard
**Project Settings**: Navigate to your project → Settings → Environment Variables

## 📋 Required Environment Variables

### 1. Supabase (REQUIRED - Probably Already Set)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://dfhqjdoydihajmjxniee.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODcwMTAsImV4cCI6MjA2OTY2MzAxMH0.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c
```

### 2. Email Service (OPTIONAL - For Domain Setup Emails)
If you want automated email support for domain setup:

**Option A: SendGrid (Recommended)**
```bash
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=support@yourdomain.com
```

**Option B: Resend**
```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=support@yourdomain.com
```

**Option C: Postmark**
```bash
POSTMARK_SERVER_TOKEN=xxxxxxxxxxxxxxxxxxxxx
POSTMARK_FROM_EMAIL=support@yourdomain.com
```

### 3. Payment Processing (OPTIONAL - For Domain Purchases)
If you want to enable domain purchases:
```bash
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

### 4. Domain Registrar APIs (OPTIONAL - For Automated Domain Registration)
If you want automated domain registration:

**Namecheap**
```bash
NAMECHEAP_API_KEY=xxxxxxxxxxxxxxxxxxxxx
NAMECHEAP_API_USER=yourusername
NAMECHEAP_CLIENT_IP=your.server.ip.address
```

**GoDaddy**
```bash
GODADDY_API_KEY=xxxxxxxxxxxxxxxxxxxxx
GODADDY_API_SECRET=xxxxxxxxxxxxxxxxxxxxx
```

### 5. AI Services (Already Set in Your Local)
```bash
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxx
```

### 6. Analytics & Monitoring (OPTIONAL)
```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

## 🔧 How to Add Environment Variables in Vercel

### Step 1: Navigate to Environment Variables
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project
3. Go to **Settings** tab
4. Click **Environment Variables** in the left sidebar

### Step 2: Add Variables
For each variable:
1. Enter the **Key** (e.g., `SENDGRID_API_KEY`)
2. Enter the **Value** (your actual API key)
3. Select environments:
   - ✅ Production
   - ✅ Preview
   - ✅ Development (optional)
4. Click **Save**

### Step 3: Redeploy (If Needed)
After adding variables:
1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click **Redeploy** → **Redeploy**

## 🔍 Verify Your Settings

### Check What's Already Set
In Vercel Dashboard → Environment Variables, you should see:
- ✅ `NEXT_PUBLIC_SUPABASE_URL` (Required)
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Required)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (Required)
- ⚠️ `SENDGRID_API_KEY` (Recommended for email features)

### Test Your Deployment
Once variables are set, test these endpoints:
```bash
# Replace [your-domain] with your Vercel URL
curl https://[your-domain].vercel.app/api/health
curl https://[your-domain].vercel.app/api/auth/session
```

## 🚨 OAuth Redirect URL Configuration

### CRITICAL: Update Supabase OAuth Settings
1. Go to: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/auth/url-configuration
2. Add your Vercel URLs to **Redirect URLs**:
```
https://[your-project].vercel.app/api/auth/callback
https://[your-project].vercel.app/auth/callback
https://[your-custom-domain].com/api/auth/callback
http://localhost:9999/api/auth/callback
http://localhost:3000/api/auth/callback
```

3. Update **Site URL**:
```
https://[your-project].vercel.app
```

## 📊 Minimal Setup (Just to Get Started)

If you want the bare minimum to test:

### Required Only:
1. `NEXT_PUBLIC_SUPABASE_URL` ✅
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅
3. `SUPABASE_SERVICE_ROLE_KEY` ✅

### Features Available with Minimal Setup:
- ✅ OAuth login
- ✅ Onboarding flow
- ✅ Data persistence
- ✅ Basic features
- ❌ Email notifications (needs SendGrid)
- ❌ Domain purchases (needs Stripe)

## 🎯 Priority Order

1. **First Priority** (Do Now):
   - Ensure Supabase variables are set
   - Update OAuth redirect URLs

2. **Second Priority** (Nice to Have):
   - Add SendGrid for email features
   - Test the onboarding flow

3. **Third Priority** (Later):
   - Stripe for domain purchases
   - Domain registrar APIs
   - Analytics services

## ✅ Quick Checklist

- [ ] Supabase URL set in Vercel
- [ ] Supabase Anon Key set in Vercel
- [ ] Supabase Service Role Key set in Vercel
- [ ] OAuth redirect URLs updated in Supabase
- [ ] Site URL updated in Supabase
- [ ] Deployment is live and accessible
- [ ] Health check endpoint responds
- [ ] OAuth login works

## 🆘 Troubleshooting

### "Invalid API Key" Error
- Double-check the Supabase keys are correct
- Make sure there are no extra spaces or quotes

### OAuth Not Working
- Verify redirect URLs in Supabase match your Vercel URL
- Check Site URL in Supabase settings

### Email Features Not Working
- Add SendGrid API key
- Verify SendGrid sender email is verified

### Build Failing
- Check build logs in Vercel
- Ensure all required variables are set
- Try redeploying

---

**Need Help?**
- Vercel Docs: https://vercel.com/docs/environment-variables
- Supabase Auth Docs: https://supabase.com/docs/guides/auth
- Your Vercel Project: Check the exact URL in your dashboard
# Vercel Production Setup - Visual Guide

## 🎯 Quick Setup (5 minutes)

You need to make 3 changes in Vercel. Here's exactly what to click:

---

## Step 1: Set Production Branch (1 minute)

### Navigate to Git Settings
1. **Open this link**: https://vercel.com/c50bossios-projects/6fb-ai-dashboard/settings/git
2. **Sign in** if prompted

### Change Production Branch
Look for a section that says:
```
Production Branch
The branch that will be deployed to your Production Environment.
[staging] [Edit]
```

3. **Click** the "Edit" button
4. **Type**: `production`
5. **Click**: "Save"

✅ Done! You should see:
```
Production Branch
[production]
```

---

## Step 2: Add Production Domains (2 minutes)

### Navigate to Domains
1. **Open this link**: https://vercel.com/c50bossios-projects/6fb-ai-dashboard/settings/domains

### Add First Domain
2. **Click** the "Add" button (usually top-right)
3. **Type**: `bookedbarber.com`
4. **Click**: "Add" button
5. When asked "Which Git branch would you like to link to?":
   - **Select**: `production`
   - **Click**: "Save"

### Add WWW Domain
6. **Click** "Add" again
7. **Type**: `www.bookedbarber.com`
8. **Click**: "Add" button
9. When asked about Git branch:
   - **Select**: `production`
   - **Click**: "Save"

✅ Done! You should see both domains listed with "Valid Configuration"

---

## Step 3: Update Environment Variables (2 minutes)

### Navigate to Environment Variables
1. **Open this link**: https://vercel.com/c50bossios-projects/6fb-ai-dashboard/settings/environment-variables

### Update Stripe Keys for Production
2. **Find**: `STRIPE_SECRET_KEY`
   - **Click**: Edit (pencil icon)
   - **Check**: ☑️ Production
   - **Change value to**: Your live Stripe secret key (starts with `sk_live_`)
   - **Click**: "Save"

3. **Find**: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Click**: Edit (pencil icon)
   - **Check**: ☑️ Production
   - **Change value to**: Your live Stripe public key (starts with `pk_live_`)
   - **Click**: "Save"

### Ensure Other Variables are Set for Production
4. For each of these variables, click Edit and ensure "Production" is checked:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`

✅ Done! All variables should show they're available in Production

---

## 🎉 That's It!

Production will automatically deploy. Check status:
1. **Go to**: https://vercel.com/c50bossios-projects/6fb-ai-dashboard
2. Look for a deployment to `production` branch
3. Should take 2-3 minutes

## Verify It Worked

After deployment completes (2-3 minutes), test:

```bash
# In your terminal:
curl https://bookedbarber.com/api/health
```

Or just visit: https://bookedbarber.com

---

## Common Issues

### "Invalid Configuration" on Domain
- **Cause**: DNS is already configured correctly in Cloudflare
- **Solution**: Wait 5 minutes, it will auto-validate

### Domain Not Loading
- **Cause**: SSL certificate provisioning
- **Solution**: Wait 10 minutes for SSL to provision

### 404 Error
- **Cause**: Production branch not deployed yet
- **Solution**: Check deployments page for build status

---

## Need Help?

If something doesn't work:
1. Check: https://vercel.com/c50bossios-projects/6fb-ai-dashboard
2. Look for any error messages
3. The deployment log will show what went wrong
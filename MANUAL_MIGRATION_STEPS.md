# Manual Database Migration Steps for BookedBarber

## Current Status
✅ Stripe products created  
✅ Webhook endpoint created (we_1RvegaEzoIvSRPoDqlvMZGAi)  
⏳ **Need to complete database migration manually**  

## Step 1: Get Webhook Signing Secret

1. Go to **[Stripe Dashboard Webhooks](https://dashboard.stripe.com/webhooks)**
2. Find and click on webhook: **we_1RvegaEzoIvSRPoDqlvMZGAi**
3. In the "Signing secret" section, click **"Reveal"**
4. Copy the secret (starts with `whsec_`)

## Step 2: Update Environment Variables

Add the webhook secret to your `.env.local` file:

```env
# Replace the existing line with the actual secret from Step 1
STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_SECRET_HERE
```

## Step 3: Run Database Migration in Supabase

1. Go to **[Supabase SQL Editor](https://app.supabase.com/project/dfhqjdoydihajmjxniee/sql)**
2. Create a **New Query**
3. **Copy and paste** the entire contents from `/database/subscription-migration.sql`
4. Click **"Run"** to execute the migration
5. **Verify** that all tables are created successfully

## Step 4: Verify Migration Success

After running the migration, verify these tables exist in the Supabase Table Editor:

- ✅ `users` (with new subscription columns)
- ✅ `subscription_history`
- ✅ `usage_tracking`
- ✅ `overage_charges`
- ✅ `subscription_features` 
- ✅ `payment_methods`
- ✅ `invoices`

## Step 5: Deploy to BookedBarber.com

Once the migration is complete, you're ready to deploy!

### Option A: Vercel Deployment (Recommended)
```bash
# Deploy to production
vercel --prod

# Make sure all environment variables are set in Vercel Dashboard
```

### Option B: Manual Server Deployment
```bash
# Build the application
npm run build

# Start production server
npm start
```

## Step 6: Test Complete Flow

### Test Email Registration
1. Go to `https://bookbarber.com/register`
2. Create account with email/password
3. Should redirect to `/subscribe`
4. Select a plan and complete payment
5. Should redirect to dashboard

### Test Google OAuth Registration  
1. Go to `https://bookbarber.com/login`
2. Click "Continue with Google"
3. Complete OAuth flow
4. Should redirect to `/subscribe`
5. Select a plan and complete payment
6. Should redirect to dashboard

### Test Subscription Management
1. Go to `https://bookbarber.com/billing`
2. View subscription details
3. Click "Manage Subscription" 
4. Should open Stripe Customer Portal

## Troubleshooting

### Common Issues:

**Issue**: Migration fails with "relation does not exist"  
**Solution**: Make sure you're running the migration in the correct Supabase project

**Issue**: Webhook returns 400 error  
**Solution**: Verify STRIPE_WEBHOOK_SECRET is correctly set in environment variables

**Issue**: Subscription status not updating  
**Solution**: Check Stripe webhook logs and ensure webhook endpoint is accessible

**Issue**: User can't access dashboard after payment  
**Solution**: Check if subscription status was updated in database

## Environment Variables Checklist

Make sure all these are set before deployment:

```env
# Stripe (LIVE KEYS - Already configured)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... # ← UPDATE THIS

# Products (Already configured)
STRIPE_BARBER_PRICE_ID=price_1Rvec7EzoIvSRPoDPEzD2d8g
STRIPE_SHOP_PRICE_ID=price_1Rvec7EzoIvSRPoD2pNplqi0
STRIPE_ENTERPRISE_PRICE_ID=price_1Rvec8EzoIvSRPoDXoEzrEHC

# App URL (Already configured)
NEXT_PUBLIC_APP_URL=https://bookbarber.com

# Supabase (Already configured)
NEXT_PUBLIC_SUPABASE_URL=https://dfhqjdoydihajmjxniee.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Success Criteria

✅ Database migration completed without errors  
✅ Webhook secret updated in environment variables  
✅ Application deployed to bookbarber.com  
✅ New user registration redirects to pricing  
✅ Subscription payment flow works  
✅ Users with active subscriptions can access dashboard  
✅ Billing page shows subscription details  
✅ Stripe Customer Portal integration works  

---

**Next Action Required**: Complete the manual database migration in Supabase SQL Editor, then update the webhook secret in your environment variables.

Once both are done, you'll be ready to deploy your paywall to bookbarber.com!
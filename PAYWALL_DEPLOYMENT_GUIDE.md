# BookedBarber Paywall Deployment Guide

## 🚀 Complete Setup Instructions for bookbarber.com

### Prerequisites
- [ ] Stripe Account (with verified business)
- [ ] Access to bookbarber.com DNS/hosting
- [ ] Supabase project configured
- [ ] Environment variables file ready

---

## Step 1: Stripe Setup (15 minutes)

### 1.1 Create Stripe Products
```bash
# First, install Stripe package if not already installed
npm install stripe

# Set your Stripe secret key (get from Stripe Dashboard)
export STRIPE_SECRET_KEY="sk_test_..." # Use test key first

# Run the setup script
node scripts/setup-stripe-products.js
```

This script will:
- Create all 3 subscription tiers
- Set up monthly and yearly pricing
- Configure customer portal
- Output all necessary environment variables

### 1.2 Get Your Stripe Keys
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Copy your keys:
   - **Test Mode First**: 
     - Publishable key: `pk_test_...`
     - Secret key: `sk_test_...`
   - **Live Mode (after testing)**:
     - Publishable key: `pk_live_...`
     - Secret key: `sk_live_...`

### 1.3 Configure Webhook Endpoint
1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Configure:
   - **Endpoint URL**: `https://bookbarber.com/api/stripe/webhook`
   - **Description**: BookedBarber Subscription Webhooks
   - **Events to send**: Select these events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.trial_will_end` (if adding trials later)
4. Click **"Add endpoint"**
5. Copy the **Signing secret** (starts with `whsec_`)

---

## Step 2: Environment Configuration (5 minutes)

### 2.1 Update Your .env.local File
Add these environment variables (the setup script will provide the actual values):

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...  # Replace with live key in production
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Replace with live key in production
STRIPE_WEBHOOK_SECRET=whsec_...  # From webhook configuration

# Individual Barber Prices (from setup script output)
STRIPE_BARBER_PRICE_ID=price_...
STRIPE_BARBER_PRICE_ID_YEARLY=price_...

# Barbershop Prices (from setup script output)
STRIPE_SHOP_PRICE_ID=price_...
STRIPE_SHOP_PRICE_ID_YEARLY=price_...

# Enterprise Prices (from setup script output)
STRIPE_ENTERPRISE_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID_YEARLY=price_...

# Customer Portal (from setup script output)
STRIPE_PORTAL_CONFIG_ID=bpc_...

# Your Domain
NEXT_PUBLIC_APP_URL=https://bookbarber.com
```

### 2.2 Update Stripe Checkout Configuration
Edit `/app/api/stripe/create-checkout-session/route.js` and update lines 131-132:
```javascript
success_url: `https://bookbarber.com/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
cancel_url: `https://bookbarber.com/subscribe?canceled=true`,
```

---

## Step 3: Database Migration (5 minutes)

### 3.1 Run Database Migration
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **SQL Editor**
4. Create a new query
5. Paste the contents of `/database/subscription-migration.sql`
6. Click **"Run"**

This will create:
- Subscription columns in users table
- subscription_history table
- usage_tracking table
- overage_charges table
- All necessary RLS policies

### 3.2 Verify Tables
After running migration, verify in Table Editor that these tables exist:
- [ ] users (with new subscription columns)
- [ ] subscription_history
- [ ] usage_tracking
- [ ] overage_charges

---

## Step 4: Deploy to Production (10 minutes)

### 4.1 Test Locally First
```bash
# Start development server
npm run dev

# Test the flow:
1. Go to http://localhost:9999/register
2. Complete registration
3. You should be redirected to /subscribe
4. Select a plan
5. Use Stripe test card: 4242 4242 4242 4242
6. Verify subscription is active
```

### 4.2 Deploy to Vercel (Recommended)
```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel Dashboard
# Go to: https://vercel.com/your-project/settings/environment-variables
# Add all variables from .env.local
```

### 4.3 Alternative: Deploy to Your Server
```bash
# Build the application
npm run build

# Start production server
npm start

# Or use PM2 for process management
pm2 start npm --name "bookbarber" -- start
```

---

## Step 5: DNS Configuration (5 minutes)

### 5.1 Update DNS Records (if using subdomain)
If using a subdomain like `app.bookbarber.com`:
```
Type: A
Name: app
Value: [Your server IP or Vercel IP]
TTL: 3600
```

### 5.2 SSL Certificate
- **Vercel**: Automatic SSL
- **Self-hosted**: Use Let's Encrypt
```bash
sudo certbot --nginx -d bookbarber.com -d www.bookbarber.com
```

---

## Step 6: Testing Checklist

### 6.1 Test in Stripe Test Mode
- [ ] Register new account → redirects to pricing
- [ ] Select Individual Barber plan → payment works
- [ ] Select Barbershop plan → payment works
- [ ] Select Enterprise plan → payment works
- [ ] Login with existing account → checks subscription
- [ ] Access /dashboard without subscription → redirects to /subscribe
- [ ] Access /billing page → shows subscription details
- [ ] Cancel subscription → updates status
- [ ] Webhook receives events → check Stripe webhook logs

### 6.2 Test Card Numbers
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Requires Auth: 4000 0025 0000 3155
```

---

## Step 7: Go Live Checklist

### 7.1 Switch to Live Mode
1. [ ] Update STRIPE_SECRET_KEY to live key
2. [ ] Update NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to live key
3. [ ] Create products in Stripe live mode (run setup script again)
4. [ ] Update all PRICE_IDs with live mode IDs
5. [ ] Create webhook endpoint for live mode
6. [ ] Update STRIPE_WEBHOOK_SECRET with live webhook secret

### 7.2 Final Verification
- [ ] Test with real credit card (you can refund yourself)
- [ ] Verify webhook is receiving live events
- [ ] Check subscription status updates in database
- [ ] Verify email notifications are sent
- [ ] Test customer portal access
- [ ] Monitor error logs for first 24 hours

---

## Step 8: Monitor & Maintain

### 8.1 Set Up Monitoring
```javascript
// Add to your monitoring service
const checkpoints = [
  'https://bookbarber.com/api/health',
  'https://bookbarber.com/api/stripe/webhook',
  'https://bookbarber.com/subscribe'
];
```

### 8.2 Regular Checks
- Daily: Check Stripe Dashboard for failed payments
- Weekly: Review subscription metrics
- Monthly: Analyze conversion rates and churn

### 8.3 Common Issues & Solutions

**Issue**: User can't access dashboard after payment
**Solution**: Check webhook logs, ensure subscription status updated in database

**Issue**: Webhook returns 400 error
**Solution**: Verify STRIPE_WEBHOOK_SECRET is correct

**Issue**: Prices showing as $0
**Solution**: Check PRICE_ID environment variables are set correctly

---

## 📞 Support Resources

- **Stripe Support**: https://support.stripe.com
- **Stripe Status**: https://status.stripe.com
- **Test Cards**: https://stripe.com/docs/testing
- **Webhook Debugging**: https://dashboard.stripe.com/test/webhooks

---

## 🎉 Congratulations!

Your paywall is now live on bookbarber.com! 

### Quick Links:
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Customer Portal](https://bookbarber.com/billing)
- [Subscription Analytics](https://dashboard.stripe.com/subscriptions)

### Revenue Tracking:
```sql
-- Run in Supabase SQL Editor to see revenue
SELECT 
  subscription_tier,
  COUNT(*) as subscribers,
  SUM(CASE WHEN subscription_status = 'active' THEN 1 ELSE 0 END) as active_subscribers
FROM users
GROUP BY subscription_tier;
```

---

Last Updated: [Current Date]
Domain: bookbarber.com
Status: Ready for Deployment
# Stripe Payment Setup Guide for Live Barbershop

## Overview
This guide will help you set up Stripe Connect for your barbershop platform, enabling real payment processing for customer bookings and barber payouts.

## What You'll Need
- A Stripe account (create one at https://stripe.com)
- Your barbershop's business information
- Bank account details for payouts

## Step 1: Create a Stripe Account

1. Go to https://dashboard.stripe.com/register
2. Sign up with your business email
3. Select "United States" as your country
4. Complete the initial setup wizard

## Step 2: Get Your API Keys

1. Once logged in, go to **Developers → API keys**
2. You'll see two types of keys:
   - **Test keys** (for development) - start with `sk_test_` and `pk_test_`
   - **Live keys** (for production) - start with `sk_live_` and `pk_live_`

3. For testing, use the test keys first
4. Copy these keys - you'll need them in the next step

## Step 3: Configure Your Environment

1. Create a `.env.local` file in your project root:
```bash
cp .env.example .env.local
```

2. Add your Stripe keys to `.env.local`:
```env
# For Testing (use these first)
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_SECRET_KEY_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_PUBLISHABLE_KEY_HERE

# For Production (switch to these when ready to go live)
# STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY_HERE
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY_HERE
```

## Step 4: Enable Stripe Connect

1. In Stripe Dashboard, go to **Connect → Settings**
2. Click "Get started" with Connect
3. Choose "Express" account type (recommended for barbershops)
4. Configure your platform settings:
   - Business name: Your barbershop name
   - Platform type: Marketplace
   - Business model: Service marketplace

## Step 5: Set Up Webhooks (Important!)

1. Go to **Developers → Webhooks**
2. Click "Add endpoint"
3. Add your webhook URL:
   - For local testing: Use ngrok or similar tool
   - For production: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen to:
   - `account.updated`
   - `account.application.authorized`
   - `account.application.deauthorized`
   - `charge.succeeded`
   - `charge.failed`
   - `payout.created`
   - `payout.paid`
5. Copy the webhook signing secret and add to `.env.local`:
```env
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

## Step 6: Configure Platform Fees

1. In Stripe Dashboard, go to **Connect → Platform fees**
2. Set your platform fee percentage (typically 2-5% for barbershops)
3. This fee will be automatically deducted from each transaction

## Step 7: Test the Integration

1. Restart your development server:
```bash
npm run dev
```

2. Go through the payment setup in onboarding
3. Use Stripe's test card numbers:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Requires authentication: `4000 0025 0000 3155`

## Step 8: Go Live

When ready for production:

1. Switch to live API keys in `.env.local`
2. Update webhook URLs to production domain
3. Complete Stripe's platform activation:
   - Go to **Connect → Settings → Platform settings**
   - Complete all required business information
   - Submit for review (usually approved within 1-2 business days)

## How It Works for Barbers

1. **Barber Onboarding**:
   - Each barber creates a connected Stripe account
   - They provide their business info and bank details
   - Stripe handles all compliance and verification

2. **Payment Flow**:
   - Customer pays for service through your platform
   - Payment goes to barber's Stripe account
   - Your platform fee is automatically deducted
   - Barber receives payout to their bank (daily/weekly based on settings)

3. **Tax Handling**:
   - Stripe generates 1099s for barbers (US)
   - All tax reporting is handled automatically
   - Barbers are responsible for their own taxes as independent contractors

## Troubleshooting

### "Payment system not configured" Error
- Make sure your `.env.local` file exists and contains valid Stripe keys
- Restart your development server after adding keys

### "Failed to create payment account" Error
- Check that your Stripe account is activated
- Verify you have Connect enabled in your Stripe dashboard
- Check the browser console for detailed error messages

### Webhook Errors
- Ensure your webhook endpoint is publicly accessible
- Verify the webhook signing secret is correct
- Check webhook logs in Stripe Dashboard → Developers → Webhooks

## Security Best Practices

1. **Never commit API keys to git**
   - Keep `.env.local` in `.gitignore`
   - Use environment variables in production

2. **Use restricted API keys in production**
   - Create keys with minimal required permissions
   - Rotate keys regularly

3. **Always verify webhooks**
   - Use the webhook signing secret to verify requests
   - Never trust webhook data without verification

4. **PCI Compliance**
   - Never store card details on your server
   - Always use Stripe's hosted payment forms
   - Keep your Stripe libraries updated

## Support

- Stripe Documentation: https://stripe.com/docs/connect
- Stripe Support: https://support.stripe.com
- Test card numbers: https://stripe.com/docs/testing

## Next Steps

After setup:
1. Test the complete payment flow with test cards
2. Configure payout schedules for barbers
3. Set up financial reporting dashboards
4. Train your barbers on using the system
5. Go live with real payments!
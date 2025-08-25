# Stripe Connect Setup Guide

## Quick Setup (5 minutes)

### 1. Get Your Stripe Connect Client ID

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Settings** → **Connect settings**
3. Find the **OAuth settings** section
4. Copy your **Client ID** (starts with `ca_`)
5. Add it to `.env.local`:
   ```
   STRIPE_CONNECT_CLIENT_ID=ca_YOUR_ACTUAL_CLIENT_ID_HERE
   ```

### 2. Configure Connect Settings

In the same Connect settings page:

1. **Platform name**: 6FB AI Agent System
2. **Platform icon**: Upload your logo
3. **Redirect URIs**: Add these URLs:
   - Development: `http://localhost:9999/api/payments/connect/callback`
   - Production: `https://bookbarber.com/api/payments/connect/callback`

### 3. Set Up Webhook Endpoints

1. Go to **Developers** → **Webhooks**
2. Click **+ Add endpoint**
3. **Endpoint URL**: 
   - Development: `http://localhost:9999/api/webhooks/stripe`
   - Production: `https://bookbarber.com/api/webhooks/stripe`
4. Select these Connect events:
   - `account.updated`
   - `account.application.deauthorized`
   - `capability.updated`
   - `payout.created`
   - `payout.paid`
   - `payout.failed`
   - `external_account.created`
   - `external_account.updated`

### 4. Enable Connect Capabilities

In Connect settings, enable:
- ✅ Express accounts
- ✅ Standard accounts (optional)
- ✅ Custom accounts (optional)

## Important Security Notes

### ⚠️ Current Configuration Issues

Your `.env.local` currently has **LIVE** Stripe keys. For development, you should:

1. Switch to **TEST** mode in Stripe Dashboard
2. Get TEST keys from [API Keys page](https://dashboard.stripe.com/test/apikeys)
3. Replace in `.env.local`:
   ```
   # For Development (TEST KEYS)
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_test_...
   STRIPE_CONNECT_CLIENT_ID=ca_test_...
   ```

### 🔒 Production Checklist

Before going live:
- [ ] Use environment-specific keys (test for dev, live for production)
- [ ] Store keys securely (use environment variables, never commit)
- [ ] Enable webhook signature verification
- [ ] Set up proper error logging
- [ ] Configure rate limiting
- [ ] Enable Stripe Radar for fraud protection

## Testing the Integration

### 1. Run Database Migration

```sql
-- In Supabase SQL Editor, run:
-- Contents of database/migrations/004_payment_processing.sql
```

### 2. Test Payment Setup

```bash
# Run the test script
node test-payment-setup.js
```

### 3. Test Onboarding Flow

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/dashboard`
3. Go through onboarding to Step 5 (Payment Processing)
4. Click "Connect with Stripe"
5. Complete the Stripe Connect onboarding

### 4. Verify Integration

Check these endpoints:
- Health check: `GET /api/payments/health`
- Account status: `GET /api/payments/connect/status/{accountId}`
- Bank accounts: `GET /api/payments/bank-accounts`

## Common Issues & Solutions

### Issue: "Stripe Connect Client ID not found"
**Solution**: Add `STRIPE_CONNECT_CLIENT_ID` to `.env.local`

### Issue: "Account not found or unauthorized"
**Solution**: Ensure the user has completed Stripe Connect onboarding

### Issue: "Webhook signature verification failed"
**Solution**: Update `STRIPE_WEBHOOK_SECRET` with the correct signing secret

### Issue: Database tables don't exist
**Solution**: Run the migration script in Supabase SQL Editor

## API Reference

### Create Connected Account
```javascript
POST /api/payments/connect/create
{
  "business_type": "individual|company",
  "country": "US",
  "email": "merchant@example.com"
}
```

### Generate Onboarding Link
```javascript
POST /api/payments/connect/onboarding-link
{
  "account_id": "acct_...",
  "refresh_url": "http://localhost:9999/dashboard",
  "return_url": "http://localhost:9999/dashboard?onboarding=complete"
}
```

### Check Account Status
```javascript
GET /api/payments/connect/status/{accountId}
```

### Create Dashboard Login Link
```javascript
POST /api/payments/connect/login-link
{
  "account_id": "acct_..."
}
```

## Support

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Express Accounts Guide](https://stripe.com/docs/connect/express-accounts)
- [Connect Webhooks](https://stripe.com/docs/connect/webhooks)
- [Testing Connect](https://stripe.com/docs/connect/testing)

## Next Steps

1. ✅ Add Connect Client ID to environment
2. ✅ Configure webhook endpoints
3. ✅ Run database migration
4. ✅ Test the complete flow
5. 🎉 Payment processing is ready!
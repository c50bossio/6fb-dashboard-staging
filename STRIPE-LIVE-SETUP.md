# 🔐 Stripe Live Mode Setup Guide for BookedBarber

## ⚠️ CRITICAL: Live Mode Checklist

This guide ensures you deploy BookedBarber with **LIVE Stripe keys only** for production use in real barbershops.

---

## 📋 Quick Setup (15 minutes)

### Step 1: Get Your Live Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. **Toggle to "Live mode"** (top-right corner - CRITICAL!)
3. Navigate to `Developers` → `API keys`
4. Copy your keys:
   - **Secret key**: `sk_live_...` (Keep this private!)
   - **Publishable key**: `pk_live_...` (Safe for frontend)

### Step 2: Configure Vercel Production Environment

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your BookedBarber project
3. Go to `Settings` → `Environment Variables`
4. Add these variables for **Production** environment:

```bash
# STRIPE LIVE KEYS (Required)
STRIPE_SECRET_KEY=sk_live_[your_actual_key]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_[your_actual_key]

# APPLICATION CONFIG (Required)
NEXT_PUBLIC_APP_URL=https://bookedbarber.com
NODE_ENV=production

# WEBHOOK (After Step 3)
STRIPE_WEBHOOK_SECRET=whsec_[your_webhook_secret]
```

### Step 3: Configure Stripe Connect

1. In Stripe Dashboard, go to `Connect` → `Settings`
2. Under "Redirect URIs", add:
   - `https://bookedbarber.com/stripe-redirect`
   - `https://bookedbarber.com/dashboard/settings`
3. Under "Account types", ensure "Express" is enabled

### Step 4: Set Up Webhooks (Important!)

1. In Stripe Dashboard, go to `Developers` → `Webhooks`
2. Click "Add endpoint"
3. Endpoint URL: `https://bookedbarber.com/api/webhooks/stripe`
4. Select events:
   - `account.updated`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.succeeded`
5. Copy the "Signing secret" (starts with `whsec_`)
6. Add to Vercel as `STRIPE_WEBHOOK_SECRET`

---

## 🧪 Validation Commands

Before deploying, always run:

```bash
# Check current configuration
npm run stripe:validate

# Validate for production (will fail if not live keys)
npm run stripe:validate:prod

# Run full deployment checklist
npm run deploy:checklist

# If all passes, deploy to production
npm run deploy:production
```

---

## 🚨 Warning Signs You're Using Test Keys

1. **Visual Banner**: A yellow warning banner appears on production site
2. **Payment Failures**: Customers can't complete real transactions
3. **Dashboard Shows Test Data**: Stripe dashboard shows "Test mode"
4. **Keys Start with `sk_test_` or `pk_test_`**: These are TEST keys!

---

## ✅ How to Verify Live Mode is Active

### On Your Site:
1. Visit https://bookedbarber.com
2. Look for green "✅ Live Payment Processing Active" banner (auto-hides after 5 seconds)
3. No yellow warning banners should appear

### In Stripe Dashboard:
1. Toggle to "Live mode"
2. Check `Payments` → Should show real transactions
3. Check `Connect` → Should show connected barber accounts

### Via Command Line:
```bash
# This should show all green checkmarks
npm run stripe:validate:prod
```

---

## 🔄 Switching from Test to Live

If you've been using test mode and need to switch:

1. **Update ALL environment variables** in Vercel:
   - Change `sk_test_...` → `sk_live_...`
   - Change `pk_test_...` → `pk_live_...`

2. **Trigger new deployment**:
   ```bash
   git commit --allow-empty -m "Deploy: Switch to Stripe live mode"
   git push origin main
   ```

3. **Verify the switch**:
   - Check the site for green confirmation banner
   - Make a small test transaction ($1)
   - Verify in Stripe Dashboard (Live mode)

---

## 📊 Environment Variable Reference

| Variable | Production Value | Purpose |
|----------|-----------------|---------|
| `STRIPE_SECRET_KEY` | `sk_live_...` | Server-side API calls |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Client-side Stripe.js |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Webhook signature verification |
| `NEXT_PUBLIC_APP_URL` | `https://bookedbarber.com` | Redirect URLs |
| `NODE_ENV` | `production` | Enable production optimizations |

---

## 🚫 Common Mistakes to Avoid

1. **DON'T** mix test and live keys
2. **DON'T** hardcode keys in code (use environment variables)
3. **DON'T** use localhost URLs with live keys
4. **DON'T** forget to update webhook endpoints
5. **DON'T** deploy without running validation

---

## 🆘 Troubleshooting

### "Payment setup not working on production"
- Run `npm run stripe:validate:prod` locally
- Check Vercel environment variables are set for Production
- Verify redirect URLs in Stripe Connect settings

### "Yellow warning banner on live site"
- You're using test keys in production
- Update to live keys in Vercel immediately

### "Stripe Connect onboarding fails"
- Check redirect URLs include `https://bookedbarber.com`
- Ensure Express accounts are enabled
- Verify live keys are being used

---

## 📱 Testing Live Payments

1. Create a test service for $1
2. Use a real credit card (you can refund after)
3. Verify:
   - Payment appears in Stripe Dashboard (Live mode)
   - Customer receives confirmation
   - Barber can see transaction
   - Commission calculations are correct

---

## 🎯 Final Checklist Before Going Live

- [ ] All Stripe keys are `live` mode
- [ ] Vercel has production environment variables
- [ ] Webhooks are configured with live endpoint
- [ ] Redirect URLs updated for production domain
- [ ] Validation script shows all green
- [ ] Test transaction completed successfully
- [ ] Staff trained on system
- [ ] Backup payment method available

---

## 📞 Support

- **Stripe Support**: Available 24/7 in Dashboard
- **BookedBarber Support**: support@bookedbarber.com
- **Emergency**: Keep Stripe Dashboard accessible on phone

---

Remember: **NEVER use test keys in a real barbershop!** Real customers = Real money = Live keys only.
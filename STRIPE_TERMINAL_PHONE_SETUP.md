# Stripe Terminal: Phone-Based Payment Options

## Overview
Yes, you **CAN use your phone as a terminal!** Stripe offers multiple phone-based payment solutions that work with the POS system we've built.

---

## Option 1: Tap to Pay on iPhone (Recommended) ⭐

### What It Is
Turn your iPhone into a contactless payment terminal with **zero additional hardware**. Customers tap their card or phone directly on your iPhone's back.

### Requirements
- **iPhone**: XS or newer (2018+)
- **iOS**: 15.4 or later
- **Stripe Account**: Approved for Tap to Pay
- **Internet**: WiFi or cellular data

### Pricing
- **Hardware Cost**: $0 (uses built-in NFC chip)
- **Transaction Fee**: 2.7% + 0¢ per transaction (same as physical Terminal readers)
- **Platform Margin**: Your processing fee (2.9% + 30¢) - Stripe's fee (2.7%) = **0.2% + 30¢ immediate profit**

### How It Works
1. Customer's payment total shows on your iPhone screen
2. Customer taps their card/phone/watch on the back of your iPhone
3. iPhone vibrates to confirm card detected
4. Transaction processes in 1-2 seconds
5. Receipt sent via email/SMS

### Setup Steps

#### Step 1: Enable Tap to Pay in Stripe Dashboard
1. Go to: https://dashboard.stripe.com/terminal/tap-to-pay
2. Click "Get Started"
3. Accept terms and conditions
4. Verify your business details (may take 1-2 business days)

#### Step 2: Update TerminalPaymentModal Configuration
```javascript
// File: components/pos/TerminalPaymentModal.jsx (line 102-105)

// Change discovery config to support Tap to Pay:
const { readers: discoveredReaders, error } = await terminalInstance.discoverReaders({
  simulated: process.env.NODE_ENV === 'development', // Simulated in dev
  discoveryMethod: 'tapToPay', // NEW: Enable Tap to Pay discovery
  location: undefined
})
```

#### Step 3: Install Stripe Terminal SDK on iOS (if building native app)
If you're building a native iOS app:
```swift
// Add to your Podfile:
pod 'StripeTerminal', '~> 2.21'

// Or use Swift Package Manager:
dependencies: [
    .package(url: "https://github.com/stripe/stripe-terminal-ios", from: "2.21.0")
]
```

For web-based app (what you're using now), the `@stripe/terminal-js` SDK already supports Tap to Pay!

#### Step 4: Test with LIVE Keys
```bash
# In .env.local, switch back to LIVE keys:
STRIPE_SECRET_KEY=sk_live_51BSi7BEzoIvSRPoD...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_v6ilAqP9y2gT46Os63ONgGmC
```

Restart servers:
```bash
./dev-stop.sh && ./dev-start.sh
```

#### Step 5: Test Payment Flow
1. Open POS on iPhone Safari: `http://localhost:9999/dashboard/pos` (or your domain)
2. Add products to cart
3. Click "Collect Payment" → "Terminal"
4. Your iPhone should appear as a reader: "Tap to Pay on iPhone"
5. Click to connect
6. Customer taps their card on iPhone back
7. Payment completes!

### Supported Cards
- ✅ Contactless credit/debit cards (Visa, Mastercard, Amex, Discover)
- ✅ Apple Pay
- ✅ Google Pay
- ✅ Digital wallets
- ❌ NOT supported: Chip-insert cards, magnetic stripe cards

---

## Option 2: Stripe Reader M2 (Budget Option)

### What It Is
Small Bluetooth card reader that pairs with any smartphone (iOS or Android).

### Requirements
- **Phone**: Any iOS or Android device
- **Bluetooth**: Must be enabled
- **Stripe Account**: Standard account
- **Internet**: Phone's WiFi or cellular

### Pricing
- **Hardware Cost**: $59 one-time purchase
- **Transaction Fee**: 2.7% + 5¢ per transaction
- **Your Margin**: (2.9% + 30¢) - (2.7% + 5¢) = **0.2% + 25¢**

### How It Works
1. Reader pairs with phone via Bluetooth
2. Customer taps/inserts card on small reader device
3. Reader communicates with phone
4. Phone processes payment via Stripe
5. Receipt sent via email/SMS

### Purchase & Setup
1. **Order**: https://stripe.com/terminal/readers/stripe-m2
2. **Delivery**: 3-5 business days
3. **Register**: Add reader in Stripe Dashboard
4. **Pair**: Bluetooth pairing with phone
5. **Test**: Same POS flow as Tap to Pay

---

## Option 3: BBPOS WisePOS E (All-in-One Terminal)

### What It Is
Standalone touchscreen terminal. No phone needed.

### Requirements
- **Device**: BBPOS WisePOS E terminal
- **Internet**: WiFi connection
- **Stripe Account**: Standard account

### Pricing
- **Hardware Cost**: $249 one-time purchase
- **Transaction Fee**: 2.7% + 0¢ per transaction
- **Your Margin**: (2.9% + 30¢) - (2.7%) = **0.2% + 30¢**

### Best For
- Fixed checkout stations
- Multiple staff members using same device
- High transaction volumes
- Professional appearance

---

## Comparison Table

| Feature | Tap to Pay (iPhone) | Reader M2 + Phone | WisePOS E |
|---------|-------------------|------------------|-----------|
| **Hardware Cost** | $0 | $59 | $249 |
| **Device Needed** | iPhone XS+ | Any Phone | None (standalone) |
| **Transaction Fee** | 2.7% + 0¢ | 2.7% + 5¢ | 2.7% + 0¢ |
| **Your Profit/Transaction** | 0.2% + 30¢ | 0.2% + 25¢ | 0.2% + 30¢ |
| **Setup Time** | Instant | 3-5 days | 3-5 days |
| **Portability** | ✅ High | ✅ High | ⚠️ Medium |
| **Battery** | Uses phone | Built-in | Built-in |
| **Accepts Chip Cards** | ❌ No | ✅ Yes | ✅ Yes |
| **Professional Look** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## Recommended Setup for Your Barbershop

### Phase 1: Immediate (This Week)
**Use Tap to Pay on iPhone**
- ✅ $0 hardware cost
- ✅ Instant setup (once approved)
- ✅ Works with code we've already built
- ✅ Professional appearance
- ✅ Most customers have contactless cards/phones

**Action Steps:**
1. Enable Tap to Pay in Stripe Dashboard (request approval)
2. Wait 1-2 business days for approval
3. Switch to LIVE keys in `.env.local`
4. Test payment flow on iPhone
5. Go live immediately

### Phase 2: Growth (Month 2-3)
**Add Reader M2 as Backup**
- Accepts chip-insert cards (for customers without contactless)
- Only $59 investment
- Works alongside Tap to Pay
- Can hand to customers to insert their card

**Action Steps:**
1. Order Reader M2 from Stripe
2. Register in Stripe Dashboard
3. Pair with iPhone via Bluetooth
4. Both readers available in POS system
5. Choose based on customer's card type

### Phase 3: Scale (Month 6+)
**Consider WisePOS E for Second Location**
- Standalone terminal for fixed station
- Professional checkout experience
- No phone dependency
- Shared device for multiple barbers

---

## Code Changes Required

### For Tap to Pay on iPhone
**File**: `components/pos/TerminalPaymentModal.jsx`

```javascript
// Line 102-105: Update reader discovery
const { readers: discoveredReaders, error } = await terminalInstance.discoverReaders({
  simulated: process.env.NODE_ENV === 'development',
  discoveryMethod: process.env.NODE_ENV === 'development'
    ? 'internet'  // Simulated readers
    : 'tapToPay', // Tap to Pay in production
  location: undefined
})
```

### For Physical Readers (M2, WisePOS E)
**No code changes needed!** The current implementation already supports physical readers:

```javascript
// Line 102-105: Already configured correctly
const { readers: discoveredReaders, error } = await terminalInstance.discoverReaders({
  simulated: process.env.NODE_ENV === 'development',
  location: undefined // Discovers ALL registered readers
})
```

---

## Testing Checklist

### Before Going Live
- [ ] Stripe Tap to Pay approved (1-2 business days)
- [ ] LIVE keys configured in `.env.local`
- [ ] Dev servers restarted with LIVE keys
- [ ] Test payment with real card (1 cent test)
- [ ] Verify payment appears in Stripe LIVE Dashboard
- [ ] Verify inventory decrements in database
- [ ] Test refund flow (if implemented)
- [ ] Test receipt email delivery
- [ ] Train staff on payment flow

### After First Real Transaction
- [ ] Check Stripe Dashboard for settlement
- [ ] Verify funds deposited to bank (2-3 days)
- [ ] Confirm platform margin calculated correctly
- [ ] Review transaction logs for any errors

---

## Revenue Breakdown (Real Numbers)

### Example: $50 Haircut + Products
| Item | Amount |
|------|--------|
| **Subtotal** | $50.00 |
| **Processing Fee (shown to customer)** | $1.75 (2.9% + 30¢) |
| **Total Charged to Customer** | $51.75 |
| | |
| **Stripe Takes (2.7%)** | $1.40 |
| **Your Platform Profit** | $0.35 |
| **Barber Receives (if 60% split)** | $30.00 |
| **Shop Owner Receives** | $20.00 |

**Platform Margin**: $0.35 per transaction (immediate profit)
**Monthly Revenue (100 transactions/day)**: ~$1,050/month just from processing fees

---

## Support & Resources

- **Stripe Terminal Docs**: https://stripe.com/docs/terminal
- **Tap to Pay on iPhone**: https://stripe.com/docs/terminal/payments/setup-reader/tap-to-pay-ios
- **Reader M2 Guide**: https://stripe.com/docs/terminal/readers/stripe-m2
- **Your Test Dashboard**: https://dashboard.stripe.com/test/terminal
- **Your Live Dashboard**: https://dashboard.stripe.com/terminal

---

## Next Steps

1. **Today**: Test simulated readers with TEST keys (already set up!)
2. **This Week**: Request Tap to Pay approval in Stripe Dashboard
3. **Once Approved**: Switch to LIVE keys and test real payment
4. **Go Live**: Start accepting payments via iPhone
5. **Optional**: Order Reader M2 as backup for chip cards

**You're already 90% done! The code is built. Just need Stripe approval for Tap to Pay.**

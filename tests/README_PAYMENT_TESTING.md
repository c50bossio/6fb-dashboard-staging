# Payment Flow Testing Suite

## Overview

This directory contains comprehensive testing resources for the BookedBarber payment system. Since Stripe Checkout cannot be fully automated, these files provide structured manual testing procedures to ensure payment system reliability.

## Files Included

### 📋 [MANUAL_PAYMENT_TEST_GUIDE.md](./MANUAL_PAYMENT_TEST_GUIDE.md)
**Primary testing guide** with step-by-step instructions for manual testing of the complete payment flow.

**Covers:**
- New user registration → subscription flow
- Existing user subscription scenarios  
- Plan upgrades/downgrades
- Payment method updates
- Subscription cancellation
- Error scenarios and edge cases
- Mobile and cross-browser testing

### 🛠️ [create-test-accounts.js](../scripts/create-test-accounts.js)
**Test data setup script** that creates clean test user accounts and removes old test data.

**Features:**
- Creates test accounts for all user roles
- Generates accounts with and without active subscriptions
- Cleans up old test data automatically
- Outputs test credentials for manual testing
- Verifies database connection before proceeding

**Usage:**
```bash
# Create fresh test accounts
node scripts/create-test-accounts.js

# Clean up only (no new accounts)
node scripts/create-test-accounts.js --cleanup-only

# Create specific number of accounts
node scripts/create-test-accounts.js --count=3
```

### ⚙️ [stripe-test-config.js](./stripe-test-config.js)
**Stripe test configuration** with test card numbers, customer data, and webhook validation.

**Includes:**
- Complete Stripe test card database
- Expected webhook events and validation
- Pricing configuration for all tiers
- Test mode verification utilities
- Customer data templates

**Usage:**
```javascript
const { StripeTestConfig } = require('./tests/stripe-test-config.js')

// Get a test card
const successCard = StripeTestConfig.getTestCard('success', 'visa')
const declineCard = StripeTestConfig.getTestCard('decline', 'insufficient_funds')

// Validate webhook events
const validation = StripeTestConfig.validateWebhookEvent('checkout.session.completed', eventData)
```

### ✅ [PAYMENT_VERIFICATION_CHECKLIST.md](./PAYMENT_VERIFICATION_CHECKLIST.md)
**Quality assurance checklist** for comprehensive verification of payment system before production deployment.

**Sections:**
- Pre-test setup verification
- Core payment flow testing
- Post-payment verification  
- Subscription management testing
- Error handling & edge cases
- Security verification
- Performance testing
- Final production readiness checklist

## Quick Start Guide

### 1. Environment Setup
```bash
# Ensure you're in test environment
export NODE_ENV=development

# Verify Stripe is in test mode
echo $STRIPE_SECRET_KEY | grep "sk_test_" || echo "❌ Not in test mode!"

# Create test accounts
node scripts/create-test-accounts.js
```

### 2. Manual Testing Process
1. **Review** the [Manual Payment Test Guide](./MANUAL_PAYMENT_TEST_GUIDE.md)
2. **Execute** each test scenario following the step-by-step instructions
3. **Document** results using the [Payment Verification Checklist](./PAYMENT_VERIFICATION_CHECKLIST.md)
4. **Take screenshots** at key stages for documentation
5. **Report** any issues found with detailed reproduction steps

### 3. Test Card Reference
Use these Stripe test cards during manual testing:

| Scenario | Card Number | Expected Result |
|----------|-------------|-----------------|
| **Success** | `4242 4242 4242 4242` | Payment succeeds |
| **Decline** | `4000 0000 0000 0002` | Generic decline |
| **Insufficient Funds** | `4000 0000 0000 9995` | Insufficient funds |
| **Expired Card** | `4000 0000 0000 0069` | Expired card error |

### 4. Verification Steps
After each test run:
- [ ] Check database for correct subscription data
- [ ] Verify Stripe webhook events were processed
- [ ] Confirm user access levels match subscription tier
- [ ] Validate email notifications were sent
- [ ] Review application logs for errors

## Test Scenarios Coverage

### ✅ Supported Test Cases
- **New User Flow**: Registration → Subscription → Dashboard Access
- **Payment Success**: All major card brands (Visa, Mastercard, Amex)
- **Payment Failures**: Declines, expired cards, insufficient funds
- **Subscription Management**: Upgrades, downgrades, cancellations
- **Error Handling**: Network issues, session timeouts, form validation
- **Security**: HTTPS enforcement, session management, access control
- **Mobile**: Responsive design, touch interactions, mobile browsers
- **Cross-Browser**: Chrome, Firefox, Safari, Edge compatibility

### ⚠️ Manual Testing Required
These scenarios cannot be fully automated and require manual verification:
- Stripe Checkout form interaction
- 3D Secure authentication flows
- Customer portal functionality
- Email notification content
- Mobile payment experience
- Network interruption handling

## Integration with Automated Tests

### Existing E2E Tests
The [payment-flow-e2e.spec.js](./payment-flow-e2e.spec.js) file provides automated testing for:
- User registration and authentication
- Plan selection and button interactions
- API endpoint connectivity
- Post-payment dashboard access
- Subscription status verification

### Manual Testing Supplements
Manual testing fills gaps that automation cannot cover:
- Actual Stripe payment processing
- Payment form interactions
- Error message validation
- User experience verification
- Cross-browser payment behavior

## Troubleshooting

### Common Issues

**❌ "Test accounts creation failed"**
- Check database connection
- Verify Supabase credentials
- Ensure proper table permissions

**❌ "Stripe checkout not loading"**
- Verify Stripe keys are in test mode
- Check API endpoint connectivity
- Review browser console for errors

**❌ "Webhook events not received"**
- Confirm webhook endpoint URL
- Check webhook secret configuration
- Verify Stripe webhook settings

**❌ "Subscription not activated"**
- Check webhook processing logs
- Verify database updates
- Confirm Stripe event delivery

### Debug Resources
- **Stripe Dashboard**: Monitor test payments and webhooks
- **Browser DevTools**: Check network requests and console errors
- **Application Logs**: Review payment processing logs
- **Database**: Verify subscription data updates

## Production Deployment

### Before Going Live
1. **Complete all manual testing scenarios**
2. **Review and sign off on verification checklist**
3. **Switch Stripe keys to live mode**
4. **Update webhook endpoints for production**
5. **Test with small real transaction**
6. **Monitor initial live payments closely**

### Post-Deployment Monitoring
- Track payment success/failure rates
- Monitor webhook delivery success
- Watch for subscription activation issues
- Alert on unusual payment patterns

## Contributing

### Adding New Test Scenarios
1. Update the manual testing guide with new steps
2. Add corresponding verification items to checklist
3. Include any new test cards or configurations
4. Document expected outcomes clearly

### Reporting Issues
Use this template for payment-related bug reports:

```markdown
## Payment Issue Report

**Test Scenario**: [Scenario name from guide]
**Environment**: [staging/development]
**Browser**: [Chrome 91.0, etc.]
**Test Card Used**: [Card number]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result**: [What should happen]
**Actual Result**: [What actually happened]
**Screenshots**: [Attach relevant screenshots]
**Stripe Logs**: [Include relevant Stripe Dashboard info]
```

---

## Summary

This testing suite provides comprehensive coverage of the BookedBarber payment system through:

1. **Structured manual testing** with step-by-step guidance
2. **Automated test data management** for consistent testing
3. **Complete Stripe test configuration** for all scenarios
4. **Quality assurance checklist** for production readiness

Use these resources to ensure payment system reliability before deployment and maintain quality through ongoing testing.
# Manual Payment Flow Testing Guide

## Overview

This guide provides comprehensive manual testing procedures for the BookedBarber payment flow since automated Stripe Checkout testing has limitations. Use this guide to ensure the complete payment system works correctly across all scenarios.

## Pre-Testing Setup

### 1. Environment Requirements
- **Test Environment**: Use staging/development environment
- **Stripe Mode**: Ensure Stripe is in TEST mode
- **Email Access**: Have access to test email addresses
- **Browser**: Latest Chrome/Firefox with developer tools enabled
- **Screen Recording**: Optional but recommended for bug reports

### 2. Test Environment URLs
- **Staging**: `https://staging.bookedbarber.com`
- **Development**: `http://localhost:9999`
- **Production**: `https://bookedbarber.com` (use with extreme caution)

### 3. Test Account Preparation
Before starting, run the test data setup script:
```bash
node scripts/create-test-accounts.js
```

## Test Scenarios

### Scenario 1: New User Registration → Subscription Flow

#### Step 1: Account Registration
1. Navigate to registration page: `/register`
2. Fill registration form:
   - **Email**: Use unique test email (e.g., `test-${timestamp}@bookedbarber.com`)
   - **Password**: `TestPassword123!`
   - **Confirm Password**: `TestPassword123!`
   - **Name**: `Test User`
   - **Role**: Select appropriate role

**Screenshot**: `01-registration-form.png`

3. Click "Create Account"
4. **Expected Result**: Redirect to `/subscribe` page
5. **Verify**: URL contains `/subscribe`

**Screenshot**: `02-subscribe-redirect.png`

#### Step 2: Plan Selection
1. Verify all three pricing tiers are displayed:
   - **Individual Barber**: $35/month
   - **Barbershop**: $99/month
   - **Multi-Location**: $249/month

2. Test billing period toggle:
   - Switch between Monthly/Yearly
   - Verify price updates and savings display
   - Note: Yearly shows 20% discount

**Screenshot**: `03-pricing-tiers.png`

3. Select "Individual Barber" plan (Monthly)
4. Click "Start as Individual" button
5. **Expected Result**: 
   - Button shows loading state ("Processing...")
   - Redirect to Stripe Checkout within 3-5 seconds

**Screenshot**: `04-plan-selection.png`

#### Step 3: Stripe Checkout Completion
1. **Verify Stripe Checkout URL**: Should contain `checkout.stripe.com`
2. **Fill payment form with test card**:
   - **Email**: Should be pre-filled from account
   - **Card Number**: `4242 4242 4242 4242` (Visa)
   - **Expiry Date**: `12/35` (any future date)
   - **CVC**: `123`
   - **ZIP Code**: `10001`
   - **Cardholder Name**: `Test User`

**Screenshot**: `05-stripe-checkout-form.png`

3. Click "Subscribe" button
4. **Expected Result**: Processing animation, then redirect to success page
5. **Verify Success URL**: Should redirect to `/subscribe/success?session_id=...`

**Screenshot**: `06-payment-success.png`

#### Step 4: Subscription Activation Verification
1. Navigate to `/dashboard`
2. **Expected Results**:
   - Access granted (no redirect to login/subscribe)
   - Subscription tier displayed as "Individual Barber"
   - Subscription status shown as "Active"
   - Credits displayed (500 SMS, 1,000 Email)

**Screenshot**: `07-dashboard-access.png`

3. Check subscription details in billing section (`/billing`)
4. **Verify**:
   - Subscription tier and billing period
   - Next billing date
   - Payment method (last 4 digits)
   - "Manage Subscription" button present

**Screenshot**: `08-billing-details.png`

### Scenario 2: Existing User Adding Subscription

#### Step 1: Login to Existing Account
1. Use existing test account without subscription
2. Navigate to `/login`
3. Enter credentials and login
4. **Expected Result**: Redirect to `/subscribe` (no active subscription)

#### Step 2: Follow Subscription Flow
Follow Steps 2-4 from Scenario 1

### Scenario 3: Plan Upgrade/Downgrade Testing

#### Step 1: Access Subscription Management
1. Login with active subscription
2. Navigate to `/billing`
3. Click "Manage Subscription"
4. **Expected Result**: Redirect to Stripe Customer Portal

**Screenshot**: `09-stripe-portal.png`

#### Step 2: Plan Change
1. In Stripe Portal, click "Update plan"
2. Select different tier (e.g., upgrade to Barbershop)
3. **Expected Results**:
   - Proration calculation shown
   - Immediate upgrade confirmation
   - Return to application

#### Step 3: Verify Plan Change
1. Return to `/billing` in main application
2. **Verify**:
   - New plan tier displayed
   - Updated credit limits
   - Correct billing amount

### Scenario 4: Payment Method Updates

#### Step 1: Access Payment Methods
1. Navigate to `/billing`
2. Click "Manage Subscription" → Stripe Portal
3. Go to "Payment methods" section

#### Step 2: Update Payment Method
1. Click "Add payment method"
2. Add new test card: `4000 0000 0000 0341` (American Express)
3. Set as default payment method
4. **Verify**: New card becomes primary

#### Step 3: Remove Old Payment Method
1. Delete previous payment method
2. **Verify**: Cannot delete last payment method
3. Confirm changes saved

### Scenario 5: Subscription Cancellation

#### Step 1: Initiate Cancellation
1. Access Stripe Customer Portal via "Manage Subscription"
2. Click "Cancel plan"
3. Select cancellation reason
4. Choose cancellation timing:
   - **Option A**: Cancel immediately
   - **Option B**: Cancel at period end

**Screenshot**: `10-cancellation-form.png`

#### Step 2: Verify Cancellation
1. **For immediate cancellation**:
   - Access revoked immediately
   - Redirect to `/subscribe` on next login
2. **For end-of-period cancellation**:
   - Access maintained until period end
   - Subscription shows "Canceling" status
   - Billing page shows cancellation date

**Screenshot**: `11-cancellation-confirmation.png`

## Error Scenario Testing

### Failed Payment Testing

#### Scenario 1: Declined Card
1. Use test card: `4000 0000 0000 0002` (Generic Decline)
2. Complete checkout process
3. **Expected Results**:
   - Error message: "Your card was declined"
   - User remains on checkout page
   - Can retry with different card

**Screenshot**: `12-card-declined.png`

#### Scenario 2: Insufficient Funds
1. Use test card: `4000 0000 0000 9995` (Insufficient Funds)
2. **Expected Results**:
   - Specific error message about insufficient funds
   - Option to try different payment method

#### Scenario 3: Incorrect CVC
1. Use valid card with wrong CVC
2. **Expected Results**:
   - CVC validation error
   - Form highlights CVC field

#### Scenario 4: Expired Card
1. Use test card: `4000 0000 0000 0069` (Expired Card)
2. **Expected Results**:
   - Expired card error message
   - Request for valid card

### Network/System Error Testing

#### Scenario 1: Network Interruption
1. Start checkout process
2. Disable network connection during payment
3. **Expected Results**:
   - Appropriate error message
   - Ability to retry
   - No duplicate charges

#### Scenario 2: Session Timeout
1. Leave checkout page open for extended period
2. Attempt to complete payment
3. **Expected Results**:
   - Session expiry message
   - Redirect to restart flow

## Post-Payment Verification

### Database Verification
Check that the following records are created:

1. **User Table Updates**:
   - `subscription_tier`: Correct tier (barber/shop/enterprise)
   - `subscription_status`: "active"
   - `stripe_customer_id`: Populated
   - `stripe_subscription_id`: Populated
   - `subscription_current_period_end`: Future date

2. **Subscription History**:
   - New record in `subscription_history` table
   - Correct amount and currency
   - Payment method details

### Webhook Verification
Check Stripe Dashboard → Webhooks for successful events:

1. **checkout.session.completed**: ✅
2. **customer.subscription.created**: ✅
3. **invoice.payment_succeeded**: ✅

### Email Verification
Verify emails are sent:

1. **Registration confirmation**
2. **Subscription activation**
3. **Payment receipt**

## Mobile Testing

### Mobile Responsive Tests
1. **iPhone Safari**: Test complete flow
2. **Android Chrome**: Test complete flow
3. **iPad**: Test tablet experience

### Mobile-Specific Checks
- Touch targets are adequate size
- Forms work with mobile keyboards
- Payment forms are mobile-optimized
- Stripe Checkout is mobile-friendly

## Performance Testing

### Page Load Times
- Registration page: < 2 seconds
- Subscribe page: < 2 seconds
- Stripe Checkout: < 3 seconds
- Success page: < 2 seconds

### Payment Processing Times
- Checkout session creation: < 1 second
- Stripe payment processing: < 5 seconds
- Webhook processing: < 2 seconds
- Database updates: < 1 second

## Security Testing

### Data Protection
1. **No sensitive data in URLs**
2. **HTTPS enforced throughout**
3. **No payment data stored locally**
4. **Stripe handles all card data**

### Session Security
1. **Session invalidation after logout**
2. **Subscription status checks on protected routes**
3. **CSRF protection on forms**

## Browser Compatibility

Test across multiple browsers:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ⚠️ IE11 (if supported)

## Documentation Requirements

### For Each Test Run

1. **Test Environment**: Document which environment was used
2. **Test Date/Time**: Include timestamp
3. **Tester Name**: Who performed the test
4. **Browser/Device**: Specific browser version and device
5. **Test Results**: Pass/Fail for each scenario
6. **Screenshots**: Capture key stages
7. **Issues Found**: Document any bugs or unexpected behavior

### Bug Report Template

```markdown
## Bug Report

**Test Scenario**: [Scenario name]
**Environment**: [staging/development/production]
**Browser**: [Chrome 91.0, etc.]
**Device**: [Desktop/Mobile/Tablet]

**Steps to Reproduce**:
1. Step one
2. Step two
3. Step three

**Expected Result**: [What should happen]
**Actual Result**: [What actually happened]
**Screenshots**: [Attach relevant screenshots]
**Severity**: [Critical/High/Medium/Low]
```

## Success Criteria

### Complete Success
All scenarios pass with:
- ✅ Successful payment processing
- ✅ Correct subscription activation
- ✅ Proper access control
- ✅ Accurate billing information
- ✅ Working subscription management

### Acceptable Issues
Minor issues that don't block functionality:
- UI/UX improvements needed
- Non-critical error messages
- Performance optimizations

### Blocking Issues
Issues that prevent release:
- Payment processing failures
- Security vulnerabilities
- Data corruption
- Complete feature breakdown

## Emergency Procedures

### If Payment Processing Fails
1. **Immediately stop testing**
2. **Notify development team**
3. **Document exact error conditions**
4. **Do not attempt to process real payments**

### If Data Issues Detected
1. **Stop testing immediately**
2. **Document the data inconsistency**
3. **Check if test data contaminated production**
4. **Escalate to technical lead**

## Next Steps After Testing

1. **Generate test report** using verification checklist
2. **Upload all screenshots** to shared drive
3. **Submit bug reports** for any issues found
4. **Schedule re-testing** after fixes
5. **Sign off on payment system** when all tests pass

---

**Remember**: Always use test mode and test cards. Never use real payment information during testing.
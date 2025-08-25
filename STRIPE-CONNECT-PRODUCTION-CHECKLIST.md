# Stripe Connect Production Readiness Checklist

## Overview

This checklist ensures the Stripe Connect API endpoints are production-ready for the unified financial management system where:
- Shop owners have main Stripe accounts  
- Barbers get individual Stripe Connect accounts
- Payments are automatically split at the processor level
- Commission calculations happen automatically

## 🚀 Quick Testing Commands

```bash
# Test all endpoints in development
npm run test:stripe

# Test specific endpoints
npm run test:stripe:create      # Create account endpoint
npm run test:stripe:onboarding  # Onboarding link endpoint  
npm run test:stripe:status      # Account status endpoint

# Test in production environment
npm run test:stripe:prod

# Comprehensive test suite with database setup
npm run test:stripe:comprehensive
```

## 📋 Pre-Production Checklist

### ✅ Environment Configuration

#### Required Environment Variables
- [ ] `STRIPE_SECRET_KEY` - Set to live key (starts with `sk_live_`)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Production Supabase URL
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Production service role key  
- [ ] `NEXT_PUBLIC_APP_URL` - Production app URL (https://bookedbarber.com)

#### Stripe Configuration
- [ ] Stripe account has Connect permissions enabled
- [ ] Stripe webhook endpoints configured for production URL
- [ ] Express account creation permissions verified
- [ ] Account linking permissions verified

### ✅ Database Schema

#### financial_arrangements Table
- [ ] `barber_stripe_account_id` column exists (VARCHAR(255))
- [ ] `barber_stripe_onboarded` column exists (BOOLEAN DEFAULT false)
- [ ] Table has proper RLS policies for barbershop owners and barbers
- [ ] Indexes on `barbershop_id`, `barber_id`, and `barber_stripe_account_id`
- [ ] Updated_at trigger configured

#### Test Database Integration
```sql
-- Verify schema
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'financial_arrangements' 
AND column_name IN ('barber_stripe_account_id', 'barber_stripe_onboarded');

-- Verify RLS policies
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'financial_arrangements';
```

### ✅ API Endpoint Testing

#### 1. Create Account Endpoint (`/api/stripe/connect/create-account`)

**Functional Tests:**
- [ ] Creates new Stripe Express account successfully
- [ ] Handles duplicate account creation gracefully
- [ ] Saves account ID to `financial_arrangements` table
- [ ] Sets `barber_stripe_onboarded` to false initially
- [ ] Returns proper success response format

**Security Tests:**
- [ ] Requires valid Supabase authentication
- [ ] Only barbershop owners can create accounts for their barbers
- [ ] Validates barbershop ownership before account creation
- [ ] Properly sanitizes input parameters

**Error Handling:**
- [ ] Returns 401 for unauthenticated requests
- [ ] Returns 403 for unauthorized users (non-owners)
- [ ] Returns 400 for missing required fields
- [ ] Returns 500 with safe error messages for Stripe API failures
- [ ] Logs errors without exposing sensitive data

#### 2. Onboarding Link Endpoint (`/api/stripe/connect/onboarding-link`)

**Functional Tests:**
- [ ] Creates account onboarding link (POST method)
- [ ] Refreshes expired onboarding link (GET method)  
- [ ] Returns valid Stripe-hosted onboarding URL
- [ ] Includes proper return and refresh URLs
- [ ] Sets correct expiration time

**Security Tests:**
- [ ] Requires valid Supabase authentication
- [ ] Allows barbershop owners to get links for their barbers
- [ ] Allows barbers to get their own onboarding links
- [ ] Validates account ownership before link creation

**Error Handling:**
- [ ] Returns 401 for unauthenticated requests
- [ ] Returns 403 for unauthorized users
- [ ] Returns 400 for missing account ID
- [ ] Returns 404 for invalid account ID
- [ ] Handles Stripe API errors gracefully

#### 3. Account Status Endpoint (`/api/stripe/connect/account-status`)

**Functional Tests:**
- [ ] Gets account status by Stripe account ID
- [ ] Gets account status by barber ID (database lookup)
- [ ] Returns comprehensive account information
- [ ] Updates database when onboarding complete
- [ ] Handles accounts without Stripe integration

**Security Tests:**
- [ ] Requires valid Supabase authentication
- [ ] Returns data only for authorized users
- [ ] Validates account ownership

**Error Handling:**
- [ ] Returns 400 for missing required parameters
- [ ] Returns 404 for invalid/deleted Stripe accounts
- [ ] Handles database connection errors
- [ ] Handles Stripe API rate limiting

### ✅ Integration Testing

#### Database Integration
- [ ] Account creation updates `financial_arrangements` correctly
- [ ] Status updates sync between Stripe and database
- [ ] Multiple barbershop support works correctly
- [ ] RLS policies enforced properly

#### Stripe Integration  
- [ ] Express account creation works with live API
- [ ] Account linking generates valid URLs
- [ ] Status retrieval returns accurate information
- [ ] Webhook handling for account updates (if implemented)

#### End-to-End Flow
- [ ] Barbershop owner can create barber account
- [ ] Barber receives onboarding link
- [ ] Onboarding completion updates database
- [ ] Account status reflects correct information
- [ ] Payment splitting works correctly (test with small amounts)

### ✅ Performance & Reliability

#### Response Times
- [ ] Account creation: < 3 seconds
- [ ] Link generation: < 1 second  
- [ ] Status checking: < 500ms
- [ ] Database queries optimized with proper indexes

#### Error Recovery
- [ ] Partial failures handled gracefully
- [ ] Retry logic for transient Stripe API errors
- [ ] Database transactions for atomic operations
- [ ] Proper logging for debugging production issues

#### Rate Limiting
- [ ] Stripe API rate limits respected
- [ ] Implement request queuing if needed
- [ ] Monitor API usage in production

### ✅ Security Hardening

#### Authentication & Authorization
- [ ] All endpoints require valid Supabase session
- [ ] Proper ownership validation on all operations
- [ ] No privilege escalation vulnerabilities
- [ ] Session handling follows best practices

#### Data Protection
- [ ] Sensitive Stripe data not logged
- [ ] API keys properly secured
- [ ] No sensitive data in client-side responses
- [ ] HTTPS enforced for all API calls

#### Input Validation
- [ ] All user inputs sanitized
- [ ] SQL injection prevention
- [ ] XSS prevention in responses
- [ ] Proper email validation

### ✅ Monitoring & Observability

#### Logging
- [ ] Structured logging implemented
- [ ] Error tracking with context
- [ ] Performance metrics logged
- [ ] No sensitive data in logs

#### Monitoring
- [ ] API endpoint monitoring configured
- [ ] Database query performance monitoring
- [ ] Stripe API error rate monitoring
- [ ] Alert thresholds configured

#### Dashboards
- [ ] Stripe Connect adoption metrics
- [ ] Onboarding completion rates
- [ ] API error rates and types
- [ ] Performance metrics

## 🧪 Testing Procedures

### Pre-Deployment Testing

1. **Run Comprehensive Test Suite**
   ```bash
   npm run test:stripe:comprehensive
   ```

2. **Manual Production Environment Testing**
   ```bash
   npm run test:stripe:prod
   ```

3. **Database Integrity Check**
   ```sql
   -- Check for data consistency
   SELECT COUNT(*) as total_arrangements,
          COUNT(barber_stripe_account_id) as with_stripe_accounts,
          COUNT(CASE WHEN barber_stripe_onboarded THEN 1 END) as onboarded
   FROM financial_arrangements 
   WHERE is_active = true;
   ```

### Post-Deployment Validation

1. **Health Check**
   ```bash
   curl -X GET "https://bookedbarber.com/api/stripe/connect/account-status?barberId=test" \
        -H "Authorization: Bearer $AUTH_TOKEN"
   ```

2. **End-to-End Test with Real Account**
   - Create a test barber account
   - Generate onboarding link
   - Complete onboarding process
   - Verify status updates correctly

3. **Monitor for 24 Hours**
   - Check error logs
   - Monitor API response times
   - Verify no security incidents

## 🚨 Production Issues & Troubleshooting

### Common Issues

#### "Unauthorized" Errors (401/403)
- Verify Supabase authentication is working
- Check RLS policies on financial_arrangements table
- Ensure user has proper barbershop association

#### Stripe API Errors
- Check API key permissions
- Verify account creation limits not exceeded
- Check for Stripe API outages

#### Database Errors
- Verify connection string and credentials
- Check table schema matches expectations
- Ensure proper indexes exist

### Rollback Plan

If critical issues are detected:

1. **Immediate Response**
   - Disable endpoints via feature flag
   - Route traffic to fallback system
   - Alert development team

2. **Data Recovery**
   - Backup financial_arrangements table
   - Identify affected accounts
   - Manual data reconciliation if needed

3. **Communication**
   - Notify affected barbershops
   - Provide timeline for resolution
   - Offer manual onboarding if needed

## 📞 Support Contacts

- **Stripe Connect Issues**: [Stripe Support](https://support.stripe.com)
- **Database Issues**: Supabase Support
- **Application Issues**: Development Team
- **Emergency Escalation**: Platform Administrator

## 📚 Additional Resources

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Express Accounts Guide](https://stripe.com/docs/connect/express-accounts)
- [Webhooks for Connect](https://stripe.com/docs/connect/webhooks)
- [Testing Connect](https://stripe.com/docs/connect/testing)

---

**Last Updated**: December 2024  
**Version**: 1.0  
**Status**: Ready for Production Review
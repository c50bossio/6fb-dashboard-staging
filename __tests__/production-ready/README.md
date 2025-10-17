# Production-Ready Test Suite

This directory contains comprehensive tests to verify that the 6FB Barbershop Platform is production-ready with all mock data removed and real integrations working.

## Test Categories

### 1. Authentication Flow Tests (`auth-flow.test.js`)
**Purpose**: Verify real Supabase authentication integration without mock data

**What it tests**:
- User creation with real Supabase credentials
- JWT token validation and structure
- OAuth configuration (no test pages in production)
- User profile association with barbershop_id
- Role-based access control
- Session persistence and management

**Key validations**:
- No placeholder emails like "test@example.com"
- JWT tokens have required claims and proper expiration
- Authentication requires real database connection
- Users get properly associated with barbershops

### 2. Dashboard Data Tests (`dashboard-data.test.js`)
**Purpose**: Ensure dashboard shows real data or proper empty states

**What it tests**:
- Dashboard metrics come from actual database tables
- No "demo-shop-001" references in database
- AI insights display only when real data exists
- Proper empty states when no data exists
- Real-time data updates reflect database changes

**Key validations**:
- No hardcoded shop information
- No placeholder addresses or phone numbers
- No test client names in appointments
- Database schema has proper structure

### 3. Booking System Tests (`booking-system.test.js`)
**Purpose**: Verify booking system uses real barbershop data

**What it tests**:
- Booking page loads real barbershop data
- Services and barbers come from database
- No hardcoded shop info (address, phone)
- Payment processing through Stripe
- Calendar integration with real appointment data

**Key validations**:
- No hardcoded addresses like "123 Main St"
- No fake phone numbers like "(555) 123-4567"
- Shop hours come from database configuration
- Payment amounts come from real service prices

### 4. AI System Tests (`ai-system.test.js`)
**Purpose**: Ensure AI requires authentication and analyzes real data

**What it tests**:
- AI endpoints require authenticated user
- AI requires user with associated barbershop
- AI analyzes real data, not mock data
- Insights stored in database with real barbershop_id
- Cache uses real barbershop_id as key

**Key validations**:
- AI provider configurations (OpenAI, Anthropic, Google)
- Redis cache configuration for production
- AI agents configured for specific domains
- No demo agent configurations in database

### 5. External Integrations Tests (`external-integrations.test.js`)
**Purpose**: Verify Stripe, Twilio, SendGrid, and calendar sync work properly

**What it tests**:
- Stripe webhook processing
- Twilio SMS with real phone numbers
- SendGrid email with real branding
- Google Calendar sync functionality
- Service health monitoring

**Key validations**:
- API credentials properly configured
- No placeholder/test credentials
- Webhook endpoints secure and accessible
- Rate limiting and quotas properly configured

### 6. Data Integrity Tests (`data-integrity.test.js`)
**Purpose**: Verify no placeholder/mock data exists in production

**What it tests**:
- No placeholder email addresses
- No fake phone numbers (555 patterns)
- No hardcoded addresses
- No mock customer data
- Database constraints and validation
- Foreign key relationships

**Key validations**:
- All data comes from Supabase database
- No test@example.com emails
- No (555) 123-4567 phone numbers
- No "Test Client" appointment names
- Proper database schema validation

## Running the Tests

### Run All Production Tests
```bash
# Run comprehensive production test suite
npm run test:production-ready

# OR use the script directly
./scripts/run-production-tests.sh
```

### Run Individual Test Categories
```bash
# Authentication tests only
npx jest __tests__/production-ready/auth-flow.test.js

# Dashboard data tests only
npx jest __tests__/production-ready/dashboard-data.test.js

# Booking system tests only
npx jest __tests__/production-ready/booking-system.test.js

# AI system tests only
npx jest __tests__/production-ready/ai-system.test.js

# External integrations tests only
npx jest __tests__/production-ready/external-integrations.test.js

# Data integrity tests only
npx jest __tests__/production-ready/data-integrity.test.js
```

### Run Production Readiness Checker
```bash
# Complete production readiness assessment
node scripts/production-readiness-checker.js

# OR through npm script
npm run check:production
```

## Test Requirements

### Environment Variables Required
```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Stripe (Required for payment tests)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_or_test_key
STRIPE_SECRET_KEY=sk_live_or_test_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# AI Providers (At least one required)
OPENAI_API_KEY=sk-your_openai_key
ANTHROPIC_API_KEY=sk-ant-your_anthropic_key
GOOGLE_AI_API_KEY=AIza_your_google_key

# Optional Integrations
TWILIO_ACCOUNT_SID=AC_your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
SENDGRID_API_KEY=SG.your_sendgrid_key
REDIS_URL=your_redis_url
```

### Database Requirements
- Supabase database must be accessible
- Required tables: `profiles`, `barbershops`, `appointments`, `services`, `barbers`
- Proper RLS (Row Level Security) policies configured
- No mock/placeholder data in production tables

## Test Output and Reporting

### Test Results
- Tests output detailed results with pass/fail status
- Failed tests include specific error details
- Warnings highlight potential issues that don't fail tests

### Production Readiness Report
The production readiness checker generates:
- JSON report: `production-readiness-report.json`
- Console summary with color-coded results
- Production readiness score (0-100%)

### Test Reports
- HTML reports in `test-reports/` directory
- Coverage reports in `coverage/` directory
- Playwright reports in `playwright-report/` directory

## Common Issues and Solutions

### "Missing Supabase credentials"
- Ensure environment variables are properly set
- Check `.env.local` or `.env` file exists
- Verify Supabase URL and keys are valid

### "Permission denied" errors
- Service role key may be needed for some database operations
- Check RLS policies allow the operations being tested
- Ensure test user has proper permissions

### "Table does not exist" errors
- Run database migrations to create required tables
- Check if you're connected to the correct Supabase project
- Verify table names match the schema

### Tests timing out
- Increase test timeout in Jest configuration
- Check network connectivity to external services
- Ensure services (Supabase, Stripe, etc.) are responsive

## Best Practices

### Before Running Tests
1. Ensure all environment variables are configured
2. Verify database is accessible and has proper schema
3. Check that external services (Stripe, Twilio, etc.) are configured
4. Run `npm install` to ensure dependencies are installed

### Interpreting Results
- **PASS**: Test completed successfully
- **FAIL**: Critical issue that must be fixed before production
- **WARN**: Potential issue that should be reviewed
- **INFO**: Informational message

### Production Deployment
Only deploy to production when:
- All critical tests pass (FAIL count = 0)
- Production readiness score ≥ 90%
- No placeholder/mock data found
- All required integrations configured

## Contributing

When adding new production tests:
1. Follow the existing test structure and naming conventions
2. Test real integrations, not mocked responses
3. Include both positive and negative test cases
4. Add appropriate cleanup in `afterEach` hooks
5. Update this README with new test descriptions
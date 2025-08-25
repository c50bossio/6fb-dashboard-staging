# Comprehensive E2E Testing Suite Documentation

## Overview

This comprehensive End-to-End (E2E) testing suite validates all critical user journeys and features of the 6FB AI Agent System with real data integration. The test suite ensures that completed features work together seamlessly without any mock data.

## 🎯 Test Coverage

### Critical User Flows
- **Complete Booking Flow**: Service selection → Barber choice → Time selection → Payment → Confirmation
- **Payment Processing**: Stripe integration with success/failure scenarios 
- **Notification System**: Email, SMS, and real-time notifications
- **Analytics Dashboard**: Real data verification and calculations
- **Visual Regression**: Cross-browser and responsive design testing
- **Error Scenarios**: Network failures, validation errors, edge cases

### Key Features Verified
✅ **Real Data Integration**: No mock data - all tests use actual Supabase database  
✅ **Stripe Payment Processing**: Live payment testing with test cards  
✅ **Notification Delivery**: Email and SMS confirmation testing  
✅ **Dashboard Analytics**: Revenue calculations with real booking data  
✅ **Multi-Browser Support**: Chrome, Firefox, Safari compatibility  
✅ **Mobile Responsiveness**: Touch interactions and viewport testing  
✅ **Error Handling**: Graceful failure and recovery mechanisms  

## 📁 Test Suite Structure

```
tests/e2e/
├── complete-booking-flow.spec.js     # End-to-end booking journey
├── payment-processing.spec.js        # Stripe payment integration
├── notification-system.spec.js       # Email/SMS/push notifications
├── analytics-dashboard.spec.js       # Dashboard data verification
├── visual-regression.spec.js         # UI consistency across browsers
├── error-scenarios.spec.js           # Error handling and edge cases
└── e2e-test-runner.js                # Test orchestration and reporting

scripts/
└── run-e2e-tests.sh                  # Comprehensive test execution script

.github/workflows/
└── e2e-tests.yml                     # CI/CD pipeline integration
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- All services running (Frontend, Backend, Database)
- Required environment variables set:
  ```bash
  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
  STRIPE_SECRET_KEY=your_stripe_test_key
  ```

### Basic Test Execution

```bash
# Install dependencies and browsers
npm run claude:setup

# Health check - verify all services are running
npm run claude:health

# Run smoke tests (quick validation)
npm run test:e2e:smoke

# Run critical tests only
npm run test:e2e:critical

# Run full test suite
npm run test:e2e:full
```

### Specific Test Suites

```bash
# Individual test suites
npm run test:e2e:booking       # Complete booking flow
npm run test:e2e:payment       # Payment processing
npm run test:e2e:notifications # Notification system
npm run test:e2e:analytics     # Analytics dashboard
npm run test:e2e:visual        # Visual regression
npm run test:e2e:errors        # Error scenarios

# Cross-browser testing
npm run test:e2e:cross-browser

# Mobile testing
npm run test:e2e:mobile

# Visual regression
npm run test:visual
```

## 🔧 Advanced Usage

### Custom Test Execution

```bash
# Use the comprehensive test runner script
./scripts/run-e2e-tests.sh --help

# Examples:
./scripts/run-e2e-tests.sh --browsers all --suites booking,payment
./scripts/run-e2e-tests.sh --environment staging --headed --debug
./scripts/run-e2e-tests.sh --critical-only --verbose
```

### Debug Mode

```bash
# Run tests with browser visible
npm run test:e2e:headed

# Step-by-step debugging
npm run test:e2e:debug

# Interactive test runner
npm run test:e2e:ui
```

## 📊 Test Reports

### Automatic Report Generation
Tests automatically generate comprehensive reports:
- **HTML Report**: `playwright-report/index.html`
- **JSON Results**: `test-results/results.json`
- **Screenshots**: `screenshots/` directory
- **Videos**: Available for failed tests

### Viewing Reports
```bash
# Open HTML report
npm run report:open

# Serve report on local server
npm run report:serve

# Generate custom reports
npm run report:generate
```

## 🧪 Test Categories

### 1. Complete Booking Flow Tests
**File**: `complete-booking-flow.spec.js`

Tests the entire booking journey from start to finish:
- Service selection with real shop data
- Barber availability checking
- Time slot selection with calendar integration
- Customer information validation
- Payment processing (online and in-person)
- Booking confirmation and database verification

**Key Validations**:
- Real shop settings loaded from Supabase
- No hardcoded or mock data used
- Payment integration with actual Stripe Connect
- Notification triggers working correctly
- Mobile responsive design

### 2. Payment Processing Tests
**File**: `payment-processing.spec.js`

Comprehensive Stripe integration testing:
- Successful payments with test cards
- Failed payment scenarios (declined, insufficient funds)
- Deposit handling for shops requiring deposits
- Webhook processing for payment events
- Error recovery and retry mechanisms

**Test Cards Used**:
- `4242424242424242` - Successful Visa
- `4000000000000002` - Declined card
- `4000000000009995` - Insufficient funds
- `4000000000000069` - Expired card

### 3. Notification System Tests
**File**: `notification-system.spec.js`

Verifies all notification channels:
- Email booking confirmations
- SMS notifications (if enabled)
- Real-time push notifications
- Webhook processing for booking events
- Error handling for failed deliveries

**Notification Types Tested**:
- Booking confirmations
- Payment receipts
- Booking reminders
- Real-time dashboard updates

### 4. Analytics Dashboard Tests
**File**: `analytics-dashboard.spec.js`

Validates dashboard data accuracy:
- Revenue calculations with real booking data
- Customer metrics and counts
- Booking trends and analytics
- Service popularity rankings
- Data integrity verification

**Metrics Verified**:
- Daily, weekly, monthly revenue
- Customer acquisition and retention
- Booking success rates
- Service performance metrics

### 5. Visual Regression Tests
**File**: `visual-regression.spec.js`

Ensures UI consistency across browsers and devices:
- Cross-browser compatibility (Chrome, Firefox, Safari)
- Mobile responsive design
- Dark mode and accessibility features
- Loading states and error messages
- Modal dialogs and form states

**Viewports Tested**:
- Desktop: 1280x720, 1920x1080
- Tablet: 768x1024
- Mobile: 375x667, 320x568

### 6. Error Scenarios and Edge Cases
**File**: `error-scenarios.spec.js`

Tests application resilience:
- Network connectivity issues
- API timeouts and server errors
- Authentication failures
- Invalid data input handling
- Memory pressure scenarios

**Error Conditions**:
- Offline mode handling
- Payment processing failures
- Form validation errors
- Concurrent user actions
- Browser compatibility issues

## 🔄 CI/CD Integration

### GitHub Actions Workflow
The E2E test suite integrates with GitHub Actions for automated testing:

**Triggers**:
- Pull requests to main branch
- Pushes to main/develop branches
- Daily scheduled runs
- Manual workflow dispatch

**Test Matrix**:
- Multiple browsers (Chrome, Firefox, Safari)
- Different environments (development, staging, production)
- Various test suites (critical, full, specific features)

**Workflow Features**:
- Pre-test environment validation
- Service health checks
- Parallel test execution
- Comprehensive reporting
- Failure notifications
- Visual regression detection

### Environment-Specific Testing

```yaml
# Development: Quick validation
browsers: [chromium]
suites: [critical]

# Staging: Comprehensive testing
browsers: [chromium, firefox]
suites: [all]

# Production: Full validation
browsers: [chromium, firefox, webkit]
suites: [all]
```

## 🛠️ Configuration

### Playwright Configuration
**File**: `playwright.config.js`

Key configurations:
- Multi-browser testing setup
- Visual regression thresholds
- Mobile device emulation
- Performance testing options
- Accessibility testing integration

### Test Data Management
Tests use real data with proper setup and cleanup:
- Dynamic test data creation
- Automatic cleanup after test completion
- No interference between test runs
- Real database operations

### Environment Variables
Required for testing:
```bash
# Core Services
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Payment Processing
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=

# AI Services (optional)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Notifications (optional)
SENDGRID_API_KEY=
TWILIO_AUTH_TOKEN=
```

## 📈 Performance Considerations

### Test Execution Optimization
- Parallel test execution across browsers
- Smart test selection based on changes
- Efficient screenshot comparison
- Selective test suite execution

### Resource Management
- Automatic cleanup of test data
- Memory-efficient test design
- Proper browser session management
- Optimized for CI/CD environments

## 🐛 Troubleshooting

### Common Issues

**Service Not Running**:
```bash
# Check if services are healthy
npm run claude:health

# Start services
bash docker-dev-start.sh
```

**Environment Variables Missing**:
```bash
# Verify environment variables are set
env | grep -E "(SUPABASE|STRIPE|OPENAI)"
```

**Browser Installation Issues**:
```bash
# Reinstall Playwright browsers
npx playwright install --force
```

**Test Data Issues**:
```bash
# Verify test data setup
npm run claude:test-setup
```

### Debug Information
Tests provide detailed debug information:
- Screenshot capture on failures
- Video recordings of test execution
- Network request/response logging
- Console error capture
- Detailed test timing information

## 🎯 Best Practices

### Test Development
1. **Real Data Only**: Never use mock data - always test with actual database
2. **Comprehensive Coverage**: Test happy paths, edge cases, and error scenarios
3. **Cross-Browser Testing**: Ensure compatibility across all supported browsers
4. **Mobile First**: Always test mobile responsiveness
5. **Error Recovery**: Test how the application handles failures

### Test Maintenance
1. **Regular Updates**: Keep tests updated with feature changes
2. **Flaky Test Management**: Investigate and fix unstable tests immediately
3. **Performance Monitoring**: Track test execution times and optimize
4. **Visual Baseline Updates**: Maintain up-to-date visual regression baselines

### CI/CD Best Practices
1. **Fail Fast**: Run critical tests first to catch major issues early
2. **Parallel Execution**: Utilize parallel testing for faster feedback
3. **Smart Triggering**: Run appropriate test suites based on changes
4. **Clear Reporting**: Provide actionable test results and failure information

## 📞 Support

For issues with the E2E testing suite:
1. Check the troubleshooting section above
2. Review test execution logs in `test-results/`
3. Examine screenshots and videos for visual failures
4. Verify environment setup and service health

This comprehensive E2E testing suite ensures that all features work together seamlessly with real data integration, providing confidence in the production readiness of the 6FB AI Agent System.
# Phase 4 Migration Testing Infrastructure

Comprehensive testing suite to validate the booking ecosystem migration from legacy schemas to the unified `appointments` table.

## Quick Start

```bash
# Run all Phase 4 tests
npm run test:phase4

# Run specific test categories
npm run test:phase4:database    # Database integrity tests
npm run test:phase4:api         # API endpoint tests
npm run test:phase4:e2e         # End-to-end workflow tests
npm run test:phase4:notifications # Notification delivery tests

# Run quick validation (database + API only)
npm run test:phase4:quick

# Generate test report
npm run test:phase4:report
```

## Directory Structure

```
tests/phase4/
├── README.md                           # This file
├── database-integrity.test.js          # Database schema and data validation
├── api-endpoints.test.js               # API CRUD operations testing
├── booking-flow.e2e.test.js           # Complete booking workflows
├── calendar-integration.e2e.test.js   # Calendar component testing
├── notification-delivery.test.js      # Notification system validation
├── fixtures/
│   ├── test-appointments.json         # Appointment test data
│   ├── test-clients.json              # Client/user test data
│   └── test-services.json             # Service test data
├── utils/
│   ├── database-helpers.js            # Database utility functions
│   ├── api-helpers.js                 # API testing utilities
│   └── generate-report.js             # Test report generator
└── reports/                           # Generated test reports
    ├── phase4-test-report-*.json
    ├── phase4-test-report-*.md
    └── phase4-test-report-*.html
```

## Test Categories

### 1. Database Integrity Tests
**File**: `database-integrity.test.js`
**Duration**: ~10 minutes

Validates:
- Schema structure matches specification
- No legacy field names remain
- Foreign key relationships intact
- Data consistency and format validation
- Required fields populated

**Run**: `npm run test:phase4:database`

### 2. API Endpoint Tests
**File**: `api-endpoints.test.js`
**Duration**: ~15 minutes

Validates:
- All CRUD operations functional
- Request/response field names correct
- Error handling graceful
- Performance within thresholds
- Data validation working

**Run**: `npm run test:phase4:api`

### 3. End-to-End Workflow Tests
**Files**: `booking-flow.e2e.test.js`, `calendar-integration.e2e.test.js`
**Duration**: ~30 minutes

Validates:
- Complete user journeys
- Walk-in booking flow
- Online client booking
- Barber calendar management
- Appointment lifecycle
- Data persistence

**Run**: `npm run test:phase4:e2e`

### 4. Notification Delivery Tests
**File**: `notification-delivery.test.js`
**Duration**: ~5 minutes

Validates:
- Appointment creation notifications
- Status update notifications
- Reminder notifications
- Proper recipient targeting

**Run**: `npm run test:phase4:notifications`

## Test Fixtures

### Appointments (`fixtures/test-appointments.json`)
- **validAppointment**: Standard confirmed appointment
- **walkInAppointment**: Walk-in customer without prior booking
- **futureAppointment**: Scheduled future appointment
- **completedAppointment**: Historical completed appointment
- **cancelledAppointment**: Cancelled appointment
- **noShowAppointment**: No-show appointment
- **invalidAppointment**: Invalid data for error testing

### Clients (`fixtures/test-clients.json`)
- **registeredClient1-3**: Active registered users
- **walkInClient**: Guest customer data
- **testBarber1-2**: Barber profiles
- **shopOwner**: Shop owner profile

### Services (`fixtures/test-services.json`)
- **basicHaircut**: Standard service (45 min, $35)
- **quickTrim**: Fast service (30 min, $25)
- **fullService**: Premium service (60 min, $50)
- **beardTrim**: Add-on service (20 min, $15)

## Utility Functions

### Database Helpers (`utils/database-helpers.js`)

```javascript
const {
  seedTestAppointments,      // Create test appointment data
  cleanTestData,              // Remove all test data
  verifySchema,               // Validate table schema
  checkReferentialIntegrity,  // Check foreign keys
  verifyRequiredFields,       // Validate required fields
  verifyDateTimeFormats,      // Check date/time formats
  getDatabaseStats            // Get database statistics
} = require('./utils/database-helpers')
```

### API Helpers (`utils/api-helpers.js`)

```javascript
const {
  createTestAppointment,      // POST /api/appointments
  getAppointment,             // GET /api/appointments/:id
  updateAppointment,          // PUT /api/appointments/:id
  deleteAppointment,          // DELETE /api/appointments/:id
  listAppointments,           // GET /api/appointments
  checkAvailability,          // GET /api/appointments/availability
  verifyResponseStructure,    // Validate API response
  verifyFieldNames            // Check field name migration
} = require('./utils/api-helpers')
```

## Test Reports

Reports are automatically generated in three formats:

### JSON Report
- Programmatic access to test results
- Integration with CI/CD pipelines
- Location: `reports/phase4-test-report-{timestamp}.json`

### Markdown Report
- Human-readable summary
- Easy to share and review
- Location: `reports/phase4-test-report-{timestamp}.md`

### HTML Report
- Visual dashboard
- Color-coded results
- Location: `reports/phase4-test-report-{timestamp}.html`

**Generate Report**: `npm run test:phase4:report`

## Acceptance Criteria

Tests validate the following acceptance criteria:

### Database Layer
- ✅ Schema validation: 100% pass rate
- ✅ Foreign key integrity: 0 violations
- ✅ Data consistency: 0 orphaned records
- ✅ Migration completeness: 100% converted

### API Layer
- ✅ Endpoint availability: 100% online
- ✅ Response accuracy: 100% correct field names
- ✅ Error handling: 100% graceful failures
- ✅ Performance: <500ms average response time

### Component Layer
- ✅ Render success: 100% components load
- ✅ Data accuracy: 100% correct data display
- ✅ User interactions: 100% functional
- ✅ Console errors: 0 errors

### E2E Layer
- ✅ Workflow completion: 100% success rate
- ✅ Data persistence: 100% accurate
- ✅ Notification delivery: 100% sent
- ✅ Financial accuracy: 100% correct calculations

## Rollback Criteria

Consider rollback if:

1. **Database Failures**
   - More than 1% orphaned relationships
   - Schema constraints violated
   - Critical foreign keys broken

2. **API Failures**
   - More than 5% endpoints returning errors
   - Critical CRUD operations failing
   - Data corruption detected

3. **Component Failures**
   - Critical booking flow broken
   - Calendar integration non-functional
   - More than 10% components failing

4. **Workflow Failures**
   - Any critical user journey failing
   - Data loss during state transitions
   - Financial calculations incorrect

## Environment Setup

### Required Environment Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:9999
```

### Prerequisites

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# In another terminal, start backend (if needed)
python3 fastapi_backend.py
```

## Troubleshooting

### Tests Failing to Connect to Database

```bash
# Verify Supabase credentials
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Test connection
node test-supabase-access.js
```

### API Tests Failing

```bash
# Ensure development server is running
curl http://localhost:9999/api/health

# Check API logs for errors
```

### E2E Tests Timing Out

```bash
# Run with headed browser for debugging
npx playwright test tests/phase4/booking-flow.e2e.test.js --headed

# Increase timeout in test file
test('...', async ({ page }) => {
  // code
}, 120000) // 2 minutes
```

### Cleaning Test Data

```bash
# Remove all test data from database
npm run cleanup-test-data

# Dry run to see what would be deleted
npm run cleanup-test-data:dry
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Phase 4 Migration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:phase4
      - uses: actions/upload-artifact@v2
        with:
          name: test-reports
          path: tests/phase4/reports/
```

## Support and Contact

**Test Infrastructure Lead**: Agent 4.4
**Issue Tracker**: Create ticket with `phase4-testing` label
**Documentation**: `/tests/phase4-migration-testing-plan.md`

---

**Last Updated**: 2025-10-10
**Version**: 1.0

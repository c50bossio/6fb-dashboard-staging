# 6FB AI Agent System - Testing Framework

## Overview

This document outlines the comprehensive testing framework for the 6FB AI Agent System Next.js application. The testing strategy includes unit tests, integration tests, end-to-end tests, performance tests, and automated CI/CD pipelines.

## 🧪 Testing Strategy

### Test Pyramid Structure

```
    🔺 E2E Tests (Playwright)
      - User workflows
      - Cross-browser testing
      - Critical path validation

  🔹 Integration Tests (Jest)
    - API endpoint testing
    - Component integration
    - External service mocking

🔸 Unit Tests (Jest + Testing Library)
  - Component behavior
  - Pure function testing
  - Business logic validation
```

## 📁 Test Structure

```
6FB AI Agent System/
├── __tests__/                     # Jest unit & integration tests
│   ├── components/
│   │   ├── ui/                    # UI component tests
│   │   │   ├── Button.test.js
│   │   │   ├── Card.test.js
│   │   │   └── Modal.test.js
│   │   └── dashboard/             # Dashboard component tests
│   │       └── AIAgentsDashboard.test.js
│   ├── api/                       # API route tests
│   │   ├── agents.test.js
│   │   ├── auth.test.js
│   │   └── integrations.test.js
│   └── performance/               # Performance tests
│       └── performance.test.js
├── tests/                         # Playwright E2E tests
│   ├── auth.setup.js             # Authentication setup
│   ├── auth.spec.js              # Authentication flows
│   └── dashboard.spec.js         # Dashboard workflows
├── test-utils/                    # Testing utilities
│   ├── jest.setup.js             # Jest configuration
│   ├── test-utils.js             # Custom render functions
│   └── msw-handlers.js           # Mock Service Worker handlers
├── .github/workflows/             # CI/CD pipelines
│   ├── test.yml                  # Main test workflow
│   └── lighthouse.yml            # Performance monitoring
├── jest.config.js                # Jest configuration
├── playwright.config.js          # Playwright configuration
└── lighthouserc.js              # Lighthouse CI configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Installation

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npm run playwright:install
```

## 🧪 Running Tests

### All Tests
```bash
# Run comprehensive test suite
npm run test:all
# or
./scripts/test-all.sh
```

### Unit Tests
```bash
# Run Jest tests
npm run test

# Run with watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run CI mode (no watch, coverage enabled)
npm run test:ci
```

### End-to-End Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (visible browser)
npm run test:e2e:headed
```

### Performance Tests
```bash
# Run performance-specific tests
npm run test -- --testPathPattern=performance

# Run Lighthouse audit
npx lhci autorun
```

## 📊 Test Coverage

### Coverage Targets

- **Statements**: 80%+
- **Branches**: 80%+
- **Functions**: 80%+
- **Lines**: 80%+

### Viewing Coverage

After running `npm run test:coverage`, open:
- HTML Report: `coverage/lcov-report/index.html`
- Terminal Report: Displayed in console

### Coverage by Directory

| Directory | Target | Current |
|-----------|--------|---------|
| components/ui | 90%+ | TBD |
| components/dashboard | 85%+ | TBD |
| app/api | 80%+ | TBD |
| lib/ | 85%+ | TBD |
| services/ | 80%+ | TBD |

## 🎯 Test Categories

### 1. Unit Tests

**Purpose**: Test individual components and functions in isolation

**Examples**:
- Button component variants and interactions
- Card component rendering and props
- Modal component state management
- Utility function behavior

**Best Practices**:
- Test component props and state
- Test event handlers
- Test conditional rendering
- Mock external dependencies

### 2. Integration Tests

**Purpose**: Test component interactions and API integrations

**Examples**:
- API route handlers with database operations
- Component communication
- External service integrations (Trafft)
- Authentication flows

**Best Practices**:
- Use MSW for API mocking
- Test realistic data flows
- Verify error handling
- Test edge cases

### 3. End-to-End Tests

**Purpose**: Test complete user workflows across browsers

**Examples**:
- User registration and login
- AI agent conversations
- Integration setup and sync
- Dashboard navigation

**Best Practices**:
- Test critical user paths
- Use page object model
- Test across multiple browsers
- Verify accessibility

### 4. Performance Tests

**Purpose**: Ensure application meets performance standards

**Examples**:
- Component render times
- API response times
- Bundle size monitoring
- Core Web Vitals tracking

**Best Practices**:
- Set performance budgets
- Monitor regression
- Test with realistic data
- Track over time

## 🔧 Configuration

### Jest Configuration

Key configurations in `jest.config.js`:
- **Environment**: jsdom for DOM testing
- **Setup**: Custom matchers and global mocks
- **Coverage**: Thresholds and exclusions
- **Transform**: TypeScript and ES modules

### Playwright Configuration

Key configurations in `playwright.config.js`:
- **Browsers**: Chromium, Firefox, WebKit
- **Reporters**: HTML, JUnit, JSON
- **Retries**: 2 retries on CI
- **Timeouts**: 30s action, 60s test

### MSW Configuration

Mock Service Worker handles:
- Authentication endpoints
- AI agent API calls
- External integration APIs
- Error scenarios

## 🤖 CI/CD Pipeline

### GitHub Actions Workflow

The pipeline includes:

1. **Lint & Type Check**
   - ESLint validation
   - TypeScript compilation

2. **Unit & Integration Tests**
   - Jest test execution
   - Coverage reporting

3. **End-to-End Tests**
   - Playwright execution
   - Multi-browser testing

4. **Performance Tests**
   - Bundle analysis
   - Lighthouse audits

5. **Security Scan**
   - npm audit
   - Dependency scanning

6. **Deployment**
   - Staging on `staging` branch
   - Production on `main` branch

### Performance Monitoring

Automated performance monitoring via:
- Lighthouse CI on every PR
- Core Web Vitals tracking
- Bundle size analysis
- Performance regression detection

## 📝 Writing Tests

### Component Testing Template

```javascript
import { render, screen } from '@/test-utils/test-utils'
import { ComponentName } from '@/components/ComponentName'

describe('ComponentName', () => {
  it('renders with default props', () => {
    render(<ComponentName />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('handles user interactions', async () => {
    const handleClick = jest.fn()
    const { user } = render(<ComponentName onClick={handleClick} />)
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### API Testing Template

```javascript
import { POST } from '@/app/api/endpoint/route'
import { NextRequest } from 'next/server'

describe('/api/endpoint', () => {
  it('handles valid request', async () => {
    const request = new NextRequest('http://localhost:3000/api/endpoint', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' })
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
  })
})
```

### E2E Testing Template

```javascript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test('completes user workflow', async ({ page }) => {
    await page.goto('/feature')
    
    await page.click('[data-testid="button"]')
    
    await expect(page.locator('[data-testid="result"]')).toBeVisible()
  })
})
```

## 🏆 Best Practices

### General Testing

1. **Test Behavior, Not Implementation**
   - Focus on what the user sees and does
   - Avoid testing internal component state
   - Test the public API/interface

2. **Use Descriptive Test Names**
   - Describe the scenario and expected result
   - Use "should" or "when/then" patterns
   - Be specific about the conditions

3. **Arrange, Act, Assert**
   - Set up test data (Arrange)
   - Perform the action (Act)
   - Check the result (Assert)

4. **Mock External Dependencies**
   - Use MSW for API calls
   - Mock third-party services
   - Keep tests isolated and fast

### React Testing

1. **Query Priority**
   - Use `getByRole` for interactive elements
   - Use `getByLabelText` for form fields
   - Use `getByTestId` as last resort

2. **User Events**
   - Use `@testing-library/user-event`
   - Simulate real user interactions
   - Test keyboard navigation

3. **Async Operations**
   - Use `waitFor` for async updates
   - Don't use arbitrary timeouts
   - Test loading states

### E2E Testing

1. **Page Object Model**
   - Encapsulate page interactions
   - Reuse common workflows
   - Maintain selectors centrally

2. **Data Management**
   - Use test-specific data
   - Clean up after tests
   - Avoid dependencies between tests

3. **Accessibility Testing**
   - Test keyboard navigation
   - Verify ARIA attributes
   - Check color contrast

## 🚨 Debugging Tests

### Jest Tests

```bash
# Run specific test file
npm test Button.test.js

# Run tests matching pattern
npm test -- --testNamePattern="renders with"

# Debug with Chrome DevTools
npm test -- --inspect-brk
```

### Playwright Tests

```bash
# Run with debug mode
npx playwright test --debug

# Run specific test
npx playwright test auth.spec.js

# Generate trace
npx playwright test --trace on
```

### Common Issues

1. **Async/Await Problems**
   - Always await user interactions
   - Use `waitFor` for state changes
   - Check for race conditions

2. **Mock Issues**
   - Clear mocks between tests
   - Verify mock implementations
   - Check mock call counts

3. **Flaky Tests**
   - Add explicit waits
   - Check for timing issues
   - Use deterministic test data

## 📈 Monitoring & Reporting

### Test Results

- **Jest**: Coverage reports in `coverage/`
- **Playwright**: HTML reports in `playwright-report/`
- **CI**: GitHub Actions summaries

### Performance Metrics

- **Lighthouse**: Performance scores and recommendations
- **Bundle Analysis**: Size tracking and optimization
- **Core Web Vitals**: Real user metrics

### Alerts

- **Failed Tests**: Immediate notifications
- **Performance Regression**: Threshold alerts
- **Security Issues**: Vulnerability reports

## 🔄 Maintenance

### Regular Tasks

1. **Update Dependencies**
   - Keep testing libraries current
   - Update browser versions
   - Review security patches

2. **Review Test Suite**
   - Remove obsolete tests
   - Add tests for new features
   - Refactor duplicated code

3. **Performance Review**
   - Analyze slow tests
   - Optimize test execution
   - Update performance budgets

### Quarterly Reviews

- Test coverage analysis
- Flaky test identification
- CI/CD optimization
- Tool evaluation

## 📚 Resources

### Documentation

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/docs/)

### Best Practices

- [Testing Best Practices](https://kentcdodds.com/blog/common-testing-mistakes)
- [React Testing Guide](https://kentcdodds.com/blog/react-testing-library-tutorial)
- [E2E Testing Guide](https://playwright.dev/docs/best-practices)

---

## 🤝 Contributing

When contributing to the test suite:

1. Add tests for new features
2. Update tests for modified functionality
3. Ensure all tests pass before committing
4. Follow the established patterns
5. Update documentation as needed

For questions or support, please refer to the team documentation or create an issue in the repository.
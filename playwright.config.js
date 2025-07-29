// @ts-check
const { defineConfig, devices } = require('@playwright/test')

/**
 * 6FB AI Agent System - Comprehensive Testing Configuration
 * Triple Tool Approach: Playwright (E2E) + Puppeteer (Debug) + Computer Use (AI Visual)
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { 
      outputFolder: 'playwright-report',
      open: 'never' 
    }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['github'],
    ['./test-utils/custom-reporter.js']
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:9999',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* Global timeout for navigation and assertions */
    actionTimeout: 30000,
    navigationTimeout: 30000,

    /* Visual comparison settings */
    expect: {
      // Threshold for visual comparisons (0-1, where 0.2 = 20% difference allowed)
      threshold: 0.2,
      // Animation handling
      animations: 'disabled'
    },

    /* Accessibility testing */
    axeOptions: {
      // WCAG 2.2 AA compliance
      tags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
      rules: {
        'color-contrast': { enabled: true },
        'keyboard-navigation': { enabled: true }
      }
    },

    /* Performance monitoring */
    launchOptions: {
      // Collect performance metrics
      args: ['--enable-web-vitals-reporting']
    }
  },

  /* Configure projects for major browsers */
  projects: [
    // Setup project for authentication and global setup
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/,
      use: {
        ...devices['Desktop Chrome']
      }
    },

    // Main browser testing projects
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json'
      },
      dependencies: ['setup'],
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/user.json'
      },
      dependencies: ['setup'],
    },

    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        storageState: 'playwright/.auth/user.json'
      },
      dependencies: ['setup'],
    },

    // Mobile testing projects
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        storageState: 'playwright/.auth/user.json'
      },
      dependencies: ['setup'],
    },
    
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        storageState: 'playwright/.auth/user.json'
      },
      dependencies: ['setup'],
    },

    // Visual regression testing project
    {
      name: 'visual-tests',
      testMatch: /.*\.visual\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
        // Ensure consistent screenshots
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1
      },
      dependencies: ['setup'],
    },

    // Performance testing project
    {
      name: 'performance-tests',
      testMatch: /.*\.performance\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
        // Performance testing specific settings
        launchOptions: {
          args: [
            '--enable-web-vitals-reporting',
            '--disable-web-security',
            '--disable-background-timer-throttling'
          ]
        }
      },
      dependencies: ['setup'],
    },

    // Accessibility testing project
    {
      name: 'accessibility-tests',
      testMatch: /.*\.accessibility\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json'
      },
      dependencies: ['setup'],
    }
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:9999',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* Directory for test artifacts */
  outputDir: 'test-results',

  /* Global test timeout */
  timeout: 60 * 1000,

  /* Expect timeout */
  expect: {
    timeout: 10 * 1000,
    // Visual comparison settings
    toHaveScreenshot: { 
      threshold: 0.2,
      maxDiffPixels: 1000,
      animations: 'disabled'
    },
    toMatchSnapshot: { 
      threshold: 0.2,
      maxDiffPixels: 1000
    }
  },

  /* Global setup and teardown */
  globalSetup: './test-utils/global-setup.js',
  globalTeardown: './test-utils/global-teardown.js',

  /* Test metadata */
  metadata: {
    'Test Framework': '6FB AI Agent System - Triple Tool Approach',
    'Playwright Version': require('@playwright/test/package.json').version,
    'Testing Strategy': 'E2E + Visual + Performance + Accessibility',
    'AI Integration': 'Computer Use + Puppeteer MCP'
  }
})
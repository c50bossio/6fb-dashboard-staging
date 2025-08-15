// @ts-check
const { defineConfig, devices } = require('@playwright/test')

/**
 * 6FB AI Agent System - Comprehensive Testing Configuration
 * Triple Tool Approach: Playwright (E2E) + Puppeteer (Debug) + Computer Use (AI Visual)
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
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

  use: {
    baseURL: 'http://localhost:9999',

    trace: 'on-first-retry',

    screenshot: 'only-on-failure',

    video: 'retain-on-failure',

    actionTimeout: 30000,
    navigationTimeout: 30000,

    expect: {
      threshold: 0.2,
      animations: 'disabled'
    },

    axeOptions: {
      tags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
      rules: {
        'color-contrast': { enabled: true },
        'keyboard-navigation': { enabled: true }
      }
    },

    launchOptions: {
      args: ['--enable-web-vitals-reporting']
    }
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/,
      use: {
        ...devices['Desktop Chrome']
      }
    },

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

    {
      name: 'visual-tests',
      testMatch: /.*\.visual\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1
      },
      dependencies: ['setup'],
    },

    {
      name: 'performance-tests',
      testMatch: /.*\.performance\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
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

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:9999',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  outputDir: 'test-results',

  timeout: 60 * 1000,

  expect: {
    timeout: 10 * 1000,
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

  globalSetup: './test-utils/global-setup.js',
  globalTeardown: './test-utils/global-teardown.js',

  metadata: {
    'Test Framework': '6FB AI Agent System - Triple Tool Approach',
    'Playwright Version': require('@playwright/test/package.json').version,
    'Testing Strategy': 'E2E + Visual + Performance + Accessibility',
    'AI Integration': 'Computer Use + Puppeteer MCP'
  }
})
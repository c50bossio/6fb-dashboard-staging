// @ts-check
const { defineConfig, devices } = require('@playwright/test')

/**
 * Minimal Playwright configuration for debugging
 */
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['line']],

  use: {
    baseURL: 'http://localhost:9999',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'debug-chromium',
      use: { 
        ...devices['Desktop Chrome'],
      },
    },
  ],

  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
})
/**
 * 6FB AI Agent System - Global Test Setup
 * Sets up test environment for Triple Tool Approach
 */

const { chromium } = require('@playwright/test')
const fs = require('fs').promises
const path = require('path')

async function globalSetup(config) {
  console.log('🔧 Setting up 6FB AI Agent System test environment...')
  
  const testDirs = [
    'test-results',
    'test-results/screenshots',
    'test-results/traces',
    'test-results/videos',
    'test-results/puppeteer-screenshots',
    'test-results/computer-use-screenshots',
    'test-results/computer-use-reports',
    'playwright/.auth'
  ]

  for (const dir of testDirs) {
    await fs.mkdir(dir, { recursive: true })
    console.log(`✓ Created directory: ${dir}`)
  }

  await setupAuthentication()

  await verifyTestServer()

  await initializeComputerUse()

  console.log('✅ Global setup completed successfully')
}

async function setupAuthentication() {
  console.log('🔐 Setting up test authentication...')
  
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await page.goto('http://localhost:9999/login')
    
    await page.waitForSelector('[data-testid="login-form"]', { timeout: 10000 })
    
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    
    await page.click('[data-testid="login-button"]')
    
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    
    await page.waitForSelector('[data-testid="user-menu"]', { timeout: 5000 })
    
    await page.context().storageState({ path: 'playwright/.auth/user.json' })
    
    console.log('✓ Authentication setup completed')
    
  } catch (error) {
    console.warn('⚠️  Authentication setup failed:', error.message)
    console.warn('   Tests requiring authentication may fail')
    
    await fs.writeFile('playwright/.auth/user.json', JSON.stringify({
      cookies: [],
      origins: []
    }))
    
  } finally {
    await browser.close()
  }
}

async function verifyTestServer() {
  console.log('🌐 Verifying test server availability...')
  
  const maxRetries = 30
  const retryDelay = 1000
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('http://localhost:9999/health', {
        method: 'GET',
        timeout: 2000
      })
      
      if (response.ok) {
        console.log('✓ Test server is ready')
        return
      }
    } catch (error) {
    }
    
    if (i < maxRetries - 1) {
      console.log(`   Waiting for server... (${i + 1}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, retryDelay))
    }
  }
  
  console.warn('⚠️  Test server not responding')
  console.warn('   Make sure the development server is running on port 9999')
  console.warn('   Run: npm run dev')
}

async function initializeComputerUse() {
  console.log('🤖 Initializing Computer Use integration...')
  
  try {
    const pythonScriptPath = path.join(__dirname, '../../computer_use_basic.py')
    await fs.access(pythonScriptPath)
    
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('⚠️  ANTHROPIC_API_KEY not configured')
      console.warn('   Computer Use tests will be skipped')
      return
    }
    
    const { exec } = require('child_process')
    const { promisify } = require('util')
    const execAsync = promisify(exec)
    
    await execAsync('python3 --version')
    console.log('✓ Python environment ready')
    
    const testCommand = `cd "${path.dirname(pythonScriptPath)}" && python3 -c "
import os
import anthropic
client = anthropic.Anthropic(api_key=os.environ.get('ANTHROPIC_API_KEY'))
print('Claude API connection ready')
"`
    
    await execAsync(testCommand, {
      env: { ...process.env },
      timeout: 10000
    })
    
    console.log('✓ Computer Use integration ready')
    
  } catch (error) {
    console.warn('⚠️  Computer Use initialization failed:', error.message)
    console.warn('   AI visual validation tests will be skipped')
  }
}

async function createHealthCheckTest() {
  const healthCheckTest = `
import { test, expect } from '@playwright/test'

test('health check', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/6FB AI Agent System/)
})
`

  await fs.writeFile('tests/health-check.spec.js', healthCheckTest)
  console.log('✓ Created health check test')
}

async function setupTestData() {
  console.log('📊 Setting up test data...')
  
  const testData = {
    users: [
      {
        id: 1,
        email: 'test@example.com',
        name: await getTestUserFromDatabase(),
        role: 'admin',
        password: 'testpassword' // In real app, this would be hashed
      }
    ],
    services: [
      {
        id: 1,
        name: 'Classic Haircut',
        price: 25,
        duration: 30,
        available: true
      },
      {
        id: 2,
        name: 'Beard Trim',
        price: 15,
        duration: 15,
        available: true
      }
    ],
    barbers: [
      {
        id: 1,
        name: 'John Smith',
        rating: 4.8,
        available: true,
        priceModifier: 0
      },
      {
        id: 2,
        name: 'Mike Premium',
        rating: 4.9,
        available: true,
        priceModifier: 0.2
      }
    ]
  }
  
  const testDataPath = path.join(__dirname, '../test-results/test-data.json')
  await fs.writeFile(testDataPath, JSON.stringify(testData, null, 2))
  console.log('✓ Test data prepared')
}

module.exports = globalSetup
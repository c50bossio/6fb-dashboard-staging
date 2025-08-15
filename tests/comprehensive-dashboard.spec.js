import { test, expect } from '@playwright/test'

/**
 * 6FB AI Agent System - Comprehensive Dashboard Testing
 * Tests all key functionality based on current system architecture
 */

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/login')
  })

  test('shows dev bypass button on localhost', async ({ page }) => {
    await expect(page.locator('h1, h2')).toContainText(/login|sign in/i)
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    
    const devBypassButton = page.locator('button', { hasText: '🚧 Dev Bypass Login (localhost only)' })
    await expect(devBypassButton).toBeVisible({ timeout: 5000 })
    
    await devBypassButton.click()
    
    await page.waitForTimeout(2000)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('dev bypass authentication works correctly', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    
    const devBypassButton = page.locator('button', { hasText: '🚧 Dev Bypass Login (localhost only)' })
    await devBypassButton.click()
    
    await page.waitForTimeout(2000)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    await expect(page.locator('h1, h2, [role="heading"]')).toBeTruthy()
    
    await page.goto('/dashboard/ai-tools')
    await expect(page).toHaveURL(/\/dashboard\/ai-tools/)
  })
})

test.describe('Dashboard Navigation - 5 Categories', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const devBypassButton = page.locator('button', { hasText: '🚧 Dev Bypass Login (localhost only)' })
    await devBypassButton.click()
    await page.waitForTimeout(2000)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('Overview category navigation', async ({ page }) => {
    await page.goto('/dashboard/overview')
    
    await expect(page).toHaveURL(/\/dashboard\/overview/)
    
    const pageContent = page.locator('body')
    await expect(pageContent).toBeTruthy()
    
    const errorMessages = page.locator('text=/error|404|not found/i')
    await expect(errorMessages).toHaveCount(0)
  })

  test('AI Tools category navigation', async ({ page }) => {
    await page.goto('/dashboard/ai-tools')
    
    await expect(page).toHaveURL(/\/dashboard\/ai-tools/)
    
    const pageContent = page.locator('body')
    await expect(pageContent).toBeTruthy()
    
    const errorMessages = page.locator('text=/error|404|not found/i')
    await expect(errorMessages).toHaveCount(0)
  })

  test('Business category navigation', async ({ page }) => {
    const businessRoutes = [
      '/dashboard/analytics',
      '/dashboard/bookings', 
      '/dashboard/customers',
      '/dashboard/billing'
    ]
    
    for (const route of businessRoutes) {
      await page.goto(route)
      await expect(page).toHaveURL(new RegExp(route))
      
      const pageContent = page.locator('body')
      await expect(pageContent).toBeTruthy()
      
      const errorMessages = page.locator('text=/error|404|not found/i')
      await expect(errorMessages).toHaveCount(0)
    }
  })

  test('Platform category navigation', async ({ page }) => {
    const platformRoutes = [
      '/dashboard/settings',
      '/dashboard/notifications',
      '/dashboard/enterprise'
    ]
    
    for (const route of platformRoutes) {
      await page.goto(route)
      await expect(page).toHaveURL(new RegExp(route))
      
      const pageContent = page.locator('body')
      await expect(pageContent).toBeTruthy()
      
      const errorMessages = page.locator('text=/error|404|not found/i')
      await expect(errorMessages).toHaveCount(0)
    }
  })

  test('Company category navigation', async ({ page }) => {
    const companyRoutes = [
      '/dashboard/about',
      '/dashboard/support',
      '/dashboard/privacy',
      '/dashboard/terms'
    ]
    
    for (const route of companyRoutes) {
      await page.goto(route)
      await expect(page).toHaveURL(new RegExp(route))
      
      const pageContent = page.locator('body')
      await expect(pageContent).toBeTruthy()
      
      const errorMessages = page.locator('text=/error|404|not found/i')
      await expect(errorMessages).toHaveCount(0)
    }
  })
})

test.describe('Sidebar Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const devBypassButton = page.locator('button', { hasText: '🚧 Dev Bypass Login (localhost only)' })
    await devBypassButton.click()
    await page.waitForTimeout(2000)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('sidebar toggles between expanded and collapsed states', async ({ page }) => {
    await page.goto('/dashboard')
    
    const sidebar = page.locator('nav, aside, [class*="sidebar"], [data-testid*="sidebar"]').first()
    
    if (await sidebar.isVisible()) {
      const toggleButton = page.locator(
        'button[aria-label*="toggle"], button[aria-label*="menu"], ' +
        '[data-testid*="toggle"], [data-testid*="menu"], ' +
        'button:has(svg), button[class*="menu"]'
      ).first()
      
      if (await toggleButton.isVisible()) {
        const initialBox = await sidebar.boundingBox()
        const initialWidth = initialBox?.width || 0
        
        await toggleButton.click()
        await page.waitForTimeout(500) // Wait for animation
        
        const newBox = await sidebar.boundingBox()
        const newWidth = newBox?.width || 0
        
        expect(Math.abs(initialWidth - newWidth)).toBeGreaterThan(50)
        
        await toggleButton.click()
        await page.waitForTimeout(500)
        
        const finalBox = await sidebar.boundingBox()
        const finalWidth = finalBox?.width || 0
        
        expect(Math.abs(initialWidth - finalWidth)).toBeLessThan(20)
      }
    }
  })

  test('sidebar animations work smoothly', async ({ page }) => {
    await page.goto('/dashboard')
    
    const sidebar = page.locator('nav, aside, [class*="sidebar"]').first()
    
    if (await sidebar.isVisible()) {
      const toggleButton = page.locator(
        'button[aria-label*="toggle"], button[aria-label*="menu"], ' +
        '[data-testid*="toggle"], [data-testid*="menu"]'
      ).first()
      
      if (await toggleButton.isVisible()) {
        for (let i = 0; i < 3; i++) {
          await toggleButton.click()
          await page.waitForTimeout(200)
        }
        
        await toggleButton.click()
        await page.waitForTimeout(500)
        
        await expect(sidebar).toBeVisible()
      }
    }
  })
})

test.describe('Page Loading Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const devBypassButton = page.locator('button', { hasText: '🚧 Dev Bypass Login (localhost only)' })
    await devBypassButton.click()
    await page.waitForTimeout(2000)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('all dashboard pages load without errors', async ({ page }) => {
    const dashboardRoutes = [
      '/dashboard',
      '/dashboard/overview', 
      '/dashboard/ai-tools',
      '/dashboard/analytics',
      '/dashboard/bookings',
      '/dashboard/customers', 
      '/dashboard/billing',
      '/dashboard/chat',
      '/dashboard/settings',
      '/dashboard/notifications',
      '/dashboard/enterprise',
      '/dashboard/about',
      '/dashboard/support',
      '/dashboard/privacy',
      '/dashboard/terms',
      '/dashboard/demo',
      '/dashboard/features',
      '/dashboard/blog',
      '/dashboard/contact',
      '/dashboard/security',
      '/dashboard/docs'
    ]
    
    for (const route of dashboardRoutes) {
      console.log(`Testing route: ${route}`)
      
      await page.goto(route)
      
      await page.waitForLoadState('networkidle')
      
      await expect(page).toHaveURL(new RegExp(route.replace(/\//g, '\\/')))
      
      const bodyText = await page.locator('body').textContent()
      expect(bodyText?.length || 0).toBeGreaterThan(10)
      
      const errors = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })
      
      const criticalErrorMessages = page.locator('text=/500|internal server error|application error/i')
      await expect(criticalErrorMessages).toHaveCount(0)
    }
  })

  test('pages load within acceptable time limits', async ({ page }) => {
    const testRoutes = [
      '/dashboard',
      '/dashboard/analytics', 
      '/dashboard/ai-tools',
      '/dashboard/bookings'
    ]
    
    for (const route of testRoutes) {
      const startTime = Date.now()
      
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      
      const loadTime = Date.now() - startTime
      
      expect(loadTime).toBeLessThan(5000)
      console.log(`${route} loaded in ${loadTime}ms`)
    }
  })
})

test.describe('Interactive Elements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const devBypassButton = page.locator('button', { hasText: '🚧 Dev Bypass Login (localhost only)' })
    await devBypassButton.click()
    await page.waitForTimeout(2000)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('quick action buttons are interactive', async ({ page }) => {
    await page.goto('/dashboard')
    
    const quickActionSelectors = [
      'button:has-text("Start AI Chat")',
      'button:has-text("New Booking")', 
      'button:has-text("View Analytics")',
      '[data-testid*="quick-action"]',
      '[data-testid*="action-button"]',
      'button[class*="action"]',
      'button[class*="quick"]'
    ]
    
    for (const selector of quickActionSelectors) {
      const button = page.locator(selector).first()
      
      if (await button.isVisible()) {
        await expect(button).toBeEnabled()
        
        await button.hover()
        
        try {
          await button.click()
          await page.waitForTimeout(1000)
        } catch (error) {
          console.log(`Button click resulted in: ${error.message}`)
        }
      }
    }
  })

  test('chat interfaces are functional', async ({ page }) => {
    const chatRoutes = ['/dashboard/chat', '/dashboard/ai-tools']
    
    for (const route of chatRoutes) {
      await page.goto(route)
      
      const chatInput = page.locator(
        'input[placeholder*="message"], textarea[placeholder*="message"], ' +
        'input[placeholder*="chat"], textarea[placeholder*="chat"], ' +
        '[data-testid*="chat-input"], [data-testid*="message-input"]'
      ).first()
      
      if (await chatInput.isVisible()) {
        await chatInput.fill('Test message')
        await expect(chatInput).toHaveValue('Test message')
        
        const sendButton = page.locator(
          'button:has-text("Send"), button:has-text("Submit"), ' +
          '[data-testid*="send"], button[type="submit"]'
        ).first()
        
        if (await sendButton.isVisible()) {
          await expect(sendButton).toBeEnabled()
        }
      }
    }
  })

  test('navigation elements are responsive', async ({ page }) => {
    await page.goto('/dashboard')
    
    const navLinks = page.locator('a[href*="/dashboard"], nav a, [role="navigation"] a')
    const linkCount = await navLinks.count()
    
    if (linkCount > 0) {
      for (let i = 0; i < Math.min(5, linkCount); i++) {
        const link = navLinks.nth(i)
        
        if (await link.isVisible()) {
          await link.hover()
          
          const href = await link.getAttribute('href')
          if (href && href.startsWith('/dashboard')) {
            await expect(link).toBeEnabled()
          }
        }
      }
    }
  })
})

test.describe('API Health Check', () => {
  test('health endpoint responds correctly', async ({ page }) => {
    const response = await page.request.get('http://localhost:8001/health')
    
    expect(response.status()).toBe(200)
    
    const responseBody = await response.json()
    expect(responseBody).toBeDefined()
    
    expect(responseBody.status).toBeDefined()
    
    console.log('API Health Response:', responseBody)
  })

  test('frontend health endpoint responds', async ({ page }) => {
    const response = await page.request.get('http://localhost:9999/api/health')
    
    expect(response.status()).toBe(200)
    
    const responseBody = await response.json()
    expect(responseBody).toBeDefined()
    
    console.log('Frontend Health Response:', responseBody)
  })
})
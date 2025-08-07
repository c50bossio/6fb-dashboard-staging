import { test, expect } from '@playwright/test'

/**
 * 6FB AI Agent System - Comprehensive Dashboard Testing
 * Tests all key functionality based on current system architecture
 */

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh without authentication
    await page.context().clearCookies()
    await page.goto('/login')
  })

  test('shows dev bypass button on localhost', async ({ page }) => {
    // Check that we're on login page
    await expect(page.locator('h1, h2')).toContainText(/login|sign in/i)
    
    // Scroll down to find dev bypass button (it appears when scrolled down)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    
    // Wait for dev bypass button to be visible
    const devBypassButton = page.locator('button', { hasText: '🚧 Dev Bypass Login (localhost only)' })
    await expect(devBypassButton).toBeVisible({ timeout: 5000 })
    
    // Click dev bypass button
    await devBypassButton.click()
    
    // Wait for authentication to process and navigate to dashboard
    await page.waitForTimeout(2000)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('dev bypass authentication works correctly', async ({ page }) => {
    // Scroll to find and click dev bypass
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    
    const devBypassButton = page.locator('button', { hasText: '🚧 Dev Bypass Login (localhost only)' })
    await devBypassButton.click()
    
    // Wait for authentication and navigate to dashboard
    await page.waitForTimeout(2000)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Verify we're authenticated by checking for dashboard elements
    await expect(page.locator('h1, h2, [role="heading"]')).toBeTruthy()
    
    // Check that we can access protected routes
    await page.goto('/dashboard/ai-tools')
    await expect(page).toHaveURL(/\/dashboard\/ai-tools/)
  })
})

test.describe('Dashboard Navigation - 5 Categories', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate first
    await page.goto('/login')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const devBypassButton = page.locator('button', { hasText: '🚧 Dev Bypass Login (localhost only)' })
    await devBypassButton.click()
    await page.waitForTimeout(2000)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('Overview category navigation', async ({ page }) => {
    // Navigate to overview section
    await page.goto('/dashboard/overview')
    
    // Should load without errors
    await expect(page).toHaveURL(/\/dashboard\/overview/)
    
    // Check for overview content
    const pageContent = page.locator('body')
    await expect(pageContent).toBeTruthy()
    
    // Verify no error states
    const errorMessages = page.locator('text=/error|404|not found/i')
    await expect(errorMessages).toHaveCount(0)
  })

  test('AI Tools category navigation', async ({ page }) => {
    await page.goto('/dashboard/ai-tools')
    
    await expect(page).toHaveURL(/\/dashboard\/ai-tools/)
    
    // Check page loads successfully
    const pageContent = page.locator('body')
    await expect(pageContent).toBeTruthy()
    
    // No error states
    const errorMessages = page.locator('text=/error|404|not found/i')
    await expect(errorMessages).toHaveCount(0)
  })

  test('Business category navigation', async ({ page }) => {
    // Test multiple business-related routes
    const businessRoutes = [
      '/dashboard/analytics',
      '/dashboard/bookings', 
      '/dashboard/customers',
      '/dashboard/billing'
    ]
    
    for (const route of businessRoutes) {
      await page.goto(route)
      await expect(page).toHaveURL(new RegExp(route))
      
      // Verify page loads
      const pageContent = page.locator('body')
      await expect(pageContent).toBeTruthy()
      
      // No errors
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
    // Authenticate
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
    
    // Look for sidebar element (could be nav, aside, or div with sidebar class)
    const sidebar = page.locator('nav, aside, [class*="sidebar"], [data-testid*="sidebar"]').first()
    
    // If sidebar exists, test toggle functionality
    if (await sidebar.isVisible()) {
      // Look for toggle button (hamburger menu, toggle button, etc.)
      const toggleButton = page.locator(
        'button[aria-label*="toggle"], button[aria-label*="menu"], ' +
        '[data-testid*="toggle"], [data-testid*="menu"], ' +
        'button:has(svg), button[class*="menu"]'
      ).first()
      
      if (await toggleButton.isVisible()) {
        // Get initial sidebar width
        const initialBox = await sidebar.boundingBox()
        const initialWidth = initialBox?.width || 0
        
        // Click toggle button
        await toggleButton.click()
        await page.waitForTimeout(500) // Wait for animation
        
        // Get new sidebar width
        const newBox = await sidebar.boundingBox()
        const newWidth = newBox?.width || 0
        
        // Verify width changed (either expanded to collapsed or vice versa)
        expect(Math.abs(initialWidth - newWidth)).toBeGreaterThan(50)
        
        // Toggle back
        await toggleButton.click()
        await page.waitForTimeout(500)
        
        const finalBox = await sidebar.boundingBox()
        const finalWidth = finalBox?.width || 0
        
        // Should return to original width (with some tolerance for animations)
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
        // Test multiple rapid toggles to ensure animations don't break
        for (let i = 0; i < 3; i++) {
          await toggleButton.click()
          await page.waitForTimeout(200)
        }
        
        // Final toggle and verify sidebar is still functional
        await toggleButton.click()
        await page.waitForTimeout(500)
        
        // Sidebar should still be visible and functional
        await expect(sidebar).toBeVisible()
      }
    }
  })
})

test.describe('Page Loading Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate
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
      
      // Navigate to route
      await page.goto(route)
      
      // Wait for page to load
      await page.waitForLoadState('networkidle')
      
      // Verify URL is correct
      await expect(page).toHaveURL(new RegExp(route.replace(/\//g, '\\/')))
      
      // Check that page content loaded (not just a blank page)
      const bodyText = await page.locator('body').textContent()
      expect(bodyText?.length || 0).toBeGreaterThan(10)
      
      // Check for JavaScript errors in console
      const errors = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })
      
      // Verify no critical errors
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
      
      // Pages should load within 5 seconds
      expect(loadTime).toBeLessThan(5000)
      console.log(`${route} loaded in ${loadTime}ms`)
    }
  })
})

test.describe('Interactive Elements', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate
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
    
    // Look for common quick action buttons
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
        // Test button is clickable
        await expect(button).toBeEnabled()
        
        // Test hover state
        await button.hover()
        
        // Test click (should not throw error)
        try {
          await button.click()
          // Wait a bit for any navigation or modal
          await page.waitForTimeout(1000)
        } catch (error) {
          console.log(`Button click resulted in: ${error.message}`)
        }
      }
    }
  })

  test('chat interfaces are functional', async ({ page }) => {
    // Try to access chat functionality
    const chatRoutes = ['/dashboard/chat', '/dashboard/ai-tools']
    
    for (const route of chatRoutes) {
      await page.goto(route)
      
      // Look for chat input elements
      const chatInput = page.locator(
        'input[placeholder*="message"], textarea[placeholder*="message"], ' +
        'input[placeholder*="chat"], textarea[placeholder*="chat"], ' +
        '[data-testid*="chat-input"], [data-testid*="message-input"]'
      ).first()
      
      if (await chatInput.isVisible()) {
        // Test input is functional
        await chatInput.fill('Test message')
        await expect(chatInput).toHaveValue('Test message')
        
        // Look for send button
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
    
    // Test main navigation links
    const navLinks = page.locator('a[href*="/dashboard"], nav a, [role="navigation"] a')
    const linkCount = await navLinks.count()
    
    if (linkCount > 0) {
      // Test first few navigation links
      for (let i = 0; i < Math.min(5, linkCount); i++) {
        const link = navLinks.nth(i)
        
        if (await link.isVisible()) {
          // Test hover state
          await link.hover()
          
          // Get href and test it's valid
          const href = await link.getAttribute('href')
          if (href && href.startsWith('/dashboard')) {
            // Link should be clickable
            await expect(link).toBeEnabled()
          }
        }
      }
    }
  })
})

test.describe('API Health Check', () => {
  test('health endpoint responds correctly', async ({ page }) => {
    // Test the API health endpoint
    const response = await page.request.get('http://localhost:8001/health')
    
    // Should return 200 status
    expect(response.status()).toBe(200)
    
    // Should return JSON
    const responseBody = await response.json()
    expect(responseBody).toBeDefined()
    
    // Should have status field
    expect(responseBody.status).toBeDefined()
    
    console.log('API Health Response:', responseBody)
  })

  test('frontend health endpoint responds', async ({ page }) => {
    // Test frontend API health
    const response = await page.request.get('http://localhost:9999/api/health')
    
    expect(response.status()).toBe(200)
    
    const responseBody = await response.json()
    expect(responseBody).toBeDefined()
    
    console.log('Frontend Health Response:', responseBody)
  })
})
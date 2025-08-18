/**
 * Visual Regression Testing E2E Tests
 * 
 * Comprehensive visual testing suite that captures screenshots of all major pages
 * and components, compares against baselines, and tests responsive design across
 * different devices and browsers.
 */

import { test, expect } from '@playwright/test'
import { createClient } from '@/lib/supabase/client'

class VisualTestEnvironment {
  constructor() {
    this.supabase = createClient()
    this.testData = {
      shop: null,
      testPages: [
        { name: 'homepage', path: '/', description: 'Landing page' },
        { name: 'dashboard', path: '/dashboard', description: 'Analytics dashboard', requiresAuth: true },
        { name: 'booking-wizard', path: '/book', description: 'Booking wizard', useShopSlug: true },
        { name: 'calendar', path: '/calendar', description: 'Calendar view', requiresAuth: true },
        { name: 'settings', path: '/settings', description: 'Settings page', requiresAuth: true },
        { name: 'pricing', path: '/pricing', description: 'Pricing page' },
        { name: 'login', path: '/login', description: 'Login page' },
        { name: 'register', path: '/register', description: 'Registration page' }
      ],
      viewports: [
        { name: 'desktop', width: 1280, height: 720 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'mobile', width: 375, height: 667 },
        { name: 'desktop-large', width: 1920, height: 1080 }
      ]
    }
  }

  async setupVisualTest() {
    // Get test shop for pages that require shop context
    const { data: shop } = await this.supabase
      .from('barbershops')
      .select('*')
      .eq('status', 'active')
      .limit(1)
      .single()

    if (shop) {
      this.testData.shop = shop
    }

    return this.testData
  }

  getPageUrl(page) {
    if (page.useShopSlug && this.testData.shop) {
      return `/shop/${this.testData.shop.slug}${page.path}`
    }
    return page.path
  }

  async authenticateUser(page) {
    // Mock authentication for visual tests
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock_token',
        refresh_token: 'mock_refresh',
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          role: 'SHOP_OWNER'
        }
      }))
    })

    // Navigate to dashboard to establish auth context
    await page.goto('/dashboard')
    
    // Wait for auth check
    await page.waitForTimeout(2000)
  }
}

test.describe('Visual Regression - Homepage and Public Pages', () => {
  let visualEnv

  test.beforeEach(async ({ page }) => {
    visualEnv = new VisualTestEnvironment()
    await visualEnv.setupVisualTest()
  })

  test('Homepage visual consistency across viewports', async ({ page }) => {
    console.log('Testing homepage visual consistency...')

    for (const viewport of visualEnv.testData.viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/')
      
      // Wait for page to fully load
      await page.waitForLoadState('networkidle')
      await page.waitForSelector('main', { timeout: 10000 })
      
      // Hide dynamic elements that change between runs
      await page.addStyleTag({
        content: `
          [data-testid="current-time"],
          [data-testid="live-metrics"],
          .loading-spinner,
          .skeleton-loader {
            visibility: hidden !important;
          }
        `
      })

      // Take screenshot
      await expect(page).toHaveScreenshot(`homepage-${viewport.name}.png`, {
        fullPage: true,
        animations: 'disabled'
      })
    }
  })

  test('Pricing page visual consistency', async ({ page }) => {
    console.log('Testing pricing page visual consistency...')

    await page.goto('/pricing')
    await page.waitForLoadState('networkidle')
    
    // Verify pricing cards are loaded
    await expect(page.locator('[data-testid="pricing-card"]')).toHaveCount(3, { timeout: 10000 })
    
    // Desktop view
    await page.setViewportSize({ width: 1280, height: 720 })
    await expect(page).toHaveScreenshot('pricing-desktop.png', {
      fullPage: true,
      animations: 'disabled'
    })

    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page).toHaveScreenshot('pricing-mobile.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('Login page visual consistency', async ({ page }) => {
    console.log('Testing login page visual consistency...')

    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    
    // Wait for form to load
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
    
    await expect(page).toHaveScreenshot('login-page.png', {
      animations: 'disabled'
    })

    // Test with error state
    await page.fill('[data-testid="email-input"]', 'invalid-email')
    await page.fill('[data-testid="password-input"]', 'wrong-password')
    await page.click('[data-testid="login-button"]')
    
    // Wait for error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    
    await expect(page).toHaveScreenshot('login-page-with-error.png', {
      animations: 'disabled'
    })
  })

  test('Registration page visual consistency', async ({ page }) => {
    console.log('Testing registration page visual consistency...')

    await page.goto('/register')
    await page.waitForLoadState('networkidle')
    
    await expect(page.locator('[data-testid="registration-form"]')).toBeVisible()
    
    await expect(page).toHaveScreenshot('registration-page.png', {
      animations: 'disabled'
    })
  })
})

test.describe('Visual Regression - Authenticated Pages', () => {
  let visualEnv

  test.beforeEach(async ({ page }) => {
    visualEnv = new VisualTestEnvironment()
    await visualEnv.setupVisualTest()
    await visualEnv.authenticateUser(page)
  })

  test('Dashboard visual consistency', async ({ page }) => {
    console.log('Testing dashboard visual consistency...')

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Wait for dashboard metrics to load
    await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible({ timeout: 15000 })
    
    // Hide dynamic elements
    await page.addStyleTag({
      content: `
        [data-testid="real-time-clock"],
        [data-testid="live-counter"],
        [data-testid="last-updated"],
        .chart-loading,
        .shimmer-effect {
          visibility: hidden !important;
        }
      `
    })

    // Desktop dashboard
    await page.setViewportSize({ width: 1280, height: 720 })
    await expect(page).toHaveScreenshot('dashboard-desktop.png', {
      fullPage: true,
      animations: 'disabled'
    })

    // Mobile dashboard
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('Calendar page visual consistency', async ({ page }) => {
    console.log('Testing calendar page visual consistency...')

    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')
    
    // Wait for calendar to load
    await expect(page.locator('[data-testid="calendar-container"]')).toBeVisible({ timeout: 10000 })
    
    // Hide time-sensitive elements
    await page.addStyleTag({
      content: `
        .fc-today-button,
        .fc-today,
        [data-testid="current-time-indicator"] {
          visibility: hidden !important;
        }
      `
    })

    await expect(page).toHaveScreenshot('calendar-page.png', {
      fullPage: true,
      animations: 'disabled'
    })

    // Test different calendar views
    await page.click('[data-testid="week-view"]')
    await page.waitForTimeout(1000)
    
    await expect(page).toHaveScreenshot('calendar-week-view.png', {
      fullPage: true,
      animations: 'disabled'
    })

    await page.click('[data-testid="day-view"]')
    await page.waitForTimeout(1000)
    
    await expect(page).toHaveScreenshot('calendar-day-view.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('Settings page visual consistency', async ({ page }) => {
    console.log('Testing settings page visual consistency...')

    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    
    await expect(page.locator('[data-testid="settings-container"]')).toBeVisible()
    
    await expect(page).toHaveScreenshot('settings-page.png', {
      fullPage: true,
      animations: 'disabled'
    })

    // Test different settings tabs
    const settingsTabs = ['business', 'notifications', 'payment', 'integrations']
    
    for (const tab of settingsTabs) {
      const tabElement = page.locator(`[data-testid="settings-tab-${tab}"]`)
      if (await tabElement.isVisible()) {
        await tabElement.click()
        await page.waitForTimeout(500)
        
        await expect(page).toHaveScreenshot(`settings-${tab}-tab.png`, {
          fullPage: true,
          animations: 'disabled'
        })
      }
    }
  })
})

test.describe('Visual Regression - Booking Wizard', () => {
  let visualEnv

  test.beforeEach(async ({ page }) => {
    visualEnv = new VisualTestEnvironment()
    await visualEnv.setupVisualTest()
  })

  test('Booking wizard steps visual consistency', async ({ page }) => {
    if (!visualEnv.testData.shop) {
      test.skip('No test shop available')
    }

    console.log('Testing booking wizard visual consistency...')

    const bookingUrl = visualEnv.getPageUrl({ path: '/book', useShopSlug: true })
    await page.goto(bookingUrl)
    await page.waitForLoadState('networkidle')
    
    // Step 1: Service selection
    await expect(page.locator('[data-testid="service-selection"]')).toBeVisible({ timeout: 10000 })
    await expect(page).toHaveScreenshot('booking-step-1-services.png', {
      fullPage: true,
      animations: 'disabled'
    })

    // Step 2: Barber selection (if services are available)
    const serviceCards = page.locator('[data-testid^="service-"]')
    const serviceCount = await serviceCards.count()
    
    if (serviceCount > 0) {
      await serviceCards.first().click()
      await page.click('button:has-text("Next")')
      
      await expect(page.locator('[data-testid="barber-selection"]')).toBeVisible()
      await expect(page).toHaveScreenshot('booking-step-2-barbers.png', {
        fullPage: true,
        animations: 'disabled'
      })

      // Step 3: Time selection
      const barberCards = page.locator('[data-testid^="barber-"]')
      const barberCount = await barberCards.count()
      
      if (barberCount > 0) {
        await barberCards.first().click()
        await page.click('button:has-text("Next")')
        
        await expect(page.locator('[data-testid="time-selection"]')).toBeVisible()
        await expect(page).toHaveScreenshot('booking-step-3-time.png', {
          fullPage: true,
          animations: 'disabled'
        })
      }
    }
  })

  test('Booking wizard mobile responsiveness', async ({ page }) => {
    if (!visualEnv.testData.shop) {
      test.skip('No test shop available')
    }

    console.log('Testing booking wizard mobile responsiveness...')

    await page.setViewportSize({ width: 375, height: 667 })
    
    const bookingUrl = visualEnv.getPageUrl({ path: '/book', useShopSlug: true })
    await page.goto(bookingUrl)
    await page.waitForLoadState('networkidle')
    
    await expect(page.locator('[data-testid="booking-wizard"]')).toBeVisible()
    
    await expect(page).toHaveScreenshot('booking-wizard-mobile.png', {
      fullPage: true,
      animations: 'disabled'
    })

    // Test mobile navigation
    const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]')
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click()
      await expect(page).toHaveScreenshot('booking-wizard-mobile-menu.png', {
        animations: 'disabled'
      })
    }
  })
})

test.describe('Visual Regression - Component States', () => {
  let visualEnv

  test.beforeEach(async ({ page }) => {
    visualEnv = new VisualTestEnvironment()
    await visualEnv.setupVisualTest()
  })

  test('Loading states visual consistency', async ({ page }) => {
    console.log('Testing loading states...')

    // Mock slow API responses to capture loading states
    await page.route('/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      await route.continue()
    })

    await page.goto('/dashboard')
    
    // Capture loading state
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveScreenshot('dashboard-loading-state.png', {
      animations: 'disabled'
    })
  })

  test('Error states visual consistency', async ({ page }) => {
    console.log('Testing error states...')

    // Mock API errors
    await page.route('/api/**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })

    await page.goto('/dashboard')
    
    // Wait for error state
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10000 })
    await expect(page).toHaveScreenshot('dashboard-error-state.png', {
      animations: 'disabled'
    })
  })

  test('Modal dialogs visual consistency', async ({ page }) => {
    console.log('Testing modal dialogs...')

    await visualEnv.authenticateUser(page)
    await page.goto('/calendar')
    
    // Open appointment modal
    const appointmentSlot = page.locator('[data-testid="appointment-slot"]').first()
    if (await appointmentSlot.isVisible()) {
      await appointmentSlot.click()
      
      await expect(page.locator('[data-testid="appointment-modal"]')).toBeVisible()
      await expect(page).toHaveScreenshot('appointment-modal.png', {
        animations: 'disabled'
      })
    }

    // Test confirmation modal
    const deleteButton = page.locator('[data-testid="delete-appointment"]')
    if (await deleteButton.isVisible()) {
      await deleteButton.click()
      
      await expect(page.locator('[data-testid="confirmation-modal"]')).toBeVisible()
      await expect(page).toHaveScreenshot('confirmation-modal.png', {
        animations: 'disabled'
      })
    }
  })

  test('Form validation states', async ({ page }) => {
    console.log('Testing form validation states...')

    await page.goto('/register')
    
    // Submit empty form to trigger validation
    await page.click('[data-testid="submit-button"]')
    
    // Wait for validation errors
    await expect(page.locator('[data-testid="validation-error"]').first()).toBeVisible()
    await expect(page).toHaveScreenshot('form-validation-errors.png', {
      animations: 'disabled'
    })

    // Test success state
    await page.fill('[data-testid="name-input"]', 'Test User')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    
    // Mock successful submission
    await page.route('/api/auth/register', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      })
    })

    await page.click('[data-testid="submit-button"]')
    
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page).toHaveScreenshot('form-success-state.png', {
      animations: 'disabled'
    })
  })
})

test.describe('Visual Regression - Cross-Browser Compatibility', () => {
  let visualEnv

  test.beforeEach(async ({ page }) => {
    visualEnv = new VisualTestEnvironment()
    await visualEnv.setupVisualTest()
  })

  test('Chrome browser consistency', async ({ page }) => {
    console.log('Testing Chrome browser consistency...')

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveScreenshot('homepage-chrome.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  // This test would run on Firefox when configured in playwright.config.js
  test('Firefox browser consistency', async ({ page }) => {
    console.log('Testing Firefox browser consistency...')

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveScreenshot('homepage-firefox.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  // This test would run on Safari when configured in playwright.config.js
  test('Safari browser consistency', async ({ page }) => {
    console.log('Testing Safari browser consistency...')

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveScreenshot('homepage-safari.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })
})

test.describe('Visual Regression - Accessibility Features', () => {
  let visualEnv

  test.beforeEach(async ({ page }) => {
    visualEnv = new VisualTestEnvironment()
    await visualEnv.setupVisualTest()
  })

  test('High contrast mode visual consistency', async ({ page }) => {
    console.log('Testing high contrast mode...')

    await page.goto('/')
    
    // Enable high contrast mode
    await page.addStyleTag({
      content: `
        @media (prefers-contrast: high) {
          * {
            filter: contrast(2) !important;
          }
        }
      `
    })

    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
    
    await expect(page).toHaveScreenshot('homepage-high-contrast.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('Dark mode visual consistency', async ({ page }) => {
    console.log('Testing dark mode...')

    await page.goto('/')
    
    // Add dark mode class
    await page.addStyleTag({
      content: `
        :root {
          --bg-primary: #1a1a1a;
          --text-primary: #ffffff;
          --border-color: #333333;
        }
        
        body {
          background-color: var(--bg-primary);
          color: var(--text-primary);
        }
      `
    })

    await page.emulateMedia({ colorScheme: 'dark' })
    
    await expect(page).toHaveScreenshot('homepage-dark-mode.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('Reduced motion visual consistency', async ({ page }) => {
    console.log('Testing reduced motion...')

    await page.goto('/')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    
    await expect(page).toHaveScreenshot('homepage-reduced-motion.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('Focus states visual consistency', async ({ page }) => {
    console.log('Testing focus states...')

    await page.goto('/login')
    
    // Focus on form elements and capture states
    await page.focus('[data-testid="email-input"]')
    await expect(page).toHaveScreenshot('email-input-focused.png', {
      animations: 'disabled'
    })

    await page.focus('[data-testid="password-input"]')
    await expect(page).toHaveScreenshot('password-input-focused.png', {
      animations: 'disabled'
    })

    await page.focus('[data-testid="submit-button"]')
    await expect(page).toHaveScreenshot('submit-button-focused.png', {
      animations: 'disabled'
    })
  })
})
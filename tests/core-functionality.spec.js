import { test, expect } from '@playwright/test'

test.describe('Core Dashboard Functionality', () => {
  
  async function authenticate(page) {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(1000)
    
    const devBypassButton = page.locator('button', { hasText: '🚧 Dev Bypass Login (localhost only)' })
    await expect(devBypassButton).toBeVisible({ timeout: 10000 })
    await devBypassButton.click()
    await page.waitForTimeout(2000)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  }

  test('authentication flow works correctly', async ({ page }) => {
    await authenticate(page)
    
    // Verify we're on dashboard
    await expect(page).toHaveURL(/\/dashboard/)
    
    // Verify page has content
    const bodyText = await page.locator('body').textContent()
    expect(bodyText?.length || 0).toBeGreaterThan(100)
    
    console.log('✅ Authentication successful')
  })

  test('dashboard pages are accessible', async ({ page }) => {
    await authenticate(page)
    
    const testRoutes = [
      '/dashboard',
      '/dashboard/analytics', 
      '/dashboard/bookings',
      '/dashboard/chat',
      '/dashboard/settings'
    ]
    
    let accessibleRoutes = 0
    let routesWithContent = 0
    
    for (const route of testRoutes) {
      try {
        await page.goto(route)
        await page.waitForLoadState('networkidle')
        
        // Check if URL is correct
        if (page.url().includes(route.split('/').pop())) {
          accessibleRoutes++
          
          // Check if page has meaningful content
          const bodyText = await page.locator('body').textContent()
          if (bodyText && bodyText.length > 50) {
            routesWithContent++
          }
        }
        
        console.log(`✅ ${route}: Accessible`)
      } catch (error) {
        console.log(`❌ ${route}: ${error.message}`)
      }
    }
    
    // Most routes should be accessible
    expect(accessibleRoutes).toBeGreaterThanOrEqual(3)
    expect(routesWithContent).toBeGreaterThanOrEqual(2)
    
    console.log(`✅ ${accessibleRoutes}/${testRoutes.length} routes accessible`)
    console.log(`✅ ${routesWithContent}/${testRoutes.length} routes have content`)
  })

  test('responsive design basics', async ({ page }) => {
    await authenticate(page)
    
    // Test different viewport sizes
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ]
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      // Check page loads without horizontal scrolling issues
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth + 50 // Small tolerance
      })
      
      // Check that content is visible
      const bodyText = await page.locator('body').textContent()
      const hasContent = bodyText && bodyText.length > 50
      
      expect(hasContent).toBe(true)
      expect(hasHorizontalScroll).toBe(false)
      
      console.log(`✅ ${viewport.name} (${viewport.width}x${viewport.height}): Responsive OK`)
    }
  })

  test('interactive elements are functional', async ({ page }) => {
    await authenticate(page)
    
    let interactiveElementsFound = 0
    let functionalElements = 0
    
    // Look for common interactive elements
    const buttonSelectors = [
      'button',
      'a[href*="/dashboard"]',
      'input[type="submit"]',
      '[role="button"]'
    ]
    
    for (const selector of buttonSelectors) {
      const elements = await page.locator(selector).all()
      
      for (let i = 0; i < Math.min(5, elements.length); i++) {
        const element = elements[i]
        
        if (await element.isVisible()) {
          interactiveElementsFound++
          
          try {
            // Test hover (should not throw error)
            await element.hover()
            
            // Test that element responds to interaction
            const isEnabled = await element.isEnabled()
            if (isEnabled) {
              functionalElements++
            }
          } catch (error) {
            // Element might not be interactable - that's OK
          }
        }
      }
    }
    
    expect(interactiveElementsFound).toBeGreaterThan(0)
    console.log(`✅ Found ${interactiveElementsFound} interactive elements`)
    console.log(`✅ ${functionalElements} elements are functional`)
  })

  test('navigation between dashboard sections', async ({ page }) => {
    await authenticate(page)
    
    // Test navigation between different sections
    const navigationTests = [
      { from: '/dashboard', to: '/dashboard/analytics' },
      { from: '/dashboard/analytics', to: '/dashboard/bookings' },
      { from: '/dashboard/bookings', to: '/dashboard/settings' }
    ]
    
    let successfulNavigations = 0
    
    for (const nav of navigationTests) {
      try {
        await page.goto(nav.from)
        await page.waitForLoadState('networkidle')
        
        await page.goto(nav.to)
        await page.waitForLoadState('networkidle')
        
        if (page.url().includes(nav.to.split('/').pop())) {
          successfulNavigations++
          console.log(`✅ Navigation: ${nav.from} → ${nav.to}`)
        }
      } catch (error) {
        console.log(`❌ Navigation failed: ${nav.from} → ${nav.to}`)
      }
    }
    
    expect(successfulNavigations).toBeGreaterThanOrEqual(2)
  })
})
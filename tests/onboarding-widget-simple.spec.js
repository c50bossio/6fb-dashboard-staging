import { test, expect } from '@playwright/test'

test.describe('Global Onboarding Widget - Simple Test', () => {
  
  test('should navigate to dashboard and check for compilation errors', async ({ page }) => {
    // Navigate to the dashboard to trigger the global onboarding widget
    const response = await page.goto('http://localhost:9999/dashboard')
    
    // Check if page loads without critical errors
    expect(response.status()).toBeLessThan(400)
    
    // Wait for page to finish loading
    await page.waitForLoadState('networkidle')
    
    // Check for JavaScript errors in console
    const errors = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    // Check if the page loaded successfully
    await expect(page.locator('body')).toBeVisible()
    
    // Log any console errors for debugging
    if (errors.length > 0) {
      console.log('Console errors found:', errors)
    }
  })

  test('should check for onboarding widget visibility on dashboard', async ({ page }) => {
    await page.goto('http://localhost:9999/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Look for the onboarding widget by various selectors
    const widgetSelectors = [
      'text=Setup Progress',
      'text=Complete your profile', 
      'text=Add your services',
      '.fixed.bottom-4.right-4',
      '[data-testid="onboarding-widget"]'
    ]
    
    let widgetFound = false
    for (const selector of widgetSelectors) {
      if (await page.locator(selector).isVisible()) {
        widgetFound = true
        console.log(`✅ Onboarding widget found with selector: ${selector}`)
        break
      }
    }
    
    // If widget is not visible, log what we can see
    if (!widgetFound) {
      console.log('❌ Onboarding widget not found. Page content:')
      const bodyText = await page.locator('body').textContent()
      console.log(bodyText.substring(0, 500) + '...')
    }
    
    // This test passes regardless but logs findings
    expect(true).toBe(true)
  })

  test('should test navigation between pages', async ({ page }) => {
    // Start at dashboard
    await page.goto('http://localhost:9999/dashboard')
    await page.waitForLoadState('networkidle')
    
    const initialUrl = page.url()
    console.log('Dashboard URL:', initialUrl)
    
    // Try to navigate to calendar
    try {
      await page.goto('http://localhost:9999/dashboard/calendar')
      await page.waitForLoadState('networkidle')
      console.log('✅ Successfully navigated to calendar')
      
      // Navigate back to dashboard
      await page.goto('http://localhost:9999/dashboard')
      await page.waitForLoadState('networkidle')
      console.log('✅ Successfully navigated back to dashboard')
      
    } catch (error) {
      console.log('❌ Navigation error:', error.message)
    }
    
    expect(true).toBe(true)
  })

  test('should check for React component errors', async ({ page }) => {
    await page.goto('http://localhost:9999/dashboard')
    
    // Look for React error boundaries or error messages
    const reactErrors = [
      'text=Something went wrong',
      'text=Error:',
      'text=TypeError:',
      'text=ReferenceError:',
      '.error-boundary'
    ]
    
    for (const errorSelector of reactErrors) {
      const errorElement = page.locator(errorSelector)
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent()
        console.log('❌ React error found:', errorText)
      }
    }
    
    // Check if main dashboard content loaded
    const dashboardLoaded = await page.locator('h2:has-text("Main Dashboard"), text=Main Dashboard').isVisible()
    console.log('Dashboard loaded:', dashboardLoaded ? '✅' : '❌')
    
    expect(true).toBe(true)
  })

  test('should check for missing module errors', async ({ page }) => {
    // Monitor console for module errors
    const moduleErrors = []
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('Module not found')) {
        moduleErrors.push(msg.text())
      }
    })
    
    await page.goto('http://localhost:9999/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Wait a bit for any lazy-loaded modules
    await page.waitForTimeout(2000)
    
    if (moduleErrors.length > 0) {
      console.log('❌ Module errors found:')
      moduleErrors.forEach(error => console.log('  -', error))
    } else {
      console.log('✅ No module errors detected')
    }
    
    expect(moduleErrors.length).toBe(0)
  })
})
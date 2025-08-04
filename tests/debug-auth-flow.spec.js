import { test, expect } from '@playwright/test'

test('debug authentication flow', async ({ page }) => {
  console.log('Starting authentication flow debug...')
  
  // Navigate to login page
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  console.log('Loaded login page')

  // Scroll down to find the dev bypass button
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(1000)
  console.log('Scrolled down')

  // Look for the specific dev bypass button
  const devBypassButton = page.locator('button', { hasText: '🚧 Dev Bypass Login (localhost only)' })
  
  // Check if button is visible
  const isVisible = await devBypassButton.isVisible()
  console.log('Dev bypass button visible:', isVisible)
  
  if (isVisible) {
    console.log('Clicking dev bypass button...')
    
    // Listen for any navigation
    const navigationPromise = page.waitForURL(/.*/, { timeout: 5000 }).catch(() => null)
    
    // Click the button
    await devBypassButton.click()
    console.log('Button clicked')
    
    // Wait a bit and check current URL
    await page.waitForTimeout(2000)
    const currentUrl = page.url()
    console.log('Current URL after click:', currentUrl)
    
    // Check for any error messages or loading states
    const bodyText = await page.locator('body').textContent()
    console.log('Page contains error?', bodyText?.toLowerCase().includes('error'))
    console.log('Page contains loading?', bodyText?.toLowerCase().includes('loading'))
    
    // Take screenshot after click
    await page.screenshot({ path: 'test-results/after-dev-bypass-click.png' })
    console.log('Screenshot taken after button click')
    
    // Try navigating directly to dashboard to see if authentication state is set
    await page.goto('/dashboard')
    await page.waitForTimeout(2000)
    const dashboardUrl = page.url()
    console.log('Dashboard URL after direct navigation:', dashboardUrl)
    
    // Check if we're still redirected to login
    if (dashboardUrl.includes('/login')) {
      console.log('Still redirected to login - authentication may not have worked')
    } else {
      console.log('Successfully accessed dashboard')
    }
    
    await page.screenshot({ path: 'test-results/dashboard-access-attempt.png' })
  } else {
    console.log('Dev bypass button not found')
    await page.screenshot({ path: 'test-results/no-dev-button.png' })
  }
  
  // Always pass this test since it's just for debugging
  expect(true).toBe(true)
})
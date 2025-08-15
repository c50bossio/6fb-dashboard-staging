import { test, expect } from '@playwright/test'

test('debug authentication flow', async ({ page }) => {
  
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  console.log('Loaded login page')

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(1000)
  console.log('Scrolled down')

  const devBypassButton = page.locator('button', { hasText: '🚧 Dev Bypass Login (localhost only)' })
  
  const isVisible = await devBypassButton.isVisible()
  console.log('Dev bypass button visible:', isVisible)
  
  if (isVisible) {
    console.log('Clicking dev bypass button...')
    
    const navigationPromise = page.waitForURL(/.*/, { timeout: 5000 }).catch(() => null)
    
    await devBypassButton.click()
    console.log('Button clicked')
    
    await page.waitForTimeout(2000)
    const currentUrl = page.url()
    console.log('Current URL after click:', currentUrl)
    
    const bodyText = await page.locator('body').textContent()
    console.log('Page contains error?', bodyText?.toLowerCase().includes('error'))
    console.log('Page contains loading?', bodyText?.toLowerCase().includes('loading'))
    
    await page.screenshot({ path: 'test-results/after-dev-bypass-click.png' })
    console.log('Screenshot taken after button click')
    
    await page.goto('/dashboard')
    await page.waitForTimeout(2000)
    const dashboardUrl = page.url()
    console.log('Dashboard URL after direct navigation:', dashboardUrl)
    
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
  
  expect(true).toBe(true)
})
import { test as setup, expect } from '@playwright/test'

const authFile = 'playwright/.auth/user.json'

setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login')

  // Wait a moment for page to load
  await page.waitForLoadState('networkidle')

  // Scroll down to find the dev bypass button (mentioned in requirements)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  
  // Wait a moment for any dynamic content
  await page.waitForTimeout(1000)

  // Look for the specific dev bypass button
  const devBypassButton = page.locator('button', { hasText: '🚧 Dev Bypass Login (localhost only)' })
  
  // Wait for dev bypass button and click it
  await expect(devBypassButton).toBeVisible({ timeout: 10000 })
  await devBypassButton.click()

  // Wait a moment for authentication to be processed
  await page.waitForTimeout(2000)
  
  // Navigate to dashboard (dev bypass doesn't auto-redirect)
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')
  
  // Verify we're logged in by checking we're on dashboard
  await expect(page).toHaveURL(/\/dashboard/)

  // Save authentication state
  await page.context().storageState({ path: authFile })
})
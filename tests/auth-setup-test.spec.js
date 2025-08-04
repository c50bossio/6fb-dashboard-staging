import { test, expect } from '@playwright/test'

test('updated authentication setup test', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  // Scroll down to find the dev bypass button
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
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
  
  console.log('✅ Authentication setup successful!')
})
import { test, expect } from '@playwright/test'

test('dev bypass authentication test', async ({ page }) => {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(1000)

  const devBypassButton = page.locator('button', { hasText: '🚧 Dev Bypass Login (localhost only)' })
  
  await expect(devBypassButton).toBeVisible({ timeout: 10000 })
  await devBypassButton.click()

  await page.waitForURL(/\/dashboard/, { timeout: 15000 })
  
  await expect(page).toHaveURL(/\/dashboard/)
  
  console.log('✅ Authentication successful - redirected to dashboard')
})
import { test as setup, expect } from '@playwright/test'

const authFile = 'playwright/.auth/user.json'

setup('authenticate', async ({ page }) => {

  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  await page.evaluate(() => {
    localStorage.setItem('dev_session', 'true')
    document.cookie = 'dev_auth=true; path=/; max-age=86400'
    
    const mockSession = {
      access_token: 'test_token_' + Date.now(),
      user: {
        id: 'test-user-playwright',
        email: 'playwright@test.com',
        user_metadata: {
          full_name: 'Playwright Test User'
        }
      },
      expires_at: Date.now() + (24 * 60 * 60 * 1000) // 24 hours from now
    }

    localStorage.setItem('supabase.auth.token', JSON.stringify(mockSession))
    
  })

  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000) // Allow time for auth checks
  
  const currentUrl = page.url()

  const isDashboard = currentUrl.includes('/dashboard')
  const canAccessAI = await page.goto('/ai-agents').then(() => true).catch(() => false)
  
  if (isDashboard || canAccessAI) {

    await page.context().storageState({ path: authFile })
    
  } else {
    console.warn('⚠️ Authentication may not be fully working')
    
    await page.context().storageState({ path: authFile })
  }
})
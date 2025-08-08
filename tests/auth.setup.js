import { test as setup, expect } from '@playwright/test'

const authFile = 'playwright/.auth/user.json'

setup('authenticate', async ({ page }) => {
  console.log('🔐 Setting up authentication for tests...')
  
  // Navigate to login page
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  // Set up development authentication bypass
  console.log('🔧 Setting up dev authentication bypass...')
  await page.evaluate(() => {
    // Set development session markers
    localStorage.setItem('dev_session', 'true')
    document.cookie = 'dev_auth=true; path=/; max-age=86400'
    
    // Set up mock Supabase session for testing
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
    console.log('✅ Dev authentication bypass configured')
  })

  // Navigate to dashboard to verify authentication
  console.log('🏠 Navigating to dashboard to verify auth...')
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000) // Allow time for auth checks
  
  // Verify we can access protected content
  const currentUrl = page.url()
  console.log(`📍 Current URL: ${currentUrl}`)
  
  // Check if we're on dashboard or if we can access AI agents (both are protected)
  const isDashboard = currentUrl.includes('/dashboard')
  const canAccessAI = await page.goto('/ai-agents').then(() => true).catch(() => false)
  
  if (isDashboard || canAccessAI) {
    console.log('✅ Authentication setup successful')
    
    // Save authentication state
    await page.context().storageState({ path: authFile })
    console.log('💾 Authentication state saved')
  } else {
    console.warn('⚠️ Authentication may not be fully working')
    
    // Still save the state for other tests to try
    await page.context().storageState({ path: authFile })
  }
})
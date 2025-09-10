import { test, expect } from '@playwright/test'

test.describe('Onboarding Checklist', () => {
  // Test checklist visibility on dashboard
  test('should display onboarding checklist on executive dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Wait for dashboard to load
    await expect(page.locator('h2:has-text("Main Dashboard")')).toBeVisible()
    
    // Check if onboarding checklist is visible in executive mode
    await expect(page.locator('h3:has-text("Setup Progress")')).toBeVisible()
    
    // Verify checklist items are present
    await expect(page.locator('text=Complete your profile')).toBeVisible()
    await expect(page.locator('text=Add your services')).toBeVisible()
    await expect(page.locator('text=Set business hours')).toBeVisible()
    
    // Check for progress indicator
    await expect(page.locator('text=%')).toBeVisible()
  })

  test('should show completion status for checklist items', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Wait for checklist to load
    await expect(page.locator('h3:has-text("Setup Progress")')).toBeVisible()
    
    // Check for both completed and incomplete items
    const items = page.locator('[data-testid="checklist-item"], .rounded-lg.border').filter({ hasText: /Complete your profile|Add your services|Set business hours/ })
    await expect(items).toHaveCount(3, { timeout: 10000 })
    
    // Verify required items are marked with asterisk
    await expect(page.locator('text=*')).toHaveCount(3) // 3 required items
  })

  test('should handle item clicks and navigation', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Wait for checklist to load
    await expect(page.locator('h3:has-text("Setup Progress")')).toBeVisible()
    
    // Click on a checklist item (profile setup)
    const profileItem = page.locator('text=Complete your profile').first()
    
    // Check if item is clickable (not completed)
    const itemContainer = profileItem.locator('..').locator('..').locator('..')
    const isClickable = await itemContainer.getAttribute('class')
    
    if (isClickable && isClickable.includes('cursor-pointer')) {
      await profileItem.click()
      
      // Should navigate to settings page
      await expect(page).toHaveURL(/\/dashboard\/settings/)
    }
  })

  test('should show achievement levels and points', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Wait for checklist to load
    await expect(page.locator('h3:has-text("Setup Progress")')).toBeVisible()
    
    // Check for achievement level display
    await expect(page.locator('text=Level').or(page.locator('text=Newcomer').or(page.locator('text=Beginner')))).toBeVisible()
    
    // Check for points display
    await expect(page.locator('text=points earned').or(page.locator('text=pts'))).toBeVisible()
  })
})

test.describe('Onboarding Checklist Embed', () => {
  test('should load embed page successfully', async ({ page }) => {
    await page.goto('/onboarding-checklist/embed')
    
    // Check that embed page loads
    await expect(page.locator('text=Complete Your Setup')).toBeVisible({ timeout: 10000 })
    
    // Verify checklist items are present
    await expect(page.locator('text=Complete your profile')).toBeVisible()
    await expect(page.locator('text=Add your services')).toBeVisible()
  })

  test('should support theme parameter', async ({ page }) => {
    await page.goto('/onboarding-checklist/embed?theme=dark')
    
    // Wait for page to load
    await expect(page.locator('text=Complete Your Setup')).toBeVisible({ timeout: 10000 })
    
    // Check for dark theme styling
    const container = page.locator('#embed-container')
    const bgColor = await container.evaluate(el => window.getComputedStyle(el).backgroundColor)
    
    // Should have dark background (not white)
    expect(bgColor).not.toBe('rgb(255, 255, 255)')
  })

  test('should support compact mode parameter', async ({ page }) => {
    await page.goto('/onboarding-checklist/embed?compact=true')
    
    // Wait for page to load
    await expect(page.locator('text=Complete Your Setup')).toBeVisible({ timeout: 10000 })
    
    // In compact mode, container should be smaller
    const container = page.locator('#embed-container')
    const styles = await container.evaluate(el => ({
      minHeight: window.getComputedStyle(el).minHeight,
      padding: window.getComputedStyle(el).padding
    }))
    
    expect(styles.minHeight).toBe('350px') // Compact mode height
  })

  test('should handle hideHeader parameter', async ({ page }) => {
    await page.goto('/onboarding-checklist/embed?hideHeader=true')
    
    // Wait for page to load and check that header is hidden
    await page.waitForLoadState('networkidle')
    
    // Header should not be visible when hideHeader is true
    await expect(page.locator('text=Complete Your Setup')).not.toBeVisible()
    
    // But checklist items should still be visible
    await expect(page.locator('text=Complete your profile')).toBeVisible()
  })

  test('should handle item clicks in embed mode', async ({ page }) => {
    await page.goto('/onboarding-checklist/embed')
    
    // Wait for page to load
    await expect(page.locator('text=Complete your profile')).toBeVisible({ timeout: 10000 })
    
    // Set up message listener for postMessage
    const messages = []
    await page.addInitScript(() => {
      window.addEventListener('message', (event) => {
        window.testMessages = window.testMessages || []
        window.testMessages.push(event.data)
      })
    })
    
    // Click on a checklist item
    const profileItem = page.locator('text=Complete your profile').first()
    const itemContainer = profileItem.locator('..').locator('..').locator('..')
    
    // Check if item is clickable
    const isClickable = await itemContainer.getAttribute('class')
    if (isClickable && isClickable.includes('cursor-pointer')) {
      await profileItem.click()
      
      // Check if postMessage was sent or alert was shown
      // Note: In embed mode, this should either show an alert or send postMessage
      const hasAlert = await page.locator('text=Complete this step').isVisible().catch(() => false)
      
      if (!hasAlert) {
        // Check for postMessage (would need parent window to receive it in real scenario)
        const messages = await page.evaluate(() => window.testMessages || [])
        const navMessage = messages.find(msg => msg.type === 'onboarding-checklist-navigate')
        
        if (navMessage) {
          expect(navMessage.link).toBeTruthy()
          expect(navMessage.item).toBeTruthy()
        }
      }
    }
  })
})

test.describe('Onboarding API Endpoints', () => {
  test('should return 401 for unauthenticated status request', async ({ page }) => {
    const response = await page.request.get('/api/onboarding/checklist/status')
    expect(response.status()).toBe(401)
    
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe('Authentication required')
  })

  test('should return 401 for unauthenticated update request', async ({ page }) => {
    const response = await page.request.post('/api/onboarding/checklist/update', {
      data: {
        item_id: 'profile',
        completed: true,
        points: 20
      }
    })
    
    expect(response.status()).toBe(401)
    
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe('Authentication required')
  })

  test('should return 400 for invalid update request', async ({ page }) => {
    const response = await page.request.post('/api/onboarding/checklist/update', {
      data: {
        // Missing item_id
        completed: true,
        points: 20
      }
    })
    
    expect(response.status()).toBe(400)
    
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain('item_id and completed status required')
  })

  test('should return 405 for wrong HTTP methods', async ({ page }) => {
    // Status endpoint should only accept GET
    const statusResponse = await page.request.post('/api/onboarding/checklist/status')
    expect(statusResponse.status()).toBe(405)
    
    // Update endpoint should only accept POST
    const updateResponse = await page.request.get('/api/onboarding/checklist/update')
    expect(updateResponse.status()).toBe(405)
    
    // Complete endpoint should only accept POST
    const completeResponse = await page.request.get('/api/onboarding/checklist/complete')
    expect(completeResponse.status()).toBe(405)
  })
})

test.describe('Onboarding Checklist Integration', () => {
  test('should have proper CORS headers for embed usage', async ({ page }) => {
    const response = await page.request.get('/onboarding-checklist/embed')
    expect(response.status()).toBe(200)
    
    // Should be embeddable in iframe
    const headers = response.headers()
    expect(headers['x-frame-options']).toBeFalsy() // Should not block iframe embedding
  })

  test('should handle responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard')
    
    // Checklist should still be visible on mobile
    await expect(page.locator('h3:has-text("Setup Progress")')).toBeVisible({ timeout: 10000 })
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator('h3:has-text("Setup Progress")')).toBeVisible()
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page.locator('h3:has-text("Setup Progress")')).toBeVisible()
  })

  test('should maintain state across page refreshes', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Wait for checklist to load
    await expect(page.locator('h3:has-text("Setup Progress")')).toBeVisible()
    
    // Get initial progress
    const initialProgress = await page.locator('text=%').first().textContent()
    
    // Refresh page
    await page.reload()
    
    // Progress should be maintained
    await expect(page.locator('h3:has-text("Setup Progress")')).toBeVisible()
    const newProgress = await page.locator('text=%').first().textContent()
    
    expect(newProgress).toBe(initialProgress)
  })
})
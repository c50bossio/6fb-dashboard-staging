import { test, expect } from '@playwright/test'

test.describe('Dashboard Navigation', () => {
  test('navigates to dashboard after login', async ({ page }) => {
    await page.goto('/dashboard')
    
    await expect(page.locator('h1')).toContainText('Dashboard')
    
    await expect(page.locator('[data-testid="nav-agents"]')).toBeVisible()
    await expect(page.locator('[data-testid="nav-integrations"]')).toBeVisible()
  })

  test('displays user information', async ({ page }) => {
    await page.goto('/dashboard')
    
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    
    await page.click('[data-testid="user-menu"]')
    
    await expect(page.locator('[data-testid="user-email"]')).toBeVisible()
    await expect(page.locator('[data-testid="logout-button"]')).toBeVisible()
  })

  test('shows quick stats cards', async ({ page }) => {
    await page.goto('/dashboard')
    
    await expect(page.locator('[data-testid="stats-revenue"]')).toBeVisible()
    await expect(page.locator('[data-testid="stats-appointments"]')).toBeVisible()
    await expect(page.locator('[data-testid="stats-customers"]')).toBeVisible()
  })
})

test.describe('AI Agents Dashboard', () => {
  test('displays all available AI agents', async ({ page }) => {
    await page.goto('/dashboard/agents')
    
    await expect(page.locator('h1')).toContainText('AI Agents')
    
    await expect(page.locator('[data-testid="agent-master-coach"]')).toBeVisible()
    await expect(page.locator('[data-testid="agent-financial"]')).toBeVisible()
    await expect(page.locator('[data-testid="agent-client-acquisition"]')).toBeVisible()
    await expect(page.locator('[data-testid="agent-operations"]')).toBeVisible()
    await expect(page.locator('[data-testid="agent-brand"]')).toBeVisible()
    await expect(page.locator('[data-testid="agent-growth"]')).toBeVisible()
    await expect(page.locator('[data-testid="agent-strategic-mindset"]')).toBeVisible()
  })

  test('allows selecting and chatting with an agent', async ({ page }) => {
    await page.goto('/dashboard/agents')
    
    await page.click('[data-testid="agent-financial"]')
    
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible()
    await expect(page.locator('[data-testid="message-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="send-button"]')).toBeVisible()
    
    await page.fill('[data-testid="message-input"]', 'How can I increase my revenue?')
    
    await page.click('[data-testid="send-button"]')
    
    await expect(page.locator('[data-testid="user-message"]')).toContainText('How can I increase my revenue?')
    
    await expect(page.locator('[data-testid="agent-response"]')).toBeVisible({ timeout: 10000 })
  })

  test('displays agent recommendations', async ({ page }) => {
    await page.goto('/dashboard/agents')
    
    await page.click('[data-testid="agent-master-coach"]')
    
    await page.fill('[data-testid="message-input"]', 'Give me business recommendations')
    await page.click('[data-testid="send-button"]')
    
    await expect(page.locator('[data-testid="recommendations-section"]')).toBeVisible({ timeout: 10000 })
    
    await expect(page.locator('[data-testid="recommendation-item"]').first()).toBeVisible()
    await expect(page.locator('[data-testid="recommendation-title"]').first()).toBeVisible()
    await expect(page.locator('[data-testid="recommendation-impact"]').first()).toBeVisible()
  })

  test('switches between different agents', async ({ page }) => {
    await page.goto('/dashboard/agents')
    
    await page.click('[data-testid="agent-financial"]')
    await expect(page.locator('[data-testid="agent-title"]')).toContainText('Financial Agent')
    
    await page.click('[data-testid="agent-operations"]')
    await expect(page.locator('[data-testid="agent-title"]')).toContainText('Operations Agent')
    
    await expect(page.locator('[data-testid="message-input"]')).toHaveAttribute(
      'placeholder', 
      /Ask the Operations Agent/
    )
  })
})

test.describe('Integrations Dashboard', () => {
  test('displays available integrations', async ({ page }) => {
    await page.goto('/dashboard/integrations')
    
    await expect(page.locator('h1')).toContainText('Integrations')
    
    await expect(page.locator('[data-testid="integration-trafft"]')).toBeVisible()
    await expect(page.locator('[data-testid="integration-google-calendar"]')).toBeVisible()
    await expect(page.locator('[data-testid="integration-square"]')).toBeVisible()
  })

  test('configures Trafft integration', async ({ page }) => {
    await page.goto('/dashboard/integrations')
    
    await page.click('[data-testid="integration-trafft"]')
    
    await expect(page.locator('[data-testid="trafft-config-modal"]')).toBeVisible()
    
    await page.fill('[data-testid="trafft-api-key"]', 'test-api-key-123')
    
    await page.click('[data-testid="save-integration"]')
    
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    
    await expect(page.locator('[data-testid="trafft-status"]')).toContainText('Connected')
  })

  test('triggers manual sync', async ({ page }) => {
    await page.goto('/dashboard/integrations')
    
    await page.click('[data-testid="trafft-sync-button"]')
    
    await expect(page.locator('[data-testid="sync-progress"]')).toBeVisible()
    
    await expect(page.locator('[data-testid="sync-success"]')).toBeVisible({ timeout: 15000 })
    
    await expect(page.locator('[data-testid="sync-summary"]')).toBeVisible()
  })

  test('displays sync history', async ({ page }) => {
    await page.goto('/dashboard/integrations')
    
    await page.click('[data-testid="integration-trafft"]')
    
    await page.click('[data-testid="sync-history-tab"]')
    
    await expect(page.locator('[data-testid="sync-history-list"]')).toBeVisible()
    await expect(page.locator('[data-testid="sync-item"]').first()).toBeVisible()
  })
})

test.describe('Responsive Design', () => {
  test('works on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/dashboard')
    
    await page.click('[data-testid="mobile-menu-button"]')
    await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible()
    
    await page.click('[data-testid="mobile-nav-agents"]')
    await expect(page.locator('h1')).toContainText('AI Agents')
    
    const agentCards = page.locator('[data-testid^="agent-"]')
    await expect(agentCards.first()).toBeVisible()
  })

  test('works on tablet devices', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    
    await page.goto('/dashboard/agents')
    
    await expect(page.locator('[data-testid="agents-grid"]')).toBeVisible()
    
    await page.click('[data-testid="agent-financial"]')
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible()
  })
})

test.describe('Performance', () => {
  test('dashboard loads within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/dashboard')
    
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible()
    
    const loadTime = Date.now() - startTime
    
    expect(loadTime).toBeLessThan(3000)
  })

  test('agent responses are delivered promptly', async ({ page }) => {
    await page.goto('/dashboard/agents')
    
    await page.click('[data-testid="agent-master-coach"]')
    
    const startTime = Date.now()
    
    await page.fill('[data-testid="message-input"]', 'Quick test message')
    await page.click('[data-testid="send-button"]')
    
    await expect(page.locator('[data-testid="agent-response"]')).toBeVisible()
    
    const responseTime = Date.now() - startTime
    
    expect(responseTime).toBeLessThan(5000)
  })
})
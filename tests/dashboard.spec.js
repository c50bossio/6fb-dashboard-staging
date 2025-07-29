import { test, expect } from '@playwright/test'

test.describe('Dashboard Navigation', () => {
  test('navigates to dashboard after login', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check that dashboard loads
    await expect(page.locator('h1')).toContainText('Dashboard')
    
    // Check for main navigation elements
    await expect(page.locator('[data-testid="nav-agents"]')).toBeVisible()
    await expect(page.locator('[data-testid="nav-integrations"]')).toBeVisible()
  })

  test('displays user information', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check for user avatar/menu
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    
    // Click user menu
    await page.click('[data-testid="user-menu"]')
    
    // Check for user details
    await expect(page.locator('[data-testid="user-email"]')).toBeVisible()
    await expect(page.locator('[data-testid="logout-button"]')).toBeVisible()
  })

  test('shows quick stats cards', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check for statistics cards
    await expect(page.locator('[data-testid="stats-revenue"]')).toBeVisible()
    await expect(page.locator('[data-testid="stats-appointments"]')).toBeVisible()
    await expect(page.locator('[data-testid="stats-customers"]')).toBeVisible()
  })
})

test.describe('AI Agents Dashboard', () => {
  test('displays all available AI agents', async ({ page }) => {
    await page.goto('/dashboard/agents')
    
    // Check that AI agents page loads
    await expect(page.locator('h1')).toContainText('AI Agents')
    
    // Check for all 7 agents
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
    
    // Click on Financial Agent
    await page.click('[data-testid="agent-financial"]')
    
    // Check that chat interface appears
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible()
    await expect(page.locator('[data-testid="message-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="send-button"]')).toBeVisible()
    
    // Type a message
    await page.fill('[data-testid="message-input"]', 'How can I increase my revenue?')
    
    // Send the message
    await page.click('[data-testid="send-button"]')
    
    // Check that message appears in chat
    await expect(page.locator('[data-testid="user-message"]')).toContainText('How can I increase my revenue?')
    
    // Wait for agent response
    await expect(page.locator('[data-testid="agent-response"]')).toBeVisible({ timeout: 10000 })
  })

  test('displays agent recommendations', async ({ page }) => {
    await page.goto('/dashboard/agents')
    
    // Select Master Coach
    await page.click('[data-testid="agent-master-coach"]')
    
    // Send a message that would generate recommendations
    await page.fill('[data-testid="message-input"]', 'Give me business recommendations')
    await page.click('[data-testid="send-button"]')
    
    // Wait for response with recommendations
    await expect(page.locator('[data-testid="recommendations-section"]')).toBeVisible({ timeout: 10000 })
    
    // Check that recommendations have proper structure
    await expect(page.locator('[data-testid="recommendation-item"]').first()).toBeVisible()
    await expect(page.locator('[data-testid="recommendation-title"]').first()).toBeVisible()
    await expect(page.locator('[data-testid="recommendation-impact"]').first()).toBeVisible()
  })

  test('switches between different agents', async ({ page }) => {
    await page.goto('/dashboard/agents')
    
    // Select Financial Agent
    await page.click('[data-testid="agent-financial"]')
    await expect(page.locator('[data-testid="agent-title"]')).toContainText('Financial Agent')
    
    // Switch to Operations Agent
    await page.click('[data-testid="agent-operations"]')
    await expect(page.locator('[data-testid="agent-title"]')).toContainText('Operations Agent')
    
    // Verify chat input placeholder changed
    await expect(page.locator('[data-testid="message-input"]')).toHaveAttribute(
      'placeholder', 
      /Ask the Operations Agent/
    )
  })
})

test.describe('Integrations Dashboard', () => {
  test('displays available integrations', async ({ page }) => {
    await page.goto('/dashboard/integrations')
    
    // Check that integrations page loads
    await expect(page.locator('h1')).toContainText('Integrations')
    
    // Check for integration cards
    await expect(page.locator('[data-testid="integration-trafft"]')).toBeVisible()
    await expect(page.locator('[data-testid="integration-google-calendar"]')).toBeVisible()
    await expect(page.locator('[data-testid="integration-square"]')).toBeVisible()
  })

  test('configures Trafft integration', async ({ page }) => {
    await page.goto('/dashboard/integrations')
    
    // Click on Trafft integration
    await page.click('[data-testid="integration-trafft"]')
    
    // Check that configuration modal opens
    await expect(page.locator('[data-testid="trafft-config-modal"]')).toBeVisible()
    
    // Fill in API key
    await page.fill('[data-testid="trafft-api-key"]', 'test-api-key-123')
    
    // Save configuration
    await page.click('[data-testid="save-integration"]')
    
    // Check for success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    
    // Verify integration status changed
    await expect(page.locator('[data-testid="trafft-status"]')).toContainText('Connected')
  })

  test('triggers manual sync', async ({ page }) => {
    await page.goto('/dashboard/integrations')
    
    // Assuming Trafft is already configured
    await page.click('[data-testid="trafft-sync-button"]')
    
    // Check for sync progress indicator
    await expect(page.locator('[data-testid="sync-progress"]')).toBeVisible()
    
    // Wait for sync completion
    await expect(page.locator('[data-testid="sync-success"]')).toBeVisible({ timeout: 15000 })
    
    // Check that sync data is displayed
    await expect(page.locator('[data-testid="sync-summary"]')).toBeVisible()
  })

  test('displays sync history', async ({ page }) => {
    await page.goto('/dashboard/integrations')
    
    // Open Trafft integration details
    await page.click('[data-testid="integration-trafft"]')
    
    // Click on sync history tab
    await page.click('[data-testid="sync-history-tab"]')
    
    // Check that sync history is displayed
    await expect(page.locator('[data-testid="sync-history-list"]')).toBeVisible()
    await expect(page.locator('[data-testid="sync-item"]').first()).toBeVisible()
  })
})

test.describe('Responsive Design', () => {
  test('works on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/dashboard')
    
    // Check that mobile navigation works
    await page.click('[data-testid="mobile-menu-button"]')
    await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible()
    
    // Navigate to agents page on mobile
    await page.click('[data-testid="mobile-nav-agents"]')
    await expect(page.locator('h1')).toContainText('AI Agents')
    
    // Check that agent cards are stacked vertically on mobile
    const agentCards = page.locator('[data-testid^="agent-"]')
    await expect(agentCards.first()).toBeVisible()
  })

  test('works on tablet devices', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    
    await page.goto('/dashboard/agents')
    
    // Check that layout adapts to tablet size
    await expect(page.locator('[data-testid="agents-grid"]')).toBeVisible()
    
    // Select an agent and verify chat interface works
    await page.click('[data-testid="agent-financial"]')
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible()
  })
})

test.describe('Performance', () => {
  test('dashboard loads within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/dashboard')
    
    // Wait for main content to load
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible()
    
    const loadTime = Date.now() - startTime
    
    // Dashboard should load within 3 seconds
    expect(loadTime).toBeLessThan(3000)
  })

  test('agent responses are delivered promptly', async ({ page }) => {
    await page.goto('/dashboard/agents')
    
    // Select an agent
    await page.click('[data-testid="agent-master-coach"]')
    
    // Send a message and measure response time
    const startTime = Date.now()
    
    await page.fill('[data-testid="message-input"]', 'Quick test message')
    await page.click('[data-testid="send-button"]')
    
    // Wait for agent response
    await expect(page.locator('[data-testid="agent-response"]')).toBeVisible()
    
    const responseTime = Date.now() - startTime
    
    // Agent should respond within 5 seconds
    expect(responseTime).toBeLessThan(5000)
  })
})
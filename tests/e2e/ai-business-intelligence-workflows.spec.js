/**
 * END-TO-END TESTS FOR AI BUSINESS INTELLIGENCE WORKFLOWS
 * 
 * Tests complete user workflows for AI-powered business intelligence features
 * Covers multi-model AI switching, predictive analytics, and business insights
 */

import { test, expect } from '@playwright/test'

test.describe('AI Business Intelligence Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard and ensure it's loaded
    await page.goto('http://localhost:9999')
    await page.waitForLoadState('networkidle')
    
    // Wait for initial data load
    await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible()
  })

  test.describe('AI Chat and Model Switching Workflow', () => {
    test('complete AI chat conversation with model switching', async ({ page }) => {
      // Navigate to AI chat section
      await page.click('[data-testid="ai-chat-tab"]')
      await expect(page.locator('[data-testid="ai-agent-chat"]')).toBeVisible()
      
      // Verify initial GPT-5 model is selected
      const modelSelector = page.locator('[data-testid="model-selector"]')
      await expect(modelSelector).toHaveValue('gpt-5')
      
      // Send initial business question
      const chatInput = page.locator('[data-testid="chat-input"]')
      const sendButton = page.locator('[data-testid="send-button"]')
      
      await chatInput.fill('What are my revenue trends for this month?')
      await sendButton.click()
      
      // Wait for AI response
      await expect(page.locator('[data-testid="ai-response"]').last()).toBeVisible({ timeout: 10000 })
      const firstResponse = await page.locator('[data-testid="ai-response"]').last().textContent()
      expect(firstResponse).toContain('revenue')
      
      // Switch to Claude Opus 4.1 model
      await modelSelector.selectOption('claude-opus-4.1')
      await expect(modelSelector).toHaveValue('claude-opus-4.1')
      
      // Send follow-up question with new model
      await chatInput.fill('Can you provide more detailed analytics on customer behavior?')
      await sendButton.click()
      
      // Verify response from Claude model
      await expect(page.locator('[data-testid="ai-response"]').last()).toBeVisible({ timeout: 10000 })
      const claudeResponse = await page.locator('[data-testid="ai-response"]').last().textContent()
      expect(claudeResponse).toContain('customer')
      
      // Switch to Gemini 2.0 Flash
      await modelSelector.selectOption('gemini-2.0-flash')
      await chatInput.fill('Generate a pricing optimization strategy')
      await sendButton.click()
      
      // Verify Gemini response
      await expect(page.locator('[data-testid="ai-response"]').last()).toBeVisible({ timeout: 10000 })
      const geminiResponse = await page.locator('[data-testid="ai-response"]').last().textContent()
      expect(geminiResponse).toContain('pricing')
      
      // Verify conversation history is maintained
      const allResponses = await page.locator('[data-testid="ai-response"]').count()
      expect(allResponses).toBeGreaterThanOrEqual(3)
    })

    test('AI chat handles business context integration', async ({ page }) => {
      await page.click('[data-testid="ai-chat-tab"]')
      
      const chatInput = page.locator('[data-testid="chat-input"]')
      const sendButton = page.locator('[data-testid="send-button"]')
      
      // Ask for specific business metrics
      await chatInput.fill('Show me today\'s booking statistics and revenue breakdown')
      await sendButton.click()
      
      // Wait for response with actual business data
      await expect(page.locator('[data-testid="ai-response"]').last()).toBeVisible({ timeout: 10000 })
      
      const response = await page.locator('[data-testid="ai-response"]').last().textContent()
      
      // Verify AI has access to real business data
      expect(response).toMatch(/(\$\d+|\d+%|\d+ bookings)/i) // Should contain actual numbers
      expect(response).not.toContain('I don\'t have access') // Should not indicate data unavailability
    })

    test('AI chat error handling and recovery', async ({ page }) => {
      await page.click('[data-testid="ai-chat-tab"]')
      
      // Simulate network interruption by intercepting API calls
      await page.route('/api/ai/unified-chat', route => {
        route.abort('failed')
      })
      
      const chatInput = page.locator('[data-testid="chat-input"]')
      const sendButton = page.locator('[data-testid="send-button"]')
      
      await chatInput.fill('Test message during network error')
      await sendButton.click()
      
      // Should handle error gracefully
      await expect(chatInput).toBeEnabled({ timeout: 5000 })
      
      // Restore network and retry
      await page.unroute('/api/ai/unified-chat')
      
      await chatInput.fill('Retry after network recovery')
      await sendButton.click()
      
      await expect(page.locator('[data-testid="ai-response"]').last()).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Predictive Analytics Dashboard Workflow', () => {
    test('complete predictive analytics exploration workflow', async ({ page }) => {
      // Navigate to predictive analytics
      await page.click('[data-testid="predictive-analytics-tab"]')
      await expect(page.locator('[data-testid="predictive-dashboard"]')).toBeVisible()
      
      // Wait for initial predictions to load
      await expect(page.locator('[data-testid="prediction-accuracy"]')).toBeVisible({ timeout: 15000 })
      
      // Verify accuracy badge is displayed
      const accuracyBadge = page.locator('[data-testid="prediction-accuracy"]')
      const accuracy = await accuracyBadge.textContent()
      expect(accuracy).toMatch(/\d+\.\d+% accuracy/)
      
      // Check revenue metrics are loaded
      await expect(page.locator('[data-testid="total-revenue"]')).toBeVisible()
      await expect(page.locator('[data-testid="total-bookings"]')).toBeVisible()
      await expect(page.locator('[data-testid="avg-service-price"]')).toBeVisible()
      
      // Verify revenue forecast section
      await expect(page.locator('[data-testid="revenue-forecast"]')).toBeVisible()
      
      const forecastRevenue = page.locator('[data-testid="predicted-revenue"]')
      const forecastValue = await forecastRevenue.textContent()
      expect(forecastValue).toMatch(/\$[\d,]+/)
      
      // Check demand prediction data
      await expect(page.locator('[data-testid="demand-prediction"]')).toBeVisible()
      await expect(page.locator('[data-testid="peak-times"]')).toBeVisible()
      
      // Verify service demand breakdown
      const servicesList = page.locator('[data-testid="service-demand-list"]')
      await expect(servicesList).toBeVisible()
      
      const services = await servicesList.locator('[data-testid="service-item"]').count()
      expect(services).toBeGreaterThan(0)
    })

    test('timeframe selection affects predictions', async ({ page }) => {
      await page.click('[data-testid="predictive-analytics-tab"]')
      await expect(page.locator('[data-testid="predictive-dashboard"]')).toBeVisible()
      
      // Wait for initial load with 30-day default
      await expect(page.locator('[data-testid="prediction-accuracy"]')).toBeVisible({ timeout: 15000 })
      
      const initialRevenue = await page.locator('[data-testid="predicted-revenue"]').textContent()
      
      // Change timeframe to 60 days
      const timeframeSelector = page.locator('[data-testid="timeframe-selector"]')
      await timeframeSelector.selectOption('60')
      
      // Wait for predictions to reload
      await page.waitForTimeout(2000) // Allow for API calls
      await expect(page.locator('[data-testid="prediction-accuracy"]')).toBeVisible()
      
      const newRevenue = await page.locator('[data-testid="predicted-revenue"]').textContent()
      
      // Revenue prediction should change with different timeframe
      expect(newRevenue).not.toBe(initialRevenue)
      
      // Change to 90 days and verify again
      await timeframeSelector.selectOption('90')
      await page.waitForTimeout(2000)
      
      const longerTermRevenue = await page.locator('[data-testid="predicted-revenue"]').textContent()
      expect(longerTermRevenue).not.toBe(newRevenue)
    })

    test('refresh functionality updates all predictions', async ({ page }) => {
      await page.click('[data-testid="predictive-analytics-tab"]')
      await expect(page.locator('[data-testid="predictive-dashboard"]')).toBeVisible()
      
      // Wait for initial load
      await expect(page.locator('[data-testid="prediction-accuracy"]')).toBeVisible({ timeout: 15000 })
      
      // Capture initial values
      const initialAccuracy = await page.locator('[data-testid="prediction-accuracy"]').textContent()
      const initialRevenue = await page.locator('[data-testid="predicted-revenue"]').textContent()
      
      // Click refresh button
      await page.click('[data-testid="refresh-predictions"]')
      
      // Wait for refresh to complete
      await page.waitForTimeout(3000)
      await expect(page.locator('[data-testid="prediction-accuracy"]')).toBeVisible()
      
      // Verify data has been refreshed (timestamps should update)
      const lastUpdated = await page.locator('[data-testid="last-updated"]').textContent()
      expect(lastUpdated).toContain('seconds ago')
    })

    test('view switching between different analytics sections', async ({ page }) => {
      await page.click('[data-testid="predictive-analytics-tab"]')
      await expect(page.locator('[data-testid="predictive-dashboard"]')).toBeVisible()
      
      // Start with overview view
      await expect(page.locator('[data-testid="overview-section"]')).toBeVisible()
      
      // Switch to forecast view
      await page.click('[data-testid="forecast-view-button"]')
      await expect(page.locator('[data-testid="forecast-section"]')).toBeVisible()
      await expect(page.locator('[data-testid="weekly-breakdown"]')).toBeVisible()
      
      // Switch to demand view
      await page.click('[data-testid="demand-view-button"]')
      await expect(page.locator('[data-testid="demand-section"]')).toBeVisible()
      await expect(page.locator('[data-testid="capacity-alerts"]')).toBeVisible()
      
      // Switch back to overview
      await page.click('[data-testid="overview-view-button"]')
      await expect(page.locator('[data-testid="overview-section"]')).toBeVisible()
    })
  })

  test.describe('Business Intelligence Integration Workflow', () => {
    test('AI recommendations integration with business data', async ({ page }) => {
      // Navigate to business insights section
      await page.click('[data-testid="business-insights-tab"]')
      await expect(page.locator('[data-testid="business-insights-dashboard"]')).toBeVisible()
      
      // Check for AI-generated recommendations
      await expect(page.locator('[data-testid="ai-recommendations"]')).toBeVisible({ timeout: 10000 })
      
      const recommendations = await page.locator('[data-testid="recommendation-item"]').count()
      expect(recommendations).toBeGreaterThan(0)
      
      // Click on a recommendation for details
      await page.click('[data-testid="recommendation-item"]')
      await expect(page.locator('[data-testid="recommendation-details"]')).toBeVisible()
      
      // Verify recommendation includes data-driven insights
      const details = await page.locator('[data-testid="recommendation-details"]').textContent()
      expect(details).toMatch(/(\d+%|\$\d+|increase|improve)/i)
    })

    test('real-time metrics and live updates', async ({ page }) => {
      await page.click('[data-testid="live-metrics-tab"]')
      await expect(page.locator('[data-testid="live-dashboard"]')).toBeVisible()
      
      // Check for real-time indicators
      await expect(page.locator('[data-testid="live-indicator"]')).toBeVisible()
      await expect(page.locator('[data-testid="current-bookings"]')).toBeVisible()
      await expect(page.locator('[data-testid="revenue-today"]')).toBeVisible()
      
      // Wait for auto-refresh (should happen within 30 seconds)
      const initialTimestamp = await page.locator('[data-testid="last-updated"]').textContent()
      
      await page.waitForTimeout(35000) // Wait for auto-refresh
      
      const updatedTimestamp = await page.locator('[data-testid="last-updated"]').textContent()
      expect(updatedTimestamp).not.toBe(initialTimestamp)
    })

    test('business KPI monitoring workflow', async ({ page }) => {
      await page.click('[data-testid="kpi-monitoring-tab"]')
      await expect(page.locator('[data-testid="kpi-dashboard"]')).toBeVisible()
      
      // Verify 25+ KPIs are displayed
      const kpiCards = await page.locator('[data-testid="kpi-card"]').count()
      expect(kpiCards).toBeGreaterThanOrEqual(25)
      
      // Check key business KPIs
      await expect(page.locator('[data-testid="customer-satisfaction-kpi"]')).toBeVisible()
      await expect(page.locator('[data-testid="booking-efficiency-kpi"]')).toBeVisible()
      await expect(page.locator('[data-testid="staff-utilization-kpi"]')).toBeVisible()
      await expect(page.locator('[data-testid="revenue-growth-kpi"]')).toBeVisible()
      
      // Click on a KPI for detailed drill-down
      await page.click('[data-testid="customer-satisfaction-kpi"]')
      await expect(page.locator('[data-testid="kpi-drill-down"]')).toBeVisible()
      
      // Verify drill-down shows historical trend
      await expect(page.locator('[data-testid="historical-trend-chart"]')).toBeVisible()
    })
  })

  test.describe('Cross-Browser AI Workflow Compatibility', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`AI chat workflow works in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping ${browserName} test in ${currentBrowser}`)
        
        await page.click('[data-testid="ai-chat-tab"]')
        await expect(page.locator('[data-testid="ai-agent-chat"]')).toBeVisible()
        
        const chatInput = page.locator('[data-testid="chat-input"]')
        const sendButton = page.locator('[data-testid="send-button"]')
        
        await chatInput.fill('Test cross-browser AI functionality')
        await sendButton.click()
        
        await expect(page.locator('[data-testid="ai-response"]').last()).toBeVisible({ timeout: 10000 })
        
        const response = await page.locator('[data-testid="ai-response"]').last().textContent()
        expect(response.length).toBeGreaterThan(10)
      })
    })
  })

  test.describe('Mobile AI Workflow Testing', () => {
    test('mobile AI chat interaction', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Navigate to mobile-optimized AI chat
      await page.click('[data-testid="mobile-menu-toggle"]')
      await page.click('[data-testid="mobile-ai-chat-link"]')
      
      await expect(page.locator('[data-testid="mobile-ai-chat"]')).toBeVisible()
      
      // Test mobile chat interaction
      const mobileInput = page.locator('[data-testid="mobile-chat-input"]')
      const mobileSend = page.locator('[data-testid="mobile-send-button"]')
      
      await mobileInput.fill('Mobile AI test question')
      await mobileSend.click()
      
      await expect(page.locator('[data-testid="mobile-ai-response"]').last()).toBeVisible({ timeout: 10000 })
    })

    test('mobile predictive analytics dashboard', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      await page.click('[data-testid="mobile-menu-toggle"]')
      await page.click('[data-testid="mobile-analytics-link"]')
      
      await expect(page.locator('[data-testid="mobile-analytics-dashboard"]')).toBeVisible()
      
      // Verify mobile-optimized layout
      await expect(page.locator('[data-testid="mobile-metrics-grid"]')).toBeVisible()
      
      // Test swipe navigation for metrics
      await page.locator('[data-testid="mobile-metrics-carousel"]').swipe({ direction: 'left' })
      
      await expect(page.locator('[data-testid="mobile-forecast-card"]')).toBeVisible()
    })
  })

  test.describe('Performance and Load Testing', () => {
    test('AI dashboard loads within performance thresholds', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto('http://localhost:9999')
      await page.waitForLoadState('networkidle')
      
      // Navigate to AI features
      await page.click('[data-testid="ai-chat-tab"]')
      await expect(page.locator('[data-testid="ai-agent-chat"]')).toBeVisible()
      
      await page.click('[data-testid="predictive-analytics-tab"]')
      await expect(page.locator('[data-testid="predictive-dashboard"]')).toBeVisible({ timeout: 15000 })
      
      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(20000) // Should load within 20 seconds
    })

    test('concurrent AI requests handling', async ({ page }) => {
      await page.click('[data-testid="ai-chat-tab"]')
      
      const chatInput = page.locator('[data-testid="chat-input"]')
      const sendButton = page.locator('[data-testid="send-button"]')
      
      // Send multiple requests rapidly
      const messages = ['Question 1', 'Question 2', 'Question 3']
      
      for (const message of messages) {
        await chatInput.fill(message)
        await sendButton.click()
        await page.waitForTimeout(100) // Small delay to avoid overwhelming
      }
      
      // Wait for all responses
      await expect(page.locator('[data-testid="ai-response"]').nth(2)).toBeVisible({ timeout: 30000 })
      
      const responseCount = await page.locator('[data-testid="ai-response"]').count()
      expect(responseCount).toBeGreaterThanOrEqual(3)
    })
  })

  test.describe('Accessibility Testing', () => {
    test('AI interfaces are keyboard accessible', async ({ page }) => {
      await page.click('[data-testid="ai-chat-tab"]')
      
      // Test keyboard navigation
      await page.keyboard.press('Tab') // Focus on input
      await page.keyboard.type('Keyboard accessibility test')
      await page.keyboard.press('Enter') // Send message
      
      await expect(page.locator('[data-testid="ai-response"]').last()).toBeVisible({ timeout: 10000 })
      
      // Test model selector keyboard navigation
      await page.keyboard.press('Tab') // Navigate to model selector
      await page.keyboard.press('ArrowDown') // Change model
      await page.keyboard.press('Enter') // Confirm selection
    })

    test('screen reader compatibility for AI features', async ({ page }) => {
      await page.click('[data-testid="ai-chat-tab"]')
      
      // Check ARIA labels
      const chatInput = page.locator('[data-testid="chat-input"]')
      expect(await chatInput.getAttribute('aria-label')).toContain('chat')
      
      const modelSelector = page.locator('[data-testid="model-selector"]')
      expect(await modelSelector.getAttribute('aria-label')).toContain('model')
      
      // Check for screen reader announcements
      await expect(page.locator('[aria-live="polite"]')).toBeVisible()
    })
  })
})
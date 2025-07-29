import { test, expect } from '@playwright/test'

/**
 * 6FB AI Agent System - Visual Regression Testing Suite
 * Tests design system components for visual consistency across browsers and updates
 * Part of the Triple Tool Approach: Visual testing with Playwright screenshots
 */

test.describe('Visual Regression Tests - Design System Components @visual', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure consistent viewport for visual tests
    await page.setViewportSize({ width: 1280, height: 720 })
    
    // Disable animations for consistent screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    })
  })

  test('button component variants', async ({ page }) => {
    await page.goto('/components-showcase')
    
    // Primary button
    await expect(page.locator('[data-testid="button-primary"]')).toHaveScreenshot('button-primary.png')
    
    // Secondary button
    await expect(page.locator('[data-testid="button-secondary"]')).toHaveScreenshot('button-secondary.png')
    
    // Outline button
    await expect(page.locator('[data-testid="button-outline"]')).toHaveScreenshot('button-outline.png')
    
    // Disabled button
    await expect(page.locator('[data-testid="button-disabled"]')).toHaveScreenshot('button-disabled.png')
    
    // Loading button
    await expect(page.locator('[data-testid="button-loading"]')).toHaveScreenshot('button-loading.png')
    
    // Button sizes
    await expect(page.locator('[data-testid="button-small"]')).toHaveScreenshot('button-small.png')
    await expect(page.locator('[data-testid="button-medium"]')).toHaveScreenshot('button-medium.png')
    await expect(page.locator('[data-testid="button-large"]')).toHaveScreenshot('button-large.png')
  })

  test('card component variants', async ({ page }) => {
    await page.goto('/components-showcase')
    
    // Basic card
    await expect(page.locator('[data-testid="card-basic"]')).toHaveScreenshot('card-basic.png')
    
    // Card with header
    await expect(page.locator('[data-testid="card-with-header"]')).toHaveScreenshot('card-with-header.png')
    
    // Card with footer
    await expect(page.locator('[data-testid="card-with-footer"]')).toHaveScreenshot('card-with-footer.png')
    
    // Card with image
    await expect(page.locator('[data-testid="card-with-image"]')).toHaveScreenshot('card-with-image.png')
    
    // Elevated card
    await expect(page.locator('[data-testid="card-elevated"]')).toHaveScreenshot('card-elevated.png')
    
    // Interactive card
    await page.hover('[data-testid="card-interactive"]')
    await expect(page.locator('[data-testid="card-interactive"]')).toHaveScreenshot('card-interactive-hover.png')
  })

  test('modal component states', async ({ page }) => {
    await page.goto('/components-showcase')
    
    // Open modal
    await page.click('[data-testid="open-modal-button"]')
    await expect(page.locator('[data-testid="modal"]')).toBeVisible()
    
    // Modal with overlay
    await expect(page).toHaveScreenshot('modal-open.png', { fullPage: true })
    
    // Modal with form
    await page.click('[data-testid="modal-form-tab"]')
    await expect(page.locator('[data-testid="modal"]')).toHaveScreenshot('modal-with-form.png')
    
    // Modal with error state
    await page.click('[data-testid="trigger-error"]')
    await expect(page.locator('[data-testid="modal"]')).toHaveScreenshot('modal-with-error.png')
    
    // Close modal
    await page.click('[data-testid="modal-close"]')
    await expect(page.locator('[data-testid="modal"]')).not.toBeVisible()
  })

  test('form input variants and states', async ({ page }) => {
    await page.goto('/components-showcase')
    
    // Text input - default
    await expect(page.locator('[data-testid="input-text-default"]')).toHaveScreenshot('input-text-default.png')
    
    // Text input - focused
    await page.focus('[data-testid="input-text-focus"]')
    await expect(page.locator('[data-testid="input-text-focus"]')).toHaveScreenshot('input-text-focused.png')
    
    // Text input - filled
    await page.fill('[data-testid="input-text-filled")', 'Sample text')
    await expect(page.locator('[data-testid="input-text-filled"]')).toHaveScreenshot('input-text-filled.png')
    
    // Text input - error state
    await expect(page.locator('[data-testid="input-text-error"]')).toHaveScreenshot('input-text-error.png')
    
    // Text input - disabled
    await expect(page.locator('[data-testid="input-text-disabled"]')).toHaveScreenshot('input-text-disabled.png')
    
    // Select dropdown
    await page.click('[data-testid="select-dropdown"]')
    await expect(page.locator('[data-testid="select-dropdown"]')).toHaveScreenshot('select-dropdown-open.png')
    
    // Checkbox states
    await expect(page.locator('[data-testid="checkbox-unchecked"]')).toHaveScreenshot('checkbox-unchecked.png')
    await expect(page.locator('[data-testid="checkbox-checked"]')).toHaveScreenshot('checkbox-checked.png')
    await expect(page.locator('[data-testid="checkbox-indeterminate"]')).toHaveScreenshot('checkbox-indeterminate.png')
    
    // Radio button states
    await expect(page.locator('[data-testid="radio-group"]')).toHaveScreenshot('radio-group.png')
  })

  test('navigation components', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Header navigation
    await expect(page.locator('[data-testid="header-nav"]')).toHaveScreenshot('header-navigation.png')
    
    // Sidebar navigation
    await expect(page.locator('[data-testid="sidebar-nav"]')).toHaveScreenshot('sidebar-navigation.png')
    
    // Active navigation state
    await page.click('[data-testid="nav-agents"]')
    await expect(page.locator('[data-testid="sidebar-nav"]')).toHaveScreenshot('sidebar-navigation-active.png')
    
    // User menu dropdown
    await page.click('[data-testid="user-menu-trigger"]')
    await expect(page.locator('[data-testid="user-menu-dropdown"]')).toHaveScreenshot('user-menu-dropdown.png')
    
    // Mobile navigation (hamburger menu)
    await page.setViewportSize({ width: 375, height: 667 })
    await page.click('[data-testid="mobile-menu-button"]')
    await expect(page.locator('[data-testid="mobile-nav-menu"]')).toHaveScreenshot('mobile-navigation.png')
  })

  test('table component variants', async ({ page }) => {
    await page.goto('/components-showcase')
    
    // Basic table
    await expect(page.locator('[data-testid="table-basic"]')).toHaveScreenshot('table-basic.png')
    
    // Table with sorting
    await page.click('[data-testid="table-sort-header"]')
    await expect(page.locator('[data-testid="table-sortable"]')).toHaveScreenshot('table-sorted.png')
    
    // Table with selection
    await page.click('[data-testid="table-select-all"]')
    await expect(page.locator('[data-testid="table-selectable"]')).toHaveScreenshot('table-with-selection.png')
    
    // Table with pagination
    await expect(page.locator('[data-testid="table-with-pagination"]')).toHaveScreenshot('table-with-pagination.png')
    
    // Empty table state
    await expect(page.locator('[data-testid="table-empty"]')).toHaveScreenshot('table-empty-state.png')
    
    // Loading table state
    await expect(page.locator('[data-testid="table-loading"]')).toHaveScreenshot('table-loading-state.png')
  })

  test('loading and skeleton states', async ({ page }) => {
    await page.goto('/components-showcase')
    
    // Loading spinner variants
    await expect(page.locator('[data-testid="spinner-small"]')).toHaveScreenshot('spinner-small.png')
    await expect(page.locator('[data-testid="spinner-medium"]')).toHaveScreenshot('spinner-medium.png')
    await expect(page.locator('[data-testid="spinner-large"]')).toHaveScreenshot('spinner-large.png')
    
    // Skeleton loaders
    await expect(page.locator('[data-testid="skeleton-text"]')).toHaveScreenshot('skeleton-text.png')
    await expect(page.locator('[data-testid="skeleton-card"]')).toHaveScreenshot('skeleton-card.png')
    await expect(page.locator('[data-testid="skeleton-list"]')).toHaveScreenshot('skeleton-list.png')
    await expect(page.locator('[data-testid="skeleton-avatar"]')).toHaveScreenshot('skeleton-avatar.png')
    
    // Progress bars
    await expect(page.locator('[data-testid="progress-bar-25"]')).toHaveScreenshot('progress-bar-25.png')
    await expect(page.locator('[data-testid="progress-bar-50"]')).toHaveScreenshot('progress-bar-50.png')
    await expect(page.locator('[data-testid="progress-bar-75"]')).toHaveScreenshot('progress-bar-75.png')
    await expect(page.locator('[data-testid="progress-bar-100"]')).toHaveScreenshot('progress-bar-100.png')
  })

  test('alert and notification components', async ({ page }) => {
    await page.goto('/components-showcase')
    
    // Alert variants
    await expect(page.locator('[data-testid="alert-info"]')).toHaveScreenshot('alert-info.png')
    await expect(page.locator('[data-testid="alert-success"]')).toHaveScreenshot('alert-success.png')
    await expect(page.locator('[data-testid="alert-warning"]')).toHaveScreenshot('alert-warning.png')
    await expect(page.locator('[data-testid="alert-error"]')).toHaveScreenshot('alert-error.png')
    
    // Toast notifications
    await page.click('[data-testid="show-toast-success"]')
    await expect(page.locator('[data-testid="toast-success"]')).toHaveScreenshot('toast-success.png')
    
    await page.click('[data-testid="show-toast-error"]')
    await expect(page.locator('[data-testid="toast-error"]')).toHaveScreenshot('toast-error.png')
    
    // Banner notifications
    await expect(page.locator('[data-testid="banner-promotion"]')).toHaveScreenshot('banner-promotion.png')
    await expect(page.locator('[data-testid="banner-maintenance"]')).toHaveScreenshot('banner-maintenance.png')
  })

  test('dashboard components', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Stats cards
    await expect(page.locator('[data-testid="stats-cards"]')).toHaveScreenshot('dashboard-stats-cards.png')
    
    // Chart components
    await expect(page.locator('[data-testid="revenue-chart"]')).toHaveScreenshot('dashboard-revenue-chart.png')
    await expect(page.locator('[data-testid="appointments-chart"]')).toHaveScreenshot('dashboard-appointments-chart.png')
    
    // Recent activity feed
    await expect(page.locator('[data-testid="activity-feed"]')).toHaveScreenshot('dashboard-activity-feed.png')
    
    // Quick actions panel
    await expect(page.locator('[data-testid="quick-actions"]')).toHaveScreenshot('dashboard-quick-actions.png')
  })

  test('AI agents interface components', async ({ page }) => {
    await page.goto('/dashboard/agents')
    
    // Agent cards grid
    await expect(page.locator('[data-testid="agents-grid"]')).toHaveScreenshot('agents-grid.png')
    
    // Individual agent card
    await expect(page.locator('[data-testid="agent-financial"]')).toHaveScreenshot('agent-card-financial.png')
    
    // Selected agent card
    await page.click('[data-testid="agent-financial"]')
    await expect(page.locator('[data-testid="agent-financial"]')).toHaveScreenshot('agent-card-selected.png')
    
    // Chat interface
    await expect(page.locator('[data-testid="chat-interface"]')).toHaveScreenshot('chat-interface-empty.png')
    
    // Chat with messages
    await page.fill('[data-testid="message-input"]', 'Test message')
    await page.click('[data-testid="send-button"]')
    await expect(page.locator('[data-testid="chat-interface"]')).toHaveScreenshot('chat-interface-with-messages.png')
    
    // Agent recommendations
    await expect(page.locator('[data-testid="agent-recommendations")')).toHaveScreenshot('agent-recommendations.png')
  })

  test('booking flow components', async ({ page }) => {
    await page.goto('/booking')
    
    // Step progress indicator
    await expect(page.locator('[data-testid="step-progress"]')).toHaveScreenshot('booking-step-progress.png')
    
    // Service selection grid
    await expect(page.locator('[data-testid="service-grid"]')).toHaveScreenshot('booking-service-grid.png')
    
    // Barber selection cards
    await expect(page.locator('[data-testid="barber-grid"]')).toHaveScreenshot('booking-barber-grid.png')
    
    // Selected service state
    await page.click('[data-testid="service-haircut-classic"]')
    await expect(page.locator('[data-testid="service-grid"]')).toHaveScreenshot('booking-service-selected.png')
    
    // Date picker component
    await page.click('[data-testid="barber-john-smith"]')
    await page.click('[data-testid="next-button"]')
    await expect(page.locator('[data-testid="date-picker"]')).toHaveScreenshot('booking-date-picker.png')
    
    // Time slots grid
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    
    await page.click(`[data-testid="date-${tomorrowStr}"]`)
    await expect(page.locator('[data-testid="time-slots"]')).toHaveScreenshot('booking-time-slots.png')
    
    // Booking summary
    await page.click('[data-testid="time-slot-10:00"]')
    await page.click('[data-testid="next-button"]')
    await expect(page.locator('[data-testid="booking-summary"]')).toHaveScreenshot('booking-summary.png')
  })

  test('integration components', async ({ page }) => {
    await page.goto('/dashboard/integrations')
    
    // Integration cards
    await expect(page.locator('[data-testid="integrations-grid"]')).toHaveScreenshot('integrations-grid.png')
    
    // Connected integration
    await expect(page.locator('[data-testid="integration-trafft-connected"]')).toHaveScreenshot('integration-connected.png')
    
    // Disconnected integration
    await expect(page.locator('[data-testid="integration-google-calendar"]')).toHaveScreenshot('integration-disconnected.png')
    
    // Integration setup modal
    await page.click('[data-testid="integration-square"]')
    await expect(page.locator('[data-testid="integration-setup-modal"]')).toHaveScreenshot('integration-setup-modal.png')
    
    // Sync status indicators
    await expect(page.locator('[data-testid="sync-status-success"]')).toHaveScreenshot('sync-status-success.png')
    await expect(page.locator('[data-testid="sync-status-pending"]')).toHaveScreenshot('sync-status-pending.png')
    await expect(page.locator('[data-testid="sync-status-error"]')).toHaveScreenshot('sync-status-error.png')
  })

  test('responsive design breakpoints', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Desktop view (1280px)
    await page.setViewportSize({ width: 1280, height: 720 })
    await expect(page).toHaveScreenshot('dashboard-desktop.png', { fullPage: true })
    
    // Tablet view (768px)
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page).toHaveScreenshot('dashboard-tablet.png', { fullPage: true })
    
    // Mobile view (375px)
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page).toHaveScreenshot('dashboard-mobile.png', { fullPage: true })
    
    // Large desktop view (1920px)
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page).toHaveScreenshot('dashboard-large-desktop.png', { fullPage: true })
  })

  test('dark mode theme components', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Enable dark mode
    await page.click('[data-testid="theme-toggle"]')
    
    // Wait for theme transition
    await page.waitForTimeout(500)
    
    // Dashboard in dark mode
    await expect(page).toHaveScreenshot('dashboard-dark-mode.png', { fullPage: true })
    
    // Components in dark mode
    await expect(page.locator('[data-testid="stats-cards"]')).toHaveScreenshot('stats-cards-dark.png')
    await expect(page.locator('[data-testid="header-nav"]')).toHaveScreenshot('header-nav-dark.png')
    await expect(page.locator('[data-testid="sidebar-nav"]')).toHaveScreenshot('sidebar-nav-dark.png')
    
    // Form components in dark mode
    await page.goto('/components-showcase')
    await expect(page.locator('[data-testid="form-components"]')).toHaveScreenshot('form-components-dark.png')
    
    // Modal in dark mode
    await page.click('[data-testid="open-modal-button"]')
    await expect(page.locator('[data-testid="modal"]')).toHaveScreenshot('modal-dark-mode.png')
  })

  test('high contrast mode accessibility', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Enable high contrast mode
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
    await page.addStyleTag({
      content: `
        @media (prefers-contrast: high) {
          :root {
            --contrast-ratio: 7:1;
          }
        }
      `
    })
    
    // Dashboard in high contrast
    await expect(page).toHaveScreenshot('dashboard-high-contrast.png', { fullPage: true })
    
    // Interactive elements in high contrast
    await expect(page.locator('[data-testid="primary-button"]')).toHaveScreenshot('button-high-contrast.png')
    await expect(page.locator('[data-testid="form-input"]')).toHaveScreenshot('input-high-contrast.png')
  })

  test('print styles', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Emulate print media
    await page.emulateMedia({ media: 'print' })
    
    // Dashboard print layout
    await expect(page).toHaveScreenshot('dashboard-print.png', { fullPage: true })
    
    // Booking confirmation print layout
    await page.goto('/booking/confirmation')
    await expect(page).toHaveScreenshot('booking-confirmation-print.png', { fullPage: true })
  })
})

test.describe('Visual Regression Tests - Cross-Browser Consistency', () => {
  test('components render consistently across browsers', async ({ page, browserName }) => {
    await page.goto('/components-showcase')
    
    // Take browser-specific screenshots
    await expect(page.locator('[data-testid="button-primary"]')).toHaveScreenshot(`button-primary-${browserName}.png`)
    await expect(page.locator('[data-testid="card-basic"]')).toHaveScreenshot(`card-basic-${browserName}.png`)
    await expect(page.locator('[data-testid="form-components"]')).toHaveScreenshot(`form-components-${browserName}.png`)
    
    // Complex layouts
    await page.goto('/dashboard')
    await expect(page).toHaveScreenshot(`dashboard-${browserName}.png`, { fullPage: true })
    
    await page.goto('/booking')
    await expect(page).toHaveScreenshot(`booking-${browserName}.png`, { fullPage: true })
  })
})

test.describe('Visual Regression Tests - Component States', () => {
  test('interactive component states', async ({ page }) => {
    await page.goto('/components-showcase')
    
    // Button hover states
    await page.hover('[data-testid="button-primary"]')
    await expect(page.locator('[data-testid="button-primary"]')).toHaveScreenshot('button-primary-hover.png')
    
    await page.hover('[data-testid="button-secondary"]')
    await expect(page.locator('[data-testid="button-secondary"]')).toHaveScreenshot('button-secondary-hover.png')
    
    // Card hover states
    await page.hover('[data-testid="card-interactive"]')
    await expect(page.locator('[data-testid="card-interactive"]')).toHaveScreenshot('card-interactive-hover.png')
    
    // Form focus states
    await page.focus('[data-testid="input-text"]')
    await expect(page.locator('[data-testid="input-text"]')).toHaveScreenshot('input-text-focus.png')
    
    // Link hover states
    await page.hover('[data-testid="nav-link"]')
    await expect(page.locator('[data-testid="nav-link"]')).toHaveScreenshot('nav-link-hover.png')
    
    // Dropdown open states
    await page.click('[data-testid="dropdown-trigger"]')
    await expect(page.locator('[data-testid="dropdown-menu"]')).toHaveScreenshot('dropdown-menu-open.png')
  })

  test('error and validation states', async ({ page }) => {
    await page.goto('/components-showcase')
    
    // Form validation errors
    await page.fill('[data-testid="email-input"]', 'invalid-email')
    await page.blur('[data-testid="email-input"]')
    await expect(page.locator('[data-testid="email-input-container"]')).toHaveScreenshot('email-input-error.png')
    
    // Required field errors
    await page.click('[data-testid="submit-button"]')
    await expect(page.locator('[data-testid="required-field-error"]')).toHaveScreenshot('required-field-error.png')
    
    // Network error states
    await expect(page.locator('[data-testid="network-error"]')).toHaveScreenshot('network-error-state.png')
    
    // Loading error states
    await expect(page.locator('[data-testid="loading-error"]')).toHaveScreenshot('loading-error-state.png')
  })

  test('empty and placeholder states', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Empty dashboard state
    await page.route('**/api/stats', route => route.fulfill({ json: { appointments: 0, revenue: 0 } }))
    await page.reload()
    await expect(page.locator('[data-testid="empty-dashboard"]')).toHaveScreenshot('empty-dashboard-state.png')
    
    // Empty agents list
    await page.goto('/dashboard/agents')
    await page.route('**/api/agents', route => route.fulfill({ json: [] }))
    await page.reload()
    await expect(page.locator('[data-testid="empty-agents"]')).toHaveScreenshot('empty-agents-state.png')
    
    // No search results
    await page.goto('/search')
    await page.fill('[data-testid="search-input"]', 'nonexistent')
    await page.click('[data-testid="search-button"]')
    await expect(page.locator('[data-testid="no-results"]')).toHaveScreenshot('no-search-results.png')
  })
})
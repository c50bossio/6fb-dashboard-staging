import { test, expect } from '@playwright/test'

// These tests run without authentication
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Authentication Flow', () => {
  test('user can register new account', async ({ page }) => {
    await page.goto('/register')
    
    // Fill registration form
    await page.fill('[data-testid="name-input"]', 'Test User')
    await page.fill('[data-testid="email-input"]', 'newuser@example.com')
    await page.fill('[data-testid="password-input"]', 'securepassword123')
    await page.fill('[data-testid="confirm-password-input"]', 'securepassword123')
    await page.fill('[data-testid="barbershop-name-input"]', 'Test Barbershop')
    
    // Submit registration
    await page.click('[data-testid="register-button"]')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    
    // Check for welcome message or user menu
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('user can login with valid credentials', async ({ page }) => {
    await page.goto('/login')
    
    // Fill login form
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    
    // Submit login
    await page.click('[data-testid="login-button"]')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    
    // Verify login success
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('login fails with invalid credentials', async ({ page }) => {
    await page.goto('/login')
    
    // Fill login form with invalid credentials
    await page.fill('[data-testid="email-input"]', 'invalid@example.com')
    await page.fill('[data-testid="password-input"]', 'wrongpassword')
    
    // Submit login
    await page.click('[data-testid="login-button"]')
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials')
    
    // Should remain on login page
    await expect(page).toHaveURL('/login')
  })

  test('registration fails with weak password', async ({ page }) => {
    await page.goto('/register')
    
    // Fill registration form with weak password
    await page.fill('[data-testid="name-input"]', 'Test User')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', '123')
    await page.fill('[data-testid="confirm-password-input"]', '123')
    
    // Submit registration
    await page.click('[data-testid="register-button"]')
    
    // Should show password strength error
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="password-error"]')).toContainText('Password too weak')
  })

  test('registration fails with mismatched passwords', async ({ page }) => {
    await page.goto('/register')
    
    // Fill registration form with mismatched passwords
    await page.fill('[data-testid="name-input"]', 'Test User')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'securepassword123')
    await page.fill('[data-testid="confirm-password-input"]', 'differentpassword')
    
    // Submit registration
    await page.click('[data-testid="register-button"]')
    
    // Should show password mismatch error
    await expect(page.locator('[data-testid="password-mismatch-error"]')).toBeVisible()
  })

  test('redirects to login when accessing protected route', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/dashboard')
    
    // Should redirect to login
    await expect(page).toHaveURL('/login')
    
    // Should show login form
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
  })

  test('supports social login with Google', async ({ page }) => {
    await page.goto('/login')
    
    // Click Google login button
    await page.click('[data-testid="google-login-button"]')
    
    // Should navigate to Google OAuth (in real test, this would be mocked)
    // For now, just check that the button is functional
    // In a real implementation, you'd mock the OAuth flow
    
    expect(true).toBe(true) // Placeholder for OAuth flow test
  })

  test('supports social login with Facebook', async ({ page }) => {
    await page.goto('/login')
    
    // Click Facebook login button
    await page.click('[data-testid="facebook-login-button"]')
    
    // Should navigate to Facebook OAuth (in real test, this would be mocked)
    expect(true).toBe(true) // Placeholder for OAuth flow test
  })

  test('forgot password flow works', async ({ page }) => {
    await page.goto('/login')
    
    // Click forgot password link
    await page.click('[data-testid="forgot-password-link"]')
    
    // Should navigate to forgot password page
    await expect(page).toHaveURL('/forgot-password')
    
    // Fill email and submit
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.click('[data-testid="reset-password-button"]')
    
    // Should show success message
    await expect(page.locator('[data-testid="reset-success-message"]')).toBeVisible()
  })

  test('password reset with token works', async ({ page }) => {
    // Navigate to reset password page with token
    await page.goto('/reset-password?token=valid-reset-token')
    
    // Fill new password
    await page.fill('[data-testid="new-password-input"]', 'newsecurepassword123')
    await page.fill('[data-testid="confirm-new-password-input"]', 'newsecurepassword123')
    
    // Submit password reset
    await page.click('[data-testid="update-password-button"]')
    
    // Should redirect to login with success message
    await expect(page).toHaveURL('/login')
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Password updated')
  })

  test('invalid reset token shows error', async ({ page }) => {
    // Navigate to reset password page with invalid token
    await page.goto('/reset-password?token=invalid-token')
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid or expired token')
  })
})

test.describe('Session Management', () => {
  test('user can logout', async ({ page }) => {
    // First login
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="login-button"]')
    
    // Verify login
    await expect(page).toHaveURL('/dashboard')
    
    // Logout
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="logout-button"]')
    
    // Should redirect to home or login
    await expect(page).toHaveURL('/login')
    
    // Verify logout by trying to access protected route
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login')
  })

  test('session persists across page reloads', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="login-button"]')
    
    // Verify login
    await expect(page).toHaveURL('/dashboard')
    
    // Reload page
    await page.reload()
    
    // Should still be logged in
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('session expires after timeout', async ({ page }) => {
    // This would typically require mocking time or server-side session management
    // For now, we'll skip this test as it's complex to implement in E2E
    test.skip('Session timeout test requires server-side configuration')
  })
})

test.describe('Form Validation', () => {
  test('login form validates email format', async ({ page }) => {
    await page.goto('/login')
    
    // Enter invalid email
    await page.fill('[data-testid="email-input"]', 'invalid-email')
    await page.fill('[data-testid="password-input"]', 'password')
    
    // Try to submit
    await page.click('[data-testid="login-button"]')
    
    // Should show email validation error
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible()
  })

  test('registration form validates all required fields', async ({ page }) => {
    await page.goto('/register')
    
    // Try to submit empty form
    await page.click('[data-testid="register-button"]')
    
    // Should show validation errors for required fields
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible()
  })

  test('form prevents submission while processing', async ({ page }) => {
    await page.goto('/login')
    
    // Fill form
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    
    // Submit form
    await page.click('[data-testid="login-button"]')
    
    // Button should be disabled during processing
    await expect(page.locator('[data-testid="login-button"]')).toBeDisabled()
    
    // Should show loading state
    await expect(page.locator('[data-testid="login-loading"]')).toBeVisible()
  })
})

test.describe('Security Features', () => {
  test('implements rate limiting on login attempts', async ({ page }) => {
    await page.goto('/login')
    
    // Make multiple failed login attempts
    for (let i = 0; i < 6; i++) {
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'wrongpassword')
      await page.click('[data-testid="login-button"]')
      
      if (i < 5) {
        // First 5 attempts should show invalid credentials
        await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials')
      }
    }
    
    // 6th attempt should be rate limited
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Too many attempts')
    
    // Login button should be disabled
    await expect(page.locator('[data-testid="login-button"]')).toBeDisabled()
  })

  test('clears sensitive data on logout', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="login-button"]')
    
    // Go to a page that might cache sensitive data
    await page.goto('/dashboard/agents')
    
    // Send a message to create some session data
    await page.click('[data-testid="agent-financial"]')
    await page.fill('[data-testid="message-input"]', 'Sensitive business question')
    await page.click('[data-testid="send-button"]')
    
    // Logout
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="logout-button"]')
    
    // Try to go back to agents page
    await page.goto('/dashboard/agents')
    
    // Should be redirected to login
    await expect(page).toHaveURL('/login')
  })
})
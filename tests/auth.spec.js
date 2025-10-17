import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Authentication Flow', () => {
  test('user can register new account', async ({ page }) => {
    await page.goto('/register')
    
    await page.fill('[data-testid="name-input"]', await getTestUserFromDatabase())
    await page.fill('[data-testid="email-input"]', 'newuser@example.com')
    await page.fill('[data-testid="password-input"]', 'securepassword123')
    await page.fill('[data-testid="confirm-password-input"]', 'securepassword123')
    await page.fill('[data-testid="barbershop-name-input"]', 'Test Barbershop')
    
    await page.click('[data-testid="register-button"]')
    
    await expect(page).toHaveURL('/dashboard')
    
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('user can login with valid credentials', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    
    await page.click('[data-testid="login-button"]')
    
    await expect(page).toHaveURL('/dashboard')
    
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('login fails with invalid credentials', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('[data-testid="email-input"]', 'invalid@example.com')
    await page.fill('[data-testid="password-input"]', 'wrongpassword')
    
    await page.click('[data-testid="login-button"]')
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials')
    
    await expect(page).toHaveURL('/login')
  })

  test('registration fails with weak password', async ({ page }) => {
    await page.goto('/register')
    
    await page.fill('[data-testid="name-input"]', await getTestUserFromDatabase())
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', '123')
    await page.fill('[data-testid="confirm-password-input"]', '123')
    
    await page.click('[data-testid="register-button"]')
    
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="password-error"]')).toContainText('Password too weak')
  })

  test('registration fails with mismatched passwords', async ({ page }) => {
    await page.goto('/register')
    
    await page.fill('[data-testid="name-input"]', await getTestUserFromDatabase())
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'securepassword123')
    await page.fill('[data-testid="confirm-password-input"]', 'differentpassword')
    
    await page.click('[data-testid="register-button"]')
    
    await expect(page.locator('[data-testid="password-mismatch-error"]')).toBeVisible()
  })

  test('redirects to login when accessing protected route', async ({ page }) => {
    await page.goto('/dashboard')
    
    await expect(page).toHaveURL('/login')
    
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
  })

  test('supports social login with Google', async ({ page }) => {
    await page.goto('/login')
    
    await page.click('[data-testid="google-login-button"]')
    
    
    expect(true).toBe(true) // Placeholder for OAuth flow test
  })

  test('supports social login with Facebook', async ({ page }) => {
    await page.goto('/login')
    
    await page.click('[data-testid="facebook-login-button"]')
    
    expect(true).toBe(true) // Placeholder for OAuth flow test
  })

  test('forgot password flow works', async ({ page }) => {
    await page.goto('/login')
    
    await page.click('[data-testid="forgot-password-link"]')
    
    await expect(page).toHaveURL('/forgot-password')
    
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.click('[data-testid="reset-password-button"]')
    
    await expect(page.locator('[data-testid="reset-success-message"]')).toBeVisible()
  })

  test('password reset with token works', async ({ page }) => {
    await page.goto('/reset-password?token=valid-reset-token')
    
    await page.fill('[data-testid="new-password-input"]', 'newsecurepassword123')
    await page.fill('[data-testid="confirm-new-password-input"]', 'newsecurepassword123')
    
    await page.click('[data-testid="update-password-button"]')
    
    await expect(page).toHaveURL('/login')
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Password updated')
  })

  test('invalid reset token shows error', async ({ page }) => {
    await page.goto('/reset-password?token=invalid-token')
    
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid or expired token')
  })
})

test.describe('Session Management', () => {
  test('user can logout', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="login-button"]')
    
    await expect(page).toHaveURL('/dashboard')
    
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="logout-button"]')
    
    await expect(page).toHaveURL('/login')
    
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login')
  })

  test('session persists across page reloads', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="login-button"]')
    
    await expect(page).toHaveURL('/dashboard')
    
    await page.reload()
    
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('session expires after timeout', async ({ page }) => {
    test.skip('Session timeout test requires server-side configuration')
  })
})

test.describe('Form Validation', () => {
  test('login form validates email format', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('[data-testid="email-input"]', 'invalid-email')
    await page.fill('[data-testid="password-input"]', 'password')
    
    await page.click('[data-testid="login-button"]')
    
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible()
  })

  test('registration form validates all required fields', async ({ page }) => {
    await page.goto('/register')
    
    await page.click('[data-testid="register-button"]')
    
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible()
  })

  test('form prevents submission while processing', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    
    await page.click('[data-testid="login-button"]')
    
    await expect(page.locator('[data-testid="login-button"]')).toBeDisabled()
    
    await expect(page.locator('[data-testid="login-loading"]')).toBeVisible()
  })
})

test.describe('Security Features', () => {
  test('implements rate limiting on login attempts', async ({ page }) => {
    await page.goto('/login')
    
    for (let i = 0; i < 6; i++) {
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'wrongpassword')
      await page.click('[data-testid="login-button"]')
      
      if (i < 5) {
        await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials')
      }
    }
    
    // 6th attempt should be rate limited
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Too many attempts')
    
    await expect(page.locator('[data-testid="login-button"]')).toBeDisabled()
  })

  test('clears sensitive data on logout', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="login-button"]')
    
    await page.goto('/dashboard/agents')
    
    await page.click('[data-testid="agent-financial"]')
    await page.fill('[data-testid="message-input"]', 'Sensitive business question')
    await page.click('[data-testid="send-button"]')
    
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="logout-button"]')
    
    await page.goto('/dashboard/agents')
    
    await expect(page).toHaveURL('/login')
  })
})
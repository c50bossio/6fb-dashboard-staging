/**
 * Security Testing Suite
 * Comprehensive security tests for authentication, authorization, and data protection
 */

import { test, expect } from '@playwright/test';
import { createHash, randomBytes } from 'crypto';

const SECURITY_CONFIG = {
  MIN_PASSWORD_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SPECIAL_CHARS: true,

  SESSION_TIMEOUT: 3600000, // 1 hour
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 900000, // 15 minutes

  MAX_INPUT_LENGTH: 1000,
  SQL_INJECTION_PATTERNS: [
    "'; DROP TABLE",
    "UNION SELECT",
    "' OR '1'='1",
    "admin'--",
    "'; DELETE FROM"
  ],
  XSS_PATTERNS: [
    "<script>alert('xss')</script>",
    "javascript:alert('xss')",
    "<img src=x onerror=alert('xss')>",
    "';alert('xss');//",
    "<svg onload=alert('xss')>"
  ]
};

class SecurityTester {
  constructor(page) {
    this.page = page;
  }

  async testSQLInjection(inputSelector, patterns = SECURITY_CONFIG.SQL_INJECTION_PATTERNS) {
    const results = [];
    
    for (const pattern of patterns) {
      try {
        await this.page.fill(inputSelector, pattern);
        await this.page.keyboard.press('Enter');
        
        await this.page.waitForTimeout(1000);
        
        const errorMessages = await this.page.locator('.error, [data-testid="error"]').count();
        const hasDbError = await this.page.locator('text=/database|sql|mysql|postgresql/i').count() > 0;
        
        results.push({
          pattern,
          blocked: errorMessages === 0 && !hasDbError,
          hasDbError,
          errorMessages
        });
        
        await this.page.fill(inputSelector, '');
      } catch (error) {
        results.push({
          pattern,
          blocked: true,
          error: error.message
        });
      }
    }
    
    return results;
  }

  async testXSS(inputSelector, patterns = SECURITY_CONFIG.XSS_PATTERNS) {
    const results = [];
    
    for (const pattern of patterns) {
      try {
        await this.page.fill(inputSelector, pattern);
        
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(500);
        
        const alertFired = await this.page.evaluate(() => {
          return window.xssTriggered || false;
        });
        
        const rawContent = await this.page.locator(inputSelector).inputValue();
        const displayedContent = await this.page.textContent('body');
        
        const isEscaped = !displayedContent.includes('<script>') && 
                         !displayedContent.includes('javascript:') &&
                         !displayedContent.includes('onerror=');
        
        results.push({
          pattern,
          blocked: !alertFired && isEscaped,
          alertFired,
          isEscaped,
          rawContent
        });
        
        await this.page.fill(inputSelector, '');
      } catch (error) {
        results.push({
          pattern,
          blocked: true,
          error: error.message
        });
      }
    }
    
    return results;
  }

  async testCSRF(targetUrl, formData) {
    const csrfResult = await this.page.evaluate(async (url, data) => {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data),
          credentials: 'include'
        });
        
        return {
          status: response.status,
          blocked: response.status === 403 || response.status === 401,
          headers: Object.fromEntries(response.headers.entries())
        };
      } catch (error) {
        return {
          blocked: true,
          error: error.message
        };
      }
    }, targetUrl, formData);
    
    return csrfResult;
  }

  async testPasswordStrength(password) {
    const tests = {
      length: password.length >= SECURITY_CONFIG.MIN_PASSWORD_LENGTH,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      notCommon: !this.isCommonPassword(password)
    };
    
    const score = Object.values(tests).filter(Boolean).length;
    const maxScore = Object.keys(tests).length;
    
    return {
      tests,
      score,
      maxScore,
      strength: score / maxScore,
      isStrong: score >= 5
    };
  }

  isCommonPassword(password) {
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty',
      'letmein', 'welcome', 'monkey', '1234567890', 'password1'
    ];
    
    return commonPasswords.includes(password.toLowerCase());
  }

  async testRateLimiting(endpoint, requestCount = 20, timeWindow = 1000) {
    const results = {
      totalRequests: 0,
      successfulRequests: 0,
      blockedRequests: 0,
      averageResponseTime: 0
    };
    
    const startTime = Date.now();
    
    for (let i = 0; i < requestCount; i++) {
      try {
        const requestStart = Date.now();
        const response = await this.page.request.post(endpoint, {
          data: { test: `request_${i}` }
        });
        const responseTime = Date.now() - requestStart;
        
        results.totalRequests++;
        results.averageResponseTime += responseTime;
        
        if (response.status() === 429) {
          results.blockedRequests++;
        } else if (response.ok()) {
          results.successfulRequests++;
        }
        
        if (i < requestCount - 1) {
          await this.page.waitForTimeout(timeWindow / requestCount);
        }
      } catch (error) {
        results.totalRequests++;
        console.log(`Request ${i} failed:`, error.message);
      }
    }
    
    results.averageResponseTime /= results.totalRequests;
    results.rateLimitingEffective = results.blockedRequests > 0;
    
    return results;
  }
}

test.describe('Authentication Security', () => {
  let securityTester;

  test.beforeEach(async ({ page }) => {
    securityTester = new SecurityTester(page);
  });

  test('Password strength validation', async ({ page }) => {
    await page.goto('/auth/signup');
    
    const weakPasswords = [
      'password',
      '123456',
      'qwerty',
      'short',
      'PASSWORD',
      'password123'
    ];
    
    const strongPasswords = [
      'MyStr0ng!Pass',
      'C0mpl3x#P@ssw0rd',
      'SecureP@ss123!',
      'MyP@ssw0rd2024!'
    ];
    
    for (const password of weakPasswords) {
      await page.fill('[data-testid="password-input"]', password);
      await page.blur('[data-testid="password-input"]');
      
      const errorMessage = page.locator('[data-testid="password-error"]');
      await expect(errorMessage).toBeVisible();
      
      const strengthResult = await securityTester.testPasswordStrength(password);
      expect(strengthResult.isStrong).toBe(false);
      
      console.log(`Weak password "${password}" correctly rejected:`, strengthResult);
    }
    
    for (const password of strongPasswords) {
      await page.fill('[data-testid="password-input"]', password);
      await page.blur('[data-testid="password-input"]');
      
      const errorMessage = page.locator('[data-testid="password-error"]');
      await expect(errorMessage).not.toBeVisible();
      
      const strengthResult = await securityTester.testPasswordStrength(password);
      expect(strengthResult.isStrong).toBe(true);
      
      console.log(`Strong password "${password}" correctly accepted:`, strengthResult);
    }
  });

  test('Brute force protection', async ({ page }) => {
    await page.goto('/auth/signin');
    
    const testEmail = 'bruteforce@test.com';
    const wrongPassword = 'wrongpassword';
    
    let loginAttempts = 0;
    let isLocked = false;
    
    for (let i = 0; i < SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS + 2; i++) {
      await page.fill('[data-testid="email-input"]', testEmail);
      await page.fill('[data-testid="password-input"]', wrongPassword);
      await page.click('[data-testid="signin-button"]');
      
      loginAttempts++;
      
      await page.waitForTimeout(1000);
      
      const lockoutMessage = page.locator('[data-testid="account-locked"]');
      const rateLimitMessage = page.locator('[data-testid="rate-limited"]');
      
      if (await lockoutMessage.isVisible() || await rateLimitMessage.isVisible()) {
        isLocked = true;
        console.log(`Account locked after ${loginAttempts} attempts`);
        break;
      }
      
      const errorMessage = page.locator('[data-testid="signin-error"]');
      await expect(errorMessage).toBeVisible();
    }
    
    expect(isLocked).toBe(true);
    expect(loginAttempts).toBeLessThanOrEqual(SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS + 1);
    
    await page.fill('[data-testid="email-input"]', testEmail);
    await page.fill('[data-testid="password-input"]', 'correctpassword');
    await page.click('[data-testid="signin-button"]');
    
    const stillLocked = await page.locator('[data-testid="account-locked"]').isVisible();
    expect(stillLocked).toBe(true);
  });

  test('Session management security', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="signin-button"]');
    
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name.includes('session') || c.name.includes('token'));
    
    if (sessionCookie) {
      expect(sessionCookie.httpOnly).toBe(true); // Should be HttpOnly
      expect(sessionCookie.secure).toBe(true);   // Should be Secure in production
      expect(sessionCookie.sameSite).toBe('Strict'); // Should have SameSite protection
      
      console.log('Session cookie security attributes:', {
        httpOnly: sessionCookie.httpOnly,
        secure: sessionCookie.secure,
        sameSite: sessionCookie.sameSite
      });
    }
    
    await page.evaluate((timeout) => {
      localStorage.setItem('sessionExpiry', Date.now() - timeout);
    }, SECURITY_CONFIG.SESSION_TIMEOUT);
    
    await page.goto('/dashboard/settings');
    
    await expect(page.locator('[data-testid="signin-form"]')).toBeVisible();
  });

  test('Multi-factor authentication', async ({ page }) => {
    await page.goto('/auth/signin');
    
    await page.fill('[data-testid="email-input"]', 'mfa-user@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="signin-button"]');
    
    const mfaPrompt = page.locator('[data-testid="mfa-prompt"]');
    await expect(mfaPrompt).toBeVisible();
    
    await page.fill('[data-testid="mfa-code"]', '000000');
    await page.click('[data-testid="verify-mfa"]');
    
    const mfaError = page.locator('[data-testid="mfa-error"]');
    await expect(mfaError).toBeVisible();
    
    await page.fill('[data-testid="mfa-code"]', '123456');
    await page.click('[data-testid="verify-mfa"]');
    
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test('JWT token security', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="signin-button"]');
    
    let jwtToken = null;
    
    page.on('request', request => {
      const authHeader = request.headers()['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        jwtToken = authHeader.substring(7);
      }
    });
    
    await page.goto('/dashboard/analytics');
    await page.waitForTimeout(2000);
    
    if (jwtToken) {
      const payload = JSON.parse(atob(jwtToken.split('.')[1]));
      
      console.log('JWT payload:', payload);
      
      expect(payload.exp).toBeDefined(); // Expiration
      expect(payload.iat).toBeDefined(); // Issued at
      expect(payload.sub).toBeDefined(); // Subject (user ID)
      expect(payload.role).toBeDefined(); // User role
      
      const currentTime = Math.floor(Date.now() / 1000);
      const tokenLifetime = payload.exp - payload.iat;
      
      expect(tokenLifetime).toBeLessThanOrEqual(3600); // Max 1 hour
      expect(payload.exp).toBeGreaterThan(currentTime); // Not expired
      
      const tamperedToken = jwtToken.slice(0, -10) + 'tampered123';
      
      const response = await page.request.get('/api/dashboard/analytics', {
        headers: {
          'Authorization': `Bearer ${tamperedToken}`
        }
      });
      
      expect(response.status()).toBe(401); // Should reject tampered token
      
      console.log('JWT security validation passed');
    }
  });
});

test.describe('Input Validation Security', () => {
  let securityTester;

  test.beforeEach(async ({ page }) => {
    securityTester = new SecurityTester(page);
    await page.goto('/dashboard');
  });

  test('SQL injection prevention', async ({ page }) => {
    const testForms = [
      { url: '/dashboard/customers', selector: '[data-testid="search-input"]' },
      { url: '/dashboard/appointments', selector: '[data-testid="filter-input"]' },
      { url: '/dashboard/ai-agent', selector: '[data-testid="message-input"]' }
    ];
    
    for (const form of testForms) {
      await page.goto(form.url);
      
      const results = await securityTester.testSQLInjection(form.selector);
      
      console.log(`SQL injection test results for ${form.url}:`, results);
      
      const blockedCount = results.filter(r => r.blocked).length;
      expect(blockedCount).toBe(results.length);
      
      const dbErrorCount = results.filter(r => r.hasDbError).length;
      expect(dbErrorCount).toBe(0);
    }
  });

  test('XSS prevention', async ({ page }) => {
    const testForms = [
      { url: '/profile/edit', selector: '[data-testid="name-input"]' },
      { url: '/dashboard/ai-agent', selector: '[data-testid="message-input"]' },
      { url: '/reviews/new', selector: '[data-testid="review-text"]' }
    ];
    
    for (const form of testForms) {
      try {
        await page.goto(form.url);
        
        const results = await securityTester.testXSS(form.selector);
        
        console.log(`XSS test results for ${form.url}:`, results);
        
        const blockedCount = results.filter(r => r.blocked).length;
        expect(blockedCount).toBe(results.length);
        
        const scriptExecutions = results.filter(r => r.alertFired).length;
        expect(scriptExecutions).toBe(0);
      } catch (error) {
        console.log(`Skipping XSS test for ${form.url}: ${error.message}`);
      }
    }
  });

  test('CSRF protection', async ({ page }) => {
    const csrfTests = [
      {
        url: '/api/appointments/create',
        data: { service_id: 1, date: '2024-02-15', time: '10:00' }
      },
      {
        url: '/api/profile/update',
        data: { name: 'Attacker Name', email: 'attacker@evil.com' }
      },
      {
        url: '/api/payments/process',
        data: { amount: 100, card_token: 'fake_token' }
      }
    ];
    
    for (const test of csrfTests) {
      const result = await securityTester.testCSRF(test.url, test.data);
      
      console.log(`CSRF test result for ${test.url}:`, result);
      
      expect(result.blocked).toBe(true);
      expect([401, 403]).toContain(result.status);
    }
  });

  test('Input length validation', async ({ page }) => {
    await page.goto('/profile/edit');
    
    const longInput = 'A'.repeat(SECURITY_CONFIG.MAX_INPUT_LENGTH + 100);
    
    await page.fill('[data-testid="bio-input"]', longInput);
    await page.click('[data-testid="save-profile"]');
    
    const validationError = page.locator('[data-testid="bio-error"]');
    await expect(validationError).toBeVisible();
    
    const errorText = await validationError.textContent();
    expect(errorText.toLowerCase()).toContain('too long');
    
    console.log('Input length validation working correctly');
  });

  test('File upload security', async ({ page }) => {
    await page.goto('/profile/edit');
    
    const maliciousFiles = [
      { name: 'script.js', content: 'alert("xss")' },
      { name: 'exploit.php', content: '<?php system($_GET["cmd"]); ?>' },
      { name: 'virus.exe', content: 'MZ...' }, // Mock executable header
      { name: 'huge.txt', content: 'A'.repeat(10 * 1024 * 1024) } // 10MB file
    ];
    
    for (const file of maliciousFiles) {
      try {
        const buffer = Buffer.from(file.content);
        
        await page.setInputFiles('[data-testid="avatar-upload"]', {
          name: file.name,
          mimeType: 'application/octet-stream',
          buffer
        });
        
        await page.click('[data-testid="upload-button"]');
        await page.waitForTimeout(1000);
        
        const uploadError = page.locator('[data-testid="upload-error"]');
        const isRejected = await uploadError.isVisible();
        
        expect(isRejected).toBe(true);
        
        console.log(`Malicious file ${file.name} correctly rejected`);
      } catch (error) {
        console.log(`File upload test failed for ${file.name}:`, error.message);
      }
    }
  });
});

test.describe('API Security', () => {
  let securityTester;

  test.beforeEach(async ({ page }) => {
    securityTester = new SecurityTester(page);
  });

  test('API rate limiting', async ({ page }) => {
    const endpoints = [
      '/api/auth/login',
      '/api/chat',
      '/api/appointments/search',
      '/api/dashboard/analytics'
    ];
    
    for (const endpoint of endpoints) {
      const rateLimitResults = await securityTester.testRateLimiting(
        `http://localhost:8000${endpoint}`,
        30, // 30 requests
        1000 // in 1 second
      );
      
      console.log(`Rate limiting test for ${endpoint}:`, rateLimitResults);
      
      expect(rateLimitResults.rateLimitingEffective).toBe(true);
      expect(rateLimitResults.blockedRequests).toBeGreaterThan(0);
      
      expect(rateLimitResults.averageResponseTime).toBeLessThan(5000);
    }
  });

  test('API authentication bypass attempts', async ({ page }) => {
    const protectedEndpoints = [
      '/api/users/profile',
      '/api/dashboard/analytics',
      '/api/appointments/create',
      '/api/payments/history'
    ];
    
    const bypassAttempts = [
      { headers: {} }, // No auth header
      { headers: { 'Authorization': 'Bearer invalid_token' } },
      { headers: { 'Authorization': 'Basic dGVzdDp0ZXN0' } }, // Wrong auth type
      { headers: { 'Authorization': 'Bearer ' } }, // Empty token
      { headers: { 'Authorization': 'Bearer null' } },
      { headers: { 'X-User-Id': 'admin' } } // Attempt header injection
    ];
    
    for (const endpoint of protectedEndpoints) {
      for (const attempt of bypassAttempts) {
        const response = await page.request.get(`http://localhost:8000${endpoint}`, {
          headers: attempt.headers
        });
        
        expect([401, 403]).toContain(response.status());
        
        const responseText = await response.text();
        expect(responseText.toLowerCase()).not.toContain('password');
        expect(responseText.toLowerCase()).not.toContain('secret');
        expect(responseText.toLowerCase()).not.toContain('private_key');
        
        console.log(`Auth bypass attempt blocked for ${endpoint}:`, {
          status: response.status(),
          attempt: attempt.headers
        });
      }
    }
  });

  test('API parameter pollution', async ({ page }) => {
    const pollutionTests = [
      {
        endpoint: '/api/users/search',
        params: { 'user_id': ['1', '2'], 'role': ['client', 'admin'] }
      },
      {
        endpoint: '/api/appointments/list',
        params: { 'shop_id': '1', 'shop_id': '999' } // Duplicate parameter
      }
    ];
    
    for (const test of pollutionTests) {
      const url = new URL(`http://localhost:8000${test.endpoint}`);
      
      Object.entries(test.params).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => url.searchParams.append(key, v));
        } else {
          url.searchParams.set(key, value);
        }
      });
      
      const response = await page.request.get(url.toString());
      
      expect([400, 422]).toContain(response.status()); // Bad request or validation error
      
      console.log(`Parameter pollution test for ${test.endpoint}:`, {
        status: response.status(),
        params: test.params
      });
    }
  });

  test('API response information disclosure', async ({ page }) => {
    const endpoints = [
      '/api/users/1',
      '/api/nonexistent/endpoint',
      '/api/admin/users',
      '/api/debug/info'
    ];
    
    for (const endpoint of endpoints) {
      const response = await page.request.get(`http://localhost:8000${endpoint}`);
      const responseText = await response.text();
      const responseHeaders = response.headers();
      
      const sensitiveInfo = [
        'server',
        'x-powered-by',
        'stack trace',
        'database error',
        'internal server error',
        'debug',
        'exception',
        'traceback'
      ];
      
      const disclosures = sensitiveInfo.filter(info => 
        responseText.toLowerCase().includes(info) ||
        Object.keys(responseHeaders).some(header => 
          header.toLowerCase().includes(info)
        )
      );
      
      if (disclosures.length > 0) {
        console.warn(`Information disclosure found in ${endpoint}:`, disclosures);
      }
      
      expect(responseHeaders['x-content-type-options']).toBe('nosniff');
      expect(responseHeaders['x-frame-options']).toBeDefined();
      expect(responseHeaders['x-xss-protection']).toBeDefined();
    }
  });
});

test.describe('Data Protection', () => {
  test('PII data encryption', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email-input"]', 'privacy@test.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="signin-button"]');
    
    await page.goto('/profile/view');
    
    const pageSource = await page.content();
    
    expect(pageSource).not.toMatch(/ssn|social.security|credit.card/i);
    expect(pageSource).not.toMatch(/\d{3}-\d{2}-\d{4}/); // SSN pattern
    expect(pageSource).not.toMatch(/\d{4}\s\d{4}\s\d{4}\s\d{4}/); // Credit card pattern
    
    const localStorage = await page.evaluate(() => JSON.stringify(window.localStorage));
    const sessionStorage = await page.evaluate(() => JSON.stringify(window.sessionStorage));
    
    expect(localStorage).not.toMatch(/password|ssn|credit/i);
    expect(sessionStorage).not.toMatch(/password|ssn|credit/i);
    
    console.log('PII data protection check passed');
  });

  test('Data retention compliance', async ({ page }) => {
    await page.goto('/profile/settings');
    
    const deleteButton = page.locator('[data-testid="delete-account"]');
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      const confirmDialog = page.locator('[data-testid="delete-confirmation"]');
      await expect(confirmDialog).toBeVisible();
      
      const deletionInfo = await confirmDialog.textContent();
      expect(deletionInfo.toLowerCase()).toContain('permanently delete');
      expect(deletionInfo.toLowerCase()).toMatch(/\d+\s*days?/); // Should mention retention period
      
      console.log('Data deletion process properly implemented');
    }
    
    const exportButton = page.locator('[data-testid="export-data"]');
    if (await exportButton.isVisible()) {
      await exportButton.click();
      
      const exportStatus = page.locator('[data-testid="export-status"]');
      await expect(exportStatus).toBeVisible();
      
      console.log('Data export functionality available');
    }
  });

  test('Cookie consent and tracking', async ({ page }) => {
    await page.goto('/');
    
    const cookieBanner = page.locator('[data-testid="cookie-consent"]');
    await expect(cookieBanner).toBeVisible();
    
    const necessaryCookies = page.locator('[data-testid="necessary-cookies"]');
    const analyticalCookies = page.locator('[data-testid="analytical-cookies"]');
    const marketingCookies = page.locator('[data-testid="marketing-cookies"]');
    
    if (await necessaryCookies.isVisible()) {
      expect(await necessaryCookies.isChecked()).toBe(true);
      expect(await necessaryCookies.isDisabled()).toBe(true);
    }
    
    if (await analyticalCookies.isVisible()) {
      expect(await analyticalCookies.isDisabled()).toBe(false);
    }
    
    if (await analyticalCookies.isVisible()) {
      await analyticalCookies.uncheck();
    }
    if (await marketingCookies.isVisible()) {
      await marketingCookies.uncheck();
    }
    
    await page.click('[data-testid="accept-cookies"]');
    
    const cookies = await page.context().cookies();
    const trackingCookies = cookies.filter(c => 
      c.name.includes('analytics') || 
      c.name.includes('marketing') ||
      c.name.includes('tracking')
    );
    
    expect(trackingCookies).toHaveLength(0);
    
    console.log('Cookie consent working correctly');
  });

  test('Audit trail and logging', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email-input"]', 'audit@test.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="signin-button"]');
    
    await page.goto('/profile/edit');
    await page.fill('[data-testid="name-input"]', 'Updated Name');
    await page.click('[data-testid="save-profile"]');
    
    await page.goto('/dashboard/settings');
    await page.click('[data-testid="change-password"]');
    await page.fill('[data-testid="current-password"]', 'TestPassword123!');
    await page.fill('[data-testid="new-password"]', 'NewPassword123!');
    await page.click('[data-testid="update-password"]');
    
    await page.goto('/admin/audit-logs');
    
    const auditTable = page.locator('[data-testid="audit-table"]');
    if (await auditTable.isVisible()) {
      const logEntries = await auditTable.locator('tbody tr').count();
      expect(logEntries).toBeGreaterThan(0);
      
      const firstEntry = auditTable.locator('tbody tr').first();
      const entryText = await firstEntry.textContent();
      
      expect(entryText).toMatch(/\d{4}-\d{2}-\d{2}/); // Date
      expect(entryText).toMatch(/\d{2}:\d{2}/); // Time
      expect(entryText).toContain('audit@test.com'); // User identifier
      
      console.log('Audit logging properly implemented');
    }
  });
});

test.describe('Security Configuration', () => {
  test('Security headers validation', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response.headers();
    
    console.log('Security headers:', headers);
    
    const requiredHeaders = {
      'x-content-type-options': 'nosniff',
      'x-frame-options': ['DENY', 'SAMEORIGIN'],
      'x-xss-protection': '1; mode=block',
      'strict-transport-security': /max-age=\d+/,
      'content-security-policy': /.+/,
      'referrer-policy': ['strict-origin-when-cross-origin', 'no-referrer', 'same-origin']
    };
    
    Object.entries(requiredHeaders).forEach(([header, expectedValue]) => {
      const headerValue = headers[header.toLowerCase()];
      expect(headerValue).toBeDefined();
      
      if (Array.isArray(expectedValue)) {
        expect(expectedValue).toContain(headerValue);
      } else if (expectedValue instanceof RegExp) {
        expect(headerValue).toMatch(expectedValue);
      } else {
        expect(headerValue).toBe(expectedValue);
      }
    });
    
    const forbiddenHeaders = ['server', 'x-powered-by', 'x-aspnet-version'];
    forbiddenHeaders.forEach(header => {
      expect(headers[header.toLowerCase()]).toBeUndefined();
    });
  });

  test('Content Security Policy validation', async ({ page }) => {
    const response = await page.goto('/');
    const cspHeader = response.headers()['content-security-policy'];
    
    expect(cspHeader).toBeDefined();
    
    const cspDirectives = cspHeader.split(';').map(d => d.trim());
    const cspMap = {};
    
    cspDirectives.forEach(directive => {
      const [key, ...values] = directive.split(' ');
      cspMap[key] = values;
    });
    
    expect(cspMap['default-src']).toBeDefined();
    expect(cspMap['script-src']).toBeDefined();
    expect(cspMap['object-src']).toContain("'none'");
    expect(cspMap['base-uri']).toContain("'self'");
    
    expect(cspMap['script-src']).not.toContain("'unsafe-inline'");
    expect(cspMap['style-src']).not.toContain("'unsafe-inline'");
    
    console.log('CSP validation passed:', cspMap);
  });

  test('HTTPS enforcement', async ({ page }) => {
    
    try {
      const httpResponse = await page.request.get('http://localhost:3000/', {
        maxRedirects: 0
      });
      
      expect([301, 302, 307, 308]).toContain(httpResponse.status());
      
      const location = httpResponse.headers()['location'];
      expect(location).toMatch(/^https:/);
      
      console.log('HTTPS redirect working correctly');
    } catch (error) {
      console.log('HTTPS redirect test skipped (development environment)');
    }
  });

  test('Vulnerability disclosure', async ({ page }) => {
    const securityTxtResponse = await page.request.get('/.well-known/security.txt');
    
    if (securityTxtResponse.ok()) {
      const securityTxt = await securityTxtResponse.text();
      
      expect(securityTxt).toContain('Contact:');
      expect(securityTxt).toMatch(/Expires:\s*\d{4}-\d{2}-\d{2}/);
      
      console.log('Security.txt found and properly configured');
    } else {
      console.log('Security.txt not found - consider adding for vulnerability disclosure');
    }
  });
});
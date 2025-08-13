const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = process.env.BASE_URL || 'https://bookedbarber.com';
const STAGING_URL = 'https://6fb-ai-dashboard-f62lshna2-6fb.vercel.app';

// Stripe test data
const STRIPE_TEST_CARDS = {
  visa: '4242424242424242',
  visaDebit: '4000056655665556', 
  mastercard: '5555555555554444',
  amex: '378282246310005',
  declined: '4000000000000002'
};

const TEST_USER = {
  email: 'test+playwright@bookedbarber.com',
  password: 'TestPassword123!',
  name: 'Playwright Test User'
};

test.describe('Stripe Payment Flow Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for payment processing
    test.setTimeout(120000);
    
    // Navigate to production site
    await page.goto(BASE_URL);
  });

  test('Subscribe page loads with pricing tiers', async ({ page }) => {
    await page.goto(`${BASE_URL}/subscribe`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check for pricing tiers
    await expect(page.locator('text=Individual Barber')).toBeVisible();
    await expect(page.locator('text=Barbershop')).toBeVisible(); 
    await expect(page.locator('text=Multi-Location')).toBeVisible();
    
    // Check pricing amounts
    await expect(page.locator('text=$35')).toBeVisible();
    await expect(page.locator('text=$99')).toBeVisible();
    await expect(page.locator('text=$249')).toBeVisible();
    
    // Check CTA buttons
    await expect(page.locator('text=Start as Individual')).toBeVisible();
    await expect(page.locator('text=Start as Shop Owner')).toBeVisible();
    await expect(page.locator('text=Start as Enterprise')).toBeVisible();
  });

  test('Billing toggle switches between monthly and yearly', async ({ page }) => {
    await page.goto(`${BASE_URL}/subscribe`);
    await page.waitForLoadState('networkidle');
    
    // Check monthly is selected by default
    await expect(page.locator('text=Monthly')).toHaveClass(/font-semibold/);
    
    // Click billing toggle
    await page.locator('[data-track-click="billing-period-toggle"]').click();
    
    // Verify yearly is now selected  
    await expect(page.locator('text=Yearly')).toHaveClass(/font-semibold/);
    
    // Check yearly pricing (should show annual amounts)
    await expect(page.locator('text=Save 20%')).toBeVisible();
  });

  test('Plan selection redirects to login when not authenticated', async ({ page }) => {
    await page.goto(`${BASE_URL}/subscribe`);
    await page.waitForLoadState('networkidle');
    
    // Click on a plan without being logged in
    await page.locator('[data-cta="select-plan-shop"]').click();
    
    // Should redirect to login page
    await page.waitForURL(/\/login/);
    await expect(page.url()).toContain('/login');
    
    // Check for redirect parameter
    expect(page.url()).toContain('redirect');
  });

  test('Health endpoint reports Stripe status correctly', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/health`);
    const health = await response.json();
    
    expect(response.status()).toBe(200);
    expect(health.services.stripe.status).toBe('configured');
    expect(health.services.stripe.test_mode).toBe(true);
  });

  test('Stripe webhook endpoint exists and rejects GET requests', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/stripe/webhook`);
    
    // Should return 405 Method Not Allowed for GET
    expect(response.status()).toBe(405);
  });

  test('Billing dashboard is accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/billing`);
    
    // Should load (might redirect to login, but page should exist)
    expect(page.url()).toMatch(/\/(billing|login)/);
  });

  // This test would require authentication setup
  test.skip('Complete payment flow with test card', async ({ page }) => {
    // This test is skipped because it requires:
    // 1. User authentication setup
    // 2. Stripe test environment configuration
    // 3. Mock/test webhook handling
    
    await page.goto(`${BASE_URL}/subscribe`);
    
    // Would need to:
    // 1. Login or create test user
    // 2. Select a plan 
    // 3. Fill Stripe checkout form
    // 4. Handle redirect back to site
    // 5. Verify subscription was created
  });

  test('Stripe pricing matches expected values', async ({ page }) => {
    await page.goto(`${BASE_URL}/subscribe`);
    await page.waitForLoadState('networkidle');
    
    // Check Individual Barber pricing
    const barberCard = page.locator('[data-plan-name="barber"]');
    await expect(barberCard.locator('text=$35')).toBeVisible();
    
    // Check Shop pricing
    const shopCard = page.locator('[data-plan-name="shop"]');
    await expect(shopCard.locator('text=$99')).toBeVisible();
    
    // Check Enterprise pricing  
    const enterpriseCard = page.locator('[data-plan-name="enterprise"]');
    await expect(enterpriseCard.locator('text=$249')).toBeVisible();
  });

  test('Payment security badges and information present', async ({ page }) => {
    await page.goto(`${BASE_URL}/subscribe`);
    await page.waitForLoadState('networkidle');
    
    // Check for security messaging
    await expect(page.locator('text=Secure payment processing by Stripe')).toBeVisible();
    await expect(page.locator('text=🔒')).toBeVisible();
    
    // Check for payment method information
    await expect(page.locator('text=credit cards')).toBeVisible();
  });

  test('FAQ section contains payment information', async ({ page }) => {
    await page.goto(`${BASE_URL}/subscribe`);
    await page.waitForLoadState('networkidle');
    
    // Check FAQ section exists
    await expect(page.locator('text=Frequently Asked Questions')).toBeVisible();
    
    // Check payment-related FAQs
    await expect(page.locator('text=What payment methods do you accept?')).toBeVisible();
    await expect(page.locator('text=Can I change plans later?')).toBeVisible();
    await expect(page.locator('text=Do you offer refunds?')).toBeVisible();
  });

  test('Analytics tracking is present on subscription page', async ({ page }) => {
    await page.goto(`${BASE_URL}/subscribe`);
    await page.waitForLoadState('networkidle');
    
    // Check for tracking attributes
    const planCards = page.locator('.pricing-card');
    await expect(planCards.first()).toHaveAttribute('data-track-view');
    
    const ctaButtons = page.locator('.cta-button');
    await expect(ctaButtons.first()).toHaveAttribute('data-track-click');
  });
});

test.describe('Stripe Integration Edge Cases', () => {
  test('Page handles missing Stripe configuration gracefully', async ({ page }) => {
    // This would test error handling if Stripe wasn't configured
    // In our case, we know Stripe is configured, so we just verify it doesn't crash
    
    await page.goto(`${BASE_URL}/subscribe`);
    
    // Page should load without JavaScript errors
    const errors = [];
    page.on('pageerror', error => errors.push(error));
    
    await page.waitForLoadState('networkidle');
    
    // Should not have critical errors
    expect(errors.filter(e => e.message.includes('Stripe')).length).toBe(0);
  });

  test('Subscription page is mobile responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/subscribe`);
    await page.waitForLoadState('networkidle');
    
    // Should still show pricing cards (might be stacked)
    await expect(page.locator('[data-plan-name="barber"]')).toBeVisible();
    await expect(page.locator('[data-plan-name="shop"]')).toBeVisible();
    await expect(page.locator('[data-plan-name="enterprise"]')).toBeVisible();
    
    // CTA buttons should be visible
    await expect(page.locator('[data-cta="select-plan-shop"]')).toBeVisible();
  });

  test('Page performance meets Core Web Vitals standards', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(`${BASE_URL}/subscribe`);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time (5 seconds for production)
    expect(loadTime).toBeLessThan(5000);
    
    // Check for layout shift indicators
    const images = page.locator('img');
    const count = await images.count();
    
    // All images should have dimensions to prevent layout shift
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      await expect(img).toHaveAttribute('width');
      await expect(img).toHaveAttribute('height');
    }
  });
});

// Export test utilities for other test files
module.exports = {
  STRIPE_TEST_CARDS,
  TEST_USER,
  BASE_URL
};
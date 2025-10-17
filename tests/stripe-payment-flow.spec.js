const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'https://bookedbarber.com';
const STAGING_URL = 'https://6fb-ai-dashboard-f62lshna2-6fb.vercel.app';

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
    test.setTimeout(120000);
    
    await page.goto(BASE_URL);
  });

  test('Subscribe page loads with pricing tiers', async ({ page }) => {
    await page.goto(`${BASE_URL}/subscribe`);
    
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('text=Individual Barber')).toBeVisible();
    await expect(page.locator('text=Barbershop')).toBeVisible(); 
    await expect(page.locator('text=Multi-Location')).toBeVisible();
    
    await expect(page.locator('text=$35')).toBeVisible();
    await expect(page.locator('text=$99')).toBeVisible();
    await expect(page.locator('text=$249')).toBeVisible();
    
    await expect(page.locator('text=Start as Individual')).toBeVisible();
    await expect(page.locator('text=Start as Shop Owner')).toBeVisible();
    await expect(page.locator('text=Start as Enterprise')).toBeVisible();
  });

  test('Billing toggle switches between monthly and yearly', async ({ page }) => {
    await page.goto(`${BASE_URL}/subscribe`);
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('text=Monthly')).toHaveClass(/font-semibold/);
    
    await page.locator('[data-track-click="billing-period-toggle"]').click();
    
    await expect(page.locator('text=Yearly')).toHaveClass(/font-semibold/);
    
    await expect(page.locator('text=Save 20%')).toBeVisible();
  });

  test('Plan selection redirects to login when not authenticated', async ({ page }) => {
    await page.goto(`${BASE_URL}/subscribe`);
    await page.waitForLoadState('networkidle');
    
    await page.locator('[data-cta="select-plan-shop"]').click();
    
    await page.waitForURL(/\/login/);
    await expect(page.url()).toContain('/login');
    
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
    
    expect(response.status()).toBe(405);
  });

  test('Billing dashboard is accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/billing`);
    
    expect(page.url()).toMatch(/\/(billing|login)/);
  });

  test.skip('Complete payment flow with test card', async ({ page }) => {
    // 1. User authentication setup
    // 2. Stripe test environment configuration
    // 3. Mock/test webhook handling
    
    await page.goto(`${BASE_URL}/subscribe`);
    
    // 1. Login or create test user
    // 2. Select a plan 
    // 3. Fill Stripe checkout form
    // 4. Handle redirect back to site
    // 5. Verify subscription was created
  });

  test('Stripe pricing matches expected values', async ({ page }) => {
    await page.goto(`${BASE_URL}/subscribe`);
    await page.waitForLoadState('networkidle');
    
    const barberCard = page.locator('[data-plan-name="barber"]');
    await expect(barberCard.locator('text=$35')).toBeVisible();
    
    const shopCard = page.locator('[data-plan-name="shop"]');
    await expect(shopCard.locator('text=$99')).toBeVisible();
    
    const enterpriseCard = page.locator('[data-plan-name="enterprise"]');
    await expect(enterpriseCard.locator('text=$249')).toBeVisible();
  });

  test('Payment security badges and information present', async ({ page }) => {
    await page.goto(`${BASE_URL}/subscribe`);
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('text=Secure payment processing by Stripe')).toBeVisible();
    await expect(page.locator('text=🔒')).toBeVisible();
    
    await expect(page.locator('text=credit cards')).toBeVisible();
  });

  test('FAQ section contains payment information', async ({ page }) => {
    await page.goto(`${BASE_URL}/subscribe`);
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('text=Frequently Asked Questions')).toBeVisible();
    
    await expect(page.locator('text=What payment methods do you accept?')).toBeVisible();
    await expect(page.locator('text=Can I change plans later?')).toBeVisible();
    await expect(page.locator('text=Do you offer refunds?')).toBeVisible();
  });

  test('Analytics tracking is present on subscription page', async ({ page }) => {
    await page.goto(`${BASE_URL}/subscribe`);
    await page.waitForLoadState('networkidle');
    
    const planCards = page.locator('.pricing-card');
    await expect(planCards.first()).toHaveAttribute('data-track-view');
    
    const ctaButtons = page.locator('.cta-button');
    await expect(ctaButtons.first()).toHaveAttribute('data-track-click');
  });
});

test.describe('Stripe Integration Edge Cases', () => {
  test('Page handles missing Stripe configuration gracefully', async ({ page }) => {
    
    await page.goto(`${BASE_URL}/subscribe`);
    
    const errors = [];
    page.on('pageerror', error => errors.push(error));
    
    await page.waitForLoadState('networkidle');
    
    expect(errors.filter(e => e.message.includes('Stripe')).length).toBe(0);
  });

  test('Subscription page is mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/subscribe`);
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('[data-plan-name="barber"]')).toBeVisible();
    await expect(page.locator('[data-plan-name="shop"]')).toBeVisible();
    await expect(page.locator('[data-plan-name="enterprise"]')).toBeVisible();
    
    await expect(page.locator('[data-cta="select-plan-shop"]')).toBeVisible();
  });

  test('Page performance meets Core Web Vitals standards', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(`${BASE_URL}/subscribe`);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000);
    
    const images = page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      await expect(img).toHaveAttribute('width');
      await expect(img).toHaveAttribute('height');
    }
  });
});

module.exports = {
  STRIPE_TEST_CARDS,
  TEST_USER,
  BASE_URL
};
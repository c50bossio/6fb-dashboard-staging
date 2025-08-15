/**
 * End-to-End Test Suite for Critical User Workflows
 * Tests complete user journeys across the 6FB AI Agent System
 */

import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

const generateTestUser = (role = 'CLIENT') => ({
  email: faker.internet.email(),
  name: faker.person.fullName(),
  phone: faker.phone.number(),
  password: 'TestPassword123!',
  role
});

const generateShopData = () => ({
  name: faker.company.name() + ' Barbershop',
  address: faker.location.streetAddress({ useFullAddress: true }),
  phone: faker.phone.number(),
  email: faker.internet.email()
});

class AuthPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/auth/signin');
  }

  async signIn(email, password) {
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="signin-button"]');
  }

  async signUp(userData) {
    await this.page.goto('/auth/signup');
    await this.page.fill('[data-testid="name-input"]', userData.name);
    await this.page.fill('[data-testid="email-input"]', userData.email);
    await this.page.fill('[data-testid="phone-input"]', userData.phone);
    await this.page.fill('[data-testid="password-input"]', userData.password);
    await this.page.fill('[data-testid="confirm-password-input"]', userData.password);
    await this.page.selectOption('[data-testid="role-select"]', userData.role);
    await this.page.click('[data-testid="signup-button"]');
  }
}

class DashboardPage {
  constructor(page) {
    this.page = page;
  }

  async expectToBeVisible() {
    await expect(this.page.locator('[data-testid="main-dashboard"]')).toBeVisible();
  }

  async getRevenueValue() {
    return await this.page.textContent('[data-testid="revenue-total"]');
  }

  async getAppointmentCount() {
    return await this.page.textContent('[data-testid="appointments-total"]');
  }

  async navigateToAIAgent() {
    await this.page.click('[data-testid="ai-agent-nav"]');
  }

  async navigateToAppointments() {
    await this.page.click('[data-testid="appointments-nav"]');
  }
}

class AIAgentPage {
  constructor(page) {
    this.page = page;
  }

  async sendMessage(message) {
    await this.page.fill('[data-testid="message-input"]', message);
    await this.page.click('[data-testid="send-button"]');
  }

  async waitForResponse() {
    await this.page.waitForSelector('[data-testid="agent-response"]:last-child', {
      timeout: 10000
    });
  }

  async getLastResponse() {
    return await this.page.textContent('[data-testid="agent-response"]:last-child');
  }

  async expectResponseToContain(text) {
    const response = await this.getLastResponse();
    expect(response.toLowerCase()).toContain(text.toLowerCase());
  }
}

class AppointmentPage {
  constructor(page) {
    this.page = page;
  }

  async createAppointment(appointmentData) {
    await this.page.click('[data-testid="new-appointment-button"]');
    
    await this.page.selectOption('[data-testid="service-select"]', appointmentData.serviceId);
    await this.page.selectOption('[data-testid="barber-select"]', appointmentData.barberId);
    await this.page.fill('[data-testid="date-input"]', appointmentData.date);
    await this.page.fill('[data-testid="time-input"]', appointmentData.time);
    await this.page.fill('[data-testid="notes-input"]', appointmentData.notes || '');
    
    await this.page.click('[data-testid="create-appointment-button"]');
  }

  async expectAppointmentInList(clientName) {
    await expect(
      this.page.locator(`[data-testid="appointment-item"]:has-text("${clientName}")`)
    ).toBeVisible();
  }

  async updateAppointmentStatus(appointmentId, status) {
    await this.page.click(`[data-testid="appointment-${appointmentId}-menu"]`);
    await this.page.click(`[data-testid="status-${status}"]`);
  }
}

test.describe('Client User Journey', () => {
  let authPage, dashboardPage, aiAgentPage;
  let testClient;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    dashboardPage = new DashboardPage(page);
    aiAgentPage = new AIAgentPage(page);
    testClient = generateTestUser('CLIENT');
  });

  test('Complete client onboarding and first booking', async ({ page }) => {
    // 1. Sign up as new client
    await authPage.signUp(testClient);
    
    await expect(page.locator('[data-testid="email-confirmation-message"]')).toBeVisible();
    
    // 2. Complete profile setup
    await page.click('[data-testid="complete-profile-button"]');
    await page.fill('[data-testid="preferences-hair-type"]', 'Curly');
    await page.fill('[data-testid="preferences-style"]', 'Modern fade');
    await page.check('[data-testid="notifications-email"]');
    await page.check('[data-testid="notifications-sms"]');
    await page.click('[data-testid="save-profile-button"]');

    // 3. Verify dashboard access
    await dashboardPage.expectToBeVisible();
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText(testClient.name);

    // 4. Search for nearby barbershops
    await page.click('[data-testid="find-barbershops-button"]');
    
    await page.evaluate(() => {
      navigator.geolocation = {
        getCurrentPosition: (success) => {
          success({
            coords: { latitude: 40.7128, longitude: -74.0060 } // NYC coordinates
          });
        }
      };
    });

    await page.click('[data-testid="use-current-location"]');
    
    await expect(page.locator('[data-testid="barbershop-list"] .barbershop-card')).toHaveCount({ 
      min: 1 
    });

    // 5. Select barbershop and book appointment
    await page.click('[data-testid="barbershop-card"]:first-child');
    await page.click('[data-testid="book-appointment-button"]');

    await page.click('[data-testid="service-haircut"]');
    
    await page.click('[data-testid="time-slot"]:first-child');
    
    await page.fill('[data-testid="special-requests"]', 'Please use organic products');
    
    await page.click('[data-testid="confirm-booking-button"]');

    // 6. Verify booking confirmation
    await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible();
    await expect(page.locator('[data-testid="booking-id"]')).toContainText(/^BOOK-\d+/);

    // 7. Check appointment in client dashboard
    await page.goto('/dashboard/appointments');
    await expect(
      page.locator('[data-testid="upcoming-appointments"] .appointment-card')
    ).toHaveCount(1);
  });

  test('Client uses AI assistant for barbershop recommendations', async ({ page }) => {
    await authPage.goto();
    await authPage.signIn('existing.client@example.com', 'password123');
    
    await dashboardPage.navigateToAIAgent();
    
    await aiAgentPage.sendMessage("I need a good barbershop for a wedding haircut next week");
    await aiAgentPage.waitForResponse();
    
    await aiAgentPage.expectResponseToContain("wedding");
    await aiAgentPage.expectResponseToContain("recommend");
    
    await aiAgentPage.sendMessage("What about pricing for these services?");
    await aiAgentPage.waitForResponse();
    
    await aiAgentPage.expectResponseToContain("price");
    await aiAgentPage.expectResponseToContain("cost");

    const response = await aiAgentPage.getLastResponse();
    expect(response).toMatch(/(wedding|formal|special occasion)/i);
  });

  test('Client manages appointment lifecycle', async ({ page }) => {
    await authPage.goto();
    await authPage.signIn('client.with.appointments@example.com', 'password123');
    await page.goto('/dashboard/appointments');

    await page.click('[data-testid="appointment-card"]:first-child');
    await expect(page.locator('[data-testid="appointment-details"]')).toBeVisible();

    await page.click('[data-testid="reschedule-button"]');
    await page.click('[data-testid="new-time-slot"]');
    await page.click('[data-testid="confirm-reschedule"]');
    
    await expect(page.locator('[data-testid="reschedule-success"]')).toBeVisible();

    await page.click('[data-testid="add-to-calendar"]');
    
    await expect(page.locator('[data-testid="calendar-added"]')).toBeVisible();

    await page.goto('/dashboard/appointments?tab=completed');
    await page.click('[data-testid="rate-appointment-button"]:first-child');
    
    await page.click('[data-testid="star-5"]'); // 5-star rating
    await page.fill('[data-testid="review-text"]', 'Excellent service and great attention to detail!');
    await page.click('[data-testid="submit-review"]');
    
    await expect(page.locator('[data-testid="review-submitted"]')).toBeVisible();
  });
});

test.describe('Barber User Journey', () => {
  let authPage, dashboardPage, appointmentPage;
  let testBarber;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    dashboardPage = new DashboardPage(page);
    appointmentPage = new AppointmentPage(page);
    testBarber = generateTestUser('BARBER');
  });

  test('Barber daily workflow management', async ({ page }) => {
    await authPage.goto();
    await authPage.signIn('test.barber@example.com', 'password123');

    await dashboardPage.expectToBeVisible();
    
    await expect(page.locator('[data-testid="todays-schedule"]')).toBeVisible();
    const appointmentCount = await page.locator('[data-testid="todays-appointments"] .appointment-item').count();
    expect(appointmentCount).toBeGreaterThan(0);

    await appointmentPage.updateAppointmentStatus('appt-1', 'in-progress');
    await expect(page.locator('[data-testid="appointment-appt-1"]')).toHaveClass(/in-progress/);

    await page.click('[data-testid="appointment-appt-1-complete"]');
    await page.fill('[data-testid="service-notes"]', 'Client requested shorter fade. Used #2 guard.');
    await page.fill('[data-testid="actual-duration"]', '35');
    await page.click('[data-testid="save-completion"]');

    await expect(page.locator('[data-testid="completed-appointments"] [data-testid="appointment-appt-1"]')).toBeVisible();

    const earnings = await page.textContent('[data-testid="daily-earnings"]');
    expect(earnings).toMatch(/\$\d+\.\d{2}/);
  });

  test('Barber manages availability and breaks', async ({ page }) => {
    await authPage.goto();
    await authPage.signIn('test.barber@example.com', 'password123');

    await page.click('[data-testid="manage-schedule"]');

    await page.click('[data-testid="add-break-button"]');
    await page.fill('[data-testid="break-start"]', '12:00');
    await page.fill('[data-testid="break-end"]', '13:00');
    await page.fill('[data-testid="break-reason"]', 'Lunch break');
    await page.click('[data-testid="save-break"]');

    await expect(page.locator('[data-testid="schedule-break-lunch"]')).toBeVisible();

    await page.click('[data-testid="block-time-button"]');
    await page.fill('[data-testid="block-start"]', '15:30');
    await page.fill('[data-testid="block-end"]', '16:30');
    await page.fill('[data-testid="block-reason"]', 'Personal appointment');
    await page.click('[data-testid="save-block"]');

    await page.goto('/booking/barber/test-barber-id');
    await expect(page.locator('[data-testid="time-15:30"]')).toBeDisabled();
  });

  test('Barber interacts with AI coach for performance insights', async ({ page }) => {
    await authPage.goto();
    await authPage.signIn('performance.barber@example.com', 'password123');

    await dashboardPage.navigateToAIAgent();

    await aiAgentPage.sendMessage("How am I performing compared to last month?");
    await aiAgentPage.waitForResponse();

    await aiAgentPage.expectResponseToContain("performance");
    await aiAgentPage.expectResponseToContain("month");

    await aiAgentPage.sendMessage("What can I do to increase my tips?");
    await aiAgentPage.waitForResponse();

    await aiAgentPage.expectResponseToContain("tips");
    await aiAgentPage.expectResponseToContain("suggest");

    await aiAgentPage.sendMessage("Should I raise my prices for haircuts?");
    await aiAgentPage.waitForResponse();

    const response = await aiAgentPage.getLastResponse();
    expect(response).toMatch(/(price|pricing|rate|cost)/i);
  });
});

test.describe('Shop Owner Journey', () => {
  let authPage, dashboardPage, aiAgentPage;
  let testOwner, testShop;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    dashboardPage = new DashboardPage(page);
    aiAgentPage = new AIAgentPage(page);
    testOwner = generateTestUser('SHOP_OWNER');
    testShop = generateShopData();
  });

  test('Shop owner complete setup and management workflow', async ({ page }) => {
    // 1. Sign up as shop owner
    await authPage.signUp(testOwner);
    
    // 2. Complete shop setup wizard
    await page.click('[data-testid="setup-shop-button"]');
    
    await page.fill('[data-testid="shop-name"]', testShop.name);
    await page.fill('[data-testid="shop-address"]', testShop.address);
    await page.fill('[data-testid="shop-phone"]', testShop.phone);
    await page.fill('[data-testid="shop-email"]', testShop.email);
    await page.click('[data-testid="next-step"]');

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (const day of days) {
      await page.fill(`[data-testid="${day}-open"]`, '09:00');
      await page.fill(`[data-testid="${day}-close"]`, '18:00');
    }
    await page.check('[data-testid="sunday-closed"]'); // Closed on Sunday
    await page.click('[data-testid="next-step"]');

    const services = [
      { name: 'Haircut', price: '35', duration: '30' },
      { name: 'Beard Trim', price: '25', duration: '20' },
      { name: 'Full Service', price: '55', duration: '50' }
    ];

    for (const service of services) {
      await page.click('[data-testid="add-service"]');
      await page.fill('[data-testid="service-name"]', service.name);
      await page.fill('[data-testid="service-price"]', service.price);
      await page.fill('[data-testid="service-duration"]', service.duration);
      await page.click('[data-testid="save-service"]');
    }
    await page.click('[data-testid="next-step"]');

    await page.click('[data-testid="add-staff"]');
    await page.fill('[data-testid="staff-email"]', 'barber1@example.com');
    await page.fill('[data-testid="staff-name"]', 'John Barber');
    await page.selectOption('[data-testid="staff-role"]', 'BARBER');
    await page.fill('[data-testid="hourly-rate"]', '25');
    await page.fill('[data-testid="commission-rate"]', '15');
    await page.click('[data-testid="invite-staff"]');

    await page.click('[data-testid="complete-setup"]');

    // 3. Verify shop dashboard
    await expect(page.locator('[data-testid="shop-overview"]')).toBeVisible();
    await expect(page.locator('[data-testid="shop-name-display"]')).toContainText(testShop.name);
  });

  test('Shop owner analyzes business performance with AI', async ({ page }) => {
    await authPage.goto();
    await authPage.signIn('shop.owner@example.com', 'password123');

    await dashboardPage.expectToBeVisible();
    const revenue = await dashboardPage.getRevenueValue();
    const appointments = await dashboardPage.getAppointmentCount();

    await dashboardPage.navigateToAIAgent();

    await aiAgentPage.sendMessage("Analyze my shop's performance for this month");
    await aiAgentPage.waitForResponse();

    const response = await aiAgentPage.getLastResponse();
    expect(response).toMatch(/(revenue|performance|appointments|growth)/i);

    await aiAgentPage.sendMessage("How can I increase customer retention?");
    await aiAgentPage.waitForResponse();

    await aiAgentPage.expectResponseToContain("retention");
    await aiAgentPage.expectResponseToContain("customer");

    await aiAgentPage.sendMessage("Should I hire more barbers based on current demand?");
    await aiAgentPage.waitForResponse();

    const staffingResponse = await aiAgentPage.getLastResponse();
    expect(staffingResponse).toMatch(/(staff|barber|hire|demand)/i);
  });

  test('Shop owner manages complex scheduling conflicts', async ({ page }) => {
    await authPage.goto();
    await authPage.signIn('busy.shop.owner@example.com', 'password123');

    await page.click('[data-testid="scheduling-nav"]');

    await expect(page.locator('[data-testid="scheduling-conflicts"]')).toBeVisible();
    const conflictCount = await page.locator('[data-testid="conflict-item"]').count();

    if (conflictCount > 0) {
      await page.click('[data-testid="conflict-item"]:first-child');
      await page.click('[data-testid="resolve-conflict"]');
      
      await page.click('[data-testid="reschedule-option"]');
      await page.click('[data-testid="suggested-time"]:first-child');
      await page.click('[data-testid="confirm-resolution"]');

      await expect(page.locator('[data-testid="conflict-resolved"]')).toBeVisible();
    }

    await page.click('[data-testid="optimize-schedule"]');
    await page.click('[data-testid="auto-optimize"]');
    
    await expect(page.locator('[data-testid="optimization-complete"]')).toBeVisible();
    
    const efficiencyScore = await page.textContent('[data-testid="efficiency-score"]');
    expect(efficiencyScore).toMatch(/\d+%/); // Should show percentage
  });

  test('Shop owner manages financial aspects and reporting', async ({ page }) => {
    await authPage.goto();
    await authPage.signIn('financial.owner@example.com', 'password123');

    await page.click('[data-testid="finances-nav"]');

    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
    
    await page.click('[data-testid="generate-report"]');
    await page.selectOption('[data-testid="report-period"]', 'monthly');
    await page.click('[data-testid="create-report"]');

    await expect(page.locator('[data-testid="report-ready"]')).toBeVisible({ timeout: 10000 });

    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-report"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/financial-report-\d{4}-\d{2}\.pdf/);

    await page.click('[data-testid="commissions-tab"]');
    await expect(page.locator('[data-testid="commission-summary"]')).toBeVisible();
    
    const barberCommissions = await page.locator('[data-testid="barber-commission"]').count();
    expect(barberCommissions).toBeGreaterThan(0);
  });
});

test.describe('Cross-Platform and Accessibility Tests', () => {
  test('Mobile responsive booking flow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/booking/shop/test-shop-id');

    await expect(page.locator('[data-testid="mobile-booking-header"]')).toBeVisible();
    
    const serviceCarousel = page.locator('[data-testid="service-carousel"]');
    await serviceCarousel.swipe({ direction: 'left' });
    
    await page.tap('[data-testid="service-haircut"]');
    
    await expect(page.locator('[data-testid="mobile-calendar"]')).toBeVisible();
    
    await page.tap('[data-testid="calendar-date-15"]');
    await page.tap('[data-testid="time-10:00"]');
    
    await page.tap('[data-testid="mobile-book-button"]');
    
    await expect(page.locator('[data-testid="mobile-confirmation"]')).toBeVisible();
  });

  test('Keyboard navigation and screen reader compatibility', async ({ page }) => {
    await page.goto('/dashboard');
    
    await page.keyboard.press('Tab'); // Focus first element
    await page.keyboard.press('Enter'); // Activate focused element
    
    const mainContent = page.locator('[role="main"]');
    await expect(mainContent).toHaveAttribute('aria-label');
    
    await page.keyboard.press('Tab');
    const skipLink = page.locator('[data-testid="skip-to-content"]');
    if (await skipLink.isVisible()) {
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="main-content"]')).toBeFocused();
    }
    
    await page.goto('/booking/form');
    
    const emailInput = page.locator('[data-testid="email-input"]');
    await expect(emailInput).toHaveAttribute('aria-labelledby');
    
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.click('[data-testid="submit-button"]');
    
    const errorMessage = page.locator('[data-testid="email-error"]');
    await expect(errorMessage).toHaveAttribute('role', 'alert');
    await expect(errorMessage).toHaveAttribute('aria-live', 'polite');
  });

  test('High contrast and color accessibility', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    
    await page.goto('/dashboard');
    
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const styles = await button.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          border: computed.border
        };
      });
      
      expect(styles.color).not.toBe(styles.backgroundColor);
    }
    
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    const focusStyles = await focusedElement.evaluate((el) => {
      return window.getComputedStyle(el).outline;
    });
    
    expect(focusStyles).not.toBe('none');
  });
});

test.describe('Performance and Load Tests', () => {
  test('Dashboard loading performance', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    console.log(`Dashboard load time: ${loadTime}ms`);
    
    expect(loadTime).toBeLessThan(3000); // 3 seconds
    
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals = {};
          
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              vitals.fcp = entry.startTime;
            }
            if (entry.name === 'largest-contentful-paint') {
              vitals.lcp = entry.startTime;
            }
          });
          
          if (vitals.fcp && vitals.lcp) {
            resolve(vitals);
          }
        });
        
        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
        
        setTimeout(() => resolve({}), 5000);
      });
    });
    
    if (vitals.fcp) {
      console.log(`First Contentful Paint: ${vitals.fcp}ms`);
      expect(vitals.fcp).toBeLessThan(1800); // 1.8 seconds
    }
    
    if (vitals.lcp) {
      console.log(`Largest Contentful Paint: ${vitals.lcp}ms`);
      expect(vitals.lcp).toBeLessThan(2500); // 2.5 seconds
    }
  });

  test('AI agent response time under load', async ({ page }) => {
    await page.goto('/dashboard/ai-agent');
    
    const aiAgent = new AIAgentPage(page);
    
    const requests = [
      "What's my revenue this month?",
      "How many appointments do I have today?",
      "Show me customer feedback",
      "Analyze my best performing services",
      "What are my busiest hours?"
    ];
    
    const responseTimes = [];
    
    for (const request of requests) {
      const startTime = Date.now();
      
      await aiAgent.sendMessage(request);
      await aiAgent.waitForResponse();
      
      const responseTime = Date.now() - startTime;
      responseTimes.push(responseTime);
      console.log(`AI response time for "${request}": ${responseTime}ms`);
      
      await page.waitForTimeout(500);
    }
    
    const maxResponseTime = Math.max(...responseTimes);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    
    console.log(`Average AI response time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`Maximum AI response time: ${maxResponseTime}ms`);
    
    expect(maxResponseTime).toBeLessThan(10000); // 10 seconds max
    expect(avgResponseTime).toBeLessThan(5000);  // 5 seconds average
  });
});

test.describe('Integration and Third-Party Services', () => {
  test('Google Calendar integration workflow', async ({ page }) => {
    await page.route('/api/integrations/google-calendar/**', (route) => {
      const url = route.request().url();
      
      if (url.includes('/events')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                id: 'event1',
                summary: 'Haircut - John Doe',
                start: { dateTime: '2024-02-15T10:00:00Z' },
                end: { dateTime: '2024-02-15T10:30:00Z' }
              }
            ]
          })
        });
      } else {
        route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
      }
    });
    
    await page.goto('/dashboard/integrations');
    
    await page.click('[data-testid="connect-google-calendar"]');
    
    await page.route('**/oauth/google**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body><script>window.close()</script></body></html>'
      });
    });
    
    await expect(page.locator('[data-testid="calendar-connected"]')).toBeVisible();
    
    await page.click('[data-testid="sync-calendar"]');
    await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible();
    
    await page.goto('/dashboard/appointments');
    await expect(page.locator('[data-testid="synced-appointment"]')).toBeVisible();
  });

  test('Payment processing integration', async ({ page }) => {
    await page.route('**/api/payments/**', (route) => {
      const method = route.request().method();
      
      if (method === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            payment_intent: {
              id: 'pi_test_123',
              status: 'succeeded',
              amount: 3500
            }
          })
        });
      } else {
        route.continue();
      }
    });
    
    await page.goto('/booking/shop/test-shop/service/haircut');
    
    await page.fill('[data-testid="client-name"]', 'Test Client');
    await page.fill('[data-testid="client-email"]', 'test@example.com');
    await page.fill('[data-testid="client-phone"]', '+1234567890');
    
    await page.click('[data-testid="time-10:00"]');
    
    await page.click('[data-testid="proceed-to-payment"]');
    
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry"]', '12/25');
    await page.fill('[data-testid="card-cvc"]', '123');
    await page.fill('[data-testid="card-name"]', 'Test Client');
    
    await page.click('[data-testid="pay-button"]');
    
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible();
    
    await expect(page.locator('[data-testid="payment-id"]')).toContainText('pi_test_123');
  });
});

test.describe('Error Handling and Edge Cases', () => {
  test('Network failure recovery', async ({ page }) => {
    await page.goto('/dashboard');
    
    await page.context().setOffline(true);
    
    await page.click('[data-testid="refresh-data"]');
    
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    await page.context().setOffline(false);
    
    await expect(page.locator('[data-testid="online-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="data-refreshed"]')).toBeVisible();
  });

  test('Invalid session handling', async ({ page }) => {
    await page.goto('/dashboard');
    
    await page.route('**/api/auth/**', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Session expired' })
      });
    });
    
    await page.click('[data-testid="load-appointments"]');
    
    await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible();
    await page.waitForURL('**/auth/signin');
  });

  test('Form validation and error handling', async ({ page }) => {
    await page.goto('/booking/form');
    
    await page.click('[data-testid="submit-booking"]');
    
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="phone-error"]')).toBeVisible();
    
    await page.fill('[data-testid="email-input"]', 'invalid.email');
    await page.blur('[data-testid="email-input"]');
    
    await expect(page.locator('[data-testid="email-format-error"]')).toBeVisible();
    
    await page.fill('[data-testid="phone-input"]', '123');
    await page.blur('[data-testid="phone-input"]');
    
    await expect(page.locator('[data-testid="phone-format-error"]')).toBeVisible();
    
    await page.route('**/api/bookings', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          errors: {
            appointment_time: 'Time slot no longer available'
          }
        })
      });
    });
    
    await page.fill('[data-testid="name-input"]', await getUserFromDatabase());
    await page.fill('[data-testid="email-input"]', 'john@example.com');
    await page.fill('[data-testid="phone-input"]', '+1234567890');
    await page.click('[data-testid="time-10:00"]');
    
    await page.click('[data-testid="submit-booking"]');
    
    await expect(page.locator('[data-testid="server-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="server-error"]')).toContainText('Time slot no longer available');
  });
});
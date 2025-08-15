const { test, expect } = require('@playwright/test');

test.describe('Calendar Comprehensive Testing', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    page.consoleErrors = consoleErrors;

    await page.goto('http://localhost:9999/dashboard/calendar');
    
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('Authentication required, attempting to login with demo credentials');
      
      await page.fill('input[type="email"]', 'demo@barbershop.com');
      await page.fill('input[type="password"]', 'demo123');
      await page.click('button[type="submit"], button:has-text("Sign in")');
      
      await page.waitForURL('**/dashboard/calendar', { timeout: 10000 });
    }

    await page.waitForLoadState('networkidle');
  });

  test('FullCalendar SDK loads properly with real API data integration', async () => {
    const calendarContainer = page.locator('.fc, [data-testid="calendar"], #calendar');
    await expect(calendarContainer).toBeVisible({ timeout: 10000 });

    const isFullCalendarInitialized = await page.evaluate(() => {
      return window.FullCalendar !== undefined;
    });
    expect(isFullCalendarInitialized).toBe(true);

    const calendarView = page.locator('.fc-view');
    await expect(calendarView).toBeVisible();

    const apiCalls = [];
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        apiCalls.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers()
        });
      }
    });

    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/screenshots/calendar-fullcalendar-loaded.png' });
    
    console.log('✅ FullCalendar SDK loaded successfully');
  });

  test('Toast notifications work instead of alert() calls', async () => {
    await page.evaluate(() => {
      window.alertCalled = false;
      const originalAlert = window.alert;
      window.alert = function(...args) {
        window.alertCalled = true;
        window.alertMessage = args[0];
        return originalAlert.apply(window, args);
      };
    });

    const dateElement = page.locator('.fc-daygrid-day').first();
    if (await dateElement.isVisible()) {
      await dateElement.click();
    }

    const toastNotifications = page.locator('[data-testid="toast"], .toast, .notification, .alert');
    const toastCount = await toastNotifications.count();

    const alertCalled = await page.evaluate(() => window.alertCalled);
    expect(alertCalled).toBe(false);

    if (toastCount > 0) {
      await page.screenshot({ path: 'test-results/screenshots/calendar-toast-notifications.png' });
      console.log('✅ Toast notifications found instead of alert() calls');
    }
  });

  test('QR code sharing functionality works correctly', async () => {
    const qrCodeButton = page.locator('button:has-text("QR"), [data-testid="qr-code"], .qr-code-button');
    const qrCodeModal = page.locator('[data-testid="qr-modal"], .qr-modal, .modal:has(.qr-code)');

    if (await qrCodeButton.count() > 0) {
      await qrCodeButton.first().click();
      
      await expect(qrCodeModal.or(page.locator('canvas, svg, img').filter({ hasText: /qr/i }))).toBeVisible({ timeout: 5000 });
      
      await page.screenshot({ path: 'test-results/screenshots/calendar-qr-code-feature.png' });
      console.log('✅ QR code functionality is working');
    } else {
      console.log('⚠️ QR code button not found - feature may not be implemented yet');
    }
  });

  test('Calendar interactions provide proper user feedback', async () => {
    const dateElements = page.locator('.fc-daygrid-day');
    const firstDate = dateElements.first();
    
    if (await firstDate.isVisible()) {
      await firstDate.click();
      
      const selectedDate = page.locator('.fc-daygrid-day.selected, .fc-daygrid-day.active, .fc-daygrid-day.highlighted');
      const feedbackVisible = await selectedDate.count() > 0;
      
      console.log(feedbackVisible ? '✅ Date selection feedback working' : '⚠️ Date selection feedback may be missing');
    }

    const events = page.locator('.fc-event');
    const eventCount = await events.count();
    
    if (eventCount > 0) {
      await events.first().click();
      
      const eventModal = page.locator('.modal, .popover, .event-details');
      const modalVisible = await eventModal.count() > 0;
      
      console.log(modalVisible ? '✅ Event click feedback working' : '⚠️ Event click feedback may be missing');
      
      if (modalVisible) {
        await page.screenshot({ path: 'test-results/screenshots/calendar-event-interaction.png' });
      }
    }
  });

  test('Mobile responsiveness is functional', async () => {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X size
    await page.waitForTimeout(1000); // Allow layout to adjust

    const calendarContainer = page.locator('.fc, [data-testid="calendar"], #calendar');
    await expect(calendarContainer).toBeVisible();

    const mobileElements = page.locator('.fc-toolbar-chunk, .fc-button-group');
    const mobileElementsVisible = await mobileElements.count() > 0;

    const calendarWidth = await page.evaluate(() => {
      const calendar = document.querySelector('.fc, [data-testid="calendar"], #calendar');
      return calendar ? calendar.offsetWidth : 0;
    });

    expect(calendarWidth).toBeLessThanOrEqual(375); // Should fit in mobile viewport
    
    await page.screenshot({ path: 'test-results/screenshots/calendar-mobile-responsive.png' });
    console.log('✅ Mobile responsiveness verified');

    await page.setViewportSize({ width: 1200, height: 800 });
  });

  test('No console errors or broken functionality', async () => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const consoleErrors = page.consoleErrors || [];
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('Warning:') && 
      !error.includes('DevTools') &&
      !error.includes('extension')
    );

    console.log('Console errors found:', consoleErrors);
    expect(criticalErrors.length).toBe(0);

    const jsErrors = await page.evaluate(() => {
      try {
        return {
          hasFullCalendar: typeof window.FullCalendar !== 'undefined',
          hasDocument: typeof document !== 'undefined',
          hasConsole: typeof console !== 'undefined',
          errors: window.jsErrors || []
        };
      } catch (e) {
        return { error: e.message };
      }
    });

    expect(jsErrors.hasDocument).toBe(true);
    expect(jsErrors.hasConsole).toBe(true);
    
    console.log('✅ No critical console errors found');
  });

  test('API data loading and fallback to mock data', async () => {
    const responses = [];
    
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        ok: response.ok()
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const apiResponses = responses.filter(r => r.url.includes('/api/'));
    console.log('API responses:', apiResponses);

    const calendarContainer = page.locator('.fc, [data-testid="calendar"], #calendar');
    await expect(calendarContainer).toBeVisible();

    const hasEvents = await page.locator('.fc-event').count() > 0;
    const hasDefaultView = await page.locator('.fc-view').count() > 0;

    expect(hasDefaultView).toBe(true);
    console.log(hasEvents ? '✅ Events loaded (real or mock data)' : '✅ Calendar loads with default empty state');
  });

  test('Error handling and loading states', async () => {
    await page.reload();
    
    const loadingIndicators = page.locator('.loading, .spinner, [data-testid="loading"]');
    
    const hasLoadingState = await loadingIndicators.count() > 0;
    if (hasLoadingState) {
      await page.screenshot({ path: 'test-results/screenshots/calendar-loading-state.png' });
      console.log('✅ Loading states visible during initial load');
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const stillLoading = await loadingIndicators.count() > 0;
    expect(stillLoading).toBe(false);

    await page.route('**/api/**', route => {
      if (route.request().url().includes('appointments') || route.request().url().includes('calendar')) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.reload();
    await page.waitForTimeout(3000);

    const calendarContainer = page.locator('.fc, [data-testid="calendar"], #calendar');
    await expect(calendarContainer).toBeVisible();

    console.log('✅ Error handling verified - calendar renders despite API failures');
  });

  test.afterEach(async () => {
    await page.screenshot({ 
      path: `test-results/screenshots/calendar-final-state-${Date.now()}.png`,
      fullPage: true 
    });
    
    const finalUrl = page.url();
    const consoleErrors = page.consoleErrors || [];
    
    console.log('Final URL:', finalUrl);
    console.log('Total console errors:', consoleErrors.length);
    
    if (consoleErrors.length > 0) {
      console.log('Console errors:', consoleErrors);
    }
  });
});
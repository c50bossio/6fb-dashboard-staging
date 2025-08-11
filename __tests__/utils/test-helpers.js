/**
 * Test Helper Utilities
 * Common testing utilities, mocks, and helper functions
 */

import { jest } from '@jest/globals';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Time utilities
export const TimeHelpers = {
  /**
   * Create a date in the future
   */
  futureDate(days = 7) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  },

  /**
   * Create a date in the past
   */
  pastDate(days = 7) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  },

  /**
   * Format date for input fields
   */
  formatForInput(date) {
    return date.toISOString().split('T')[0];
  },

  /**
   * Format time for input fields
   */
  formatTimeForInput(date) {
    return date.toTimeString().slice(0, 5);
  },

  /**
   * Create business hours for testing
   */
  createBusinessHours(startHour = 9, endHour = 17) {
    const start = `${startHour.toString().padStart(2, '0')}:00`;
    const end = `${endHour.toString().padStart(2, '0')}:00`;
    
    return {
      monday: { open: start, close: end },
      tuesday: { open: start, close: end },
      wednesday: { open: start, close: end },
      thursday: { open: start, close: end },
      friday: { open: start, close: end },
      saturday: { open: start, close: end },
      sunday: { closed: true }
    };
  },

  /**
   * Advance timers and wait for updates
   */
  async advanceTimersAndWait(ms) {
    jest.advanceTimersByTime(ms);
    await waitFor(() => {}, { timeout: 100 });
  }
};

// DOM testing utilities
export const DOMHelpers = {
  /**
   * Find element by test ID with better error messages
   */
  getByTestId(testId, container = document) {
    const element = container.querySelector(`[data-testid="${testId}"]`);
    if (!element) {
      throw new Error(`Element with test ID "${testId}" not found`);
    }
    return element;
  },

  /**
   * Wait for element to appear with custom timeout
   */
  async waitForTestId(testId, timeout = 5000) {
    return await waitFor(
      () => {
        const element = screen.getByTestId(testId);
        expect(element).toBeInTheDocument();
        return element;
      },
      { timeout }
    );
  },

  /**
   * Check if element exists without throwing
   */
  queryByTestId(testId) {
    return screen.queryByTestId(testId);
  },

  /**
   * Get all elements by test ID pattern
   */
  getAllByTestIdPattern(pattern) {
    const elements = document.querySelectorAll(`[data-testid*="${pattern}"]`);
    return Array.from(elements);
  },

  /**
   * Simulate user typing with realistic delays
   */
  async typeRealistic(element, text, delay = 50) {
    const user = userEvent.setup({ delay });
    await user.type(element, text);
  },

  /**
   * Click element and wait for state changes
   */
  async clickAndWait(element, waitFor = () => {}) {
    const user = userEvent.setup();
    await user.click(element);
    await waitFor();
  },

  /**
   * Fill form with multiple fields
   */
  async fillForm(fields) {
    const user = userEvent.setup();
    
    for (const [testId, value] of Object.entries(fields)) {
      const element = screen.getByTestId(testId);
      await user.clear(element);
      await user.type(element, value);
    }
  },

  /**
   * Select option from dropdown
   */
  async selectOption(selectTestId, optionValue) {
    const user = userEvent.setup();
    const select = screen.getByTestId(selectTestId);
    await user.selectOptions(select, optionValue);
  },

  /**
   * Check if element is visible in viewport
   */
  isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }
};

// Database implementations
export const DatabaseHelpers = {
  /**
   * Database fetch with custom responses
   */
  createFetchMock(responses = {}) {
    return jest.fn((url, options) => {
      const method = options?.method || 'GET';
      const key = `${method} ${url}`;
      
      if (responses[key]) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(responses[key]),
          text: () => Promise.resolve(JSON.stringify(responses[key]))
        });
      }
      
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' })
      });
    });
  },

  /**
   * Database localStorage
   */
  mockLocalStorage() {
    const store = {};
    
    return {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => {
        store[key] = value;
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
      }),
      key: jest.fn((index) => Object.keys(store)[index] || null),
      get length() {
        return Object.keys(store).length;
      }
    };
  },

  /**
   * Database sessionStorage
   */
  mockSessionStorage() {
    return this.mockLocalStorage(); // Same interface
  },

  /**
   * Database geolocation API
   */
  mockGeolocation(coords = { latitude: 40.7128, longitude: -74.0060 }) {
    const Geolocation = {
      getCurrentPosition: jest.fn((success, error) => {
        success({
          coords: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: 10
          }
        });
      }),
      watchPosition: jest.fn(),
      clearWatch: jest.fn()
    };

    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true
    });

    return mockGeolocation;
  },

  /**
   * Database intersection observer
   */
  mockIntersectionObserver() {
    const IntersectionObserver = jest.fn();
    mockIntersectionObserver.mockReturnValue({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    });
    
    window.IntersectionObserver = mockIntersectionObserver;
    window.IntersectionObserverEntry = jest.fn();
    
    return mockIntersectionObserver;
  },

  /**
   * Database ResizeObserver
   */
  mockResizeObserver() {
    const ResizeObserver = jest.fn();
    mockResizeObserver.mockReturnValue({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    });
    
    window.ResizeObserver = mockResizeObserver;
    
    return mockResizeObserver;
  },

  /**
   * Database WebSocket
   */
  mockWebSocket() {
    const WebSocket = jest.fn();
    mockWebSocket.prototype.send = jest.fn();
    mockWebSocket.prototype.close = jest.fn();
    mockWebSocket.prototype.addEventListener = jest.fn();
    mockWebSocket.prototype.removeEventListener = jest.fn();
    
    window.WebSocket = mockWebSocket;
    
    return mockWebSocket;
  },

  /**
   * Database performance API
   */
  mockPerformance() {
    const Performance = {
      now: jest.fn(() => Date.now()),
      mark: jest.fn(),
      measure: jest.fn(),
      getEntriesByType: jest.fn(() => []),
      getEntriesByName: jest.fn(() => []),
      clearMarks: jest.fn(),
      clearMeasures: jest.fn()
    };

    window.performance = mockPerformance;
    
    return mockPerformance;
  }
};

// Assertion helpers
export const AssertionHelpers = {
  /**
   * Check if element has specific CSS class
   */
  expectToHaveClass(element, className) {
    expect(element).toHaveClass(className);
  },

  /**
   * Check if element has accessible name
   */
  expectToHaveAccessibleName(element, name) {
    expect(element).toHaveAccessibleName(name);
  },

  /**
   * Check if element is focused
   */
  expectToBeFocused(element) {
    expect(element).toHaveFocus();
  },

  /**
   * Check if form field has specific value
   */
  expectFieldValue(testId, value) {
    const field = screen.getByTestId(testId);
    expect(field).toHaveValue(value);
  },

  /**
   * Check if multiple elements are visible
   */
  expectElementsVisible(testIds) {
    testIds.forEach(testId => {
      expect(screen.getByTestId(testId)).toBeVisible();
    });
  },

  /**
   * Check if API was called with specific parameters
   */
  expectAPICall(mockFn, method, url, data = null) {
    expect(mockFn).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        method,
        ...(data && { body: JSON.stringify(data) })
      })
    );
  },

  /**
   * Check loading state
   */
  expectLoadingState(isLoading = true) {
    if (isLoading) {
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    } else {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    }
  },

  /**
   * Check error state
   */
  expectErrorState(errorMessage = null) {
    expect(screen.getByTestId('error-message')).toBeInTheDocument();
    if (errorMessage) {
      expect(screen.getByTestId('error-message')).toHaveTextContent(errorMessage);
    }
  },

  /**
   * Check success state
   */
  expectSuccessState(successMessage = null) {
    expect(screen.getByTestId('success-message')).toBeInTheDocument();
    if (successMessage) {
      expect(screen.getByTestId('success-message')).toHaveTextContent(successMessage);
    }
  }
};

// Test data manipulation
export const DataHelpers = {
  /**
   * Create test user with role
   */
  createTestUser(role = 'CLIENT', overrides = {}) {
    return {
      id: `test-user-${Date.now()}`,
      email: `test-${Date.now()}@example.com`,
      name: await getTestUserFromDatabase(),
      role,
      created_at: new Date().toISOString(),
      ...overrides
    };
  },

  /**
   * Create test shop
   */
  createTestShop(overrides = {}) {
    return {
      id: `test-shop-${Date.now()}`,
      name: 'Test Barbershop',
      address: '123 Test Street',
      phone: '+1234567890',
      email: 'shop@test.com',
      business_hours: TimeHelpers.createBusinessHours(),
      ...overrides
    };
  },

  /**
   * Create test appointment
   */
  createTestAppointment(overrides = {}) {
    return {
      id: `test-appointment-${Date.now()}`,
      client_id: 'test-client-id',
      barber_id: 'test-barber-id',
      shop_id: 'test-shop-id',
      service_id: 'test-service-id',
      scheduled_time: TimeHelpers.futureDate(1).toISOString(),
      status: 'scheduled',
      total_price: 35.00,
      ...overrides
    };
  },

  /**
   * Create test service
   */
  createTestService(overrides = {}) {
    return {
      id: `test-service-${Date.now()}`,
      shop_id: 'test-shop-id',
      name: 'Test Haircut',
      price: 35.00,
      duration: 30,
      description: 'Test service description',
      ...overrides
    };
  },

  /**
   * Generate test analytics data
   */
  generateAnalyticsData(days = 30) {
    const data = [];
    const endDate = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(endDate.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.floor(Math.random() * 1000) + 200,
        appointments: Math.floor(Math.random() * 20) + 5,
        customers: Math.floor(Math.random() * 15) + 3
      });
    }
    
    return data;
  },

  /**
   * Create conversation messages
   */
  createConversationMessages(count = 5) {
    const messages = [];
    
    for (let i = 0; i < count; i++) {
      messages.push({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: i % 2 === 0 
          ? `User message ${i + 1}` 
          : `Assistant response ${i + 1}`,
        timestamp: new Date(Date.now() - (count - i) * 60000).toISOString()
      });
    }
    
    return messages;
  }
};

// Setup and teardown helpers
export const SetupHelpers = {
  /**
   * Setup common mocks for testing
   */
  setupCommonDatabases() {
    DatabaseHelpers.mockLocalStorage();
    DatabaseHelpers.mockIntersectionObserver();
    DatabaseHelpers.mockResizeObserver();
    DatabaseHelpers.mockPerformance();
    
    // Database console methods to reduce noise in tests
    global.console.warn = jest.fn();
    global.console.error = jest.fn();
  },

  /**
   * Setup fake timers
   */
  setupFakeTimers() {
    jest.useFakeTimers();
    return () => jest.useRealTimers();
  },

  /**
   * Setup test environment for component tests
   */
  setupTestEnvironment() {
    this.setupCommonDatabases();
    
    // Database next/router
    const Router = {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
      pathname: '/',
      route: '/',
      query: {},
      asPath: '/',
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn()
      }
    };

    jest.mock('next/router', () => ({
      useRouter: () => mockRouter
    }));

    return { mockRouter };
  },

  /**
   * Clean up after tests
   */
  cleanup() {
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    // Reset DOM
    document.body.innerHTML = '';
    
    // Clear any remaining event listeners
    window.removeAllListeners?.();
  }
};

// Async testing utilities
export const AsyncHelpers = {
  /**
   * Wait for condition to be true
   */
  async waitForCondition(condition, timeout = 5000, interval = 100) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  },

  /**
   * Wait for API call to complete
   */
  async waitForAPICall(mockFn, expectedCalls = 1) {
    await waitFor(() => {
      expect(mockFn).toHaveBeenCalledTimes(expectedCalls);
    });
  },

  /**
   * Wait for state updates
   */
  async waitForStateUpdate(getState, expectedValue, timeout = 5000) {
    await waitFor(() => {
      expect(getState()).toEqual(expectedValue);
    }, { timeout });
  },

  /**
   * Simulate network delay
   */
  async simulateNetworkDelay(ms = 100) {
    await new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Retry async operation
   */
  async retry(operation, maxAttempts = 3, delay = 100) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }
};

// Performance testing utilities
export const PerformanceHelpers = {
  /**
   * Measure execution time
   */
  async measureTime(operation) {
    const start = performance.now();
    await operation();
    const end = performance.now();
    return end - start;
  },

  /**
   * Check if operation completes within time limit
   */
  async expectTimeLimit(operation, maxTime) {
    const executionTime = await this.measureTime(operation);
    expect(executionTime).toBeLessThan(maxTime);
    return executionTime;
  },

  /**
   * Simulate slow network
   */
  simulateSlowNetwork(delay = 2000) {
    const originalFetch = global.fetch;
    
    global.fetch = jest.fn(async (...args) => {
      await new Promise(resolve => setTimeout(resolve, delay));
      return originalFetch(...args);
    });
    
    return () => {
      global.fetch = originalFetch;
    };
  },

  /**
   * Monitor memory usage
   */
  measureMemoryUsage() {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }
};

// Accessibility testing helpers
export const A11yHelpers = {
  /**
   * Check if element has proper ARIA attributes
   */
  expectProperARIA(element, expectedAttributes = {}) {
    Object.entries(expectedAttributes).forEach(([attr, value]) => {
      expect(element).toHaveAttribute(`aria-${attr}`, value);
    });
  },

  /**
   * Check keyboard navigation
   */
  async testKeyboardNavigation(container, expectedOrder = []) {
    const user = userEvent.setup();
    
    // Start from first focusable element
    await user.tab();
    
    for (const expectedTestId of expectedOrder) {
      const element = within(container).getByTestId(expectedTestId);
      expect(element).toHaveFocus();
      await user.tab();
    }
  },

  /**
   * Check if element is accessible to screen readers
   */
  expectScreenReaderAccessible(element) {
    // Check if element has accessible name
    expect(element).toHaveAccessibleName();
    
    // Check if element has proper role
    const role = element.getAttribute('role');
    const tagName = element.tagName.toLowerCase();
    
    if (!role && !['button', 'input', 'select', 'textarea', 'a'].includes(tagName)) {
      console.warn(`Element may need explicit role: ${tagName}`);
    }
  },

  /**
   * Check color contrast (simplified)
   */
  expectSufficientContrast(element) {
    const styles = window.getComputedStyle(element);
    const color = styles.color;
    const backgroundColor = styles.backgroundColor;
    
    // This is a simplified check - in real tests you'd use a proper contrast checker
    expect(color).not.toBe(backgroundColor);
    expect(color).not.toBe('transparent');
  },

  /**
   * Test with reduced motion
   */
  testWithReducedMotion(testFunction) {
    const originalMatchMedia = window.matchMedia;
    
    window.matchMedia = jest.fn((query) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }));
    
    try {
      return testFunction();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  }
};

// Mobile testing utilities
export const MobileHelpers = {
  /**
   * Set mobile viewport
   */
  setMobileViewport(width = 375, height = 667) {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });
    
    // Trigger resize event
    window.dispatchEvent(new Event('resize'));
  },

  /**
   * Simulate touch events
   */
  async simulateTouch(element, type = 'tap') {
    const user = userEvent.setup();
    
    switch (type) {
      case 'tap':
        await user.click(element);
        break;
      case 'swipe-left':
        await user.pointer([
          { target: element, coords: { x: 100, y: 100 } },
          { coords: { x: 50, y: 100 } }
        ]);
        break;
      case 'swipe-right':
        await user.pointer([
          { target: element, coords: { x: 50, y: 100 } },
          { coords: { x: 100, y: 100 } }
        ]);
        break;
      default:
        throw new Error(`Unknown touch type: ${type}`);
    }
  },

  /**
   * Test responsive design
   */
  async testResponsiveBreakpoints(component, breakpoints = [375, 768, 1024, 1440]) {
    const results = {};
    
    for (const width of breakpoints) {
      this.setMobileViewport(width);
      await waitFor(() => {}, { timeout: 100 }); // Wait for resize
      
      results[width] = {
        layout: this.getLayoutInfo(component),
        visibility: this.getVisibilityInfo(component)
      };
    }
    
    return results;
  },

  /**
   * Get layout information
   */
  getLayoutInfo(element) {
    const rect = element.getBoundingClientRect();
    const styles = window.getComputedStyle(element);
    
    return {
      width: rect.width,
      height: rect.height,
      display: styles.display,
      flexDirection: styles.flexDirection,
      gridTemplate: styles.gridTemplate
    };
  },

  /**
   * Get visibility information
   */
  getVisibilityInfo(container) {
    const hiddenElements = container.querySelectorAll('[style*="display: none"]');
    const visibleElements = container.querySelectorAll(':not([style*="display: none"])');
    
    return {
      hidden: hiddenElements.length,
      visible: visibleElements.length
    };
  }
};

// Export all helper categories
export {
  TimeHelpers,
  DOMHelpers,
  MockHelpers,
  AssertionHelpers,
  DataHelpers,
  SetupHelpers,
  AsyncHelpers,
  PerformanceHelpers,
  A11yHelpers,
  MobileHelpers
};

// Default export with all helpers
export default {
  Time: TimeHelpers,
  DOM: DOMHelpers,
  Mock: MockHelpers,
  Assert: AssertionHelpers,
  Data: DataHelpers,
  Setup: SetupHelpers,
  Async: AsyncHelpers,
  Performance: PerformanceHelpers,
  A11y: A11yHelpers,
  Mobile: MobileHelpers
};
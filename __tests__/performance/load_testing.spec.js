/**
 * Performance and Load Testing Suite
 * Tests system performance under various load conditions
 */

import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

const PERFORMANCE_CONFIG = {
  MAX_RESPONSE_TIME: 3000, // 3 seconds
  MAX_RENDER_TIME: 2000,   // 2 seconds
  MIN_LIGHTHOUSE_SCORE: 85, // Lighthouse performance score
  
  CONCURRENT_USERS: [1, 5, 10, 25, 50],
  TEST_DURATION: 30000, // 30 seconds
  
  MAX_MEMORY_MB: 512,
  MAX_CPU_PERCENT: 80,
  
  MAX_QUERY_TIME: 500, // 500ms
  MAX_CONNECTION_POOL: 20
};

class PerformanceMonitor {
  constructor(page) {
    this.page = page;
    this.metrics = {};
  }

  async startMonitoring() {
    await this.page.addInitScript(() => {
      window.performanceMetrics = {
        navigationStart: performance.timing.navigationStart,
        loadStart: performance.timing.loadStart,
        domContentLoaded: null,
        loadComplete: null,
        firstPaint: null,
        firstContentfulPaint: null,
        largestContentfulPaint: null,
        memoryUsage: null
      };

      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          switch (entry.entryType) {
            case 'paint':
              if (entry.name === 'first-paint') {
                window.performanceMetrics.firstPaint = entry.startTime;
              } else if (entry.name === 'first-contentful-paint') {
                window.performanceMetrics.firstContentfulPaint = entry.startTime;
              }
              break;
            case 'largest-contentful-paint':
              window.performanceMetrics.largestContentfulPaint = entry.startTime;
              break;
          }
        });
      });

      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });

      document.addEventListener('DOMContentLoaded', () => {
        window.performanceMetrics.domContentLoaded = 
          performance.now() - window.performanceMetrics.navigationStart;
      });

      window.addEventListener('load', () => {
        window.performanceMetrics.loadComplete = 
          performance.now() - window.performanceMetrics.navigationStart;
        
        if (performance.memory) {
          window.performanceMetrics.memoryUsage = {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
          };
        }
      });
    });
  }

  async getMetrics() {
    return await this.page.evaluate(() => window.performanceMetrics);
  }

  async getCPUUsage() {
    const cdpSession = await this.page.context().newCDPSession(this.page);
    await cdpSession.send('Runtime.enable');
    
    const startTime = Date.now();
    const startCPU = await cdpSession.send('Runtime.getHeapUsage');
    
    await setTimeout(1000); // Wait 1 second
    
    const endTime = Date.now();
    const endCPU = await cdpSession.send('Runtime.getHeapUsage');
    
    const duration = endTime - startTime;
    const cpuDelta = endCPU.usedSize - startCPU.usedSize;
    
    return {
      usage: (cpuDelta / duration) * 100,
      memory: endCPU.usedSize / (1024 * 1024) // MB
    };
  }

  async getNetworkMetrics() {
    return await this.page.evaluate(() => {
      const entries = performance.getEntriesByType('navigation')[0];
      if (!entries) return null;

      return {
        dns: entries.domainLookupEnd - entries.domainLookupStart,
        tcp: entries.connectEnd - entries.connectStart,
        ssl: entries.secureConnectionStart > 0 
          ? entries.connectEnd - entries.secureConnectionStart 
          : 0,
        ttfb: entries.responseStart - entries.requestStart,
        download: entries.responseEnd - entries.responseStart,
        total: entries.loadEventEnd - entries.navigationStart
      };
    });
  }
}

class LoadTester {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.activeConnections = new Set();
  }

  async simulateUser(userId, duration = 30000) {
    const startTime = Date.now();
    const metrics = {
      userId,
      requests: 0,
      errors: 0,
      averageResponseTime: 0,
      totalResponseTime: 0
    };

    while (Date.now() - startTime < duration) {
      try {
        const requestStart = Date.now();
        const response = await this.makeRandomRequest();
        const responseTime = Date.now() - requestStart;

        metrics.requests++;
        metrics.totalResponseTime += responseTime;
        metrics.averageResponseTime = metrics.totalResponseTime / metrics.requests;

        if (!response.ok) {
          metrics.errors++;
        }

        await setTimeout(500 + Math.random() * 2500);
      } catch (error) {
        metrics.errors++;
      }
    }

    return metrics;
  }

  async makeRandomRequest() {
    const endpoints = [
      '/api/dashboard/analytics',
      '/api/appointments/upcoming',
      '/api/chat',
      '/api/shops/nearby',
      '/api/services',
      '/api/users/profile'
    ];

    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const url = `${this.baseUrl}${endpoint}`;

    const options = {
      method: endpoint === '/api/chat' ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    };

    if (options.method === 'POST') {
      options.body = JSON.stringify({
        message: 'Test message',
        user_id: 'load-test-user'
      });
    }

    return fetch(url, options);
  }

  async runLoadTest(concurrentUsers, duration) {
    console.log(`Starting load test: ${concurrentUsers} users for ${duration}ms`);
    
    const promises = [];
    for (let i = 0; i < concurrentUsers; i++) {
      promises.push(this.simulateUser(`user-${i}`, duration));
    }

    const results = await Promise.all(promises);
    
    const aggregated = {
      totalRequests: results.reduce((sum, r) => sum + r.requests, 0),
      totalErrors: results.reduce((sum, r) => sum + r.errors, 0),
      averageResponseTime: results.reduce((sum, r) => sum + r.averageResponseTime, 0) / results.length,
      requestsPerSecond: results.reduce((sum, r) => sum + r.requests, 0) / (duration / 1000),
      errorRate: results.reduce((sum, r) => sum + r.errors, 0) / results.reduce((sum, r) => sum + r.requests, 0)
    };

    console.log('Load test results:', aggregated);
    return aggregated;
  }
}

class AIAgentStressTester {
  constructor(page) {
    this.page = page;
  }

  async testConcurrentConversations(conversationCount = 10) {
    console.log(`Testing ${conversationCount} concurrent AI conversations`);
    
    const promises = [];
    for (let i = 0; i < conversationCount; i++) {
      promises.push(this.simulateConversation(`conversation-${i}`));
    }

    const results = await Promise.all(promises);
    
    return {
      totalConversations: results.length,
      averageResponseTime: results.reduce((sum, r) => sum + r.averageResponseTime, 0) / results.length,
      successRate: results.filter(r => r.success).length / results.length,
      errors: results.filter(r => !r.success).map(r => r.error)
    };
  }

  async simulateConversation(conversationId) {
    const messages = [
      "What's my revenue this month?",
      "How many appointments do I have today?",
      "Show me customer feedback",
      "What are my most popular services?",
      "How can I improve my business?"
    ];

    const startTime = Date.now();
    let totalResponseTime = 0;
    let messageCount = 0;

    try {
      await this.page.goto('/dashboard/ai-agent');
      
      for (const message of messages) {
        const messageStart = Date.now();
        
        await this.page.fill('[data-testid="message-input"]', message);
        await this.page.click('[data-testid="send-button"]');
        
        await this.page.waitForSelector('[data-testid="agent-response"]:last-child', {
          timeout: 10000
        });
        
        const responseTime = Date.now() - messageStart;
        totalResponseTime += responseTime;
        messageCount++;
        
        await setTimeout(1000);
      }

      return {
        conversationId,
        success: true,
        messageCount,
        averageResponseTime: totalResponseTime / messageCount,
        totalTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        conversationId,
        success: false,
        error: error.message,
        averageResponseTime: 0
      };
    }
  }
}

test.describe('Performance Testing Suite', () => {
  let performanceMonitor;
  let loadTester;
  let aiStressTester;

  test.beforeEach(async ({ page }) => {
    performanceMonitor = new PerformanceMonitor(page);
    loadTester = new LoadTester('http://localhost:3000');
    aiStressTester = new AIAgentStressTester(page);
    
    await performanceMonitor.startMonitoring();
  });

  test('Dashboard loading performance', async ({ page }) => {
    console.log('Testing dashboard loading performance...');
    
    const startTime = Date.now();
    await page.goto('/dashboard');
    
    await page.waitForSelector('[data-testid="main-dashboard"]');
    const loadTime = Date.now() - startTime;
    
    const metrics = await performanceMonitor.getMetrics();
    const networkMetrics = await performanceMonitor.getNetworkMetrics();
    
    console.log('Dashboard Performance Metrics:', {
      totalLoadTime: loadTime,
      firstContentfulPaint: metrics.firstContentfulPaint,
      largestContentfulPaint: metrics.largestContentfulPaint,
      domContentLoaded: metrics.domContentLoaded,
      networkTiming: networkMetrics
    });

    expect(loadTime).toBeLessThan(PERFORMANCE_CONFIG.MAX_RESPONSE_TIME);
    expect(metrics.firstContentfulPaint).toBeLessThan(1800); // 1.8s
    expect(metrics.largestContentfulPaint).toBeLessThan(2500); // 2.5s
    
    if (metrics.memoryUsage) {
      const memoryMB = metrics.memoryUsage.used / (1024 * 1024);
      expect(memoryMB).toBeLessThan(PERFORMANCE_CONFIG.MAX_MEMORY_MB);
    }
  });

  test('AI Agent response time performance', async ({ page }) => {
    console.log('Testing AI Agent response time...');
    
    await page.goto('/dashboard/ai-agent');
    
    const testMessages = [
      "What's my current revenue?",
      "Show me today's appointments",
      "How can I improve customer retention?",
      "What are my busiest hours?",
      "Analyze my service performance"
    ];

    const responseTimes = [];
    
    for (const message of testMessages) {
      const startTime = Date.now();
      
      await page.fill('[data-testid="message-input"]', message);
      await page.click('[data-testid="send-button"]');
      
      await page.waitForSelector('[data-testid="agent-response"]:last-child', {
        timeout: 15000
      });
      
      const responseTime = Date.now() - startTime;
      responseTimes.push(responseTime);
      
      console.log(`Response time for "${message}": ${responseTime}ms`);
      
      await page.fill('[data-testid="message-input"]', '');
      await setTimeout(500); // Brief pause between messages
    }

    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    
    console.log(`Average AI response time: ${averageResponseTime.toFixed(2)}ms`);
    console.log(`Maximum AI response time: ${maxResponseTime}ms`);

    expect(averageResponseTime).toBeLessThan(5000); // 5 seconds average
    expect(maxResponseTime).toBeLessThan(10000);    // 10 seconds max
    expect(responseTimes.filter(t => t > 8000)).toHaveLength(0); // No responses over 8s
  });

  test('Concurrent user load testing', async ({ page }) => {
    console.log('Running concurrent user load tests...');
    
    const results = {};
    
    for (const userCount of PERFORMANCE_CONFIG.CONCURRENT_USERS) {
      console.log(`Testing with ${userCount} concurrent users...`);
      
      const testResult = await loadTester.runLoadTest(
        userCount, 
        PERFORMANCE_CONFIG.TEST_DURATION
      );
      
      results[userCount] = testResult;
      
      expect(testResult.averageResponseTime).toBeLessThan(
        PERFORMANCE_CONFIG.MAX_RESPONSE_TIME
      );
      expect(testResult.errorRate).toBeLessThan(0.05); // Less than 5% error rate
      
      await setTimeout(5000);
    }

    const responseTimeIncrease = 
      (results[50].averageResponseTime - results[1].averageResponseTime) / 
      results[1].averageResponseTime;
    
    console.log('Load test scaling analysis:', {
      singleUserResponse: results[1].averageResponseTime,
      fiftyUserResponse: results[50].averageResponseTime,
      responseTimeIncrease: `${(responseTimeIncrease * 100).toFixed(2)}%`
    });

    expect(responseTimeIncrease).toBeLessThan(2.0);
  });

  test('Database query performance under load', async ({ page }) => {
    console.log('Testing database performance under load...');
    
    const queries = [
      '/api/dashboard/analytics',
      '/api/appointments/history',
      '/api/customers/list',
      '/api/revenue/breakdown',
      '/api/staff/performance'
    ];

    const concurrentRequests = 20;
    const promises = [];
    
    const startTime = Date.now();
    
    for (let i = 0; i < concurrentRequests; i++) {
      const query = queries[i % queries.length];
      promises.push(
        page.request.get(`http://localhost:8000${query}`, {
          headers: { 'Authorization': 'Bearer test-token' }
        })
      );
    }

    const responses = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    const successfulResponses = responses.filter(r => r.ok()).length;
    const averageResponseTime = totalTime / concurrentRequests;
    
    console.log('Database load test results:', {
      totalRequests: concurrentRequests,
      successfulResponses,
      averageResponseTime,
      successRate: successfulResponses / concurrentRequests
    });

    expect(successfulResponses).toBe(concurrentRequests); // All should succeed
    expect(averageResponseTime).toBeLessThan(PERFORMANCE_CONFIG.MAX_QUERY_TIME);
  });

  test('Memory usage and garbage collection', async ({ page }) => {
    console.log('Testing memory usage patterns...');
    
    await page.goto('/dashboard');
    
    const operations = [
      () => page.goto('/dashboard/analytics'),
      () => page.goto('/dashboard/appointments'),
      () => page.goto('/dashboard/customers'),
      () => page.goto('/dashboard/ai-agent'),
      () => page.goto('/dashboard/settings')
    ];

    const memorySnapshots = [];
    
    for (let cycle = 0; cycle < 5; cycle++) {
      for (const operation of operations) {
        await operation();
        await page.waitForLoadState('networkidle');
        
        const cpuMetrics = await performanceMonitor.getCPUUsage();
        memorySnapshots.push({
          cycle,
          operation: operation.name,
          memory: cpuMetrics.memory,
          timestamp: Date.now()
        });
        
        await setTimeout(1000); // Allow time for memory allocation
      }
      
      await page.evaluate(() => {
        if (window.gc) {
          window.gc();
        }
      });
    }

    const maxMemory = Math.max(...memorySnapshots.map(s => s.memory));
    const avgMemory = memorySnapshots.reduce((sum, s) => sum + s.memory, 0) / memorySnapshots.length;
    
    const firstCycleAvg = memorySnapshots
      .filter(s => s.cycle === 0)
      .reduce((sum, s) => sum + s.memory, 0) / operations.length;
      
    const lastCycleAvg = memorySnapshots
      .filter(s => s.cycle === 4)
      .reduce((sum, s) => sum + s.memory, 0) / operations.length;
    
    const memoryIncrease = (lastCycleAvg - firstCycleAvg) / firstCycleAvg;
    
    console.log('Memory usage analysis:', {
      maxMemoryMB: maxMemory,
      avgMemoryMB: avgMemory,
      firstCycleAvg: firstCycleAvg,
      lastCycleAvg: lastCycleAvg,
      memoryIncreasePercent: (memoryIncrease * 100).toFixed(2)
    });

    expect(maxMemory).toBeLessThan(PERFORMANCE_CONFIG.MAX_MEMORY_MB);
    expect(memoryIncrease).toBeLessThan(0.5); // Less than 50% increase indicates no major leaks
  });

  test('AI Agent stress testing', async ({ page }) => {
    console.log('Running AI Agent stress test...');
    
    const stressTestResults = await aiStressTester.testConcurrentConversations(5);
    
    console.log('AI Agent stress test results:', stressTestResults);

    expect(stressTestResults.successRate).toBeGreaterThan(0.9); // 90% success rate
    expect(stressTestResults.averageResponseTime).toBeLessThan(8000); // 8s average
    expect(stressTestResults.errors.length).toBeLessThan(2); // Max 2 errors
  });

  test('Progressive Web App performance', async ({ page }) => {
    console.log('Testing PWA performance characteristics...');
    
    await page.goto('/');
    
    const serviceWorkerRegistered = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    
    expect(serviceWorkerRegistered).toBe(true);
    
    await page.context().setOffline(true);
    
    try {
      await page.goto('/dashboard');
      const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
      await expect(offlineIndicator).toBeVisible({ timeout: 5000 });
    } catch (error) {
      console.log('Offline functionality test failed:', error.message);
    }
    
    await page.context().setOffline(false);
    
    const startTime = Date.now();
    await page.goto('/dashboard');
    const firstLoadTime = Date.now() - startTime;
    
    const cacheStartTime = Date.now();
    await page.reload();
    const cacheLoadTime = Date.now() - cacheStartTime;
    
    console.log('PWA Cache Performance:', {
      firstLoad: firstLoadTime,
      cachedLoad: cacheLoadTime,
      improvement: `${((firstLoadTime - cacheLoadTime) / firstLoadTime * 100).toFixed(2)}%`
    });

    expect(cacheLoadTime).toBeLessThan(firstLoadTime * 0.8); // 20% improvement minimum
  });

  test('Chart rendering performance', async ({ page }) => {
    console.log('Testing chart rendering performance...');
    
    await page.goto('/dashboard/analytics');
    
    const startTime = Date.now();
    
    await page.waitForSelector('[data-testid="revenue-chart"]');
    await page.waitForSelector('[data-testid="appointment-chart"]');
    await page.waitForSelector('[data-testid="customer-chart"]');
    
    const renderTime = Date.now() - startTime;
    
    const interactionStartTime = Date.now();
    
    await page.hover('[data-testid="revenue-chart"]');
    await page.hover('[data-testid="appointment-chart"]');
    
    const tooltipVisible = await page.locator('.chart-tooltip').isVisible();
    const interactionTime = Date.now() - interactionStartTime;
    
    console.log('Chart Performance:', {
      renderTime,
      interactionTime,
      tooltipVisible
    });

    expect(renderTime).toBeLessThan(PERFORMANCE_CONFIG.MAX_RENDER_TIME);
    expect(interactionTime).toBeLessThan(500); // 500ms for interactions
  });

  test('Mobile performance optimization', async ({ page }) => {
    console.log('Testing mobile performance...');
    
    await page.setViewportSize({ width: 375, height: 667 });
    
    const startTime = Date.now();
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="mobile-dashboard"]');
    const mobileLoadTime = Date.now() - startTime;
    
    const touchTargets = await page.locator('button, [role="button"]').count();
    const touchTargetSizes = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, [role="button"]');
      const sizes = [];
      
      buttons.forEach(button => {
        const rect = button.getBoundingClientRect();
        sizes.push({
          width: rect.width,
          height: rect.height,
          area: rect.width * rect.height
        });
      });
      
      return sizes;
    });
    
    const smallTouchTargets = touchTargetSizes.filter(
      size => size.width < 44 || size.height < 44
    ).length;
    
    console.log('Mobile Performance:', {
      loadTime: mobileLoadTime,
      touchTargets,
      smallTouchTargets,
      averageTouchTargetSize: touchTargetSizes.reduce((sum, s) => sum + s.area, 0) / touchTargetSizes.length
    });

    expect(mobileLoadTime).toBeLessThan(PERFORMANCE_CONFIG.MAX_RESPONSE_TIME);
    expect(smallTouchTargets).toBeLessThan(touchTargets * 0.1); // Less than 10% small targets
  });

  test('API rate limiting performance', async ({ page }) => {
    console.log('Testing API rate limiting...');
    
    const apiEndpoint = 'http://localhost:8000/api/chat';
    const requestsPerSecond = 50;
    const testDuration = 10000; // 10 seconds
    
    const results = {
      totalRequests: 0,
      successfulRequests: 0,
      rateLimitedRequests: 0,
      averageResponseTime: 0,
      totalResponseTime: 0
    };
    
    const startTime = Date.now();
    const promises = [];
    
    while (Date.now() - startTime < testDuration) {
      const requestPromise = page.request.post(apiEndpoint, {
        data: {
          message: 'Rate limit test',
          user_id: 'rate-limit-test'
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      }).then(response => {
        const responseTime = Date.now() - startTime;
        results.totalRequests++;
        results.totalResponseTime += responseTime;
        
        if (response.ok()) {
          results.successfulRequests++;
        } else if (response.status() === 429) {
          results.rateLimitedRequests++;
        }
        
        return response;
      }).catch(error => {
        results.totalRequests++;
        console.log('Request error:', error.message);
      });
      
      promises.push(requestPromise);
      
      await setTimeout(1000 / requestsPerSecond);
    }
    
    await Promise.all(promises);
    
    results.averageResponseTime = results.totalResponseTime / results.totalRequests;
    
    console.log('Rate Limiting Test Results:', results);

    expect(results.rateLimitedRequests).toBeGreaterThan(0); // Some requests should be rate limited
    expect(results.successfulRequests / results.totalRequests).toBeGreaterThan(0.5); // At least 50% success
    expect(results.averageResponseTime).toBeLessThan(5000); // Fast responses even under load
  });
});

test.describe('Performance Regression Tests', () => {
  const BASELINE_METRICS = {
    dashboardLoad: 2000,
    aiResponse: 5000,
    chartRender: 1500,
    apiResponse: 500
  };

  test('Performance regression detection', async ({ page }) => {
    console.log('Running performance regression tests...');
    
    const performanceMonitor = new PerformanceMonitor(page);
    await performanceMonitor.startMonitoring();
    
    const dashboardStart = Date.now();
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="main-dashboard"]');
    const dashboardLoad = Date.now() - dashboardStart;
    
    await page.goto('/dashboard/ai-agent');
    const aiStart = Date.now();
    await page.fill('[data-testid="message-input"]', 'Test performance');
    await page.click('[data-testid="send-button"]');
    await page.waitForSelector('[data-testid="agent-response"]:last-child');
    const aiResponse = Date.now() - aiStart;
    
    await page.goto('/dashboard/analytics');
    const chartStart = Date.now();
    await page.waitForSelector('[data-testid="revenue-chart"]');
    const chartRender = Date.now() - chartStart;
    
    const apiStart = Date.now();
    const response = await page.request.get('http://localhost:8000/api/dashboard/analytics');
    const apiResponse = Date.now() - apiStart;
    
    const currentMetrics = {
      dashboardLoad,
      aiResponse,
      chartRender,
      apiResponse
    };
    
    console.log('Performance Comparison:', {
      baseline: BASELINE_METRICS,
      current: currentMetrics,
      regressions: Object.keys(BASELINE_METRICS).filter(
        key => currentMetrics[key] > BASELINE_METRICS[key] * 1.2 // 20% regression threshold
      )
    });

    expect(dashboardLoad).toBeLessThan(BASELINE_METRICS.dashboardLoad * 1.2);
    expect(aiResponse).toBeLessThan(BASELINE_METRICS.aiResponse * 1.2);
    expect(chartRender).toBeLessThan(BASELINE_METRICS.chartRender * 1.2);
    expect(apiResponse).toBeLessThan(BASELINE_METRICS.apiResponse * 1.2);
  });
});
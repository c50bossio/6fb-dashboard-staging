import { test, expect } from '@playwright/test'

/**
 * 6FB AI Agent System - Performance Testing Suite
 * Tests Core Web Vitals, loading times, and performance metrics
 * Part of the Triple Tool Approach: Performance monitoring with Playwright
 */

test.describe('Performance Tests - Core Web Vitals @performance', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.webVitals = {
        fcp: null,
        lcp: null,
        fid: null,
        cls: null,
        ttfb: null
      }

      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            window.webVitals.fcp = entry.startTime
          }
        })
      }).observe({ entryTypes: ['paint'] })

      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        window.webVitals.lcp = lastEntry.startTime
      }).observe({ entryTypes: ['largest-contentful-paint'] })

      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          window.webVitals.fid = entry.processingStart - entry.startTime
        })
      }).observe({ entryTypes: ['first-input'] })

      let clsValue = 0
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        }
        window.webVitals.cls = clsValue
      }).observe({ entryTypes: ['layout-shift'] })

      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (entry.name === location.href) {
            window.webVitals.ttfb = entry.responseStart - entry.requestStart
          }
        })
      }).observe({ entryTypes: ['navigation'] })
    })
  })

  test('homepage loads with acceptable Core Web Vitals', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/')
    
    await page.waitForLoadState('networkidle')
    
    const loadTime = Date.now() - startTime
    
    const webVitals = await page.evaluate(() => window.webVitals)
    
    console.log('Core Web Vitals:', webVitals)
    
    expect(webVitals.fcp).toBeLessThan(1800)
    
    expect(webVitals.lcp).toBeLessThan(2500)
    
    expect(webVitals.cls).toBeLessThan(0.1)
    
    expect(webVitals.ttfb).toBeLessThan(600)
    
    expect(loadTime).toBeLessThan(3000)
  })

  test('dashboard loads efficiently with data', async ({ page }) => {
    await page.goto('/dashboard')
    
    const navigationStart = await page.evaluate(() => performance.timing.navigationStart)
    const loadComplete = await page.evaluate(() => performance.timing.loadEventEnd)
    const initialLoadTime = loadComplete - navigationStart
    
    expect(initialLoadTime).toBeLessThan(2000)
    
    await page.waitForSelector('[data-testid="stats-cards"]')
    
    const webVitals = await page.evaluate(() => window.webVitals)
    
    expect(webVitals.fcp).toBeLessThan(1500)
    expect(webVitals.lcp).toBeLessThan(2000)
    expect(webVitals.cls).toBeLessThan(0.05) // Stricter for dashboard
    
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0]
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        domInteractive: navigation.domInteractive - navigation.navigationStart,
        domComplete: navigation.domComplete - navigation.navigationStart
      }
    })
    
    expect(performanceMetrics.domContentLoaded).toBeLessThan(1000)
    expect(performanceMetrics.domInteractive).toBeLessThan(1500)
    expect(performanceMetrics.domComplete).toBeLessThan(2500)
  })

  test('booking flow maintains performance across steps', async ({ page }) => {
    const stepPerformance = []
    
    const step1Start = Date.now()
    await page.goto('/booking')
    await page.waitForSelector('[data-testid="service-grid"]')
    stepPerformance.push({
      step: 1,
      loadTime: Date.now() - step1Start
    })
    
    await page.click('[data-testid="service-haircut-classic"]')
    await page.click('[data-testid="barber-john-smith"]')
    
    const step2Start = Date.now()
    await page.click('[data-testid="next-button"]')
    await page.waitForSelector('[data-testid="date-picker"]')
    stepPerformance.push({
      step: 2,
      loadTime: Date.now() - step2Start
    })
    
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    
    await page.click(`[data-testid="date-${tomorrowStr}"]`)
    await page.waitForSelector('[data-testid="time-slots"]')
    await page.click('[data-testid="time-slot-10:00"]')
    
    const step3Start = Date.now()
    await page.click('[data-testid="next-button"]')
    await page.waitForSelector('[data-testid="booking-summary"]')
    stepPerformance.push({
      step: 3,
      loadTime: Date.now() - step3Start
    })
    
    stepPerformance.forEach(({ step, loadTime }) => {
      console.log(`Step ${step} load time: ${loadTime}ms`)
      expect(loadTime).toBeLessThan(1000) // Each step should load in under 1s
    })
    
    const webVitals = await page.evaluate(() => window.webVitals)
    expect(webVitals.cls).toBeLessThan(0.1) // Layout should be stable throughout
  })

  test('AI agents interface performs well under load', async ({ page }) => {
    await page.goto('/dashboard/agents')
    
    await page.waitForSelector('[data-testid="agents-grid"]')
    
    const selectionStart = Date.now()
    await page.click('[data-testid="agent-financial"]')
    await page.waitForSelector('[data-testid="chat-interface"]')
    const selectionTime = Date.now() - selectionStart
    
    expect(selectionTime).toBeLessThan(500)
    
    const messageStart = Date.now()
    await page.fill('[data-testid="message-input"]', 'Test performance message')
    await page.click('[data-testid="send-button"]')
    await page.waitForSelector('[data-testid="agent-response"]')
    const messageTime = Date.now() - messageStart
    
    expect(messageTime).toBeLessThan(1000)
    
    const memoryUsage = await page.evaluate(() => {
      if (performance.memory) {
        return {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        }
      }
      return null
    })
    
    if (memoryUsage) {
      const memoryUsageRatio = memoryUsage.used / memoryUsage.total
      expect(memoryUsageRatio).toBeLessThan(0.8) // Should use less than 80% of available heap
    }
  })

  test('image loading and optimization', async ({ page }) => {
    await page.goto('/dashboard')
    
    const imageLoadTimes = []
    
    page.on('response', async (response) => {
      if (response.url().match(/\.(jpg|jpeg|png|webp|avif)$/)) {
        const timing = response.timing()
        imageLoadTimes.push({
          url: response.url(),
          loadTime: timing.responseEnd - timing.requestStart,
          size: (await response.body()).length
        })
      }
    })
    
    await page.waitForLoadState('networkidle')
    
    imageLoadTimes.forEach(({ url, loadTime, size }) => {
      console.log(`Image: ${url.split('/').pop()}, Load time: ${loadTime}ms, Size: ${size} bytes`)
      
      expect(loadTime).toBeLessThan(2000)
      
      expect(size).toBeLessThan(500 * 1024)
    })
    
    const modernFormats = imageLoadTimes.filter(img => 
      img.url.includes('.webp') || img.url.includes('.avif')
    )
    
    expect(modernFormats.length / imageLoadTimes.length).toBeGreaterThan(0.5)
  })

  test('JavaScript bundle size and loading', async ({ page }) => {
    const resourceMetrics = []
    
    page.on('response', async (response) => {
      if (response.url().includes('.js') && !response.url().includes('node_modules')) {
        const size = (await response.body()).length
        const timing = response.timing()
        
        resourceMetrics.push({
          url: response.url(),
          size: size,
          loadTime: timing.responseEnd - timing.requestStart,
          type: 'javascript'
        })
      }
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const totalJSSize = resourceMetrics.reduce((total, resource) => total + resource.size, 0)
    const maxBundleSize = Math.max(...resourceMetrics.map(r => r.size))
    const avgLoadTime = resourceMetrics.reduce((total, r) => total + r.loadTime, 0) / resourceMetrics.length
    
    console.log('JavaScript Bundle Analysis:')
    console.log(`Total JS size: ${(totalJSSize / 1024).toFixed(2)} KB`)
    console.log(`Largest bundle: ${(maxBundleSize / 1024).toFixed(2)} KB`)
    console.log(`Average load time: ${avgLoadTime.toFixed(2)}ms`)
    
    expect(totalJSSize).toBeLessThan(1024 * 1024) // Total JS < 1MB
    expect(maxBundleSize).toBeLessThan(500 * 1024) // Largest bundle < 500KB
    expect(avgLoadTime).toBeLessThan(1000) // Average load time < 1s
  })

  test('CSS performance and critical path', async ({ page }) => {
    const cssMetrics = []
    
    page.on('response', async (response) => {
      if (response.url().includes('.css')) {
        const size = (await response.body()).length
        const timing = response.timing()
        
        cssMetrics.push({
          url: response.url(),
          size: size,
          loadTime: timing.responseEnd - timing.requestStart,
          type: 'css'
        })
      }
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const totalCSSSize = cssMetrics.reduce((total, resource) => total + resource.size, 0)
    const avgCSSLoadTime = cssMetrics.reduce((total, r) => total + r.loadTime, 0) / cssMetrics.length
    
    console.log('CSS Performance Analysis:')
    console.log(`Total CSS size: ${(totalCSSSize / 1024).toFixed(2)} KB`)
    console.log(`Average CSS load time: ${avgCSSLoadTime.toFixed(2)}ms`)
    
    expect(totalCSSSize).toBeLessThan(100 * 1024) // Total CSS < 100KB
    expect(avgCSSLoadTime).toBeLessThan(500) // CSS should load quickly
    
    const renderBlockingCSS = await page.evaluate(() => {
      const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      return stylesheets.filter(link => 
        !link.hasAttribute('media') || link.media === 'all' || link.media === 'screen'
      ).length
    })
    
    expect(renderBlockingCSS).toBeLessThan(3)
  })

  test('API response times and caching', async ({ page }) => {
    const apiMetrics = []
    
    page.on('response', async (response) => {
      if (response.url().includes('/api/')) {
        const timing = response.timing()
        const cacheStatus = response.headers()['cache-control'] || 'no-cache'
        
        apiMetrics.push({
          url: response.url(),
          status: response.status(),
          loadTime: timing.responseEnd - timing.requestStart,
          cacheControl: cacheStatus,
          method: response.request().method()
        })
      }
    })
    
    await page.goto('/dashboard')
    await page.waitForSelector('[data-testid="stats-cards"]')
    
    await page.goto('/dashboard/agents')
    await page.waitForSelector('[data-testid="agents-grid"]')
    
    await page.goto('/dashboard/integrations')
    await page.waitForSelector('[data-testid="integrations-grid"]')
    
    const avgApiResponseTime = apiMetrics.reduce((total, api) => total + api.loadTime, 0) / apiMetrics.length
    const slowAPIs = apiMetrics.filter(api => api.loadTime > 1000)
    const cachedAPIs = apiMetrics.filter(api => api.cacheControl.includes('max-age'))
    
    console.log('API Performance Analysis:')
    console.log(`Average API response time: ${avgApiResponseTime.toFixed(2)}ms`)
    console.log(`Slow APIs (>1s): ${slowAPIs.length}`)
    console.log(`Cached APIs: ${cachedAPIs.length}/${apiMetrics.length}`)
    
    expect(avgApiResponseTime).toBeLessThan(500) // Average API response < 500ms
    expect(slowAPIs.length).toBeLessThan(2) // Max 2 slow APIs
    expect(cachedAPIs.length / apiMetrics.length).toBeGreaterThan(0.5) // 50%+ should be cached
    
    const failedAPIs = apiMetrics.filter(api => api.status >= 400)
    expect(failedAPIs.length).toBe(0) // No failed API calls
  })

  test('mobile performance optimization', async ({ page }) => {
    await page.emulate({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      viewport: { width: 375, height: 667 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    })
    
    await page.context().newCDPSession(page).then(session =>
      session.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 400 * 1024 / 8, // 400 Kbps
        uploadThroughput: 400 * 1024 / 8,
        latency: 2000 // 2s latency
      })
    )
    
    const mobileStart = Date.now()
    await page.goto('/')
    await page.waitForSelector('[data-testid="mobile-header"]')
    const mobileLoadTime = Date.now() - mobileStart
    
    expect(mobileLoadTime).toBeLessThan(5000) // 5s on slow 3G
    
    const mobileWebVitals = await page.evaluate(() => window.webVitals)
    
    expect(mobileWebVitals.fcp).toBeLessThan(3000)
    expect(mobileWebVitals.lcp).toBeLessThan(4000)
    expect(mobileWebVitals.cls).toBeLessThan(0.1)
  })

  test('memory usage and cleanup', async ({ page }) => {
    await page.goto('/dashboard/agents')
    
    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="agent-financial"]')
      await page.fill('[data-testid="message-input"]', `Test message ${i}`)
      await page.click('[data-testid="send-button"]')
      await page.waitForTimeout(100)
      
      await page.click('[data-testid="agent-operations"]')
      await page.waitForTimeout(100)
    }
    
    await page.evaluate(() => {
      if (window.gc) {
        window.gc()
      }
    })
    
    const finalMemory = await page.evaluate(() => {
      if (performance.memory) {
        return {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize
        }
      }
      return null
    })
    
    if (finalMemory) {
      const memoryUsageRatio = finalMemory.used / finalMemory.total
      console.log(`Memory usage: ${(finalMemory.used / 1024 / 1024).toFixed(2)}MB / ${(finalMemory.total / 1024 / 1024).toFixed(2)}MB (${(memoryUsageRatio * 100).toFixed(1)}%)`)
      
      expect(memoryUsageRatio).toBeLessThan(0.9)
    }
  })

  test('third-party script performance impact', async ({ page }) => {
    const thirdPartyMetrics = []
    
    page.on('response', async (response) => {
      const url = response.url()
      
      const isThirdParty = !url.includes(page.url().split('/')[2]) && 
                          (url.includes('.js') || url.includes('analytics') || url.includes('tracking'))
      
      if (isThirdParty) {
        const timing = response.timing()
        const size = (await response.body()).length
        
        thirdPartyMetrics.push({
          url: url,
          loadTime: timing.responseEnd - timing.requestStart,
          size: size,
          domain: new URL(url).hostname
        })
      }
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const totalThirdPartySize = thirdPartyMetrics.reduce((total, script) => total + script.size, 0)
    const avgThirdPartyLoad = thirdPartyMetrics.reduce((total, script) => total + script.loadTime, 0) / thirdPartyMetrics.length
    
    console.log('Third-party Script Analysis:')
    console.log(`Total third-party size: ${(totalThirdPartySize / 1024).toFixed(2)} KB`)
    console.log(`Average load time: ${avgThirdPartyLoad?.toFixed(2) || 0}ms`)
    console.log(`Number of third-party domains: ${new Set(thirdPartyMetrics.map(s => s.domain)).size}`)
    
    expect(totalThirdPartySize).toBeLessThan(200 * 1024) // < 200KB total
    expect(new Set(thirdPartyMetrics.map(s => s.domain)).size).toBeLessThan(5) // < 5 third-party domains
  })
})

test.describe('Performance Tests - Stress Testing', () => {
  test('handles large datasets efficiently', async ({ page }) => {
    await page.route('**/api/appointments', route => {
      const largeDataset = await fetchFromDatabase({ limit: 1000 }, (_, i) => ({
        id: i + 1,
        client: `Client ${i + 1}`,
        service: `Service ${i % 10}`,
        date: new Date().toISOString(),
        status: 'confirmed'
      }))
      route.fulfill({ json: largeDataset })
    })
    
    const loadStart = Date.now()
    await page.goto('/dashboard')
    await page.waitForSelector('[data-testid="appointments-table"]')
    const loadTime = Date.now() - loadStart
    
    expect(loadTime).toBeLessThan(3000)
    
    const renderedItems = await page.locator('[data-testid^="appointment-"]').count()
    expect(renderedItems).toBeLessThan(100) // Should virtualize large lists
  })

  test('maintains performance during rapid interactions', async ({ page }) => {
    await page.goto('/dashboard/agents')
    
    const interactionTimes = []
    
    for (let i = 0; i < 20; i++) {
      const start = Date.now()
      
      await page.click(`[data-testid="agent-${i % 7}"]`)
      await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 2000 })
      
      const interactionTime = Date.now() - start
      interactionTimes.push(interactionTime)
    }
    
    const avgInteractionTime = interactionTimes.reduce((a, b) => a + b, 0) / interactionTimes.length
    const maxInteractionTime = Math.max(...interactionTimes)
    const performanceDecay = interactionTimes[interactionTimes.length - 1] - interactionTimes[0]
    
    console.log(`Average interaction time: ${avgInteractionTime.toFixed(2)}ms`)
    console.log(`Max interaction time: ${maxInteractionTime}ms`)
    console.log(`Performance decay: ${performanceDecay}ms`)
    
    expect(avgInteractionTime).toBeLessThan(500)
    expect(maxInteractionTime).toBeLessThan(1000)
    expect(Math.abs(performanceDecay)).toBeLessThan(200) // Should not degrade significantly
  })
})
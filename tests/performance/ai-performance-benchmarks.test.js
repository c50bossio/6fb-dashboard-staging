/**
 * PERFORMANCE BENCHMARKS FOR AI AND BUSINESS INTELLIGENCE FEATURES
 * 
 * Tests AI response times, dashboard loading performance, and system scalability
 * Covers multi-model AI performance and business intelligence query optimization
 */

const { performance, PerformanceObserver } = require('perf_hooks')
const fetch = require('node-fetch')

describe('AI Performance Benchmarks', () => {
  const performanceMetrics = {
    aiResponseTimes: [],
    dashboardLoadTimes: [],
    apiResponseTimes: [],
    memoryUsage: [],
    cpuUsage: []
  }

  const PERFORMANCE_THRESHOLDS = {
    AI_RESPONSE_MAX: 5000,        // 5 seconds max for AI responses
    DASHBOARD_LOAD_MAX: 3000,     // 3 seconds max for dashboard load
    API_RESPONSE_MAX: 1000,       // 1 second max for API responses
    MEMORY_USAGE_MAX: 500 * 1024 * 1024, // 500MB max memory usage
    CONCURRENT_REQUESTS_MIN: 10   // Handle at least 10 concurrent requests
  }

  beforeAll(() => {
    // Setup performance monitoring
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        performanceMetrics[entry.name] = entry.duration
      }
    })
    observer.observe({ entryTypes: ['measure'] })
  })

  afterAll(() => {
    // Generate performance report
    generatePerformanceReport()
  })

  describe('AI Model Response Performance', () => {
    test('GPT-5 response time benchmark', async () => {
      const startTime = performance.now()
      
      const response = await fetch('http://localhost:8001/api/ai/unified-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Analyze our revenue trends' }],
          provider: 'openai',
          model: 'gpt-5',
          barbershopId: 'perf-test-001'
        })
      })
      
      const endTime = performance.now()
      const responseTime = endTime - startTime
      
      expect(response.ok).toBe(true)
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.AI_RESPONSE_MAX)
      
      performanceMetrics.aiResponseTimes.push({
        model: 'gpt-5',
        responseTime,
        timestamp: new Date()
      })
    })

    test('Claude Opus 4.1 response time benchmark', async () => {
      const startTime = performance.now()
      
      const response = await fetch('http://localhost:8001/api/ai/unified-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Generate customer behavior insights' }],
          provider: 'anthropic',
          model: 'claude-opus-4.1',
          barbershopId: 'perf-test-001'
        })
      })
      
      const endTime = performance.now()
      const responseTime = endTime - startTime
      
      expect(response.ok).toBe(true)
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.AI_RESPONSE_MAX)
      
      performanceMetrics.aiResponseTimes.push({
        model: 'claude-opus-4.1',
        responseTime,
        timestamp: new Date()
      })
    })

    test('Gemini 2.0 Flash response time benchmark', async () => {
      const startTime = performance.now()
      
      const response = await fetch('http://localhost:8001/api/ai/unified-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Optimize pricing strategy' }],
          provider: 'google',
          model: 'gemini-2.0-flash',
          barbershopId: 'perf-test-001'
        })
      })
      
      const endTime = performance.now()
      const responseTime = endTime - startTime
      
      expect(response.ok).toBe(true)
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.AI_RESPONSE_MAX)
      
      performanceMetrics.aiResponseTimes.push({
        model: 'gemini-2.0-flash',
        responseTime,
        timestamp: new Date()
      })
    })

    test('AI model switching performance', async () => {
      const models = [
        { provider: 'openai', model: 'gpt-5' },
        { provider: 'anthropic', model: 'claude-opus-4.1' },
        { provider: 'google', model: 'gemini-2.0-flash' }
      ]
      
      const switchingTimes = []
      
      for (let i = 0; i < models.length; i++) {
        const currentModel = models[i]
        const nextModel = models[(i + 1) % models.length]
        
        // First request
        await fetch('http://localhost:8001/api/ai/unified-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: `Test with ${currentModel.model}` }],
            provider: currentModel.provider,
            model: currentModel.model,
            barbershopId: 'perf-test-001'
          })
        })
        
        // Switch to next model
        const switchStart = performance.now()
        
        const switchResponse = await fetch('http://localhost:8001/api/ai/unified-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: `Switch to ${nextModel.model}` }],
            provider: nextModel.provider,
            model: nextModel.model,
            barbershopId: 'perf-test-001'
          })
        })
        
        const switchEnd = performance.now()
        const switchTime = switchEnd - switchStart
        
        expect(switchResponse.ok).toBe(true)
        expect(switchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.AI_RESPONSE_MAX)
        
        switchingTimes.push({
          from: currentModel.model,
          to: nextModel.model,
          switchTime
        })
      }
      
      // Average switching time should be reasonable
      const avgSwitchTime = switchingTimes.reduce((sum, item) => sum + item.switchTime, 0) / switchingTimes.length
      expect(avgSwitchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.AI_RESPONSE_MAX)
    })
  })

  describe('Predictive Analytics Performance', () => {
    test('dashboard loading performance benchmark', async () => {
      const startTime = performance.now()
      
      const response = await fetch('http://localhost:8001/api/ai/predictive?barbershop_id=perf-test-001')
      
      const endTime = performance.now()
      const loadTime = endTime - startTime
      
      expect(response.ok).toBe(true)
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DASHBOARD_LOAD_MAX)
      
      performanceMetrics.dashboardLoadTimes.push({
        loadTime,
        timestamp: new Date()
      })
    })

    test('revenue forecasting performance', async () => {
      const startTime = performance.now()
      
      const response = await fetch('http://localhost:8001/api/ai/predictive-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prediction_type: 'revenue_forecast',
          barbershop_id: 'perf-test-001',
          parameters: { timeframe: 30, confidence_level: 0.85 }
        })
      })
      
      const endTime = performance.now()
      const forecastTime = endTime - startTime
      
      expect(response.ok).toBe(true)
      expect(forecastTime).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_MAX * 3) // Allow 3x for complex calculations
      
      performanceMetrics.apiResponseTimes.push({
        operation: 'revenue_forecast',
        responseTime: forecastTime,
        timestamp: new Date()
      })
    })

    test('demand prediction performance', async () => {
      const startTime = performance.now()
      
      const response = await fetch('http://localhost:8001/api/ai/predictive-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prediction_type: 'demand_prediction',
          barbershop_id: 'perf-test-001'
        })
      })
      
      const endTime = performance.now()
      const predictionTime = endTime - startTime
      
      expect(response.ok).toBe(true)
      expect(predictionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_MAX * 2)
      
      performanceMetrics.apiResponseTimes.push({
        operation: 'demand_prediction',
        responseTime: predictionTime,
        timestamp: new Date()
      })
    })

    test('customer behavior analysis performance', async () => {
      const startTime = performance.now()
      
      const response = await fetch('http://localhost:8001/api/ai/predictive-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prediction_type: 'customer_behavior',
          barbershop_id: 'perf-test-001',
          parameters: { analysis_type: 'churn_prediction' }
        })
      })
      
      const endTime = performance.now()
      const analysisTime = endTime - startTime
      
      expect(response.ok).toBe(true)
      expect(analysisTime).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_MAX * 2)
      
      performanceMetrics.apiResponseTimes.push({
        operation: 'customer_behavior',
        responseTime: analysisTime,
        timestamp: new Date()
      })
    })

    test('comprehensive analytics compilation performance', async () => {
      const startTime = performance.now()
      
      // Simulate loading all analytics components simultaneously
      const requests = [
        fetch('http://localhost:8001/api/ai/predictive?barbershop_id=perf-test-001'),
        fetch('http://localhost:8001/api/ai/predictive-analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prediction_type: 'revenue_forecast',
            barbershop_id: 'perf-test-001',
            parameters: { timeframe: 30 }
          })
        }),
        fetch('http://localhost:8001/api/ai/predictive-analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prediction_type: 'demand_prediction',
            barbershop_id: 'perf-test-001'
          })
        })
      ]
      
      const responses = await Promise.all(requests)
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      
      expect(responses.every(r => r.ok)).toBe(true)
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DASHBOARD_LOAD_MAX)
      
      performanceMetrics.dashboardLoadTimes.push({
        operation: 'comprehensive_analytics',
        loadTime: totalTime,
        timestamp: new Date()
      })
    })
  })

  describe('Concurrent Request Performance', () => {
    test('handles concurrent AI requests efficiently', async () => {
      const concurrentRequests = Array.from({ length: PERFORMANCE_THRESHOLDS.CONCURRENT_REQUESTS_MIN }, (_, i) => 
        fetch('http://localhost:8001/api/ai/unified-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: `Concurrent request ${i}` }],
            provider: 'openai',
            model: 'gpt-5',
            barbershopId: 'perf-test-001'
          })
        })
      )
      
      const startTime = performance.now()
      const responses = await Promise.all(concurrentRequests)
      const endTime = performance.now()
      
      const totalTime = endTime - startTime
      const avgResponseTime = totalTime / responses.length
      
      expect(responses.every(r => r.ok)).toBe(true)
      expect(avgResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.AI_RESPONSE_MAX)
      
      performanceMetrics.apiResponseTimes.push({
        operation: 'concurrent_ai_requests',
        requestCount: responses.length,
        totalTime,
        avgResponseTime,
        timestamp: new Date()
      })
    })

    test('maintains performance under analytics load', async () => {
      const analyticsRequests = Array.from({ length: 5 }, () => 
        fetch('http://localhost:8001/api/ai/predictive?barbershop_id=perf-test-001')
      )
      
      const startTime = performance.now()
      const responses = await Promise.all(analyticsRequests)
      const endTime = performance.now()
      
      const totalTime = endTime - startTime
      const avgResponseTime = totalTime / responses.length
      
      expect(responses.every(r => r.ok)).toBe(true)
      expect(avgResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DASHBOARD_LOAD_MAX)
    })
  })

  describe('Memory and Resource Usage', () => {
    test('AI processing memory efficiency', async () => {
      const initialMemory = process.memoryUsage()
      
      // Perform multiple AI operations
      const aiOperations = []
      for (let i = 0; i < 10; i++) {
        aiOperations.push(
          fetch('http://localhost:8001/api/ai/unified-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{ role: 'user', content: `Memory test ${i}` }],
              provider: 'openai',
              model: 'gpt-5',
              barbershopId: 'perf-test-001'
            })
          })
        )
      }
      
      await Promise.all(aiOperations)
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
      
      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE_MAX)
      
      performanceMetrics.memoryUsage.push({
        operation: 'ai_processing',
        memoryIncrease,
        timestamp: new Date()
      })
    })

    test('analytics processing memory efficiency', async () => {
      const initialMemory = process.memoryUsage()
      
      // Perform multiple analytics operations
      const analyticsOperations = []
      for (let i = 0; i < 5; i++) {
        analyticsOperations.push(
          fetch('http://localhost:8001/api/ai/predictive-analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prediction_type: 'revenue_forecast',
              barbershop_id: 'perf-test-001',
              parameters: { timeframe: 30 }
            })
          })
        )
      }
      
      await Promise.all(analyticsOperations)
      
      if (global.gc) {
        global.gc()
      }
      
      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE_MAX)
      
      performanceMetrics.memoryUsage.push({
        operation: 'analytics_processing',
        memoryIncrease,
        timestamp: new Date()
      })
    })
  })

  describe('Database Query Performance', () => {
    test('business data query optimization', async () => {
      const queries = [
        'revenue_metrics',
        'customer_analytics',
        'booking_patterns',
        'service_performance'
      ]
      
      for (const queryType of queries) {
        const startTime = performance.now()
        
        const response = await fetch(`http://localhost:8001/api/business-data/${queryType}?barbershop_id=perf-test-001`)
        
        const endTime = performance.now()
        const queryTime = endTime - startTime
        
        expect(response.ok).toBe(true)
        expect(queryTime).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_MAX)
        
        performanceMetrics.apiResponseTimes.push({
          operation: `db_query_${queryType}`,
          responseTime: queryTime,
          timestamp: new Date()
        })
      }
    })

    test('complex analytics query performance', async () => {
      const startTime = performance.now()
      
      // Complex query combining multiple data sources
      const response = await fetch('http://localhost:8001/api/ai/predictive-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prediction_type: 'comprehensive_analysis',
          barbershop_id: 'perf-test-001',
          parameters: {
            include_revenue: true,
            include_customers: true,
            include_demand: true,
            include_pricing: true,
            timeframe: 90
          }
        })
      })
      
      const endTime = performance.now()
      const queryTime = endTime - startTime
      
      expect(response.ok).toBe(true)
      expect(queryTime).toBeLessThan(PERFORMANCE_THRESHOLDS.AI_RESPONSE_MAX)
    })
  })

  describe('Caching and Optimization', () => {
    test('API response caching effectiveness', async () => {
      const cacheKey = 'perf-test-cache-001'
      
      // First request (should populate cache)
      const firstRequestStart = performance.now()
      const firstResponse = await fetch(`http://localhost:8001/api/ai/predictive?barbershop_id=${cacheKey}`)
      const firstRequestTime = performance.now() - firstRequestStart
      
      expect(firstResponse.ok).toBe(true)
      
      // Second request (should use cache)
      const secondRequestStart = performance.now()
      const secondResponse = await fetch(`http://localhost:8001/api/ai/predictive?barbershop_id=${cacheKey}`)
      const secondRequestTime = performance.now() - secondRequestStart
      
      expect(secondResponse.ok).toBe(true)
      
      // Cached request should be significantly faster
      expect(secondRequestTime).toBeLessThan(firstRequestTime * 0.5)
      
      performanceMetrics.apiResponseTimes.push({
        operation: 'cache_effectiveness',
        firstRequestTime,
        secondRequestTime,
        cacheImprovement: (firstRequestTime - secondRequestTime) / firstRequestTime,
        timestamp: new Date()
      })
    })

    test('AI model response caching', async () => {
      const cacheTestMessage = 'Performance test caching question'
      
      // First AI request
      const firstStart = performance.now()
      const firstResponse = await fetch('http://localhost:8001/api/ai/unified-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: cacheTestMessage }],
          provider: 'openai',
          model: 'gpt-5',
          barbershopId: 'perf-test-001',
          enableCache: true
        })
      })
      const firstTime = performance.now() - firstStart
      
      // Second identical request (should be cached)
      const secondStart = performance.now()
      const secondResponse = await fetch('http://localhost:8001/api/ai/unified-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: cacheTestMessage }],
          provider: 'openai',
          model: 'gpt-5',
          barbershopId: 'perf-test-001',
          enableCache: true
        })
      })
      const secondTime = performance.now() - secondStart
      
      expect(firstResponse.ok).toBe(true)
      expect(secondResponse.ok).toBe(true)
      expect(secondTime).toBeLessThan(firstTime * 0.3) // Should be much faster
    })
  })

  function generatePerformanceReport() {
    const report = {
      timestamp: new Date(),
      summary: {
        totalTests: Object.keys(performanceMetrics).length,
        averageAIResponseTime: calculateAverage(performanceMetrics.aiResponseTimes, 'responseTime'),
        averageDashboardLoadTime: calculateAverage(performanceMetrics.dashboardLoadTimes, 'loadTime'),
        averageAPIResponseTime: calculateAverage(performanceMetrics.apiResponseTimes, 'responseTime'),
        totalMemoryIncrease: performanceMetrics.memoryUsage.reduce((sum, item) => sum + item.memoryIncrease, 0)
      },
      thresholds: PERFORMANCE_THRESHOLDS,
      metrics: performanceMetrics,
      recommendations: generateRecommendations()
    }
    
    console.log('\n=== AI PERFORMANCE BENCHMARK REPORT ===')
    console.log(JSON.stringify(report, null, 2))
    
    // Write to file for CI/CD systems
    require('fs').writeFileSync(
      'performance-report.json',
      JSON.stringify(report, null, 2)
    )
  }

  function calculateAverage(array, property) {
    if (array.length === 0) return 0
    return array.reduce((sum, item) => sum + (item[property] || 0), 0) / array.length
  }

  function generateRecommendations() {
    const recommendations = []
    
    const avgAITime = calculateAverage(performanceMetrics.aiResponseTimes, 'responseTime')
    if (avgAITime > PERFORMANCE_THRESHOLDS.AI_RESPONSE_MAX * 0.8) {
      recommendations.push('Consider optimizing AI model response times or implementing response streaming')
    }
    
    const avgDashboardTime = calculateAverage(performanceMetrics.dashboardLoadTimes, 'loadTime')
    if (avgDashboardTime > PERFORMANCE_THRESHOLDS.DASHBOARD_LOAD_MAX * 0.8) {
      recommendations.push('Optimize dashboard loading with lazy loading or data pagination')
    }
    
    const totalMemory = performanceMetrics.memoryUsage.reduce((sum, item) => sum + item.memoryIncrease, 0)
    if (totalMemory > PERFORMANCE_THRESHOLDS.MEMORY_USAGE_MAX * 0.8) {
      recommendations.push('Monitor memory usage and implement garbage collection optimization')
    }
    
    return recommendations
  }
})
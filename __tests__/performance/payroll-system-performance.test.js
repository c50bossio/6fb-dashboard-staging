/**
 * Comprehensive Performance Testing Suite for 6FB AI Agent System Payroll
 * Tests system performance under load, stress conditions, and edge cases
 * 
 * Performance Coverage:
 * 1. Webhook Processing Performance & Throughput
 * 2. Database Query Performance & Optimization  
 * 3. Commission Calculation Speed & Accuracy
 * 4. Export Generation Performance
 * 5. Real-time Notification Latency
 * 6. Memory Usage & Resource Management
 */

const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals')
const { performance, PerformanceObserver } = require('perf_hooks')
const { Worker } = require('worker_threads')
const fs = require('fs').promises

describe('Payroll System Performance Tests', () => {
  let performanceHarness
  let metrics = {
    webhook_processing: [],
    database_operations: [],
    calculation_times: [],
    export_generation: [],
    notification_latency: [],
    memory_usage: []
  }

  beforeAll(async () => {
    performanceHarness = await setupPerformanceHarness()
    
    // Setup performance monitoring
    const obs = new PerformanceObserver((items) => {
      items.getEntries().forEach((entry) => {
        if (entry.name.startsWith('webhook_')) {
          metrics.webhook_processing.push({
            operation: entry.name,
            duration: entry.duration,
            timestamp: entry.startTime
          })
        }
      })
    })
    obs.observe({ entryTypes: ['measure'] })
  })

  afterAll(async () => {
    await generatePerformanceReport()
    await cleanupPerformanceTests()
  })

  beforeEach(() => {
    // Reset metrics for each test
    performance.clearMarks()
    performance.clearMeasures()
  })

  describe('Webhook Processing Performance', () => {
    it('should process single webhook under 200ms', async () => {
      const webhook = performanceHarness.createTestWebhook({
        payment_amount: 10000, // $100
        barber_id: performanceHarness.testBarber.id,
        barbershop_id: performanceHarness.testShop.id
      })

      performance.mark('webhook_start')
      
      const response = await performanceHarness.processWebhook(webhook)
      
      performance.mark('webhook_end')
      performance.measure('webhook_single_process', 'webhook_start', 'webhook_end')

      expect(response.status).toBe(200)
      
      const processingTime = performance.getEntriesByName('webhook_single_process')[0].duration
      expect(processingTime).toBeLessThan(200) // Under 200ms

      console.log(`Single webhook processing time: ${processingTime.toFixed(2)}ms`)
    })

    it('should maintain performance under concurrent webhook load', async () => {
      const concurrentWebhooks = 50
      const webhooks = []

      // Create concurrent webhook requests
      for (let i = 0; i < concurrentWebhooks; i++) {
        webhooks.push(
          performanceHarness.createTestWebhook({
            payment_intent_id: `pi_concurrent_${i}`,
            payment_amount: Math.floor(Math.random() * 50000) + 1000, // $10-$500
            barber_id: performanceHarness.testBarber.id,
            barbershop_id: performanceHarness.testShop.id
          })
        )
      }

      performance.mark('concurrent_webhooks_start')

      const promises = webhooks.map(webhook => 
        performanceHarness.processWebhook(webhook)
      )

      const results = await Promise.allSettled(promises)

      performance.mark('concurrent_webhooks_end')
      performance.measure('concurrent_webhooks_total', 'concurrent_webhooks_start', 'concurrent_webhooks_end')

      const totalTime = performance.getEntriesByName('concurrent_webhooks_total')[0].duration
      const successfulResults = results.filter(r => r.status === 'fulfilled' && r.value.status === 200)
      const averageTime = totalTime / successfulResults.length

      expect(successfulResults.length).toBeGreaterThanOrEqual(45) // 90% success rate
      expect(averageTime).toBeLessThan(500) // Average under 500ms
      expect(totalTime).toBeLessThan(10000) // Total under 10 seconds

      console.log(`Processing time: ${processingTime}ms`)
      console.log(`Processing time: ${processingTime}ms`)
    })

    it('should handle webhook bursts without degradation', async () => {
      const burstSizes = [10, 25, 50, 100]
      const burstResults = []

      for (const burstSize of burstSizes) {
        const webhooks = Array.from({ length: burstSize }, (_, i) =>
          performanceHarness.createTestWebhook({
            payment_intent_id: `pi_burst_${burstSize}_${i}`,
            payment_amount: 5000, // $50 standard
            barber_id: performanceHarness.testBarber.id,
            barbershop_id: performanceHarness.testShop.id
          })
        )

        const startTime = performance.now()
        
        const promises = webhooks.map(webhook => 
          performanceHarness.processWebhook(webhook)
        )
        const results = await Promise.allSettled(promises)
        
        const endTime = performance.now()
        const burstTime = endTime - startTime

        const successfulCount = results.filter(
          r => r.status === 'fulfilled' && r.value.status === 200
        ).length

        burstResults.push({
          size: burstSize,
          time: burstTime,
          successful: successfulCount,
          avgTime: burstTime / successfulCount,
          successRate: (successfulCount / burstSize) * 100
        })

        // Brief pause between bursts
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // Performance should remain consistent across burst sizes
      burstResults.forEach((result, index) => {
        expect(result.successRate).toBeGreaterThanOrEqual(85) // 85% success minimum
        expect(result.avgTime).toBeLessThan(1000) // Under 1 second average

        }ms avg, ${result.successRate.toFixed(1)}% success`)
      })

      // Verify no significant performance degradation with larger bursts
      const firstBurstAvg = burstResults[0].avgTime
      const lastBurstAvg = burstResults[burstResults.length - 1].avgTime
      const degradation = (lastBurstAvg - firstBurstAvg) / firstBurstAvg

      expect(degradation).toBeLessThan(2.0) // Less than 200% degradation
    })

    it('should efficiently process mixed webhook types', async () => {
      const webhookTypes = [
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
        'transfer.created',
        'transfer.paid',
        'transfer.failed'
      ]

      const mixedWebhooks = []
      for (let i = 0; i < 100; i++) {
        const webhookType = webhookTypes[i % webhookTypes.length]
        mixedWebhooks.push(
          performanceHarness.createTestWebhook({
            type: webhookType,
            payment_intent_id: `pi_mixed_${i}`,
            barber_id: performanceHarness.testBarber.id,
            barbershop_id: performanceHarness.testShop.id
          })
        )
      }

      performance.mark('mixed_webhooks_start')

      const results = await Promise.allSettled(
        mixedWebhooks.map(webhook => performanceHarness.processWebhook(webhook))
      )

      performance.mark('mixed_webhooks_end')
      performance.measure('mixed_webhooks_processing', 'mixed_webhooks_start', 'mixed_webhooks_end')

      const processingTime = performance.getEntriesByName('mixed_webhooks_processing')[0].duration
      const successfulResults = results.filter(r => r.status === 'fulfilled' && r.value.status === 200)

      expect(successfulResults.length).toBeGreaterThanOrEqual(85) // 85% success rate
      expect(processingTime).toBeLessThan(15000) // Under 15 seconds for 100 mixed webhooks

      }ms for ${successfulResults.length} webhooks`)
    })
  })

  describe('Database Performance Optimization', () => {
    it('should execute commission queries under 50ms', async () => {
      const queryTypes = [
        { name: 'single_commission', query: () => performanceHarness.getCommission('pi_test_001') },
        { name: 'barber_balance', query: () => performanceHarness.getBarberBalance(performanceHarness.testBarber.id) },
        { name: 'commission_history', query: () => performanceHarness.getCommissionHistory(performanceHarness.testBarber.id, 30) },
        { name: 'tier_status', query: () => performanceHarness.getTierStatus(performanceHarness.testBarber.id) },
        { name: 'payout_history', query: () => performanceHarness.getPayoutHistory(performanceHarness.testShop.id) }
      ]

      for (const queryType of queryTypes) {
        const executions = []
        
        // Execute each query 10 times to get average
        for (let i = 0; i < 10; i++) {
          const startTime = performance.now()
          await queryType.query()
          const endTime = performance.now()
          executions.push(endTime - startTime)
        }

        const avgTime = executions.reduce((sum, time) => sum + time, 0) / executions.length
        const maxTime = Math.max(...executions)

        expect(avgTime).toBeLessThan(50) // Average under 50ms
        expect(maxTime).toBeLessThan(100) // Max under 100ms

        metrics.database_operations.push({
          query: queryType.name,
          avgTime,
          maxTime,
          executions
        })

        }ms avg, ${maxTime.toFixed(2)}ms max`)
      }
    })

    it('should handle large dataset queries efficiently', async () => {
      // Create large dataset
      await performanceHarness.createLargeCommissionDataset(1000) // 1000 commission records

      const largeDataQueries = [
        {
          name: 'paginated_commissions',
          query: () => performanceHarness.getPaginatedCommissions(performanceHarness.testShop.id, 1, 50)
        },
        {
          name: 'date_range_commissions', 
          query: () => performanceHarness.getCommissionsByDateRange(
            performanceHarness.testShop.id,
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            new Date()
          )
        },
        {
          name: 'aggregated_metrics',
          query: () => performanceHarness.getAggregatedMetrics(performanceHarness.testShop.id)
        }
      ]

      for (const query of largeDataQueries) {
        performance.mark(`${query.name}_start`)
        
        const result = await query.query()
        
        performance.mark(`${query.name}_end`)
        performance.measure(query.name, `${query.name}_start`, `${query.name}_end`)

        const queryTime = performance.getEntriesByName(query.name)[0].duration

        expect(queryTime).toBeLessThan(200) // Under 200ms for large datasets
        expect(result.data).toBeDefined()

      console.log(`Processing time: ${processingTime}ms`)
      }
    })

    it('should optimize complex aggregation queries', async () => {
      const complexQueries = [
        {
          name: 'monthly_revenue_by_barber',
          expectedTime: 150,
          query: () => performanceHarness.getMonthlyRevenueByBarber(performanceHarness.testShop.id)
        },
        {
          name: 'tier_progression_analytics',
          expectedTime: 100,
          query: () => performanceHarness.getTierProgressionAnalytics(performanceHarness.testShop.id)
        },
        {
          name: 'commission_trends',
          expectedTime: 120,
          query: () => performanceHarness.getCommissionTrends(performanceHarness.testShop.id, 6) // 6 months
        }
      ]

      for (const query of complexQueries) {
        const startTime = performance.now()
        const result = await query.query()
        const endTime = performance.now()

        const queryTime = endTime - startTime

        expect(queryTime).toBeLessThan(query.expectedTime)
        expect(result.data.length).toBeGreaterThan(0)

        }ms (target: ${query.expectedTime}ms)`)
      }
    })

    it('should maintain connection pool efficiency', async () => {
      const connectionTests = []
      
      // Simulate high connection usage
      for (let i = 0; i < 100; i++) {
        connectionTests.push(
          performanceHarness.testDatabaseConnection()
        )
      }

      const connectionStartTime = performance.now()
      const connectionResults = await Promise.allSettled(connectionTests)
      const connectionEndTime = performance.now()

      const successfulConnections = connectionResults.filter(
        r => r.status === 'fulfilled' && r.value.connected
      ).length

      const totalConnectionTime = connectionEndTime - connectionStartTime
      const avgConnectionTime = totalConnectionTime / successfulConnections

      expect(successfulConnections).toBeGreaterThanOrEqual(95) // 95% connection success
      expect(avgConnectionTime).toBeLessThan(10) // Under 10ms per connection

      }ms avg`)
    })
  })

  describe('Commission Calculation Performance', () => {
    it('should calculate commissions under 10ms', async () => {
      const calculationScenarios = [
        { type: 'simple_commission', amount: 100, expectedTime: 5 },
        { type: 'tiered_commission', amount: 500, expectedTime: 8 },
        { type: 'hybrid_commission', amount: 300, expectedTime: 10 },
        { type: 'product_commission', amount: 150, expectedTime: 7 }
      ]

      for (const scenario of calculationScenarios) {
        const calculations = []

        // Perform 100 calculations to get accurate timing
        for (let i = 0; i < 100; i++) {
          const startTime = performance.now()
          
          const result = await performanceHarness.calculateCommission({
            type: scenario.type,
            amount: scenario.amount,
            barber_id: performanceHarness.testBarber.id,
            barbershop_id: performanceHarness.testShop.id
          })
          
          const endTime = performance.now()
          calculations.push(endTime - startTime)

          expect(result).toBeDefined()
          expect(result.commission_amount).toBeGreaterThan(0)
        }

        const avgTime = calculations.reduce((sum, time) => sum + time, 0) / calculations.length
        const maxTime = Math.max(...calculations)

        expect(avgTime).toBeLessThan(scenario.expectedTime)

        metrics.calculation_times.push({
          type: scenario.type,
          avgTime,
          maxTime,
          iterations: 100
        })

        }ms avg (target: ${scenario.expectedTime}ms)`)
      }
    })

    it('should handle complex tier calculations efficiently', async () => {
      // Create complex tier structure
      await performanceHarness.createComplexTierStructure()

      const tierCalculations = []
      const revenueScenarios = [1000, 5000, 10000, 20000, 30000] // Different tier levels

      for (const revenue of revenueScenarios) {
        const startTime = performance.now()

        const tierResult = await performanceHarness.calculateTierBasedCommission({
          current_revenue: revenue,
          payment_amount: 200,
          barber_id: performanceHarness.testBarber.id,
          barbershop_id: performanceHarness.testShop.id
        })

        const endTime = performance.now()
        const calcTime = endTime - startTime

        tierCalculations.push({
          revenue,
          calcTime,
          tier_level: tierResult.tier_level,
          commission_rate: tierResult.commission_rate
        })

        expect(calcTime).toBeLessThan(15) // Under 15ms
        expect(tierResult.tier_level).toBeGreaterThan(0)
      }

      const avgTierCalcTime = tierCalculations.reduce((sum, calc) => sum + calc.calcTime, 0) / tierCalculations.length
      
      expect(avgTierCalcTime).toBeLessThan(12) // Average under 12ms

      }ms average across revenue levels`)
    })

    it('should process bulk commission calculations efficiently', async () => {
      const bulkPayments = Array.from({ length: 500 }, (_, i) => ({
        payment_intent_id: `pi_bulk_${i}`,
        amount: Math.floor(Math.random() * 50000) + 1000, // $10-$500
        barber_id: performanceHarness.testBarber.id,
        barbershop_id: performanceHarness.testShop.id,
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random within 30 days
      }))

      performance.mark('bulk_calc_start')

      const bulkResults = await performanceHarness.processBulkCommissionCalculations(bulkPayments)

      performance.mark('bulk_calc_end')
      performance.measure('bulk_calculations', 'bulk_calc_start', 'bulk_calc_end')

      const bulkTime = performance.getEntriesByName('bulk_calculations')[0].duration
      const avgPerCalculation = bulkTime / bulkPayments.length

      expect(bulkResults.successful).toBeGreaterThanOrEqual(475) // 95% success rate
      expect(avgPerCalculation).toBeLessThan(5) // Under 5ms per calculation in bulk
      expect(bulkTime).toBeLessThan(30000) // Under 30 seconds total

      console.log(`Processing time: ${processingTime}ms`)
      console.log(`Processing time: ${processingTime}ms`)
    })
  })

  describe('Export Generation Performance', () => {
    it('should generate PDF exports under 5 seconds', async () => {
      const exportConfigs = [
        { format: 'pdf', records: 50, expectedTime: 3000 },
        { format: 'pdf', records: 200, expectedTime: 5000 },
        { format: 'pdf', records: 500, expectedTime: 8000 }
      ]

      for (const config of exportConfigs) {
        // Create test data
        await performanceHarness.createExportTestData(config.records)

        performance.mark(`export_${config.format}_${config.records}_start`)

        const exportResult = await performanceHarness.generatePayrollExport({
          format: config.format,
          barbershop_id: performanceHarness.testShop.id,
          date_range: { 
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            end: new Date() 
          }
        })

        performance.mark(`export_${config.format}_${config.records}_end`)
        performance.measure(
          `export_${config.format}_${config.records}`,
          `export_${config.format}_${config.records}_start`,
          `export_${config.format}_${config.records}_end`
        )

        const exportTime = performance.getEntriesByName(`export_${config.format}_${config.records}`)[0].duration

        expect(exportTime).toBeLessThan(config.expectedTime)
        expect(exportResult.file_size).toBeGreaterThan(1024) // At least 1KB
        expect(exportResult.success).toBe(true)

        metrics.export_generation.push({
          format: config.format,
          records: config.records,
          time: exportTime,
          fileSize: exportResult.file_size
        })

        } export (${config.records} records): ${exportTime.toFixed(2)}ms`)
      }
    })

    it('should optimize Excel export generation', async () => {
      const excelExportSizes = [100, 500, 1000, 2000]

      for (const recordCount of excelExportSizes) {
        await performanceHarness.createExportTestData(recordCount)

        const startTime = performance.now()

        const excelResult = await performanceHarness.generatePayrollExport({
          format: 'excel',
          barbershop_id: performanceHarness.testShop.id,
          include_charts: true,
          include_summary: true
        })

        const endTime = performance.now()
        const exportTime = endTime - startTime

        // Excel exports should scale reasonably
        const expectedTime = recordCount * 3 // 3ms per record baseline
        
        expect(exportTime).toBeLessThan(expectedTime + 5000) // Plus 5s overhead
        expect(excelResult.success).toBe(true)

        : ${exportTime.toFixed(2)}ms`)
      }
    })

    it('should handle concurrent export requests efficiently', async () => {
      const concurrentExports = []

      // Generate 5 concurrent exports
      for (let i = 0; i < 5; i++) {
        concurrentExports.push(
          performanceHarness.generatePayrollExport({
            format: 'pdf',
            barbershop_id: performanceHarness.testShop.id,
            export_id: `concurrent_${i}`
          })
        )
      }

      const startTime = performance.now()
      const results = await Promise.allSettled(concurrentExports)
      const endTime = performance.now()

      const successfulExports = results.filter(
        r => r.status === 'fulfilled' && r.value.success
      ).length

      const totalTime = endTime - startTime
      const avgExportTime = totalTime / successfulExports

      expect(successfulExports).toBeGreaterThanOrEqual(4) // At least 4/5 should succeed
      expect(avgExportTime).toBeLessThan(10000) // Under 10s average

      console.log(`Processing time: ${processingTime}ms`)
    })
  })

  describe('Memory Usage & Resource Management', () => {
    it('should maintain stable memory usage during processing', async () => {
      const initialMemory = process.memoryUsage()

      // Process large batch of webhooks
      const largeBatch = Array.from({ length: 1000 }, (_, i) =>
        performanceHarness.createTestWebhook({
          payment_intent_id: `pi_memory_test_${i}`,
          payment_amount: Math.floor(Math.random() * 10000) + 1000
        })
      )

      for (let i = 0; i < largeBatch.length; i += 50) {
        const batch = largeBatch.slice(i, i + 50)
        await Promise.all(
          batch.map(webhook => performanceHarness.processWebhook(webhook))
        )

        // Measure memory usage every 50 webhooks
        const currentMemory = process.memoryUsage()
        metrics.memory_usage.push({
          webhooks_processed: i + 50,
          heap_used: currentMemory.heapUsed,
          heap_total: currentMemory.heapTotal,
          external: currentMemory.external,
          rss: currentMemory.rss
        })

        // Force garbage collection if available
        if (global.gc) {
          global.gc()
        }
      }

      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100

      // Memory increase should be reasonable
      expect(memoryIncreasePercent).toBeLessThan(200) // Less than 200% increase
      expect(finalMemory.heapUsed).toBeLessThan(500 * 1024 * 1024) // Under 500MB

      }% increase after 1000 webhooks`)
      .toFixed(2)}MB`)
    })

    it('should handle resource cleanup efficiently', async () => {
      const resourceTests = []

      // Create and cleanup resources repeatedly
      for (let i = 0; i < 100; i++) {
        const startTime = performance.now()

        // Create temporary resources
        const resources = await performanceHarness.createTemporaryResources({
          connections: 5,
          cache_entries: 50,
          temp_files: 3
        })

        // Use resources briefly
        await performanceHarness.useResources(resources)

        // Cleanup resources
        await performanceHarness.cleanupResources(resources)

        const endTime = performance.now()
        resourceTests.push(endTime - startTime)
      }

      const avgCleanupTime = resourceTests.reduce((sum, time) => sum + time, 0) / resourceTests.length
      const maxCleanupTime = Math.max(...resourceTests)

      expect(avgCleanupTime).toBeLessThan(50) // Under 50ms average
      expect(maxCleanupTime).toBeLessThan(200) // Under 200ms max

      }ms avg, ${maxCleanupTime.toFixed(2)}ms max`)
    })
  })

  describe('Real-time Notification Performance', () => {
    it('should deliver notifications under 100ms', async () => {
      const notificationTypes = [
        'commission_calculated',
        'commission_paid',
        'tier_upgraded',
        'payout_completed'
      ]

      for (const notificationType of notificationTypes) {
        const deliveryTimes = []

        for (let i = 0; i < 20; i++) {
          const startTime = performance.now()

          await performanceHarness.sendNotification({
            type: notificationType,
            recipient: performanceHarness.testBarber.id,
            data: { amount: 100, message: `Test ${notificationType}` }
          })

          const endTime = performance.now()
          deliveryTimes.push(endTime - startTime)
        }

        const avgDeliveryTime = deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length
        const maxDeliveryTime = Math.max(...deliveryTimes)

        expect(avgDeliveryTime).toBeLessThan(100) // Under 100ms
        expect(maxDeliveryTime).toBeLessThan(500) // Under 500ms max

        metrics.notification_latency.push({
          type: notificationType,
          avgTime: avgDeliveryTime,
          maxTime: maxDeliveryTime
        })

        }ms avg delivery`)
      }
    })

    it('should handle notification bursts efficiently', async () => {
      const burstSize = 100
      const notifications = Array.from({ length: burstSize }, (_, i) => ({
        type: 'commission_calculated',
        recipient: performanceHarness.testBarber.id,
        data: { amount: 50 + i, commission_id: `comm_burst_${i}` }
      }))

      const startTime = performance.now()

      const results = await Promise.allSettled(
        notifications.map(notification => 
          performanceHarness.sendNotification(notification)
        )
      )

      const endTime = performance.now()
      const totalTime = endTime - startTime

      const successfulNotifications = results.filter(
        r => r.status === 'fulfilled' && r.value.delivered
      ).length

      const avgNotificationTime = totalTime / successfulNotifications

      expect(successfulNotifications).toBeGreaterThanOrEqual(90) // 90% delivery success
      expect(avgNotificationTime).toBeLessThan(20) // Under 20ms per notification

      console.log(`Processing time: ${processingTime}ms`)
    })
  })

  // Performance Test Harness Helper Functions
  async function setupPerformanceHarness() {
    return {
      testShop: await createTestShop(),
      testBarber: await createTestBarber(),
      
      createTestWebhook: (options) => ({
        id: `evt_${options.payment_intent_id || 'test'}`,
        type: options.type || 'payment_intent.succeeded',
        data: {
          object: {
            id: options.payment_intent_id || 'pi_test',
            amount: options.payment_amount || 10000,
            currency: 'usd',
            status: 'succeeded',
            metadata: {
              barber_id: options.barber_id,
              barbershop_id: options.barbershop_id,
              booking_id: `booking_${Date.now()}`
            }
          }
        }
      }),

      processWebhook: async (webhook) => {
        const payload = JSON.stringify(webhook)
        const signature = generateWebhookSignature(payload)
        
        return await fetch('/api/webhooks/stripe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Stripe-Signature': signature
          },
          body: payload
        })
      },

      calculateCommission: async (options) => {
        // Mock commission calculation
        return {
          commission_amount: options.amount * 0.6,
          shop_amount: options.amount * 0.4,
          arrangement_type: options.type
        }
      }
    }
  }

  async function generatePerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      test_summary: {
        webhook_processing: {
          avg_time: metrics.webhook_processing.reduce((sum, m) => sum + m.duration, 0) / metrics.webhook_processing.length || 0,
          total_processed: metrics.webhook_processing.length
        },
        database_operations: {
          queries_tested: metrics.database_operations.length,
          avg_time: metrics.database_operations.reduce((sum, m) => sum + m.avgTime, 0) / metrics.database_operations.length || 0
        },
        calculation_performance: {
          calculations_tested: metrics.calculation_times.length,
          avg_time: metrics.calculation_times.reduce((sum, m) => sum + m.avgTime, 0) / metrics.calculation_times.length || 0
        },
        export_generation: {
          exports_tested: metrics.export_generation.length,
          avg_time: metrics.export_generation.reduce((sum, m) => sum + m.time, 0) / metrics.export_generation.length || 0
        },
        notification_latency: {
          notifications_tested: metrics.notification_latency.length,
          avg_time: metrics.notification_latency.reduce((sum, m) => sum + m.avgTime, 0) / metrics.notification_latency.length || 0
        }
      },
      detailed_metrics: metrics,
      recommendations: generatePerformanceRecommendations(metrics)
    }

    await fs.writeFile('performance-test-report.json', JSON.stringify(report, null, 2))
    
  }

  function generatePerformanceRecommendations(metrics) {
    const recommendations = []

    // Webhook processing recommendations
    const avgWebhookTime = metrics.webhook_processing.reduce((sum, m) => sum + m.duration, 0) / metrics.webhook_processing.length
    if (avgWebhookTime > 200) {
      recommendations.push('Consider optimizing webhook processing pipeline - average time exceeds 200ms threshold')
    }

    // Database recommendations
    const slowQueries = metrics.database_operations.filter(op => op.avgTime > 50)
    if (slowQueries.length > 0) {
      recommendations.push(`Optimize slow database queries: ${slowQueries.map(q => q.query).join(', ')}`)
    }

    // Memory recommendations
    const memoryGrowth = metrics.memory_usage.length > 0 ? 
      (metrics.memory_usage[metrics.memory_usage.length - 1].heap_used - metrics.memory_usage[0].heap_used) / 1024 / 1024 : 0
    if (memoryGrowth > 100) {
      recommendations.push(`High memory growth detected: ${memoryGrowth.toFixed(2)}MB increase - investigate memory leaks`)
    }

    return recommendations
  }

  function generateWebhookSignature(payload) {
    const crypto = require('crypto')
    const timestamp = Math.floor(Date.now() / 1000)
    const secret = process.env.STRIPE_WEBHOOK_SECRET || 'test_secret'
    const signature = crypto
      .createHmac('sha256', secret)
      .update(timestamp + '.' + payload)
      .digest('hex')
    return `t=${timestamp},v1=${signature}`
  }
})
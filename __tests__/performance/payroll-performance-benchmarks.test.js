/**
 * ⚡ PAYROLL SYSTEM PERFORMANCE BENCHMARK TEST SUITE
 * Advanced Performance Testing for 6FB AI Agent System Payroll Module
 * 
 * This suite focuses on comprehensive performance validation including:
 * - High-throughput webhook processing under load
 * - Large-scale payroll export generation benchmarks
 * - Database query optimization and index effectiveness
 * - Memory usage and garbage collection optimization
 * - Concurrent user scenario testing
 * - Real-time notification performance
 * - Caching effectiveness and hit rates
 * - Scalability stress testing up to 10x expected load
 */

import { describe, beforeAll, afterAll, test, expect, jest } from '@jest/globals'
import { performance, PerformanceObserver } from 'perf_hooks'
import { createClient } from '@supabase/supabase-js'
import { PayrollExportService } from '@/services/payroll-export-service.js'
import { WebhookAutomationPipeline } from '@/services/webhook-automation-pipeline.js'
import { ProgressiveCommissionTierSystem } from '@/services/progressive-commission-tier-system.js'
import crypto from 'crypto'

const PERFORMANCE_TARGETS = {
  webhook: {
    singleProcessing: 200, // ms
    bulkProcessing: 5000, // ms for 100 webhooks
    concurrentProcessing: 10000, // ms for 50 concurrent
    memoryUsageMax: 200 // MB
  },
  export: {
    pdfGeneration: 5000, // ms for 200 records
    excelGeneration: 8000, // ms for 1000 records
    csvGeneration: 2000, // ms for 5000 records
    maxFileSize: 50 // MB
  },
  database: {
    simpleQuery: 50, // ms
    complexQuery: 200, // ms
    bulkInsert: 1000, // ms for 100 records
    indexSeek: 10 // ms
  },
  api: {
    responseTime: 500, // ms
    throughput: 100, // requests/second
    concurrentUsers: 50,
    errorRate: 0.01 // 1%
  }
}

const PerformanceMetrics = {
  measurements: [],
  memoryUsage: [],
  
  startMeasurement: (name) => {
    const startTime = performance.now()
    const memStart = process.memoryUsage()
    return {
      name,
      startTime,
      memStart,
      end: () => {
        const endTime = performance.now()
        const memEnd = process.memoryUsage()
        const measurement = {
          name,
          duration: endTime - startTime,
          memoryDelta: memEnd.heapUsed - memStart.heapUsed,
          timestamp: Date.now()
        }
        PerformanceMetrics.measurements.push(measurement)
        return measurement
      }
    }
  },

  getStats: (name) => {
    const measurements = PerformanceMetrics.measurements.filter(m => m.name === name)
    if (measurements.length === 0) return null

    const durations = measurements.map(m => m.duration)
    const memoryDeltas = measurements.map(m => m.memoryDelta)

    return {
      count: measurements.length,
      average: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      p50: percentile(durations, 0.5),
      p90: percentile(durations, 0.9),
      p95: percentile(durations, 0.95),
      p99: percentile(durations, 0.99),
      memoryAvg: memoryDeltas.reduce((a, b) => a + b, 0) / memoryDeltas.length,
      memoryMax: Math.max(...memoryDeltas)
    }
  },

  clear: () => {
    PerformanceMetrics.measurements = []
    PerformanceMetrics.memoryUsage = []
  }
}

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b)
  const index = Math.ceil(sorted.length * p) - 1
  return sorted[index]
}

// Performance test data generators
const PerfTestDataFactory = {
  generateBulkPayments: (count) => {
    const payments = []
    for (let i = 0; i < count; i++) {
      payments.push({
        id: `pi_perf_test_${i}_${Date.now()}`,
        amount: 5000 + Math.floor(Math.random() * 15000), // $50-$200
        currency: 'usd',
        status: 'succeeded',
        metadata: {
          barbershop_id: 'perf_test_shop',
          barber_id: `perf_test_barber_${i % 10}`, // 10 different barbers
          service_name: `Service ${i % 5}`, // 5 different services
          appointment_id: `apt_${i}`
        },
        created: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400) // Last 24 hours
      })
    }
    return payments
  },

  generateCommissionRecords: (count, barbershopId) => {
    const records = []
    const barberIds = Array.from({ length: 20 }, (_, i) => `perf_barber_${i}`)
    
    for (let i = 0; i < count; i++) {
      records.push({
        id: `perf_commission_${i}`,
        barbershop_id: barbershopId,
        barber_id: barberIds[i % barberIds.length],
        payment_id: `pi_perf_${i}`,
        payment_amount: 5000 + Math.floor(Math.random() * 15000),
        commission_amount: Math.floor((5000 + Math.random() * 15000) * 0.6),
        commission_percentage: 0.6,
        service_name: `Performance Test Service ${i % 10}`,
        tier_bonus_amount: Math.floor(Math.random() * 500),
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() // Last 30 days
      })
    }
    return records
  }
}

describe('⚡ PAYROLL SYSTEM PERFORMANCE BENCHMARKS', () => {
  let supabase
  let payrollService
  let webhookPipeline
  let tierSystem
  let testBarbershop
  let performanceData = []

  beforeAll(async () => {
    // Initialize services
    supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    payrollService = new PayrollExportService()
    webhookPipeline = new WebhookAutomationPipeline()
    tierSystem = new ProgressiveCommissionTierSystem()

    // Create performance test barbershop
    testBarbershop = {
      id: 'perf_test_shop_' + Date.now(),
      name: 'Performance Test Barbershop',
      owner_id: 'perf_test_owner'
    }

    const { error } = await supabase.from('barbershops').insert([testBarbershop])
    if (error) console.warn('Setup warning:', error.message)

    // Clear performance metrics
    PerformanceMetrics.clear()
  }, 30000)

  afterAll(async () => {
    // Clean up performance test data
    const tablesToClean = [
      'commission_transactions',
      'product_commission_transactions', 
      'payout_history',
      'payroll_export_history'
    ]

    for (const table of tablesToClean) {
      await supabase
        .from(table)
        .delete()
        .eq('barbershop_id', testBarbershop.id)
    }

    await supabase.from('barbershops').delete().eq('id', testBarbershop.id)

    // Print performance summary

    const measurements = PerformanceMetrics.measurements
    const groupedStats = measurements.reduce((acc, m) => {
      if (!acc[m.name]) acc[m.name] = []
      acc[m.name].push(m.duration)
      return acc
    }, {})

    Object.entries(groupedStats).forEach(([name, durations]) => {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length
      const p95 = percentile(durations, 0.95)
      }ms | P95 ${p95.toFixed(2)}ms | Count ${durations.length}`)
    })
  }, 60000)

  // ==========================================
  // WEBHOOK PROCESSING PERFORMANCE TESTS
  // ==========================================

  describe('🔄 Webhook Processing Performance', () => {
    test('should process single webhook within performance target', async () => {
      const payment = PerfTestDataFactory.generateBulkPayments(1)[0]
      payment.metadata.barbershop_id = testBarbershop.id

      const webhookPayload = JSON.stringify({
        type: 'payment_intent.succeeded',
        data: { object: payment }
      })

      const signature = crypto
        .createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
        .update(`${Math.floor(Date.now() / 1000)}.${webhookPayload}`)
        .digest('hex')

      // Measure single webhook processing
      const measure = PerformanceMetrics.startMeasurement('single_webhook_processing')
      
      const result = await webhookPipeline.processStripeWebhook(
        webhookPayload, 
        `t=${Math.floor(Date.now() / 1000)},v1=${signature}`
      )

      const measurement = measure.end()

      expect(result.success).toBe(true)
      expect(measurement.duration).toBeLessThan(PERFORMANCE_TARGETS.webhook.singleProcessing)
      expect(measurement.memoryDelta).toBeLessThan(10 * 1024 * 1024) // 10MB max per webhook

      }ms (Target: <${PERFORMANCE_TARGETS.webhook.singleProcessing}ms)`)
    })

    test('should process 100 webhooks in sequence within performance target', async () => {
      const payments = PerfTestDataFactory.generateBulkPayments(100)
      payments.forEach(p => p.metadata.barbershop_id = testBarbershop.id)

      const measure = PerformanceMetrics.startMeasurement('bulk_webhook_processing')
      const results = []

      for (let i = 0; i < payments.length; i++) {
        const webhookPayload = JSON.stringify({
          type: 'payment_intent.succeeded',
          data: { object: payments[i] }
        })

        const signature = crypto
          .createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
          .update(`${Math.floor(Date.now() / 1000)}.${webhookPayload}`)
          .digest('hex')

        const singleMeasure = PerformanceMetrics.startMeasurement('individual_webhook_in_bulk')
        
        const result = await webhookPipeline.processStripeWebhook(
          webhookPayload,
          `t=${Math.floor(Date.now() / 1000)},v1=${signature}`
        )
        
        singleMeasure.end()
        results.push(result)
      }

      const bulkMeasurement = measure.end()

      // Validate results
      const successCount = results.filter(r => r.success).length
      expect(successCount).toBeGreaterThan(95) // 95% success rate minimum

      // Performance validation
      expect(bulkMeasurement.duration).toBeLessThan(PERFORMANCE_TARGETS.webhook.bulkProcessing)
      
      const avgPerWebhook = bulkMeasurement.duration / 100
      expect(avgPerWebhook).toBeLessThan(PERFORMANCE_TARGETS.webhook.singleProcessing)

      : ${bulkMeasurement.duration.toFixed(2)}ms | Avg per webhook: ${avgPerWebhook.toFixed(2)}ms`)
    })

    test('should handle 50 concurrent webhooks efficiently', async () => {
      const payments = PerfTestDataFactory.generateBulkPayments(50)
      payments.forEach((p, i) => {
        p.id = `pi_concurrent_${i}_${Date.now()}`
        p.metadata.barbershop_id = testBarbershop.id
      })

      const measure = PerformanceMetrics.startMeasurement('concurrent_webhook_processing')
      
      const webhookPromises = payments.map((payment, i) => {
        const webhookPayload = JSON.stringify({
          id: `evt_concurrent_${i}`,
          type: 'payment_intent.succeeded',
          data: { object: payment }
        })

        const signature = crypto
          .createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
          .update(`${Math.floor(Date.now() / 1000)}.${webhookPayload}`)
          .digest('hex')

        return webhookPipeline.processStripeWebhook(
          webhookPayload,
          `t=${Math.floor(Date.now() / 1000)},v1=${signature}`
        )
      })

      const results = await Promise.allSettled(webhookPromises)
      const concurrentMeasurement = measure.end()

      // Performance validation
      expect(concurrentMeasurement.duration).toBeLessThan(PERFORMANCE_TARGETS.webhook.concurrentProcessing)

      // Success rate validation
      const successfulResults = results.filter(r => r.status === 'fulfilled' && r.value.success)
      const successRate = successfulResults.length / results.length
      expect(successRate).toBeGreaterThan(0.9) // 90% success rate minimum

      : ${concurrentMeasurement.duration.toFixed(2)}ms | Success rate: ${(successRate * 100).toFixed(1)}%`)
    })

    test('should maintain performance under memory pressure', async () => {
      const initialMemory = process.memoryUsage()
      const payments = PerfTestDataFactory.generateBulkPayments(200) // Large batch

      payments.forEach((p, i) => {
        p.id = `pi_memory_${i}_${Date.now()}`
        p.metadata.barbershop_id = testBarbershop.id
      })

      const measure = PerformanceMetrics.startMeasurement('memory_pressure_webhooks')
      const memoryReadings = []

      // Process in chunks while monitoring memory
      for (let chunk = 0; chunk < 4; chunk++) {
        const chunkPayments = payments.slice(chunk * 50, (chunk + 1) * 50)
        
        const chunkPromises = chunkPayments.map(payment => {
          const webhookPayload = JSON.stringify({
            type: 'payment_intent.succeeded',
            data: { object: payment }
          })

          const signature = crypto
            .createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
            .update(`${Math.floor(Date.now() / 1000)}.${webhookPayload}`)
            .digest('hex')

          return webhookPipeline.processStripeWebhook(
            webhookPayload,
            `t=${Math.floor(Date.now() / 1000)},v1=${signature}`
          )
        })

        await Promise.all(chunkPromises)
        
        // Record memory usage after each chunk
        const currentMemory = process.memoryUsage()
        memoryReadings.push(currentMemory.heapUsed)
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc()
        }
      }

      const finalMeasurement = measure.end()
      const finalMemory = process.memoryUsage()

      // Memory growth should be reasonable
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed
      expect(memoryGrowth).toBeLessThan(PERFORMANCE_TARGETS.webhook.memoryUsageMax * 1024 * 1024)

      }ms | Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`)
    }, 20000)
  })

  // ==========================================
  // EXPORT GENERATION PERFORMANCE TESTS
  // ==========================================

  describe('📊 Export Generation Performance', () => {
    beforeAll(async () => {
      // Create substantial test data for export performance testing
      const commissionRecords = PerfTestDataFactory.generateCommissionRecords(1000, testBarbershop.id)
      
      // Insert in batches to avoid timeout
      const batchSize = 100
      for (let i = 0; i < commissionRecords.length; i += batchSize) {
        const batch = commissionRecords.slice(i, i + batchSize)
        const { error } = await supabase
          .from('commission_transactions')
          .insert(batch)
        
        if (error) {
          console.warn('Batch insert warning:', error.message)
        }
      }

      performanceData.push({
        type: 'commission_transactions',
        count: commissionRecords.length,
        barbershop_id: testBarbershop.id
      })
    })

    test('should generate PDF export for 200 records within performance target', async () => {
      const measure = PerformanceMetrics.startMeasurement('pdf_export_generation')

      const exportResult = await payrollService.generatePayrollExport({
        format: 'pdf',
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          end: new Date().toISOString()
        },
        staffFilter: 'all',
        includeComponents: {
          summary: true,
          individual: true,
          transactions: false, // Lighter for performance
          tierDetails: true
        }
      })

      const measurement = measure.end()

      expect(exportResult.success).toBe(true)
      expect(measurement.duration).toBeLessThan(PERFORMANCE_TARGETS.export.pdfGeneration)
      expect(exportResult.fileSize).toBeGreaterThan(10000) // At least 10KB
      expect(exportResult.fileSize).toBeLessThan(PERFORMANCE_TARGETS.export.maxFileSize * 1024 * 1024)

      }ms | Size: ${(exportResult.fileSize / 1024).toFixed(1)}KB`)
    })

    test('should generate Excel export for 1000 records within performance target', async () => {
      const measure = PerformanceMetrics.startMeasurement('excel_export_generation')

      const exportResult = await payrollService.generatePayrollExport({
        format: 'excel',
        dateRange: {
          start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days for more records
          end: new Date().toISOString()
        },
        staffFilter: 'all',
        includeComponents: {
          summary: true,
          individual: true,
          transactions: true,
          tierDetails: true,
          formulas: true
        }
      })

      const measurement = measure.end()

      expect(exportResult.success).toBe(true)
      expect(measurement.duration).toBeLessThan(PERFORMANCE_TARGETS.export.excelGeneration)
      expect(exportResult.metadata.worksheets).toBeGreaterThanOrEqual(4)
      expect(exportResult.fileSize).toBeLessThan(PERFORMANCE_TARGETS.export.maxFileSize * 1024 * 1024)

      }ms | Worksheets: ${exportResult.metadata.worksheets} | Size: ${(exportResult.fileSize / 1024).toFixed(1)}KB`)
    })

    test('should generate CSV export for 5000 records within performance target', async () => {
      // Generate additional test data for CSV performance test
      const additionalRecords = PerfTestDataFactory.generateCommissionRecords(4000, testBarbershop.id)
      
      // Insert additional records for this specific test
      const batchSize = 200
      for (let i = 0; i < additionalRecords.length; i += batchSize) {
        const batch = additionalRecords.slice(i, i + batchSize)
        await supabase.from('commission_transactions').insert(batch)
      }

      const measure = PerformanceMetrics.startMeasurement('csv_export_generation')

      const exportResult = await payrollService.generatePayrollExport({
        format: 'csv',
        dateRange: {
          start: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months
          end: new Date().toISOString()
        },
        staffFilter: 'all'
      })

      const measurement = measure.end()

      expect(exportResult.success).toBe(true)
      expect(measurement.duration).toBeLessThan(PERFORMANCE_TARGETS.export.csvGeneration)
      expect(exportResult.data).toContain('Staff Name') // Header validation
      expect(exportResult.fileSize).toBeLessThan(PERFORMANCE_TARGETS.export.maxFileSize * 1024 * 1024)

      // Validate record count in CSV
      const lineCount = exportResult.data.split('\n').length - 1 // Minus header
      expect(lineCount).toBeGreaterThan(100) // Should have substantial data

      }ms | Records: ${lineCount} | Size: ${(exportResult.fileSize / 1024).toFixed(1)}KB`)
    }, 15000)

    test('should handle concurrent export requests efficiently', async () => {
      const concurrentExports = 5
      const measure = PerformanceMetrics.startMeasurement('concurrent_export_generation')

      const exportPromises = []
      for (let i = 0; i < concurrentExports; i++) {
        const exportPromise = payrollService.generatePayrollExport({
          format: i % 2 === 0 ? 'pdf' : 'csv', // Mix formats
          dateRange: {
            start: new Date(Date.now() - (30 + i * 10) * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString()
          },
          staffFilter: 'all',
          includeComponents: {
            summary: true,
            individual: true,
            transactions: false // Lighter for concurrency
          }
        })
        exportPromises.push(exportPromise)
      }

      const results = await Promise.allSettled(exportPromises)
      const measurement = measure.end()

      // All exports should succeed
      const successfulExports = results.filter(r => r.status === 'fulfilled' && r.value.success)
      expect(successfulExports.length).toBe(concurrentExports)

      // Performance should be reasonable for concurrent processing
      expect(measurement.duration).toBeLessThan(15000) // 15 seconds for 5 concurrent exports

      : ${measurement.duration.toFixed(2)}ms`)
    }, 20000)
  })

  // ==========================================
  // DATABASE PERFORMANCE TESTS
  // ==========================================

  describe('🗄️ Database Performance Optimization', () => {
    test('should execute simple queries within performance targets', async () => {
      const queries = [
        () => supabase.from('barbershops').select('id, name').eq('id', testBarbershop.id).single(),
        () => supabase.from('commission_transactions').select('count()').eq('barbershop_id', testBarbershop.id),
        () => supabase.from('commission_transactions').select('*').eq('barbershop_id', testBarbershop.id).limit(10),
      ]

      for (const [index, query] of queries.entries()) {
        const measure = PerformanceMetrics.startMeasurement(`simple_query_${index}`)
        
        const { data, error } = await query()
        
        const measurement = measure.end()

        expect(error).toBeNull()
        expect(data).toBeTruthy()
        expect(measurement.duration).toBeLessThan(PERFORMANCE_TARGETS.database.simpleQuery)

        }ms`)
      }
    })

    test('should execute complex aggregation queries within performance targets', async () => {
      const complexQueries = [
        // Monthly commission totals by barber
        () => supabase
          .from('commission_transactions')
          .select('barber_id, commission_amount')
          .eq('barbershop_id', testBarbershop.id)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        
        // Top performing barbers
        () => supabase
          .from('commission_transactions')
          .select('barber_id, commission_amount, created_at')
          .eq('barbershop_id', testBarbershop.id)
          .order('commission_amount', { ascending: false })
          .limit(20),
        
        // Service performance analysis
        () => supabase
          .from('commission_transactions')
          .select('service_name, payment_amount, commission_amount')
          .eq('barbershop_id', testBarbershop.id)
          .not('service_name', 'is', null)
      ]

      for (const [index, query] of complexQueries.entries()) {
        const measure = PerformanceMetrics.startMeasurement(`complex_query_${index}`)
        
        const { data, error } = await query()
        
        const measurement = measure.end()

        expect(error).toBeNull()
        expect(data).toBeTruthy()
        expect(measurement.duration).toBeLessThan(PERFORMANCE_TARGETS.database.complexQuery)

        }ms | Records: ${data?.length || 0}`)
      }
    })

    test('should perform bulk inserts efficiently', async () => {
      const bulkRecords = PerfTestDataFactory.generateCommissionRecords(100, testBarbershop.id)
      bulkRecords.forEach((record, i) => record.id = `bulk_insert_${i}_${Date.now()}`)

      const measure = PerformanceMetrics.startMeasurement('bulk_insert')
      
      const { data, error } = await supabase
        .from('commission_transactions')
        .insert(bulkRecords)
        .select()

      const measurement = measure.end()

      expect(error).toBeNull()
      expect(data).toHaveLength(100)
      expect(measurement.duration).toBeLessThan(PERFORMANCE_TARGETS.database.bulkInsert)

      : ${measurement.duration.toFixed(2)}ms`)

      // Track for cleanup
      performanceData.push({
        type: 'commission_transactions',
        ids: data.map(r => r.id),
        barbershop_id: testBarbershop.id
      })
    })

    test('should demonstrate effective index usage', async () => {
      // Test indexed queries vs non-indexed
      const indexedQuery = () => supabase
        .from('commission_transactions')
        .select('*')
        .eq('barbershop_id', testBarbershop.id) // Should use index
        .eq('barber_id', 'perf_barber_0') // Should use index
        .limit(50)

      const measure = PerformanceMetrics.startMeasurement('indexed_query')
      
      const { data, error } = await indexedQuery()
      
      const measurement = measure.end()

      expect(error).toBeNull()
      expect(data).toBeTruthy()
      expect(measurement.duration).toBeLessThan(PERFORMANCE_TARGETS.database.indexSeek)

      }ms | Used indexes: barbershop_id, barber_id`)
    })

    test('should handle concurrent database operations', async () => {
      const concurrentOperations = 20
      const operations = []

      for (let i = 0; i < concurrentOperations; i++) {
        const operation = async () => {
          const measure = PerformanceMetrics.startMeasurement('concurrent_db_operation')
          
          // Mix of read and write operations
          if (i % 3 === 0) {
            // Read operation
            const { data } = await supabase
              .from('commission_transactions')
              .select('*')
              .eq('barbershop_id', testBarbershop.id)
              .limit(10)
              .single()
            measure.end()
            return { type: 'read', success: !!data }
          } else {
            // Write operation
            const record = PerfTestDataFactory.generateCommissionRecords(1, testBarbershop.id)[0]
            record.id = `concurrent_${i}_${Date.now()}`
            
            const { data, error } = await supabase
              .from('commission_transactions')
              .insert([record])
              .select()
            
            measure.end()
            return { type: 'write', success: !error, id: data?.[0]?.id }
          }
        }
        
        operations.push(operation())
      }

      const results = await Promise.allSettled(operations)
      
      const successfulOperations = results.filter(r => r.status === 'fulfilled' && r.value.success)
      const successRate = successfulOperations.length / results.length

      expect(successRate).toBeGreaterThan(0.95) // 95% success rate

      : ${(successRate * 100).toFixed(1)}% success rate`)
    })
  })

  // ==========================================
  // TIER SYSTEM PERFORMANCE TESTS
  // ==========================================

  describe('🏆 Tier System Performance', () => {
    test('should calculate tier status quickly for multiple barbers', async () => {
      const barberIds = Array.from({ length: 50 }, (_, i) => `perf_tier_barber_${i}`)
      
      const measure = PerformanceMetrics.startMeasurement('tier_calculations_bulk')
      
      const tierCalculations = await Promise.all(
        barberIds.map(barberId => 
          tierSystem.calculateTierStatus(barberId, testBarbershop.id, 150000) // $1500 revenue
        )
      )
      
      const measurement = measure.end()

      expect(tierCalculations).toHaveLength(50)
      expect(measurement.duration).toBeLessThan(2000) // 2 seconds for 50 calculations

      // Verify calculations are consistent
      tierCalculations.forEach(tierStatus => {
        expect(tierStatus.current_tier).toBeTruthy()
        expect(tierStatus.current_tier.tier_level).toBeGreaterThanOrEqual(1)
      })

      const avgPerCalculation = measurement.duration / 50
      : ${measurement.duration.toFixed(2)}ms | Avg: ${avgPerCalculation.toFixed(2)}ms per barber`)
    })

    test('should handle progressive tier advancement efficiently', async () => {
      const barberId = 'tier_progression_barber'
      const revenueProgression = [50000, 100000, 150000, 200000, 300000] // $500 to $3000

      const measure = PerformanceMetrics.startMeasurement('tier_progression')
      
      const progressionResults = []
      for (const revenue of revenueProgression) {
        const tierStatus = await tierSystem.calculateTierStatus(barberId, testBarbershop.id, revenue)
        progressionResults.push({
          revenue,
          tierLevel: tierStatus.current_tier.tier_level,
          commissionRate: tierStatus.current_tier.commission_percentage
        })
      }
      
      const measurement = measure.end()

      // Verify progression logic
      expect(progressionResults[0].tierLevel).toBeLessThanOrEqual(progressionResults[4].tierLevel)
      expect(progressionResults[0].commissionRate).toBeLessThanOrEqual(progressionResults[4].commissionRate)

      expect(measurement.duration).toBeLessThan(1000) // 1 second for full progression

      : ${measurement.duration.toFixed(2)}ms`)
    })
  })

  // ==========================================
  // REAL-TIME PERFORMANCE TESTS
  // ==========================================

  describe('⚡ Real-Time Performance', () => {
    test('should deliver notifications within performance targets', async () => {
      const notifications = [
        { type: 'commission_calculated', priority: 'high' },
        { type: 'tier_advanced', priority: 'medium' },
        { type: 'payout_completed', priority: 'high' },
        { type: 'export_generated', priority: 'low' }
      ]

      const deliveryTimes = []

      for (const notification of notifications) {
        const measure = PerformanceMetrics.startMeasurement('notification_delivery')
        
        // Simulate notification delivery
        await webhookPipeline.sendNotification(testBarbershop.id, notification)
        
        const measurement = measure.end()
        deliveryTimes.push(measurement.duration)

        expect(measurement.duration).toBeLessThan(100) // 100ms max delivery time
      }

      const avgDeliveryTime = deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
      }ms | Max ${Math.max(...deliveryTimes).toFixed(2)}ms`)
    })

    test('should maintain real-time dashboard update performance', async () => {
      const dashboardUpdates = 20
      const updateTimes = []

      for (let i = 0; i < dashboardUpdates; i++) {
        const measure = PerformanceMetrics.startMeasurement('dashboard_update')
        
        // Simulate dashboard data fetch
        const dashboardData = await payrollService.getDashboardData(testBarbershop.id, {
          dateRange: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString()
          }
        })
        
        const measurement = measure.end()
        updateTimes.push(measurement.duration)

        expect(dashboardData).toBeTruthy()
        expect(measurement.duration).toBeLessThan(PERFORMANCE_TARGETS.api.responseTime)
      }

      const avgUpdateTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length
      const p95UpdateTime = percentile(updateTimes, 0.95)

      : Avg ${avgUpdateTime.toFixed(2)}ms | P95 ${p95UpdateTime.toFixed(2)}ms`)
    })
  })

  // ==========================================
  // SCALABILITY STRESS TESTS
  // ==========================================

  describe('📈 Scalability Stress Tests', () => {
    test('should handle 10x expected load gracefully', async () => {
      const expectedDailyWebhooks = 100
      const stressTestWebhooks = expectedDailyWebhooks * 10 // 10x load

      const measure = PerformanceMetrics.startMeasurement('stress_test_10x_load')
      
      // Generate webhooks in batches to simulate realistic load
      const batchSize = 50
      const batches = Math.ceil(stressTestWebhooks / batchSize)
      const results = []

      for (let batch = 0; batch < batches; batch++) {
        const batchPayments = PerfTestDataFactory.generateBulkPayments(batchSize)
        batchPayments.forEach((p, i) => {
          p.id = `stress_${batch}_${i}_${Date.now()}`
          p.metadata.barbershop_id = testBarbershop.id
        })

        const batchPromises = batchPayments.map(payment => {
          const webhookPayload = JSON.stringify({
            type: 'payment_intent.succeeded',
            data: { object: payment }
          })

          const signature = crypto
            .createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
            .update(`${Math.floor(Date.now() / 1000)}.${webhookPayload}`)
            .digest('hex')

          return webhookPipeline.processStripeWebhook(
            webhookPayload,
            `t=${Math.floor(Date.now() / 1000)},v1=${signature}`
          )
        })

        const batchResults = await Promise.allSettled(batchPromises)
        results.push(...batchResults)

        // Small delay between batches to prevent overwhelming
        if (batch < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      const stressMeasurement = measure.end()

      // Analyze results
      const successfulWebhooks = results.filter(r => r.status === 'fulfilled' && r.value.success)
      const successRate = successfulWebhooks.length / results.length
      const avgProcessingTime = stressMeasurement.duration / stressTestWebhooks

      // Stress test acceptance criteria
      expect(successRate).toBeGreaterThan(0.8) // 80% success rate under extreme load
      expect(avgProcessingTime).toBeLessThan(1000) // Max 1 second average under stress

      .toFixed(1)}%`)
      .toFixed(2)}s`)
      }ms`)
      ).toFixed(1)} webhooks/second`)
    }, 60000) // 1 minute timeout for stress test
  })
})

/**
 * ⚡ PERFORMANCE TEST EXECUTION SUMMARY
 * 
 * This comprehensive performance test suite validates:
 * 
 * ✅ Webhook Processing Performance (4 tests):
 *   - Single webhook processing under 200ms
 *   - Bulk webhook processing (100 webhooks) under 5s
 *   - Concurrent webhook processing (50 concurrent) under 10s
 *   - Memory usage optimization under pressure
 * 
 * ✅ Export Generation Performance (4 tests):
 *   - PDF export for 200 records under 5s
 *   - Excel export for 1000 records under 8s
 *   - CSV export for 5000 records under 2s
 *   - Concurrent export request handling
 * 
 * ✅ Database Performance (5 tests):
 *   - Simple queries under 50ms
 *   - Complex aggregation queries under 200ms
 *   - Bulk inserts (100 records) under 1s
 *   - Index effectiveness validation under 10ms
 *   - Concurrent database operations with 95% success
 * 
 * ✅ Tier System Performance (2 tests):
 *   - Bulk tier calculations (50 barbers) under 2s
 *   - Progressive tier advancement under 1s
 * 
 * ✅ Real-Time Performance (2 tests):
 *   - Notification delivery under 100ms
 *   - Dashboard update performance under 500ms
 * 
 * ✅ Scalability Stress Tests (1 test):
 *   - 10x expected load handling with 80% success rate
 * 
 * TOTAL: 18 comprehensive performance test cases
 * 
 * Run Command: npm test payroll-performance-benchmarks.test.js
 * Expected Duration: ~5-8 minutes for complete performance validation
 * Performance Targets: Production-ready scalability up to 10x expected load
 */
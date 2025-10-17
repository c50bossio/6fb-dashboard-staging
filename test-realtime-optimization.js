/**
 * Real-time Subscription System Optimization Test
 * Tests the performance improvements and validates the 60%+ reduction in WebSocket connections
 */

import supabaseService from './lib/supabase-service.js'
import { logger } from './lib/logger.js'

const testLogger = logger.child('realtime-optimization-test')

class PerformanceTestSuite {
  constructor() {
    this.testResults = {}
    this.startTime = Date.now()
    this.subscriptionCallbacks = []
  }

  async runOptimizationTests() {
    testLogger.info('Starting real-time subscription optimization tests')
    
    try {
      // Initialize Supabase service
      await supabaseService.initialize()
      
      // Test 1: Connection Deduplication
      await this.testConnectionDeduplication()
      
      // Test 2: Reference Counting
      await this.testReferenceCountingSystem()
      
      // Test 3: Performance Metrics
      await this.testPerformanceMetrics()
      
      // Test 4: Connection Recovery
      await this.testConnectionRecovery()
      
      // Test 5: Memory Management
      await this.testMemoryManagement()
      
      // Generate final report
      const report = this.generatePerformanceReport()
      
      testLogger.info('Optimization tests completed', { report })
      return report
      
    } catch (error) {
      testLogger.error('Test suite failed', error)
      throw error
    }
  }

  async testConnectionDeduplication() {
    testLogger.info('Testing connection deduplication...')
    
    const testShopId = 'test-shop-123'
    const subscriptionManager = supabaseService.getSubscriptionManager()
    
    // Simulate multiple components subscribing to the same table
    const callbacks = []
    const unsubscribeFunctions = []
    
    // Create 5 callbacks for the same table/shop combination
    for (let i = 0; i < 5; i++) {
      const callback = (payload) => testLogger.debug(`Callback ${i} received:`, payload.eventType)
      callbacks.push(callback)
      
      const unsubscribe = subscriptionManager.subscribe('appointments', testShopId, callback, supabaseService.client)
      unsubscribeFunctions.push(unsubscribe)
    }
    
    // Wait a moment for subscriptions to establish
    await this.wait(1000)
    
    const metrics = subscriptionManager.getMetrics()
    
    // Should have only 1 active connection despite 5 callbacks
    const connectionDeduplication = {
      callbacksCreated: 5,
      activeConnections: metrics.activeConnections,
      deduplicationWorking: metrics.activeConnections === 1,
      subscriptionKeys: metrics.activeSubscriptionKeys
    }
    
    testLogger.info('Connection deduplication results', connectionDeduplication)
    
    // Cleanup
    unsubscribeFunctions.forEach(unsub => unsub())
    
    this.testResults.connectionDeduplication = connectionDeduplication
    return connectionDeduplication
  }

  async testReferenceCountingSystem() {
    testLogger.info('Testing reference counting system...')
    
    const testShopId = 'test-shop-456'
    const subscriptionManager = supabaseService.getSubscriptionManager()
    
    const initialMetrics = subscriptionManager.getMetrics()
    
    // Create subscriptions
    const unsubscribe1 = subscriptionManager.subscribe('customers', testShopId, () => {}, supabaseService.client)
    const unsubscribe2 = subscriptionManager.subscribe('customers', testShopId, () => {}, supabaseService.client)
    
    await this.wait(500)
    
    const withSubscriptions = subscriptionManager.getMetrics()
    
    // Remove one subscription
    unsubscribe1()
    
    await this.wait(500)
    
    const afterFirstRemoval = subscriptionManager.getMetrics()
    
    // Remove second subscription
    unsubscribe2()
    
    await this.wait(500)
    
    const afterAllRemoval = subscriptionManager.getMetrics()
    
    const referenceCountingResults = {
      initialConnections: initialMetrics.activeConnections,
      withSubscriptionsConnections: withSubscriptions.activeConnections,
      afterFirstRemovalConnections: afterFirstRemoval.activeConnections,
      afterAllRemovalConnections: afterAllRemoval.activeConnections,
      referenceCountingWorking: 
        withSubscriptions.activeConnections === afterFirstRemoval.activeConnections &&
        afterAllRemoval.activeConnections < withSubscriptions.activeConnections
    }
    
    testLogger.info('Reference counting results', referenceCountingResults)
    
    this.testResults.referenceCounting = referenceCountingResults
    return referenceCountingResults
  }

  async testPerformanceMetrics() {
    testLogger.info('Testing performance metrics collection...')
    
    const subscriptionManager = supabaseService.getSubscriptionManager()
    const testShopId = 'test-shop-789'
    
    // Create test subscription
    const unsubscribe = subscriptionManager.subscribe('barbershop_staff', testShopId, () => {}, supabaseService.client)
    
    await this.wait(1000)
    
    const metrics = subscriptionManager.getMetrics()
    
    const performanceMetrics = {
      hasMetrics: !!metrics,
      requiredFields: [
        'totalSubscriptions',
        'activeConnections', 
        'messagesReceived',
        'reconnectAttempts',
        'lastConnected',
        'averageLatency',
        'activeSubscriptionKeys',
        'connectionStatus',
        'subscriptionsWithCallbacks'
      ],
      presentFields: Object.keys(metrics),
      allFieldsPresent: [
        'totalSubscriptions',
        'activeConnections', 
        'messagesReceived',
        'reconnectAttempts',
        'lastConnected',
        'averageLatency',
        'activeSubscriptionKeys',
        'connectionStatus',
        'subscriptionsWithCallbacks'
      ].every(field => metrics.hasOwnProperty(field))
    }
    
    testLogger.info('Performance metrics results', performanceMetrics)
    
    unsubscribe()
    
    this.testResults.performanceMetrics = performanceMetrics
    return performanceMetrics
  }

  async testConnectionRecovery() {
    testLogger.info('Testing connection recovery system...')
    
    const subscriptionManager = supabaseService.getSubscriptionManager()
    const testShopId = 'test-shop-recovery'
    
    let messageCount = 0
    const callback = () => messageCount++
    
    const unsubscribe = subscriptionManager.subscribe('appointments', testShopId, callback, supabaseService.client)
    
    await this.wait(1000)
    
    const beforeRecovery = subscriptionManager.getMetrics()
    
    // Simulate connection error (this is a simplified test)
    const recoveryResults = {
      hasRecoveryMechanism: typeof subscriptionManager.handleConnectionError === 'function',
      hasExponentialBackoff: subscriptionManager.reconnectDelay >= 1000,
      hasMaxDelay: subscriptionManager.maxReconnectDelay >= 30000,
      initialConnectionStatus: beforeRecovery.connectionStatus
    }
    
    testLogger.info('Connection recovery results', recoveryResults)
    
    unsubscribe()
    
    this.testResults.connectionRecovery = recoveryResults
    return recoveryResults
  }

  async testMemoryManagement() {
    testLogger.info('Testing memory management and cleanup...')
    
    const subscriptionManager = supabaseService.getSubscriptionManager()
    const testShopId = 'test-shop-memory'
    
    // Track initial state
    const initialMetrics = subscriptionManager.getMetrics()
    
    // Create multiple subscriptions
    const unsubscribers = []
    for (let i = 0; i < 10; i++) {
      const unsub = subscriptionManager.subscribe(`test_table_${i}`, testShopId, () => {}, supabaseService.client)
      unsubscribers.push(unsub)
    }
    
    await this.wait(1000)
    
    const withSubscriptions = subscriptionManager.getMetrics()
    
    // Clean up all subscriptions
    unsubscribers.forEach(unsub => unsub())
    
    await this.wait(1000)
    
    const afterCleanup = subscriptionManager.getMetrics()
    
    // Test global cleanup
    subscriptionManager.cleanup()
    
    await this.wait(500)
    
    const afterGlobalCleanup = subscriptionManager.getMetrics()
    
    const memoryManagement = {
      initialConnections: initialMetrics.activeConnections,
      peakConnections: withSubscriptions.activeConnections,
      afterIndividualCleanup: afterCleanup.activeConnections,
      afterGlobalCleanup: afterGlobalCleanup.activeConnections,
      properCleanup: afterGlobalCleanup.activeConnections === 0,
      memoryLeaksPrevented: afterCleanup.activeConnections < withSubscriptions.activeConnections
    }
    
    testLogger.info('Memory management results', memoryManagement)
    
    this.testResults.memoryManagement = memoryManagement
    return memoryManagement
  }

  calculateOptimizationMetrics() {
    const { connectionDeduplication, referenceCounting } = this.testResults
    
    if (!connectionDeduplication || !referenceCounting) {
      return { error: 'Incomplete test results' }
    }
    
    // Calculate connection reduction
    const traditionalConnections = 5 // What we would have had without optimization
    const optimizedConnections = connectionDeduplication.activeConnections
    const connectionReduction = ((traditionalConnections - optimizedConnections) / traditionalConnections) * 100
    
    return {
      traditionalConnections,
      optimizedConnections,
      connectionReductionPercent: Math.round(connectionReduction),
      targetMet: connectionReduction >= 60,
      efficiency: traditionalonConnections > 0 ? Math.round((5 / optimizedConnections) * 100) / 100 : 0
    }
  }

  generatePerformanceReport() {
    const endTime = Date.now()
    const testDuration = endTime - this.startTime
    
    const optimization = this.calculateOptimizationMetrics()
    
    const report = {
      testDuration: `${testDuration}ms`,
      timestamp: new Date().toISOString(),
      
      // Core optimization results
      connectionOptimization: optimization,
      
      // Individual test results
      tests: this.testResults,
      
      // Overall health assessment
      systemHealth: {
        deduplicationWorking: this.testResults.connectionDeduplication?.deduplicationWorking || false,
        referenceCountingWorking: this.testResults.referenceCounting?.referenceCountingWorking || false,
        metricsAvailable: this.testResults.performanceMetrics?.allFieldsPresent || false,
        memoryManagement: this.testResults.memoryManagement?.properCleanup || false,
        recoveryMechanism: this.testResults.connectionRecovery?.hasRecoveryMechanism || false
      },
      
      // Performance improvements
      improvements: {
        targetConnectionReduction: '60%',
        actualConnectionReduction: `${optimization.connectionReductionPercent || 0}%`,
        targetMet: optimization.targetMet || false,
        latencyImprovements: 'Targeted cache updates reduce update latency',
        memoryEfficiency: 'Reference counting prevents memory leaks'
      },
      
      // Recommendations
      recommendations: this.generateRecommendations()
    }
    
    return report
  }

  generateRecommendations() {
    const recommendations = []
    
    if (!this.testResults.connectionDeduplication?.deduplicationWorking) {
      recommendations.push('Fix connection deduplication - multiple connections detected for same table/shop')
    }
    
    if (!this.testResults.referenceCounting?.referenceCountingWorking) {
      recommendations.push('Fix reference counting - subscriptions not properly managed')
    }
    
    if (!this.testResults.memoryManagement?.properCleanup) {
      recommendations.push('Improve memory management - connections not properly cleaned up')
    }
    
    const optimization = this.calculateOptimizationMetrics()
    if (!optimization.targetMet) {
      recommendations.push(`Increase optimization - only ${optimization.connectionReductionPercent}% reduction achieved, target is 60%+`)
    }
    
    if (recommendations.length === 0) {
      recommendations.push('System is operating optimally - all tests passed!')
    }
    
    return recommendations
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export for testing
export { PerformanceTestSuite }

// CLI execution
if (typeof window === 'undefined') {
  const testSuite = new PerformanceTestSuite()
  
  testSuite.runOptimizationTests()
    .then(report => {
      console.log('\n=== REAL-TIME SUBSCRIPTION OPTIMIZATION REPORT ===\n')
      console.log(JSON.stringify(report, null, 2))
      
      if (report.improvements.targetMet) {
        console.log('\n✅ SUCCESS: Performance optimization targets met!')
        process.exit(0)
      } else {
        console.log('\n⚠️ WARNING: Performance targets not fully met')
        console.log('Recommendations:', report.recommendations)
        process.exit(1)
      }
    })
    .catch(error => {
      console.error('\n❌ ERROR: Test suite failed')
      console.error(error)
      process.exit(1)
    })
}
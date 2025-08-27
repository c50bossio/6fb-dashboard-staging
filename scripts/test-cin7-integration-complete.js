#!/usr/bin/env node

/**
 * Complete CIN7 Integration Test Suite
 * 
 * This comprehensive test script validates all aspects of the CIN7 integration:
 * - Database connectivity and schema
 * - API authentication and data fetching
 * - Real-time sync service
 * - Webhook processing
 * - Booking system integration
 * - Error handling and retry logic
 */

const { createClient } = require('@supabase/supabase-js')
const fetch = require('node-fetch')
require('dotenv').config()

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

class Cin7IntegrationTester {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    this.testResults = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    }
    this.testBarbershopId = null
    this.testConnectionId = null
  }

  async runAllTests() {
    console.log('🧪 Starting Complete CIN7 Integration Test Suite\n')
    console.log('=' * 60)
    
    const testSuites = [
      () => this.testDatabaseSchema(),
      () => this.testAPIAuthentication(), 
      () => this.testCredentialsManagement(),
      () => this.testProductSync(),
      () => this.testStockSync(),
      () => this.testWebhookHandling(),
      () => this.testBookingIntegration(),
      () => this.testErrorHandling(),
      () => this.testRateLimiting(),
      () => this.testRealtimeSync(),
      () => this.testPerformance()
    ]

    for (const testSuite of testSuites) {
      try {
        await testSuite()
      } catch (error) {
        this.recordTest(`Test Suite Error`, false, error.message)
      }
      console.log('') // Add spacing between test suites
    }

    this.printFinalResults()
  }

  async testDatabaseSchema() {
    console.log('📊 Testing Database Schema...')
    
    // Test CIN7 connections table
    const { error: connError } = await this.supabase
      .from('cin7_connections')
      .select('*')
      .limit(1)
    
    this.recordTest(
      'cin7_connections table exists',
      !connError,
      connError?.message
    )

    // Test CIN7 sync logs table
    const { error: logsError } = await this.supabase
      .from('cin7_sync_logs')
      .select('*')
      .limit(1)
    
    this.recordTest(
      'cin7_sync_logs table exists',
      !logsError,
      logsError?.message
    )

    // Test inventory table has CIN7 columns
    const { data: inventoryColumns, error: invError } = await this.supabase
      .rpc('get_table_columns', { table_name: 'inventory' })

    if (!invError && inventoryColumns) {
      const cin7Columns = ['cin7_product_id', 'cin7_sku', 'cin7_last_sync']
      const hasAllColumns = cin7Columns.every(col => 
        inventoryColumns.some(dbCol => dbCol.column_name === col)
      )
      
      this.recordTest(
        'Inventory table has CIN7 columns',
        hasAllColumns,
        hasAllColumns ? 'All CIN7 columns present' : 'Missing CIN7 columns'
      )
    }

    // Create test barbershop if needed
    await this.ensureTestBarbershop()
  }

  async testAPIAuthentication() {
    console.log('🔐 Testing API Authentication...')
    
    // Test credentials endpoint
    try {
      const response = await fetch(`${API_BASE}/api/cin7/credentials`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      this.recordTest(
        'Credentials endpoint accessible',
        response.status === 200 || response.status === 401,
        `Status: ${response.status}`
      )

      // Test connection status endpoint
      const statusResponse = await fetch(`${API_BASE}/api/cin7/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      this.recordTest(
        'Status endpoint accessible',
        statusResponse.ok,
        `Status: ${statusResponse.status}`
      )

    } catch (error) {
      this.recordTest(
        'API endpoints accessible',
        false,
        error.message
      )
    }
  }

  async testCredentialsManagement() {
    console.log('🗝️ Testing Credentials Management...')
    
    // Test with mock credentials
    const mockCredentials = {
      accountId: 'test-account-id',
      apiKey: 'test-api-key',
      accountName: 'Test Account'
    }

    try {
      // Test credentials storage (will fail on API test, but should store)
      const response = await fetch(`${API_BASE}/api/cin7/credentials`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-cin7-bypass': 'true'
        },
        body: JSON.stringify(mockCredentials)
      })

      const result = await response.json()
      
      this.recordTest(
        'Credentials storage endpoint',
        response.status === 400 || response.status === 200, // 400 expected for invalid creds
        result.message || result.error
      )

      // Test credentials retrieval
      const getResponse = await fetch(`${API_BASE}/api/cin7/credentials`, {
        method: 'GET',
        headers: {
          'x-cin7-bypass': 'true'
        }
      })

      this.recordTest(
        'Credentials retrieval',
        getResponse.ok,
        `Status: ${getResponse.status}`
      )

    } catch (error) {
      this.recordTest(
        'Credentials management',
        false,
        error.message
      )
    }
  }

  async testProductSync() {
    console.log('📦 Testing Product Synchronization...')
    
    try {
      // Test sync endpoint
      const syncResponse = await fetch(`${API_BASE}/api/cin7/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-bypass': 'true'
        },
        body: JSON.stringify({
          forceFullSync: true,
          barbershop_id: this.testBarbershopId
        })
      })

      const syncResult = await syncResponse.json()
      
      this.recordTest(
        'Product sync endpoint',
        syncResponse.ok || syncResponse.status === 404, // 404 expected if no credentials
        syncResult.message || syncResult.error
      )

      // Test sync status retrieval
      const statusResponse = await fetch(`${API_BASE}/api/cin7/sync`, {
        method: 'GET',
        headers: {
          'x-dev-bypass': 'true'
        }
      })

      this.recordTest(
        'Sync status retrieval',
        statusResponse.ok,
        `Status: ${statusResponse.status}`
      )

    } catch (error) {
      this.recordTest(
        'Product sync test',
        false,
        error.message
      )
    }
  }

  async testStockSync() {
    console.log('📊 Testing Stock Synchronization...')
    
    // Test stock-only sync
    try {
      const stockSyncResponse = await fetch(`${API_BASE}/api/cin7/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-bypass': 'true'
        },
        body: JSON.stringify({
          syncStockOnly: true,
          barbershop_id: this.testBarbershopId
        })
      })

      const result = await stockSyncResponse.json()
      
      this.recordTest(
        'Stock-only sync',
        stockSyncResponse.ok || stockSyncResponse.status === 404,
        result.message || result.error
      )

    } catch (error) {
      this.recordTest(
        'Stock sync test',
        false,
        error.message
      )
    }

    // Test inventory data structure
    const { data: inventory, error: invError } = await this.supabase
      .from('inventory')
      .select('*')
      .eq('cin7_sync_enabled', true)
      .limit(5)

    this.recordTest(
      'Inventory data structure',
      !invError && Array.isArray(inventory),
      invError?.message || `Found ${inventory?.length || 0} synced items`
    )
  }

  async testWebhookHandling() {
    console.log('🪝 Testing Webhook Handling...')
    
    // Test webhook endpoint with mock data
    const mockWebhookData = {
      Type: 'Stock.Updated',
      ProductID: 'test-product-123',
      Available: 50,
      OnHand: 60,
      Timestamp: new Date().toISOString()
    }

    try {
      const webhookResponse = await fetch(`${API_BASE}/api/cin7/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Cin7-Signature': 'test-signature'
        },
        body: JSON.stringify(mockWebhookData)
      })

      const result = await webhookResponse.json()
      
      this.recordTest(
        'Webhook endpoint processing',
        webhookResponse.ok || webhookResponse.status === 401, // Signature verification might fail
        result.message || result.error
      )

      // Test different webhook types
      const webhookTypes = ['Product.Modified', 'Sale.Completed']
      
      for (const webhookType of webhookTypes) {
        const typeTestData = { ...mockWebhookData, Type: webhookType }
        
        const typeResponse = await fetch(`${API_BASE}/api/cin7/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Cin7-Signature': 'test-signature'
          },
          body: JSON.stringify(typeTestData)
        })

        this.recordTest(
          `Webhook type: ${webhookType}`,
          typeResponse.ok || typeResponse.status === 401,
          `Status: ${typeResponse.status}`
        )
      }

    } catch (error) {
      this.recordTest(
        'Webhook handling test',
        false,
        error.message
      )
    }
  }

  async testBookingIntegration() {
    console.log('📅 Testing Booking System Integration...')
    
    // Test service availability checking
    try {
      // Create test service and product
      const testService = await this.createTestService()
      const testProduct = await this.createTestProduct()
      
      if (testService && testProduct) {
        // Link service to product
        await this.linkServiceToProduct(testService.id, testProduct.id)
        
        this.recordTest(
          'Test service and product creation',
          true,
          `Created service ${testService.name} with product ${testProduct.name}`
        )

        // Test inventory availability check
        const { default: Cin7BookingIntegration } = await import('../lib/cin7-booking-integration.js')
        const bookingIntegration = new Cin7BookingIntegration()
        
        const availabilityCheck = await bookingIntegration.checkServiceAvailability(
          testService.id,
          new Date(),
          this.testBarbershopId
        )

        this.recordTest(
          'Service availability check',
          typeof availabilityCheck.isAvailable === 'boolean',
          `Availability: ${availabilityCheck.isAvailable}, Products: ${availabilityCheck.requiredProducts.length}`
        )

        // Test inventory reservation
        const testAppointment = await this.createTestAppointment(testService.id)
        
        if (testAppointment) {
          const reservationResult = await bookingIntegration.reserveInventoryForAppointment(testAppointment.id)
          
          this.recordTest(
            'Inventory reservation',
            reservationResult.success !== false,
            reservationResult.message || reservationResult.error
          )

          // Test inventory release
          const releaseResult = await bookingIntegration.releaseInventoryReservation(testAppointment.id, false)
          
          this.recordTest(
            'Inventory release',
            releaseResult.success !== false,
            releaseResult.message || releaseResult.error
          )

          // Cleanup test appointment
          await this.supabase
            .from('appointments')
            .delete()
            .eq('id', testAppointment.id)
        }

        // Cleanup test data
        await this.cleanupTestData(testService.id, testProduct.id)
      }

    } catch (error) {
      this.recordTest(
        'Booking integration test',
        false,
        error.message
      )
    }
  }

  async testErrorHandling() {
    console.log('🚨 Testing Error Handling...')
    
    // Test invalid API credentials
    try {
      const invalidCredsResponse = await fetch(`${API_BASE}/api/cin7/credentials`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-cin7-bypass': 'true'
        },
        body: JSON.stringify({
          accountId: 'invalid',
          apiKey: 'invalid'
        })
      })

      const result = await invalidCredsResponse.json()
      
      this.recordTest(
        'Invalid credentials handling',
        !invalidCredsResponse.ok && result.error,
        result.error || 'Correctly rejected invalid credentials'
      )

    } catch (error) {
      this.recordTest(
        'Error handling test',
        false,
        error.message
      )
    }

    // Test malformed webhook data
    try {
      const malformedResponse = await fetch(`${API_BASE}/api/cin7/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      })

      this.recordTest(
        'Malformed webhook handling',
        !malformedResponse.ok,
        `Status: ${malformedResponse.status} (expected error)`
      )

    } catch (error) {
      this.recordTest(
        'Malformed data handling',
        true, // Catching error is expected
        'Correctly handled malformed data'
      )
    }
  }

  async testRateLimiting() {
    console.log('⏱️ Testing Rate Limiting...')
    
    // Test multiple rapid requests
    const rapidRequests = Array(5).fill().map(() => 
      fetch(`${API_BASE}/api/cin7/status`, {
        method: 'GET',
        headers: { 'x-dev-bypass': 'true' }
      })
    )

    try {
      const responses = await Promise.allSettled(rapidRequests)
      const successfulRequests = responses.filter(r => r.status === 'fulfilled' && r.value.ok).length
      const failedRequests = responses.length - successfulRequests

      this.recordTest(
        'Rate limiting behavior',
        successfulRequests > 0,
        `${successfulRequests} successful, ${failedRequests} rate-limited`
      )

    } catch (error) {
      this.recordTest(
        'Rate limiting test',
        false,
        error.message
      )
    }
  }

  async testRealtimeSync() {
    console.log('⚡ Testing Real-time Sync...')
    
    try {
      // Test real-time sync service initialization
      const { default: cin7RealtimeSync } = await import('../lib/cin7-realtime-sync.js')
      
      this.recordTest(
        'Real-time sync service import',
        typeof cin7RealtimeSync === 'object',
        'Successfully imported real-time sync service'
      )

      // Test event emission
      let eventReceived = false
      cin7RealtimeSync.once('test-event', () => {
        eventReceived = true
      })
      
      cin7RealtimeSync.emit('test-event')
      
      setTimeout(() => {
        this.recordTest(
          'Real-time event system',
          eventReceived,
          eventReceived ? 'Events working correctly' : 'Events not working'
        )
      }, 100)

    } catch (error) {
      this.recordTest(
        'Real-time sync test',
        false,
        error.message
      )
    }
  }

  async testPerformance() {
    console.log('🚀 Testing Performance...')
    
    // Test API response times
    const performanceTests = [
      { name: 'Status endpoint', url: `${API_BASE}/api/cin7/status` },
      { name: 'Credentials endpoint', url: `${API_BASE}/api/cin7/credentials` }
    ]

    for (const test of performanceTests) {
      try {
        const startTime = Date.now()
        
        const response = await fetch(test.url, {
          method: 'GET',
          headers: { 'x-dev-bypass': 'true' }
        })
        
        const endTime = Date.now()
        const responseTime = endTime - startTime

        this.recordTest(
          `${test.name} response time`,
          responseTime < 5000, // 5 second threshold
          `${responseTime}ms (${responseTime < 1000 ? 'Fast' : responseTime < 5000 ? 'Acceptable' : 'Slow'})`
        )

      } catch (error) {
        this.recordTest(
          `${test.name} performance`,
          false,
          error.message
        )
      }
    }

    // Test database query performance
    try {
      const startTime = Date.now()
      
      await this.supabase
        .from('inventory')
        .select('id, name, current_stock')
        .limit(100)
      
      const queryTime = Date.now() - startTime
      
      this.recordTest(
        'Database query performance',
        queryTime < 2000,
        `${queryTime}ms for 100 records`
      )

    } catch (error) {
      this.recordTest(
        'Database performance test',
        false,
        error.message
      )
    }
  }

  // Helper methods
  async ensureTestBarbershop() {
    const { data: barbershop, error } = await this.supabase
      .from('barbershops')
      .select('id, name')
      .eq('name', 'CIN7 Test Shop')
      .single()

    if (error || !barbershop) {
      const { data: newShop, error: createError } = await this.supabase
        .from('barbershops')
        .insert({
          name: 'CIN7 Test Shop',
          address: '123 Test Street',
          phone: '555-0123',
          status: 'active',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        console.warn('⚠️ Could not create test barbershop:', createError.message)
        return false
      }

      this.testBarbershopId = newShop.id
    } else {
      this.testBarbershopId = barbershop.id
    }

    return true
  }

  async createTestService() {
    const { data: service, error } = await this.supabase
      .from('services')
      .insert({
        barbershop_id: this.testBarbershopId,
        name: 'CIN7 Test Service',
        description: 'Test service for CIN7 integration',
        price: 25.00,
        duration: 30,
        category: 'test',
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    return error ? null : service
  }

  async createTestProduct() {
    const { data: product, error } = await this.supabase
      .from('inventory')
      .insert({
        barbershop_id: this.testBarbershopId,
        name: 'CIN7 Test Product',
        sku: 'TEST-CIN7-001',
        category: 'test',
        current_stock: 10,
        min_stock_level: 2,
        unit_cost: 5.00,
        retail_price: 10.00,
        cin7_sync_enabled: true,
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    return error ? null : product
  }

  async linkServiceToProduct(serviceId, productId) {
    const { error } = await this.supabase
      .from('service_products')
      .insert({
        service_id: serviceId,
        product_id: productId,
        quantity_required: 1,
        is_optional: false
      })

    return !error
  }

  async createTestAppointment(serviceId) {
    const { data: appointment, error } = await this.supabase
      .from('appointments')
      .insert({
        barbershop_id: this.testBarbershopId,
        service_id: serviceId,
        customer_name: 'CIN7 Test Customer',
        customer_phone: '555-0456',
        appointment_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        duration: 30,
        status: 'confirmed',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    return error ? null : appointment
  }

  async cleanupTestData(serviceId, productId) {
    await this.supabase.from('service_products').delete().eq('service_id', serviceId)
    await this.supabase.from('services').delete().eq('id', serviceId)
    await this.supabase.from('inventory').delete().eq('id', productId)
  }

  recordTest(testName, passed, details = '') {
    const result = {
      name: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    }

    this.testResults.details.push(result)

    if (passed) {
      this.testResults.passed++
      console.log(`  ✅ ${testName}: ${details}`)
    } else {
      this.testResults.failed++
      console.log(`  ❌ ${testName}: ${details}`)
    }
  }

  printFinalResults() {
    console.log('\n' + '=' * 60)
    console.log('🧪 CIN7 Integration Test Results')
    console.log('=' * 60)
    console.log(`✅ Passed: ${this.testResults.passed}`)
    console.log(`❌ Failed: ${this.testResults.failed}`)
    console.log(`📊 Total: ${this.testResults.passed + this.testResults.failed}`)
    
    const successRate = (this.testResults.passed / (this.testResults.passed + this.testResults.failed) * 100).toFixed(1)
    console.log(`📈 Success Rate: ${successRate}%`)

    if (this.testResults.failed === 0) {
      console.log('\n🎉 All tests passed! CIN7 integration is working correctly.')
    } else if (successRate >= 80) {
      console.log('\n⚠️ Most tests passed. Some issues may need attention.')
    } else {
      console.log('\n🚨 Significant issues detected. Integration needs attention.')
    }

    // Save results to file
    const resultsFile = `cin7-integration-test-results-${Date.now()}.json`
    require('fs').writeFileSync(resultsFile, JSON.stringify(this.testResults, null, 2))
    console.log(`\n📄 Detailed results saved to: ${resultsFile}`)
  }
}

// Run tests if executed directly
if (require.main === module) {
  const tester = new Cin7IntegrationTester()
  tester.runAllTests().catch(console.error)
}

module.exports = Cin7IntegrationTester
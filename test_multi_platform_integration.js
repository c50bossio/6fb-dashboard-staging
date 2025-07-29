/**
 * Comprehensive Test Suite for Multi-Platform Integration System
 * Tests all components: adapters, sync orchestrator, business context engine
 */

import sqlite3 from 'sqlite3'
import { promisify } from 'util'
import fs from 'fs'

// Import our components
import GoogleCalendarAdapter from './lib/adapters/google-calendar-adapter.js'
import AcuityAdapter from './lib/adapters/acuity-adapter.js'
import SquareAdapter from './lib/adapters/square-adapter.js'
import syncOrchestrator from './services/sync-orchestrator.js'
import businessContextEngine from './services/business-context-engine.js'

const TEST_DATABASE_PATH = '/Users/bossio/6FB AI Agent System/test_agent_system.db'

class MultiPlatformIntegrationTester {
  constructor() {
    this.db = null
    this.testResults = []
    this.barbershopId = 'test-barbershop-001'
  }

  /**
   * Initialize test database
   */
  async initTestDatabase() {
    // Remove existing test database
    if (fs.existsSync(TEST_DATABASE_PATH)) {
      fs.unlinkSync(TEST_DATABASE_PATH)
    }

    this.db = new sqlite3.Database(TEST_DATABASE_PATH)
    this.db.getAsync = promisify(this.db.get.bind(this.db))
    this.db.allAsync = promisify(this.db.all.bind(this.db))
    this.db.runAsync = promisify(this.db.run.bind(this.db))

    // Load schema
    const schema = fs.readFileSync('./database/multi-platform-integration-schema.sql', 'utf8')
    const statements = schema.split(';').filter(stmt => stmt.trim())
    
    for (const statement of statements) {
      if (statement.trim()) {
        await this.db.runAsync(statement)
      }
    }

    console.log('✅ Test database initialized')
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting Multi-Platform Integration Test Suite\n')

    try {
      await this.initTestDatabase()
      
      // Test individual components
      await this.testPlatformAdapters()
      await this.testSyncOrchestrator()
      await this.testBusinessContextEngine()
      await this.testIntegrationWorkflows()
      await this.testConflictResolution()
      await this.testDataQuality()
      
      // Print results
      this.printTestResults()
      
    } catch (error) {
      console.error('❌ Test suite failed:', error)
    } finally {
      this.cleanup()
    }
  }

  /**
   * Test platform adapters
   */
  async testPlatformAdapters() {
    console.log('📊 Testing Platform Adapters...')

    // Test Google Calendar Adapter
    await this.testGoogleCalendarAdapter()
    
    // Test Acuity Adapter
    await this.testAcuityAdapter()
    
    // Test Square Adapter
    await this.testSquareAdapter()
  }

  /**
   * Test Google Calendar Adapter
   */
  async testGoogleCalendarAdapter() {
    const adapter = new GoogleCalendarAdapter()
    const testName = 'Google Calendar Adapter'
    
    try {
      // Test normalization with mock data
      const mockGoogleEvent = {
        id: 'google-event-123',
        summary: 'Haircut with John Doe',
        description: 'Regular haircut\nPhone: 555-0123\nPrice: $35',
        start: { dateTime: '2024-01-15T10:00:00-05:00', timeZone: 'America/New_York' },
        end: { dateTime: '2024-01-15T10:30:00-05:00', timeZone: 'America/New_York' },
        attendees: [{ email: 'john.doe@email.com', displayName: 'John Doe' }],
        organizer: { email: 'barber@shop.com', displayName: 'Mike the Barber' },
        location: '123 Main St, Anytown, USA',
        status: 'confirmed',
        created: '2024-01-14T09:00:00Z',
        updated: '2024-01-14T09:30:00Z'
      }

      const normalized = await adapter.normalizeAppointment(mockGoogleEvent, this.barbershopId)
      
      // Validate normalized data structure
      this.assert(normalized.id === 'google-event-123', 'ID mapping')
      this.assert(normalized.platformId === 'google', 'Platform ID')
      this.assert(normalized.client.name === 'John Doe', 'Client name extraction')
      this.assert(normalized.client.email === 'john.doe@email.com', 'Client email extraction')
      this.assert(normalized.client.phone === '5550123', 'Phone number extraction')
      this.assert(normalized.service.name === 'Haircut', 'Service name extraction')
      this.assert(normalized.service.duration === 30, 'Duration calculation')
      this.assert(normalized.staff.name === 'Mike the Barber', 'Staff name extraction')
      this.assert(normalized.scheduling.status === 'confirmed', 'Status mapping')
      this.assert(normalized.business.location === '123 Main St, Anytown, USA', 'Location extraction')
      
      this.recordSuccess(testName, 'Google Calendar event normalization')
    } catch (error) {
      this.recordFailure(testName, 'Google Calendar event normalization', error)
    }
  }

  /**
   * Test Acuity Adapter
   */
  async testAcuityAdapter() {
    const adapter = new AcuityAdapter()
    const testName = 'Acuity Adapter'
    
    try {
      // Test normalization with mock Acuity appointment
      const mockAcuityAppointment = {
        id: 12345,
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@email.com',
        phone: '555-0456',
        datetime: '2024-01-16T14:00:00-0500',
        duration: 45,
        type: 'Beard Trim & Style',
        category: 'Beard Services',
        price: 40,
        currency: 'USD',
        paid: 'yes',
        calendar: 'Tom Wilson',
        calendarID: 789,
        appointmentTypeID: 456,
        location: 'Main Location',
        notes: 'Regular customer, prefers shorter trim',
        timezone: 'America/New_York',
        canceled: 'false',
        datetimeCreated: '2024-01-15T12:00:00-0500'
      }

      const normalized = await adapter.normalizeAppointment(mockAcuityAppointment, this.barbershopId)
      
      // Validate normalized data
      this.assert(normalized.id === '12345', 'ID conversion')
      this.assert(normalized.platformId === 'acuity', 'Platform ID')
      this.assert(normalized.client.name === 'Jane Smith', 'Client name combination')
      this.assert(normalized.client.email === 'jane.smith@email.com', 'Client email')
      this.assert(normalized.client.phone === '555-0456', 'Client phone')
      this.assert(normalized.service.name === 'Beard Trim & Style', 'Service name')
      this.assert(normalized.service.category === 'beard', 'Service categorization')
      this.assert(normalized.service.duration === 45, 'Service duration')
      this.assert(normalized.service.price === 40, 'Service price')
      this.assert(normalized.staff.name === 'Tom Wilson', 'Staff name')
      this.assert(normalized.scheduling.status === 'confirmed', 'Status mapping')
      this.assert(normalized.payment.total === 40, 'Payment total')
      this.assert(normalized.payment.status === 'completed', 'Payment status')
      
      this.recordSuccess(testName, 'Acuity appointment normalization')
    } catch (error) {
      this.recordFailure(testName, 'Acuity appointment normalization', error)
    }
  }

  /**
   * Test Square Adapter
   */
  async testSquareAdapter() {
    const adapter = new SquareAdapter()
    const testName = 'Square Adapter'
    
    try {
      // Test normalization with mock Square booking
      const mockSquareBooking = {
        id: 'BOOKING_123',
        location_id: 'LOCATION_456',
        start_at: '2024-01-17T11:00:00Z',
        customer_id: 'CUSTOMER_789',
        appointment_segments: [
          {
            duration_minutes: 60,
            service_variation_id: 'SERVICE_321',
            team_member_id: 'TEAM_654'
          }
        ],
        customer_note: 'First time customer',
        seller_note: 'Very satisfied with service',
        status: 'ACCEPTED',
        created_at: '2024-01-16T10:00:00Z',
        updated_at: '2024-01-16T10:30:00Z',
        version: 1
      }

      const normalized = await adapter.normalizeAppointment(mockSquareBooking, this.barbershopId)
      
      // Validate normalized data
      this.assert(normalized.id === 'BOOKING_123', 'ID mapping')
      this.assert(normalized.platformId === 'square', 'Platform ID')
      this.assert(normalized.scheduling.duration === 60, 'Duration extraction')
      this.assert(normalized.scheduling.status === 'confirmed', 'Status mapping')
      this.assert(normalized.client.notes === 'First time customer', 'Client notes')
      this.assert(normalized.feedback.staffNotes === 'Very satisfied with service', 'Staff notes')
      this.assert(normalized.business.location === 'LOCATION_456', 'Location mapping')
      
      this.recordSuccess(testName, 'Square booking normalization')
    } catch (error) {
      this.recordFailure(testName, 'Square booking normalization', error)
    }
  }

  /**
   * Test Sync Orchestrator
   */
  async testSyncOrchestrator() {
    console.log('🔄 Testing Sync Orchestrator...')

    try {
      // Create test integrations
      await this.createTestIntegrations()
      
      // Test rate limiting
      await this.testRateLimiting()
      
      // Test sync orchestration
      await this.testSyncExecution()
      
      // Test conflict resolution
      await this.testConflictDetection()
      
    } catch (error) {
      this.recordFailure('Sync Orchestrator', 'General functionality', error)
    }
  }

  /**
   * Create test integrations
   */
  async createTestIntegrations() {
    const integrations = [
      {
        platform: 'google',
        credentials: JSON.stringify({ access_token: 'test-google-token' }),
        sync_schedule: 'every_4_hours'
      },
      {
        platform: 'trafft',
        credentials: JSON.stringify({ apiKey: 'test-trafft-key', apiSecret: 'test-secret' }),
        sync_schedule: 'hourly'
      },
      {
        platform: 'acuity',
        credentials: JSON.stringify({ userId: 'test-user', apiKey: 'test-acuity-key' }),
        sync_schedule: 'every_4_hours'
      }
    ]

    for (const integration of integrations) {
      await this.db.runAsync(`
        INSERT INTO integrations (barbershop_id, platform, credentials, sync_schedule, is_active)
        VALUES (?, ?, ?, ?, 1)
      `, [this.barbershopId, integration.platform, integration.credentials, integration.sync_schedule])
    }

    this.recordSuccess('Test Setup', 'Test integrations created')
  }

  /**
   * Test rate limiting
   */
  async testRateLimiting() {
    const testName = 'Rate Limiting'
    
    try {
      // Test rate limit checking
      const googleAllowed = await syncOrchestrator.checkRateLimit('google')
      const trafftAllowed = await syncOrchestrator.checkRateLimit('trafft')
      
      this.assert(googleAllowed === true, 'Google rate limit check - initial')
      this.assert(trafftAllowed === true, 'Trafft rate limit check - initial')
      
      // Simulate multiple requests
      for (let i = 0; i < 10; i++) {
        syncOrchestrator.updateRateLimit('trafft')
      }
      
      const trafftStillAllowed = await syncOrchestrator.checkRateLimit('trafft')
      this.assert(trafftStillAllowed === true, 'Trafft rate limit - within limits')
      
      this.recordSuccess(testName, 'Rate limiting functionality')
    } catch (error) {
      this.recordFailure(testName, 'Rate limiting functionality', error)
    }
  }

  /**
   * Test sync execution (mocked)
   */
  async testSyncExecution() {
    const testName = 'Sync Execution'
    
    try {
      // Create mock appointments in database
      await this.createMockAppointments()
      
      // Test orchestration (would normally call external APIs)
      // For testing, we'll check the database setup and logic
      
      const integrations = await this.db.allAsync(`
        SELECT * FROM integrations WHERE barbershop_id = ? AND is_active = 1
      `, [this.barbershopId])
      
      this.assert(integrations.length === 3, 'Active integrations count')
      
      // Test date range calculation
      const dateRange = syncOrchestrator.getSyncDateRange(integrations[0], 'incremental')
      this.assert(dateRange.dateFrom && dateRange.dateTo, 'Date range calculation')
      
      this.recordSuccess(testName, 'Sync orchestration setup')
    } catch (error) {
      this.recordFailure(testName, 'Sync orchestration setup', error)
    }
  }

  /**
   * Create mock appointments for testing
   */
  async createMockAppointments() {
    const mockAppointments = [
      {
        external_id: 'google-123',
        platform_id: 'google',
        client_data: JSON.stringify({
          id: 'client-1',
          name: 'John Doe',
          email: 'john@email.com',
          phone: '555-0001'
        }),
        service_data: JSON.stringify({
          id: 'service-1',
          name: 'Haircut',
          category: 'haircut',
          duration: 30,
          price: 35
        }),
        staff_data: JSON.stringify({
          id: 'staff-1',
          name: 'Mike Barber',
          role: 'barber'
        }),
        scheduling_data: JSON.stringify({
          dateTime: '2024-01-15T10:00:00Z',
          duration: 30,
          status: 'confirmed'
        }),
        business_data: JSON.stringify({
          location: 'Main Shop'
        }),
        payment_data: JSON.stringify({
          total: 35,
          currency: 'USD',
          status: 'completed'
        }),
        feedback_data: JSON.stringify({
          clientRating: 5
        }),
        metadata: JSON.stringify({
          source: 'google_calendar',
          isDuplicate: false
        })
      },
      {
        external_id: 'trafft-456',
        platform_id: 'trafft',
        client_data: JSON.stringify({
          id: 'client-1',
          name: 'John Doe',
          email: 'john@email.com',
          phone: '555-0001'
        }),
        service_data: JSON.stringify({
          id: 'service-2',
          name: 'Haircut & Shave',
          category: 'haircut',
          duration: 45,
          price: 50
        }),
        staff_data: JSON.stringify({
          id: 'staff-1',
          name: 'Mike Barber',
          role: 'barber'
        }),
        scheduling_data: JSON.stringify({
          dateTime: '2024-01-15T10:00:00Z',
          duration: 45,
          status: 'confirmed'
        }),
        business_data: JSON.stringify({
          location: 'Main Shop'
        }),
        payment_data: JSON.stringify({
          total: 50,
          currency: 'USD',
          status: 'completed'
        }),
        feedback_data: JSON.stringify({
          clientRating: 5
        }),
        metadata: JSON.stringify({
          source: 'trafft',
          isDuplicate: false
        })
      }
    ]

    // Get integration IDs
    const integrations = await this.db.allAsync(`
      SELECT id, platform FROM integrations WHERE barbershop_id = ?
    `, [this.barbershopId])

    for (let i = 0; i < mockAppointments.length; i++) {
      const appointment = mockAppointments[i]
      const integration = integrations.find(int => int.platform === appointment.platform_id)
      
      if (integration) {
        await this.db.runAsync(`
          INSERT INTO unified_appointments (
            barbershop_id, external_id, platform_id, integration_id,
            client_data, service_data, staff_data, scheduling_data,
            business_data, payment_data, feedback_data, metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          this.barbershopId,
          appointment.external_id,
          appointment.platform_id,
          integration.id,
          appointment.client_data,
          appointment.service_data,
          appointment.staff_data,
          appointment.scheduling_data,
          appointment.business_data,
          appointment.payment_data,
          appointment.feedback_data,
          appointment.metadata
        ])
      }
    }
  }

  /**
   * Test conflict detection
   */
  async testConflictDetection() {
    const testName = 'Conflict Detection'
    
    try {
      // Check for potential conflicts in our mock data
      const conflicts = await this.db.allAsync(`
        SELECT 
          a1.id as id1, a1.platform_id as platform1,
          a2.id as id2, a2.platform_id as platform2
        FROM unified_appointments a1
        JOIN unified_appointments a2 ON (
          a1.barbershop_id = a2.barbershop_id AND
          a1.id < a2.id AND
          json_extract(a1.client_data, '$.email') = json_extract(a2.client_data, '$.email') AND
          json_extract(a1.scheduling_data, '$.dateTime') = json_extract(a2.scheduling_data, '$.dateTime')
        )
        WHERE a1.barbershop_id = ?
      `, [this.barbershopId])

      this.assert(conflicts.length > 0, 'Conflict detection - found expected conflicts')
      
      this.recordSuccess(testName, 'Conflict detection working')
    } catch (error) {
      this.recordFailure(testName, 'Conflict detection', error)
    }
  }

  /**
   * Test Business Context Engine
   */
  async testBusinessContextEngine() {
    console.log('🧠 Testing Business Context Engine...')
    
    try {
      // Test base data generation
      await this.testBaseDataGeneration()
      
      // Test insight calculations
      await this.testInsightCalculations()
      
      // Test agent-specific context
      await this.testAgentContextGeneration()
      
    } catch (error) {
      this.recordFailure('Business Context Engine', 'General functionality', error)
    }
  }

  /**
   * Test base data generation
   */
  async testBaseDataGeneration() {
    const testName = 'Base Data Generation'
    
    try {
      const baseData = await businessContextEngine.getBaseBusinessData(this.barbershopId, '30_days')
      
      this.assert(baseData.summary, 'Summary data exists')
      this.assert(Array.isArray(baseData.services), 'Services data is array')
      this.assert(Array.isArray(baseData.clients), 'Clients data is array')
      this.assert(Array.isArray(baseData.staff), 'Staff data is array')
      this.assert(baseData.summary.totalAppointments >= 0, 'Total appointments is number')
      this.assert(baseData.summary.totalRevenue >= 0, 'Total revenue is number')
      
      this.recordSuccess(testName, 'Base data structure validation')
    } catch (error) {
      this.recordFailure(testName, 'Base data generation', error)
    }
  }

  /**
   * Test insight calculations
   */
  async testInsightCalculations() {
    const testName = 'Insight Calculations'
    
    try {
      const insights = await businessContextEngine.calculateAllInsights(this.barbershopId, '30_days')
      
      this.assert(insights.revenue_trends, 'Revenue trends calculated')
      this.assert(insights.client_retention, 'Client retention calculated')
      this.assert(insights.peak_hours, 'Peak hours calculated')
      
      this.recordSuccess(testName, 'Insight calculations working')
    } catch (error) {
      this.recordFailure(testName, 'Insight calculations', error)
    }
  }

  /**
   * Test agent-specific context generation
   */
  async testAgentContextGeneration() {
    const testName = 'Agent Context Generation'
    
    try {
      const agentTypes = ['financial', 'operations', 'client_acquisition', 'master_coach']
      
      for (const agentType of agentTypes) {
        const context = await businessContextEngine.generateBusinessContext(
          this.barbershopId, 
          agentType,
          { includeRecommendations: true }
        )
        
        this.assert(context.agentType === agentType, `Agent type set correctly for ${agentType}`)
        this.assert(context.baseData, `Base data exists for ${agentType}`)
        this.assert(context.insights, `Insights exist for ${agentType}`)
        this.assert(context.agentContext, `Agent context exists for ${agentType}`)
        this.assert(Array.isArray(context.recommendations), `Recommendations array for ${agentType}`)
      }
      
      this.recordSuccess(testName, 'Agent-specific context generation')
    } catch (error) {
      this.recordFailure(testName, 'Agent context generation', error)
    }
  }

  /**
   * Test complete integration workflows
   */
  async testIntegrationWorkflows() {
    console.log('🔄 Testing Integration Workflows...')
    
    const testName = 'Integration Workflows'
    
    try {
      // Test complete workflow: sync → conflict resolution → context generation
      
      // 1. Simulate sync completion
      await this.db.runAsync(`
        UPDATE integrations SET 
          last_sync_at = datetime('now'),
          sync_status = 'completed'
        WHERE barbershop_id = ?
      `, [this.barbershopId])
      
      // 2. Generate business context
      const context = await businessContextEngine.generateBusinessContext(
        this.barbershopId,
        'master_coach'
      )
      
      this.assert(context.barbershopId === this.barbershopId, 'Context barbershop ID')
      this.assert(context.platforms && context.platforms.length > 0, 'Platform information included')
      this.assert(context.dataQuality && context.dataQuality.score >= 0, 'Data quality assessment')
      
      this.recordSuccess(testName, 'Complete workflow execution')
    } catch (error) {
      this.recordFailure(testName, 'Complete workflow execution', error)
    }
  }

  /**
   * Test conflict resolution mechanisms
   */
  async testConflictResolution() {
    console.log('⚖️ Testing Conflict Resolution...')
    
    const testName = 'Conflict Resolution'
    
    try {
      // Test platform priority resolution
      const appointment1 = {
        id: 1,
        platformId: 'google',
        metadata: { lastModified: '2024-01-15T10:00:00Z' },
        payment: { total: 35 }
      }
      
      const appointment2 = {
        id: 2,
        platformId: 'trafft',
        metadata: { lastModified: '2024-01-15T09:00:00Z' },
        payment: { total: 50 }
      }
      
      // Test platform priority resolver
      const platformResolver = syncOrchestrator.conflictResolvers.get('platform_priority')
      const winner = platformResolver(appointment1, appointment2)
      
      this.assert(winner.platformId === 'trafft', 'Platform priority resolution (Trafft > Google)')
      
      // Test revenue priority resolver
      const revenueResolver = syncOrchestrator.conflictResolvers.get('revenue_priority')
      const revenueWinner = revenueResolver(appointment1, appointment2)
      
      this.assert(revenueWinner.payment.total === 50, 'Revenue priority resolution (higher amount wins)')
      
      this.recordSuccess(testName, 'Conflict resolution strategies')
    } catch (error) {
      this.recordFailure(testName, 'Conflict resolution strategies', error)
    }
  }

  /**
   * Test data quality assessment
   */
  async testDataQuality() {
    console.log('📊 Testing Data Quality Assessment...')
    
    const testName = 'Data Quality Assessment'
    
    try {
      const baseData = await businessContextEngine.getBaseBusinessData(this.barbershopId, '30_days')
      const dataQuality = businessContextEngine.assessDataQuality(baseData)
      
      this.assert(dataQuality.score >= 0 && dataQuality.score <= 100, 'Data quality score in valid range')
      this.assert(dataQuality.completeness, 'Completeness metrics exist')
      this.assert(typeof dataQuality.completeness.clientEmails === 'number', 'Client email completeness is number')
      this.assert(typeof dataQuality.completeness.revenueData === 'number', 'Revenue data completeness is number')
      
      this.recordSuccess(testName, 'Data quality assessment')
    } catch (error) {
      this.recordFailure(testName, 'Data quality assessment', error)
    }
  }

  /**
   * Helper methods for test assertions
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`)
    }
  }

  recordSuccess(testCategory, testName) {
    this.testResults.push({
      category: testCategory,
      name: testName,
      status: 'PASS',
      timestamp: new Date().toISOString()
    })
    console.log(`  ✅ ${testCategory}: ${testName}`)
  }

  recordFailure(testCategory, testName, error) {
    this.testResults.push({
      category: testCategory,
      name: testName,
      status: 'FAIL',
      error: error.message,
      timestamp: new Date().toISOString()
    })
    console.log(`  ❌ ${testCategory}: ${testName} - ${error.message}`)
  }

  /**
   * Print comprehensive test results
   */
  printTestResults() {
    console.log('\n📋 Test Results Summary')
    console.log('='.repeat(50))
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length
    const failed = this.testResults.filter(r => r.status === 'FAIL').length
    const total = this.testResults.length
    
    console.log(`Total Tests: ${total}`)
    console.log(`Passed: ${passed} (${((passed/total)*100).toFixed(1)}%)`)
    console.log(`Failed: ${failed} (${((failed/total)*100).toFixed(1)}%)`)
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:')
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`  • ${r.category}: ${r.name} - ${r.error}`)
        })
    }
    
    // Group by category
    const categories = [...new Set(this.testResults.map(r => r.category))]
    console.log('\n📊 Results by Category:')
    categories.forEach(category => {
      const categoryResults = this.testResults.filter(r => r.category === category)
      const categoryPassed = categoryResults.filter(r => r.status === 'PASS').length
      const categoryTotal = categoryResults.length
      console.log(`  ${category}: ${categoryPassed}/${categoryTotal} (${((categoryPassed/categoryTotal)*100).toFixed(1)}%)`)
    })
    
    console.log('\n' + '='.repeat(50))
    
    if (failed === 0) {
      console.log('🎉 All tests passed! Multi-platform integration system is working correctly.')
    } else {
      console.log('⚠️  Some tests failed. Please review and fix the issues above.')
    }
  }

  /**
   * Cleanup test resources
   */
  cleanup() {
    if (this.db) {
      this.db.close()
    }
    
    // Clean up test database file
    if (fs.existsSync(TEST_DATABASE_PATH)) {
      fs.unlinkSync(TEST_DATABASE_PATH)
    }
    
    console.log('\n🧹 Test cleanup completed')
  }
}

// Run tests
const tester = new MultiPlatformIntegrationTester()
tester.runAllTests().catch(console.error)
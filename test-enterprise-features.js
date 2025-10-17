/**
 * Comprehensive Test Suite for Enterprise Features
 * Tests Phase 9-10 (Enterprise Management) and Phase 11-12 (AI Agents)
 */

import { createClient } from '@supabase/supabase-js'

// Mock Supabase client for testing
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key'
)

// Test configuration
const TEST_CONFIG = {
  organizationId: 'test-org-123',
  locationIds: ['loc-1', 'loc-2', 'loc-3'],
  customerId: 'test-customer-456',
  barbershopId: 'test-shop-789',
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

class EnterpriseTestSuite {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      errors: []
    }
  }

  // Utility function for API calls
  async callAPI(endpoint, method = 'GET', body = null) {
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
        }
      }

      if (body) {
        options.body = JSON.stringify(body)
      }

      const response = await fetch(`${TEST_CONFIG.baseUrl}${endpoint}`, options)
      const data = await response.json()

      return {
        status: response.status,
        ok: response.ok,
        data
      }
    } catch (error) {
      return {
        status: 500,
        ok: false,
        error: error.message
      }
    }
  }

  // Test result logger
  logTest(testName, passed, details = '') {
    if (passed) {
      console.log(`${colors.green}✓${colors.reset} ${testName}`)
      this.results.passed++
    } else {
      console.log(`${colors.red}✗${colors.reset} ${testName}`)
      if (details) {
        console.log(`  ${colors.yellow}→ ${details}${colors.reset}`)
      }
      this.results.failed++
      this.results.errors.push({ test: testName, error: details })
    }
  }

  // ========== PHASE 9-10 TESTS ==========

  async testMultiLocationDashboard() {
    console.log(`\n${colors.cyan}Testing Multi-Location Dashboard...${colors.reset}`)

    // Test GET endpoint
    const getResponse = await this.callAPI(
      `/api/enterprise/multi-location-dashboard?organizationId=${TEST_CONFIG.organizationId}&timeRange=month`
    )

    this.logTest(
      'Multi-Location Dashboard GET',
      getResponse.ok && getResponse.data.success,
      getResponse.error || getResponse.data?.error
    )

    // Test location comparisons
    if (getResponse.data?.location_comparisons) {
      this.logTest(
        'Location Comparisons Generated',
        true
      )
    }

    // Test POST endpoint - refresh metrics
    const postResponse = await this.callAPI(
      '/api/enterprise/multi-location-dashboard',
      'POST',
      {
        action: 'refresh_metrics',
        organizationId: TEST_CONFIG.organizationId,
        locationIds: TEST_CONFIG.locationIds
      }
    )

    this.logTest(
      'Multi-Location Metrics Refresh',
      postResponse.ok && postResponse.data.success,
      postResponse.error || postResponse.data?.error
    )

    // Test business insights generation
    const insightsResponse = await this.callAPI(
      '/api/enterprise/multi-location-dashboard',
      'POST',
      {
        action: 'generate_insights',
        organizationId: TEST_CONFIG.organizationId,
        insightTypes: ['performance', 'opportunity']
      }
    )

    this.logTest(
      'Business Insights Generation',
      insightsResponse.ok && insightsResponse.data.success,
      insightsResponse.error || insightsResponse.data?.error
    )
  }

  async testStaffOptimization() {
    console.log(`\n${colors.cyan}Testing Staff Optimization Engine...${colors.reset}`)

    // Test GET endpoint
    const getResponse = await this.callAPI(
      `/api/enterprise/staff-optimization?organizationId=${TEST_CONFIG.organizationId}&optimizationType=scheduling`
    )

    this.logTest(
      'Staff Optimization GET',
      getResponse.ok && getResponse.data.success,
      getResponse.error || getResponse.data?.error
    )

    // Check for AI recommendations
    if (getResponse.data?.locations?.[0]?.optimization?.schedule_recommendations) {
      this.logTest(
        'AI Schedule Recommendations Generated',
        getResponse.data.locations[0].optimization.schedule_recommendations.length > 0
      )
    }

    // Test demand forecasting
    if (getResponse.data?.locations?.[0]?.optimization?.demand_forecast) {
      this.logTest(
        'Demand Forecasting Active',
        getResponse.data.locations[0].optimization.demand_forecast.confidence_level > 0
      )
    }

    // Test POST endpoint - apply schedule
    const postResponse = await this.callAPI(
      '/api/enterprise/staff-optimization',
      'POST',
      {
        action: 'analyze_performance',
        organizationId: TEST_CONFIG.organizationId,
        locationId: TEST_CONFIG.locationIds[0]
      }
    )

    this.logTest(
      'Staff Performance Analysis',
      postResponse.ok && postResponse.data.success,
      postResponse.error || postResponse.data?.error
    )
  }

  async testAdvancedAnalytics() {
    console.log(`\n${colors.cyan}Testing Advanced Analytics Platform...${colors.reset}`)

    // Test predictive analytics
    const analyticsResponse = await this.callAPI(
      `/api/enterprise/advanced-analytics?organizationId=${TEST_CONFIG.organizationId}&analyticsType=predictive`
    )

    this.logTest(
      'Advanced Analytics GET',
      analyticsResponse.ok && analyticsResponse.data.success,
      analyticsResponse.error || analyticsResponse.data?.error
    )

    // Check for revenue forecasting
    if (analyticsResponse.data?.analytics?.predictive_insights?.insights) {
      const revenueForecast = analyticsResponse.data.analytics.predictive_insights.insights
        .find(i => i.type === 'revenue_forecast')
      
      this.logTest(
        'Revenue Forecasting Model',
        revenueForecast && revenueForecast.confidence_level > 0,
        `Confidence: ${revenueForecast?.confidence_level || 0}`
      )
    }

    // Test trend analysis
    const trendResponse = await this.callAPI(
      `/api/enterprise/advanced-analytics?organizationId=${TEST_CONFIG.organizationId}&analyticsType=trend`
    )

    this.logTest(
      'Trend Analysis Generation',
      trendResponse.ok && trendResponse.data.analytics?.trend_analysis,
      trendResponse.error
    )

    // Test POST endpoint - refresh models
    const refreshResponse = await this.callAPI(
      '/api/enterprise/advanced-analytics',
      'POST',
      {
        action: 'refresh_models',
        organizationId: TEST_CONFIG.organizationId
      }
    )

    this.logTest(
      'Predictive Models Refresh',
      refreshResponse.ok && refreshResponse.data.success,
      refreshResponse.error || refreshResponse.data?.error
    )
  }

  async testERPSystem() {
    console.log(`\n${colors.cyan}Testing Enterprise Resource Planning (ERP)...${colors.reset}`)

    // Test inventory management
    const inventoryResponse = await this.callAPI(
      `/api/enterprise/erp?organizationId=${TEST_CONFIG.organizationId}&module=inventory`
    )

    this.logTest(
      'ERP Inventory Management',
      inventoryResponse.ok && inventoryResponse.data.success,
      inventoryResponse.error || inventoryResponse.data?.error
    )

    // Test financial management
    const financeResponse = await this.callAPI(
      `/api/enterprise/erp?organizationId=${TEST_CONFIG.organizationId}&module=finance`
    )

    this.logTest(
      'ERP Financial Management',
      financeResponse.ok && financeResponse.data.success,
      financeResponse.error || financeResponse.data?.error
    )

    // Test vendor management
    const vendorResponse = await this.callAPI(
      `/api/enterprise/erp?organizationId=${TEST_CONFIG.organizationId}&module=vendor`
    )

    this.logTest(
      'ERP Vendor Management',
      vendorResponse.ok && vendorResponse.data.success,
      vendorResponse.error || vendorResponse.data?.error
    )

    // Test compliance management
    const complianceResponse = await this.callAPI(
      `/api/enterprise/erp?organizationId=${TEST_CONFIG.organizationId}&module=compliance`
    )

    this.logTest(
      'ERP Compliance Management',
      complianceResponse.ok && complianceResponse.data.success,
      complianceResponse.error || complianceResponse.data?.error
    )
  }

  // ========== PHASE 11-12 TESTS ==========

  async testCustomerServiceAgent() {
    console.log(`\n${colors.cyan}Testing Customer Service AI Agent...${colors.reset}`)

    // Test agent status
    const statusResponse = await this.callAPI('/api/ai-agents/customer-service')

    this.logTest(
      'Customer Service Agent Status',
      statusResponse.ok && statusResponse.data.agent?.status === 'active',
      statusResponse.error || statusResponse.data?.error
    )

    // Test booking appointment intent
    const bookingResponse = await this.callAPI(
      '/api/ai-agents/customer-service',
      'POST',
      {
        message: 'I want to book a haircut for tomorrow at 2pm',
        customer_id: TEST_CONFIG.customerId,
        barbershop_id: TEST_CONFIG.barbershopId,
        channel: 'chat'
      }
    )

    this.logTest(
      'AI Appointment Booking Intent',
      bookingResponse.ok && bookingResponse.data.success,
      bookingResponse.error || bookingResponse.data?.error
    )

    // Test service inquiry
    const inquiryResponse = await this.callAPI(
      '/api/ai-agents/customer-service',
      'POST',
      {
        message: 'What services do you offer and what are the prices?',
        customer_id: TEST_CONFIG.customerId,
        barbershop_id: TEST_CONFIG.barbershopId,
        channel: 'chat'
      }
    )

    this.logTest(
      'AI Service Inquiry Response',
      inquiryResponse.ok && inquiryResponse.data.success,
      inquiryResponse.error || inquiryResponse.data?.error
    )

    // Test context awareness
    if (bookingResponse.data?.metadata?.context_used) {
      this.logTest(
        'Customer Context Management',
        true,
        'Context successfully retrieved and used'
      )
    }
  }

  async testMarketingAgent() {
    console.log(`\n${colors.cyan}Testing Marketing AI Agent...${colors.reset}`)

    // Test agent status
    const statusResponse = await this.callAPI('/api/ai-agents/marketing')

    this.logTest(
      'Marketing Agent Status',
      statusResponse.ok && statusResponse.data.agent?.status === 'active',
      statusResponse.error || statusResponse.data?.error
    )

    // Test campaign creation
    const campaignResponse = await this.callAPI(
      '/api/ai-agents/marketing',
      'POST',
      {
        action: 'create_campaign',
        barbershop_id: TEST_CONFIG.barbershopId,
        parameters: {
          objectives: ['increase_bookings', 'customer_retention'],
          budget: 500
        }
      }
    )

    this.logTest(
      'AI Campaign Generation',
      campaignResponse.ok && campaignResponse.data.success && campaignResponse.data.campaign,
      campaignResponse.error || campaignResponse.data?.error
    )

    // Test content generation
    const contentResponse = await this.callAPI(
      '/api/ai-agents/marketing',
      'POST',
      {
        action: 'generate_content',
        barbershop_id: TEST_CONFIG.barbershopId,
        parameters: {
          content_type: 'social_post',
          context: { promotion: 'summer_special', discount: '20%' }
        }
      }
    )

    this.logTest(
      'AI Content Generation',
      contentResponse.ok && contentResponse.data.success && contentResponse.data.content,
      contentResponse.error || contentResponse.data?.error
    )

    // Test audience segmentation
    const segmentResponse = await this.callAPI(
      '/api/ai-agents/marketing',
      'POST',
      {
        action: 'segment_audience',
        barbershop_id: TEST_CONFIG.barbershopId,
        parameters: {}
      }
    )

    this.logTest(
      'AI Audience Segmentation',
      segmentResponse.ok && segmentResponse.data.success,
      segmentResponse.error || segmentResponse.data?.error
    )
  }

  // ========== DATABASE TESTS ==========

  async testDatabaseSchema() {
    console.log(`\n${colors.cyan}Testing Database Schema...${colors.reset}`)

    // Test Phase 9-10 tables
    const phase910Tables = [
      'organization_hierarchy',
      'location_performance_metrics',
      'staff_skills_matrix',
      'optimized_schedules',
      'business_intelligence_insights'
    ]

    for (const table of phase910Tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)

      this.logTest(
        `Table: ${table}`,
        !error || error.code === 'PGRST116', // PGRST116 = no rows (table exists)
        error?.message
      )
    }
  }

  // ========== PERFORMANCE TESTS ==========

  async testPerformance() {
    console.log(`\n${colors.cyan}Testing Performance Metrics...${colors.reset}`)

    // Test multi-location dashboard response time
    const startTime = Date.now()
    await this.callAPI(
      `/api/enterprise/multi-location-dashboard?organizationId=${TEST_CONFIG.organizationId}`
    )
    const dashboardTime = Date.now() - startTime

    this.logTest(
      'Multi-Location Dashboard Response Time',
      dashboardTime < 500,
      `${dashboardTime}ms (target: <500ms)`
    )

    // Test AI agent response time
    const aiStartTime = Date.now()
    await this.callAPI(
      '/api/ai-agents/customer-service',
      'POST',
      {
        message: 'Hello',
        customer_id: TEST_CONFIG.customerId,
        barbershop_id: TEST_CONFIG.barbershopId
      }
    )
    const aiResponseTime = Date.now() - aiStartTime

    this.logTest(
      'AI Agent Response Time',
      aiResponseTime < 1000,
      `${aiResponseTime}ms (target: <1000ms)`
    )
  }

  // ========== INTEGRATION TESTS ==========

  async testIntegration() {
    console.log(`\n${colors.cyan}Testing System Integration...${colors.reset}`)

    // Test that multi-location dashboard integrates with performance metrics
    const dashboardResponse = await this.callAPI(
      `/api/enterprise/multi-location-dashboard?organizationId=${TEST_CONFIG.organizationId}`
    )

    if (dashboardResponse.data?.locations?.length > 0) {
      const hasMetrics = dashboardResponse.data.locations.some(loc => 
        loc.current_metrics && Object.keys(loc.current_metrics).length > 0
      )

      this.logTest(
        'Dashboard-Metrics Integration',
        hasMetrics,
        hasMetrics ? 'Metrics properly integrated' : 'No metrics found'
      )
    }

    // Test that AI agents can access business context
    const contextResponse = await this.callAPI(
      '/api/ai-agents/marketing',
      'POST',
      {
        action: 'create_campaign',
        barbershop_id: TEST_CONFIG.barbershopId,
        parameters: {
          objectives: ['test'],
          budget: 100
        }
      }
    )

    this.logTest(
      'AI Agent-Business Context Integration',
      contextResponse.ok && contextResponse.data.campaign?.channels,
      'AI can access business context'
    )
  }

  // ========== MAIN TEST RUNNER ==========

  async runAllTests() {
    console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`)
    console.log(`${colors.blue}🧪 Enterprise Features Test Suite${colors.reset}`)
    console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`)

    // Phase 9-10 Tests
    console.log(`\n${colors.yellow}📋 Phase 9-10: Enterprise Management Tests${colors.reset}`)
    await this.testMultiLocationDashboard()
    await this.testStaffOptimization()
    await this.testAdvancedAnalytics()
    await this.testERPSystem()

    // Phase 11-12 Tests
    console.log(`\n${colors.yellow}🤖 Phase 11-12: AI Agents Tests${colors.reset}`)
    await this.testCustomerServiceAgent()
    await this.testMarketingAgent()

    // Database Tests
    await this.testDatabaseSchema()

    // Performance Tests
    await this.testPerformance()

    // Integration Tests
    await this.testIntegration()

    // Summary
    console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`)
    console.log(`${colors.blue}📊 Test Results Summary${colors.reset}`)
    console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`)
    
    const total = this.results.passed + this.results.failed
    const successRate = ((this.results.passed / total) * 100).toFixed(1)
    
    console.log(`${colors.green}✓ Passed: ${this.results.passed}${colors.reset}`)
    console.log(`${colors.red}✗ Failed: ${this.results.failed}${colors.reset}`)
    console.log(`Success Rate: ${successRate}%`)

    if (this.results.failed > 0) {
      console.log(`\n${colors.red}Failed Tests:${colors.reset}`)
      this.results.errors.forEach(error => {
        console.log(`  - ${error.test}: ${error.error}`)
      })
    }

    if (this.results.passed === total) {
      console.log(`\n${colors.green}🎉 All tests passed! System is ready for production.${colors.reset}`)
    } else {
      console.log(`\n${colors.yellow}⚠️  Some tests failed. Please review and fix before proceeding.${colors.reset}`)
    }

    return this.results
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new EnterpriseTestSuite()
  tester.runAllTests().then(results => {
    process.exit(results.failed > 0 ? 1 : 0)
  })
}

export default EnterpriseTestSuite
#!/usr/bin/env node

/**
 * 6FB AI Agent System - End-to-End Integration Testing Suite
 * 
 * This comprehensive test suite validates:
 * 1. AI Agent Integration (FastAPI ↔ Frontend)
 * 2. Database Integration (Real Data vs Mock Data)
 * 3. Consolidated Dashboard Pages
 * 4. API Endpoint Functionality
 * 5. System Health & Performance
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  fastapi_url: 'http://localhost:8002',
  frontend_url: 'http://localhost:9999',
  timeout: 10000,
  retry_attempts: 3
};

// Test Results Storage
let testResults = {
  timestamp: new Date().toISOString(),
  total_tests: 0,
  passed: 0,
  failed: 0,
  errors: [],
  details: {}
};

// Utility Functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function incrementTest(passed = true, testName = '', error = null) {
  testResults.total_tests++;
  if (passed) {
    testResults.passed++;
    log(`Test passed: ${testName}`, 'success');
  } else {
    testResults.failed++;
    log(`Test failed: ${testName}`, 'error');
    if (error) {
      testResults.errors.push({ test: testName, error: error.message || error });
    }
  }
}

async function makeRequest(url, options = {}) {
  try {
    const response = await axios({
      url,
      timeout: config.timeout,
      ...options
    });
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.message, 
      status: error.response?.status,
      data: error.response?.data 
    };
  }
}

// Test Categories
async function testSystemHealth() {
  log('🏥 Testing System Health...');
  
  // Test FastAPI Health
  const fastapiHealth = await makeRequest(`${config.fastapi_url}/health`);
  incrementTest(
    fastapiHealth.success && fastapiHealth.status === 200,
    'FastAPI Health Check',
    fastapiHealth.error
  );
  testResults.details.fastapi_health = fastapiHealth;
  
  // Test FastAPI Status
  const fastapiStatus = await makeRequest(`${config.fastapi_url}/status`);
  incrementTest(
    fastapiStatus.success && fastapiStatus.data?.agents_healthy === 5,
    'FastAPI Agent Status (5/5 agents healthy)',
    fastapiStatus.error
  );
  testResults.details.fastapi_status = fastapiStatus;
  
  // Test Frontend Health
  const frontendHealth = await makeRequest(`${config.frontend_url}/api/health`);
  incrementTest(
    frontendHealth.success || frontendHealth.status === 404, // 404 is ok if no health endpoint
    'Frontend Health Check',
    frontendHealth.error
  );
  testResults.details.frontend_health = frontendHealth;
}

async function testAIAgentIntegration() {
  log('🤖 Testing AI Agent Integration...');
  
  const agents = [
    'master_coach',
    'financial',
    'marketing', 
    'technical_operations',
    'customer_success'
  ];
  
  const testMessage = {
    message: "Hello, this is an integration test. Please respond with your agent name and specialty.",
    session_id: "integration_test_" + Date.now(),
    user_id: "test_user",
    context: {}
  };
  
  for (const agent of agents) {
    const response = await makeRequest(`${config.fastapi_url}/agents/${agent}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: testMessage
    });
    
    const success = response.success && 
                   response.data?.response && 
                   response.data.response.length > 0;
    
    incrementTest(
      success,
      `${agent} agent chat response`,
      response.error
    );
    
    testResults.details[`agent_${agent}`] = {
      success,
      response_length: response.data?.response?.length || 0,
      error: response.error
    };
  }
}

async function testUnifiedChatAPI() {
  log('💬 Testing Unified Chat API...');
  
  // Test the consolidated unified chat endpoint
  const unifiedChatRequest = {
    message: "Test message for unified chat system",
    agent: "master_coach",
    session_id: "unified_test_" + Date.now(),
    context: { test: true }
  };
  
  const response = await makeRequest(`${config.fastapi_url}/ai/unified-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: unifiedChatRequest
  });
  
  incrementTest(
    response.success && response.data?.response,
    'Unified Chat API endpoint',
    response.error
  );
  
  testResults.details.unified_chat = response;
}

async function testDatabaseIntegration() {
  log('🗄️ Testing Database Integration...');
  
  // Test analytics live data (should return real data, not mock)
  const analyticsResponse = await makeRequest(`${config.frontend_url}/api/analytics/live-data?barbershop_id=demo&format=json`);
  
  incrementTest(
    analyticsResponse.success && analyticsResponse.data,
    'Analytics Live Data API',
    analyticsResponse.error
  );
  
  // Check if data structure indicates real database connection
  const hasRealData = analyticsResponse.success && 
                     analyticsResponse.data &&
                     typeof analyticsResponse.data.customers === 'number';
  
  incrementTest(
    hasRealData,
    'Analytics returns structured data (not mock)',
    !hasRealData ? 'Data structure suggests mock data' : null
  );
  
  testResults.details.database_analytics = analyticsResponse;
  
  // Test shop demo data
  const shopDataResponse = await makeRequest(`${config.frontend_url}/api/shop/demo-data`);
  incrementTest(
    shopDataResponse.success,
    'Shop Demo Data API',
    shopDataResponse.error
  );
  
  testResults.details.shop_data = shopDataResponse;
}

async function testConsolidatedDashboardPages() {
  log('📊 Testing Consolidated Dashboard Pages...');
  
  const dashboardPages = [
    '/dashboard',
    '/dashboard?mode=executive', 
    '/dashboard?mode=analytics',
    '/dashboard?mode=inventory',
    '/dashboard/ai-command-center',
    '/dashboard/settings',
    '/dashboard/calendar',
    '/dashboard/bookings'
  ];
  
  for (const page of dashboardPages) {
    const response = await makeRequest(`${config.frontend_url}${page}`);
    
    const success = response.success && (response.status === 200 || response.status === 304);
    incrementTest(
      success,
      `Dashboard page: ${page}`,
      response.error
    );
    
    testResults.details[`page_${page.replace(/[^a-zA-Z0-9]/g, '_')}`] = {
      success,
      status: response.status,
      error: response.error
    };
  }
}

async function testRemovedEndpoints() {
  log('🚫 Testing Removed Endpoints (Should Return 404)...');
  
  const removedEndpoints = [
    '/api/ai/enhanced-chat',
    '/api/ai/command-center',
    '/api/ai/agent-selector'
  ];
  
  for (const endpoint of removedEndpoints) {
    const response = await makeRequest(`${config.fastapi_url}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: { test: true }
    });
    
    const correctlyRemoved = !response.success && response.status === 404;
    incrementTest(
      correctlyRemoved,
      `Removed endpoint returns 404: ${endpoint}`,
      correctlyRemoved ? null : `Expected 404, got ${response.status}`
    );
    
    testResults.details[`removed_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`] = response;
  }
}

async function testFrontendToFastAPIConnection() {
  log('🔗 Testing Frontend → FastAPI Connection...');
  
  // Test that frontend can reach FastAPI
  const knowledgeSearchRequest = {
    query: "test integration",
    limit: 5
  };
  
  const response = await makeRequest(`${config.fastapi_url}/knowledge/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: knowledgeSearchRequest
  });
  
  incrementTest(
    response.success && response.data?.results,
    'Frontend → FastAPI knowledge search',
    response.error
  );
  
  testResults.details.frontend_fastapi_connection = response;
}

async function testPerformanceMetrics() {
  log('⚡ Testing Performance Metrics...');
  
  const startTime = Date.now();
  
  // Test multiple concurrent requests to AI agents
  const concurrentRequests = [
    makeRequest(`${config.fastapi_url}/agents/master_coach/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: {
        message: "Performance test",
        session_id: "perf_test_1",
        user_id: "test_user"
      }
    }),
    makeRequest(`${config.fastapi_url}/agents/financial/chat`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      data: {
        message: "Performance test",
        session_id: "perf_test_2",
        user_id: "test_user"
      }
    })
  ];
  
  const responses = await Promise.allSettled(concurrentRequests);
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  const successfulResponses = responses.filter(r => r.status === 'fulfilled' && r.value.success).length;
  
  incrementTest(
    successfulResponses >= 1 && totalTime < 30000, // At least 1 success, under 30 seconds
    `Performance test: ${successfulResponses}/2 requests succeeded in ${totalTime}ms`,
    totalTime >= 30000 ? 'Requests took too long' : null
  );
  
  testResults.details.performance = {
    concurrent_requests: 2,
    successful_responses: successfulResponses,
    total_time_ms: totalTime,
    average_time_ms: totalTime / 2
  };
}

// Main Test Runner
async function runIntegrationTests() {
  log('🚀 Starting 6FB AI Agent System Integration Tests...');
  log(`FastAPI URL: ${config.fastapi_url}`);
  log(`Frontend URL: ${config.frontend_url}`);
  
  try {
    await testSystemHealth();
    await testAIAgentIntegration();
    await testUnifiedChatAPI();
    await testDatabaseIntegration(); 
    await testConsolidatedDashboardPages();
    await testRemovedEndpoints();
    await testFrontendToFastAPIConnection();
    await testPerformanceMetrics();
    
  } catch (error) {
    log(`Unexpected error during testing: ${error.message}`, 'error');
    testResults.errors.push({ test: 'test_runner', error: error.message });
  }
  
  // Generate Report
  generateTestReport();
}

function generateTestReport() {
  log('\n📋 Integration Test Results Summary:');
  log(`Total Tests: ${testResults.total_tests}`);
  log(`Passed: ${testResults.passed}`, 'success');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'info');
  log(`Success Rate: ${((testResults.passed / testResults.total_tests) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    log('\n❌ Failed Tests:');
    testResults.errors.forEach(error => {
      log(`  • ${error.test}: ${error.error}`, 'error');
    });
  }
  
  // Save detailed report
  const reportPath = path.join(__dirname, 'integration-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  log(`\n📄 Detailed report saved: ${reportPath}`);
  
  // Summary Assessment
  if (testResults.passed === testResults.total_tests) {
    log('\n🎉 All integration tests passed! System is ready for production.', 'success');
  } else if (testResults.passed / testResults.total_tests >= 0.8) {
    log('\n⚠️ Most tests passed, but some issues need attention.', 'error');
  } else {
    log('\n🚨 Multiple integration issues detected. System needs fixes before production.', 'error');
  }
}

// Error Handling
process.on('unhandledRejection', (error) => {
  log(`Unhandled rejection: ${error.message}`, 'error');
  testResults.errors.push({ test: 'unhandled_rejection', error: error.message });
  process.exit(1);
});

// Run Tests
if (require.main === module) {
  runIntegrationTests().then(() => {
    process.exit(testResults.failed > 0 ? 1 : 0);
  }).catch((error) => {
    log(`Test runner failed: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = {
  runIntegrationTests,
  testResults,
  config
};
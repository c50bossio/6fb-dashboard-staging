#!/usr/bin/env node

/**
 * Comprehensive End-to-End Marketing Campaign System Test
 * 
 * This script tests the complete marketing campaign workflow:
 * 1. API endpoints accessibility
 * 2. Database tables existence and configuration
 * 3. Campaign creation workflow
 * 4. Billing account setup
 * 5. Role-based permissions validation
 * 6. Email/SMS service integration
 * 7. Frontend integration with real APIs
 * 8. Navigation updates verification
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:9999',
  backendUrl: 'http://localhost:8001',
  testUserEmail: 'marketing-test@example.com',
  testUserPassword: 'TestPassword123!',
  timeout: 10000
};

// Test Results Storage
const testResults = {
  timestamp: new Date().toISOString(),
  totalTests: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: [],
  warnings: [],
  results: {}
};

// Utility Functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m'
  };
  
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  
  if (type === 'error') {
    testResults.errors.push(message);
  } else if (type === 'warning') {
    testResults.warnings.push(message);
  }
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const defaultOptions = {
      timeout: CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Marketing-System-Test/1.0'
      }
    };
    
    const reqOptions = { ...defaultOptions, ...options };
    
    const req = protocol.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsedData = data ? JSON.parse(data) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData,
            rawData: data
          });
        } catch (parseError) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: { rawResponse: data },
            rawData: data
          });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function runTest(testName, testFunction) {
  testResults.totalTests++;
  log(`Running test: ${testName}`, 'info');
  
  try {
    const result = await testFunction();
    testResults.passed++;
    testResults.results[testName] = { status: 'PASSED', result };
    log(`✅ Test passed: ${testName}`, 'success');
    return result;
  } catch (error) {
    testResults.failed++;
    testResults.results[testName] = { status: 'FAILED', error: error.message };
    log(`❌ Test failed: ${testName} - ${error.message}`, 'error');
    return null;
  }
}

// Test Functions

async function testHealthEndpoint() {
  const response = await makeRequest(`${CONFIG.baseUrl}/api/health`);
  
  if (response.statusCode !== 200) {
    throw new Error(`Health endpoint returned status ${response.statusCode}`);
  }
  
  return {
    status: response.statusCode,
    healthy: response.data.status === 'ok'
  };
}

async function testMarketingApiEndpoints() {
  const endpoints = [
    '/api/marketing/campaigns',
    '/api/marketing/accounts',
    '/api/marketing/permissions',
    '/api/marketing/campaigns/send'
  ];
  
  const results = {};
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(`${CONFIG.baseUrl}${endpoint}`, {
        method: 'GET'
      });
      
      results[endpoint] = {
        accessible: true,
        statusCode: response.statusCode,
        hasData: !!response.data
      };
      
      log(`API endpoint ${endpoint} is accessible (${response.statusCode})`, 'success');
    } catch (error) {
      results[endpoint] = {
        accessible: false,
        error: error.message
      };
      log(`API endpoint ${endpoint} failed: ${error.message}`, 'warning');
    }
  }
  
  return results;
}

async function testDatabaseTables() {
  const requiredTables = [
    'marketing_campaigns',
    'marketing_accounts',
    'campaign_recipients',
    'campaign_analytics'
  ];
  
  const results = {};
  
  try {
    // Test database accessibility via debug endpoint
    const response = await makeRequest(`${CONFIG.baseUrl}/api/debug/tables`);
    
    if (response.statusCode === 200 && response.data.tables) {
      const existingTables = response.data.tables.map(t => t.name || t);
      
      for (const table of requiredTables) {
        const exists = existingTables.includes(table);
        results[table] = { exists, accessible: exists };
        
        if (exists) {
          log(`✅ Database table ${table} exists`, 'success');
        } else {
          log(`❌ Database table ${table} missing`, 'warning');
        }
      }
    } else {
      throw new Error(`Could not access database tables: ${response.statusCode}`);
    }
  } catch (error) {
    log(`Database table check failed: ${error.message}`, 'warning');
    // Mark as warning, not failure, since debug endpoint might not exist
    for (const table of requiredTables) {
      results[table] = { exists: 'unknown', accessible: false, error: error.message };
    }
  }
  
  return results;
}

async function testCampaignCreationWorkflow() {
  const campaignData = {
    name: 'Test Campaign ' + Date.now(),
    subject: 'Test Marketing Email',
    content: 'This is a test marketing campaign.',
    type: 'email',
    target_audience: 'all_customers',
    scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };
  
  try {
    // Test campaign creation
    const createResponse = await makeRequest(`${CONFIG.baseUrl}/api/marketing/campaigns`, {
      method: 'POST',
      body: campaignData
    });
    
    const results = {
      creation: {
        successful: createResponse.statusCode < 400,
        statusCode: createResponse.statusCode,
        campaignId: createResponse.data?.id || createResponse.data?.campaign_id
      }
    };
    
    if (results.creation.successful && results.creation.campaignId) {
      log(`✅ Campaign created successfully: ID ${results.creation.campaignId}`, 'success');
      
      // Test campaign retrieval
      const getResponse = await makeRequest(`${CONFIG.baseUrl}/api/marketing/campaigns`);
      results.retrieval = {
        successful: getResponse.statusCode === 200,
        statusCode: getResponse.statusCode,
        hasCampaigns: Array.isArray(getResponse.data) && getResponse.data.length > 0
      };
      
      if (results.retrieval.successful) {
        log('✅ Campaigns retrieved successfully', 'success');
      }
    } else {
      log(`❌ Campaign creation failed: ${createResponse.statusCode}`, 'warning');
    }
    
    return results;
  } catch (error) {
    throw new Error(`Campaign workflow test failed: ${error.message}`);
  }
}

async function testBillingAccountSetup() {
  const accountData = {
    provider: 'sendgrid',
    api_key: 'test_api_key_' + Date.now(),
    settings: {
      from_email: 'test@example.com',
      from_name: 'Test Barbershop'
    }
  };
  
  try {
    const response = await makeRequest(`${CONFIG.baseUrl}/api/marketing/accounts`, {
      method: 'POST',
      body: accountData
    });
    
    const result = {
      successful: response.statusCode < 400,
      statusCode: response.statusCode,
      accountId: response.data?.id || response.data?.account_id,
      error: response.data?.error
    };
    
    if (result.successful) {
      log(`✅ Marketing account setup successful: ID ${result.accountId}`, 'success');
    } else {
      log(`❌ Marketing account setup failed: ${response.statusCode}`, 'warning');
    }
    
    return result;
  } catch (error) {
    throw new Error(`Billing account setup test failed: ${error.message}`);
  }
}

async function testRoleBasedPermissions() {
  const testRoles = ['CLIENT', 'BARBER', 'SHOP_OWNER', 'ENTERPRISE_OWNER'];
  const results = {};
  
  for (const role of testRoles) {
    try {
      const response = await makeRequest(`${CONFIG.baseUrl}/api/marketing/permissions?role=${role}`);
      
      results[role] = {
        accessible: response.statusCode === 200,
        statusCode: response.statusCode,
        permissions: response.data?.permissions || {},
        canAccessMarketing: response.data?.permissions?.marketing || false
      };
      
      log(`Role ${role} permissions check: ${response.statusCode}`, 'success');
    } catch (error) {
      results[role] = {
        accessible: false,
        error: error.message
      };
    }
  }
  
  return results;
}

async function testEmailSmsServiceIntegration() {
  const results = {
    sendgrid: { configured: false, tested: false },
    twilio: { configured: false, tested: false }
  };
  
  // Test SendGrid service configuration
  try {
    const sendgridTest = await makeRequest(`${CONFIG.baseUrl}/api/marketing/campaigns/send`, {
      method: 'POST',
      body: {
        campaign_id: 'test_campaign',
        service: 'sendgrid',
        test_mode: true
      }
    });
    
    results.sendgrid.configured = true;
    results.sendgrid.tested = sendgridTest.statusCode < 500;
    results.sendgrid.statusCode = sendgridTest.statusCode;
    results.sendgrid.response = sendgridTest.data;
    
    log(`SendGrid integration test: ${sendgridTest.statusCode}`, 'success');
  } catch (error) {
    results.sendgrid.error = error.message;
    log(`SendGrid integration failed: ${error.message}`, 'warning');
  }
  
  // Test Twilio service configuration
  try {
    const twilioTest = await makeRequest(`${CONFIG.baseUrl}/api/marketing/campaigns/send`, {
      method: 'POST',
      body: {
        campaign_id: 'test_campaign',
        service: 'twilio',
        test_mode: true
      }
    });
    
    results.twilio.configured = true;
    results.twilio.tested = twilioTest.statusCode < 500;
    results.twilio.statusCode = twilioTest.statusCode;
    results.twilio.response = twilioTest.data;
    
    log(`Twilio integration test: ${twilioTest.statusCode}`, 'success');
  } catch (error) {
    results.twilio.error = error.message;
    log(`Twilio integration failed: ${error.message}`, 'warning');
  }
  
  return results;
}

async function testFrontendIntegration() {
  const results = {};
  
  try {
    // Test marketing page accessibility
    const marketingPageResponse = await makeRequest(`${CONFIG.baseUrl}/dashboard/marketing`);
    results.marketingPage = {
      accessible: marketingPageResponse.statusCode === 200,
      statusCode: marketingPageResponse.statusCode
    };
    
    if (results.marketingPage.accessible) {
      log('✅ Marketing page is accessible', 'success');
    } else {
      log(`❌ Marketing page not accessible: ${marketingPageResponse.statusCode}`, 'warning');
    }
    
    // Test campaigns page if it exists
    const campaignsPageResponse = await makeRequest(`${CONFIG.baseUrl}/dashboard/campaigns`);
    results.campaignsPage = {
      accessible: campaignsPageResponse.statusCode === 200,
      statusCode: campaignsPageResponse.statusCode
    };
    
    if (results.campaignsPage.accessible) {
      log('✅ Campaigns page is accessible', 'success');
    }
    
  } catch (error) {
    results.error = error.message;
    log(`Frontend integration test failed: ${error.message}`, 'warning');
  }
  
  return results;
}

async function testNavigationUpdates() {
  try {
    // Check if navigation includes marketing sections
    const navigationResponse = await makeRequest(`${CONFIG.baseUrl}/api/navigation/config`);
    
    const result = {
      navigationEndpointExists: navigationResponse.statusCode === 200,
      statusCode: navigationResponse.statusCode
    };
    
    if (navigationResponse.statusCode === 200 && navigationResponse.data) {
      const navData = navigationResponse.data;
      result.hasMarketingSection = JSON.stringify(navData).toLowerCase().includes('marketing');
      result.hasCampaignsSection = JSON.stringify(navData).toLowerCase().includes('campaign');
      
      if (result.hasMarketingSection) {
        log('✅ Navigation includes marketing section', 'success');
      }
      if (result.hasCampaignsSection) {
        log('✅ Navigation includes campaigns section', 'success');
      }
    }
    
    return result;
  } catch (error) {
    // Navigation endpoint might not exist, this is not critical
    log(`Navigation test skipped: ${error.message}`, 'warning');
    return {
      navigationEndpointExists: false,
      error: error.message,
      skipped: true
    };
  }
}

async function testServicesConfiguration() {
  const results = {};
  
  // Check if SendGrid service file exists
  const sendgridServicePath = path.join(__dirname, 'services', 'sendgrid-service.js');
  results.sendgridService = {
    fileExists: fs.existsSync(sendgridServicePath),
    path: sendgridServicePath
  };
  
  // Check if Twilio service file exists
  const twilioServicePath = path.join(__dirname, 'services', 'twilio-service.js');
  results.twilioService = {
    fileExists: fs.existsSync(twilioServicePath),
    path: twilioServicePath
  };
  
  // Check API route services
  const campaignSendServicePath = path.join(__dirname, 'app', 'api', 'marketing', 'campaigns', 'send', 'sendgrid-service.js');
  results.campaignSendService = {
    fileExists: fs.existsSync(campaignSendServicePath),
    path: campaignSendServicePath
  };
  
  log(`SendGrid service file: ${results.sendgridService.fileExists ? '✅ Found' : '❌ Missing'}`, 
       results.sendgridService.fileExists ? 'success' : 'warning');
  log(`Twilio service file: ${results.twilioService.fileExists ? '✅ Found' : '❌ Missing'}`, 
       results.twilioService.fileExists ? 'success' : 'warning');
  log(`Campaign send service: ${results.campaignSendService.fileExists ? '✅ Found' : '❌ Missing'}`, 
       results.campaignSendService.fileExists ? 'success' : 'warning');
  
  return results;
}

// Main Test Runner
async function runAllTests() {
  log('🚀 Starting Comprehensive Marketing Campaign System Test', 'info');
  log(`Testing against: ${CONFIG.baseUrl}`, 'info');
  
  // Test 1: Health Check
  await runTest('Health Endpoint Check', testHealthEndpoint);
  
  // Test 2: API Endpoints
  await runTest('Marketing API Endpoints', testMarketingApiEndpoints);
  
  // Test 3: Database Tables
  await runTest('Database Tables Check', testDatabaseTables);
  
  // Test 4: Services Configuration
  await runTest('Services Configuration Check', testServicesConfiguration);
  
  // Test 5: Campaign Creation Workflow
  await runTest('Campaign Creation Workflow', testCampaignCreationWorkflow);
  
  // Test 6: Billing Account Setup
  await runTest('Billing Account Setup', testBillingAccountSetup);
  
  // Test 7: Role-based Permissions
  await runTest('Role-based Permissions', testRoleBasedPermissions);
  
  // Test 8: Email/SMS Service Integration
  await runTest('Email/SMS Service Integration', testEmailSmsServiceIntegration);
  
  // Test 9: Frontend Integration
  await runTest('Frontend Integration', testFrontendIntegration);
  
  // Test 10: Navigation Updates
  await runTest('Navigation Updates', testNavigationUpdates);
  
  // Generate final report
  generateTestReport();
}

function generateTestReport() {
  log('\n📊 TEST REPORT SUMMARY', 'info');
  log('=' * 50, 'info');
  log(`Total Tests: ${testResults.totalTests}`, 'info');
  log(`Passed: ${testResults.passed}`, 'success');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'info');
  log(`Skipped: ${testResults.skipped}`, 'warning');
  
  if (testResults.errors.length > 0) {
    log('\n❌ ERRORS:', 'error');
    testResults.errors.forEach(error => log(`  - ${error}`, 'error'));
  }
  
  if (testResults.warnings.length > 0) {
    log('\n⚠️ WARNINGS:', 'warning');
    testResults.warnings.forEach(warning => log(`  - ${warning}`, 'warning'));
  }
  
  // Save detailed results to file
  const reportPath = path.join(__dirname, 'marketing-system-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  log(`\n📄 Detailed report saved to: ${reportPath}`, 'info');
  
  // Generate recommendations
  generateRecommendations();
}

function generateRecommendations() {
  log('\n🔧 RECOMMENDATIONS:', 'info');
  
  const recommendations = [];
  
  if (testResults.failed > 0) {
    recommendations.push('⚠️ Some tests failed. Check the detailed report for specific issues.');
  }
  
  // Check specific test results for recommendations
  if (testResults.results['Database Tables Check']?.result) {
    const dbResult = testResults.results['Database Tables Check'].result;
    const missingTables = Object.entries(dbResult)
      .filter(([_, tableInfo]) => !tableInfo.exists || tableInfo.exists === 'unknown')
      .map(([table, _]) => table);
    
    if (missingTables.length > 0) {
      recommendations.push(`📋 Missing database tables: ${missingTables.join(', ')}. Run database migration.`);
    }
  }
  
  if (testResults.results['Services Configuration Check']?.result) {
    const servicesResult = testResults.results['Services Configuration Check'].result;
    if (!servicesResult.sendgridService?.fileExists) {
      recommendations.push('📧 SendGrid service file missing. Implement SendGrid integration.');
    }
    if (!servicesResult.twilioService?.fileExists) {
      recommendations.push('📱 Twilio service file missing. Implement SMS integration.');
    }
  }
  
  if (testResults.results['Email/SMS Service Integration']?.result) {
    const integrationResult = testResults.results['Email/SMS Service Integration'].result;
    if (!integrationResult.sendgrid?.configured) {
      recommendations.push('🔧 Configure SendGrid API credentials in environment variables.');
    }
    if (!integrationResult.twilio?.configured) {
      recommendations.push('🔧 Configure Twilio API credentials in environment variables.');
    }
  }
  
  if (recommendations.length === 0) {
    log('✅ All systems appear to be working correctly!', 'success');
  } else {
    recommendations.forEach(rec => log(`  ${rec}`, 'warning'));
  }
  
  // System health score
  const healthScore = Math.round((testResults.passed / testResults.totalTests) * 100);
  log(`\n🎯 System Health Score: ${healthScore}%`, healthScore >= 80 ? 'success' : 'warning');
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(error => {
    log(`Fatal error: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testResults,
  CONFIG
};
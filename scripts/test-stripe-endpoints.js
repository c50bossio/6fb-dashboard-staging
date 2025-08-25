#!/usr/bin/env node
/**
 * Manual Stripe Connect Endpoints Validator
 * 
 * Quick validation script for testing the three Stripe Connect endpoints:
 * - /api/stripe/connect/create-account
 * - /api/stripe/connect/onboarding-link  
 * - /api/stripe/connect/account-status
 * 
 * Usage:
 *   node scripts/test-stripe-endpoints.js [endpoint] [--env=dev|prod]
 * 
 * Examples:
 *   node scripts/test-stripe-endpoints.js all
 *   node scripts/test-stripe-endpoints.js create-account
 *   node scripts/test-stripe-endpoints.js --env=prod
 */

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Configuration
const CONFIG = {
  dev: {
    baseUrl: 'http://localhost:9999',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  prod: {
    baseUrl: 'https://bookedbarber.com',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  }
};

class StripeEndpointValidator {
  constructor(environment = 'dev') {
    this.env = environment;
    this.config = CONFIG[environment];
    this.supabase = createClient(this.config.supabaseUrl, this.config.supabaseKey);
    this.results = [];
    
    console.log(`🔧 Testing Stripe Connect endpoints in ${environment.toUpperCase()} environment`);
    console.log(`📡 Base URL: ${this.config.baseUrl}\n`);
  }

  /**
   * Main validation runner
   */
  async validate(endpoint = 'all') {
    console.log('🚀 Starting Stripe Connect Endpoint Validation...\n');
    
    try {
      // Pre-validation checks
      await this.preValidationChecks();
      
      // Get test data
      const testData = await this.getTestData();
      if (!testData) {
        console.log('❌ Cannot proceed without test data');
        return;
      }
      
      // Run endpoint tests
      if (endpoint === 'all' || endpoint === 'create-account') {
        await this.testCreateAccount(testData);
      }
      if (endpoint === 'all' || endpoint === 'onboarding-link') {
        await this.testOnboardingLink(testData);
      }
      if (endpoint === 'all' || endpoint === 'account-status') {
        await this.testAccountStatus(testData);
      }
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Validation failed:', error);
    }
  }

  /**
   * Pre-validation environment checks
   */
  async preValidationChecks() {
    console.log('📋 Running pre-validation checks...');
    
    // Check environment variables
    const requiredEnvs = ['STRIPE_SECRET_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    let envOk = true;
    
    requiredEnvs.forEach(env => {
      if (!process.env[env]) {
        console.log(`❌ Missing environment variable: ${env}`);
        envOk = false;
      }
    });
    
    if (!envOk) {
      throw new Error('Missing required environment variables');
    }
    
    // Test database connection
    try {
      const { data, error } = await this.supabase
        .from('financial_arrangements')
        .select('id')
        .limit(1);
        
      if (error) throw error;
      console.log('✅ Database connection successful');
      
    } catch (error) {
      console.log('❌ Database connection failed:', error.message);
      throw error;
    }
    
    // Test API endpoint accessibility
    try {
      const response = await fetch(`${this.config.baseUrl}/api/health`, { 
        method: 'GET',
        timeout: 5000 
      });
      
      if (response.ok) {
        console.log('✅ API endpoints accessible');
      } else {
        console.log('⚠️  API endpoints may have issues (non-critical)');
      }
    } catch (error) {
      console.log('⚠️  Cannot reach API endpoints (may be normal in dev)');
    }
    
    console.log('');
  }

  /**
   * Get existing test data from database
   */
  async getTestData() {
    console.log('🔍 Looking for existing test data...');
    
    try {
      // Find a barbershop with financial arrangements
      const { data: arrangement, error } = await this.supabase
        .from('financial_arrangements')
        .select(`
          id,
          barbershop_id,
          barber_id,
          barber_stripe_account_id,
          barber_stripe_onboarded,
          barbershops!inner(id, name, owner_id),
          profiles!financial_arrangements_barber_id_fkey(id, email, full_name)
        `)
        .eq('is_active', true)
        .limit(1)
        .single();
      
      if (error || !arrangement) {
        console.log('⚠️  No suitable test data found in database');
        console.log('   Create a barbershop with staff to test endpoints');
        return null;
      }
      
      const testData = {
        barbershopId: arrangement.barbershop_id,
        barbershopOwnerId: arrangement.barbershops.owner_id,
        barberId: arrangement.barber_id,
        barberEmail: arrangement.profiles?.email || 'test@example.com',
        existingStripeAccountId: arrangement.barber_stripe_account_id,
        arrangementId: arrangement.id
      };
      
      console.log('✅ Found test data:');
      console.log(`   Barbershop: ${arrangement.barbershops.name}`);
      console.log(`   Barber: ${arrangement.profiles?.full_name || 'Unknown'}`);
      console.log(`   Has Stripe Account: ${!!testData.existingStripeAccountId}`);
      console.log('');
      
      return testData;
      
    } catch (error) {
      console.log('❌ Error getting test data:', error.message);
      return null;
    }
  }

  /**
   * Test /api/stripe/connect/create-account
   */
  async testCreateAccount(testData) {
    console.log('🔧 Testing Create Account Endpoint...');
    
    const tests = [
      {
        name: 'Valid account creation request',
        payload: {
          barberId: testData.barberId,
          barbershopId: testData.barbershopId,
          email: testData.barberEmail,
          businessType: 'individual'
        },
        expectedStatus: 200
      },
      {
        name: 'Duplicate account handling',
        payload: {
          barberId: testData.barberId,
          barbershopId: testData.barbershopId,
          email: testData.barberEmail
        },
        expectedStatus: 200
      },
      {
        name: 'Missing required fields',
        payload: {
          barberId: testData.barberId
        },
        expectedStatus: 400
      }
    ];
    
    for (const test of tests) {
      await this.runEndpointTest('create-account', 'POST', test, testData.barbershopOwnerId);
    }
    
    console.log('');
  }

  /**
   * Test /api/stripe/connect/onboarding-link
   */
  async testOnboardingLink(testData) {
    console.log('🔗 Testing Onboarding Link Endpoint...');
    
    // Get updated account ID after create-account test
    const { data: updated } = await this.supabase
      .from('financial_arrangements')
      .select('barber_stripe_account_id')
      .eq('id', testData.arrangementId)
      .single();
      
    const accountId = updated?.barber_stripe_account_id || testData.existingStripeAccountId;
    
    if (!accountId) {
      console.log('⚠️  No Stripe account ID found, skipping onboarding link tests');
      console.log('');
      return;
    }
    
    const tests = [
      {
        name: 'Create onboarding link (POST)',
        method: 'POST',
        payload: {
          accountId: accountId,
          barberId: testData.barberId,
          barbershopId: testData.barbershopId
        },
        expectedStatus: 200
      },
      {
        name: 'Get onboarding link (GET)',
        method: 'GET',
        params: { accountId: accountId },
        expectedStatus: 200
      },
      {
        name: 'Missing account ID',
        method: 'POST',
        payload: {
          barberId: testData.barberId,
          barbershopId: testData.barbershopId
        },
        expectedStatus: 400
      }
    ];
    
    for (const test of tests) {
      await this.runEndpointTest('onboarding-link', test.method, test, testData.barbershopOwnerId);
    }
    
    console.log('');
  }

  /**
   * Test /api/stripe/connect/account-status
   */
  async testAccountStatus(testData) {
    console.log('📊 Testing Account Status Endpoint...');
    
    const { data: updated } = await this.supabase
      .from('financial_arrangements')
      .select('barber_stripe_account_id')
      .eq('id', testData.arrangementId)
      .single();
      
    const accountId = updated?.barber_stripe_account_id || testData.existingStripeAccountId;
    
    const tests = [
      {
        name: 'Get status by account ID',
        method: 'GET',
        params: accountId ? { accountId: accountId } : null,
        expectedStatus: accountId ? 200 : 400
      },
      {
        name: 'Get status by barber ID', 
        method: 'GET',
        params: { barberId: testData.barberId },
        expectedStatus: 200
      },
      {
        name: 'Update account status (POST)',
        method: 'POST',
        payload: accountId ? {
          accountId: accountId,
          barberId: testData.barberId,
          onboardingComplete: false
        } : null,
        expectedStatus: accountId ? 200 : 400
      },
      {
        name: 'Missing parameters',
        method: 'GET',
        params: {},
        expectedStatus: 400
      }
    ];
    
    for (const test of tests) {
      if (test.payload === null || test.params === null) {
        console.log(`  ⚠️  ${test.name}: Skipped (no account ID)`);
        continue;
      }
      await this.runEndpointTest('account-status', test.method, test, testData.barbershopOwnerId);
    }
    
    console.log('');
  }

  /**
   * Run individual endpoint test
   */
  async runEndpointTest(endpoint, method, testCase, userId) {
    try {
      const url = `${this.config.baseUrl}/api/stripe/connect/${endpoint}`;
      
      const options = {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          // In a real scenario, you'd get an actual session token
          'Cookie': `sb-access-token=mock-${userId}; sb-refresh-token=mock-refresh`
        },
        timeout: 10000
      };
      
      // Add query params for GET requests
      let finalUrl = url;
      if (testCase.params && method === 'GET') {
        const params = new URLSearchParams(testCase.params);
        finalUrl = `${url}?${params}`;
      }
      
      // Add body for POST requests
      if (testCase.payload && method === 'POST') {
        options.body = JSON.stringify(testCase.payload);
      }
      
      const startTime = Date.now();
      const response = await fetch(finalUrl, options);
      const duration = Date.now() - startTime;
      
      const success = response.status === testCase.expectedStatus;
      const responseData = await response.text();
      
      let parsedData = null;
      try {
        parsedData = JSON.parse(responseData);
      } catch (e) {
        // Response isn't JSON
      }
      
      this.results.push({
        endpoint,
        testName: testCase.name,
        success,
        status: response.status,
        expected: testCase.expectedStatus,
        duration,
        responseSize: responseData.length
      });
      
      const status = success ? '✅' : '❌';
      console.log(`  ${status} ${testCase.name}: ${response.status} (${duration}ms)`);
      
      // Log additional details for failures
      if (!success) {
        console.log(`      Expected: ${testCase.expectedStatus}, Got: ${response.status}`);
        if (parsedData?.error) {
          console.log(`      Error: ${parsedData.error}`);
        }
      }
      
    } catch (error) {
      this.results.push({
        endpoint,
        testName: testCase.name,
        success: false,
        error: error.message,
        duration: 0
      });
      
      console.log(`  ❌ ${testCase.name}: ${error.message}`);
    }
  }

  /**
   * Generate test results report
   */
  generateReport() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    console.log('📋 VALIDATION REPORT');
    console.log('=' .repeat(50));
    console.log(`Environment: ${this.env.toUpperCase()}`);
    console.log(`Base URL: ${this.config.baseUrl}`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${Math.round(passedTests/totalTests * 100)}%`);
    console.log('');
    
    // Group by endpoint
    const endpoints = [...new Set(this.results.map(r => r.endpoint))];
    
    endpoints.forEach(endpoint => {
      const endpointResults = this.results.filter(r => r.endpoint === endpoint);
      const endpointPassed = endpointResults.filter(r => r.success).length;
      
      console.log(`${endpoint}: ${endpointPassed}/${endpointResults.length} passed`);
      
      endpointResults.forEach(result => {
        const status = result.success ? '✅' : '❌';
        const duration = result.duration ? `${result.duration}ms` : 'timeout';
        console.log(`  ${status} ${result.testName} (${duration})`);
        
        if (!result.success && result.error) {
          console.log(`      Error: ${result.error}`);
        }
      });
      console.log('');
    });
    
    // Overall assessment
    if (passedTests === totalTests) {
      console.log('🎉 All endpoints are working correctly!');
    } else if (passedTests / totalTests > 0.8) {
      console.log('⚠️  Most endpoints working, but some issues detected.');
    } else {
      console.log('❌ Multiple endpoint failures detected. Review implementation.');
    }
    
    console.log('\n🔍 PRODUCTION READINESS ASSESSMENT');
    console.log('=' .repeat(50));
    
    // Check critical functionality
    const createAccountWorks = this.results
      .filter(r => r.endpoint === 'create-account' && r.testName.includes('Valid'))
      .some(r => r.success);
      
    const onboardingWorks = this.results
      .filter(r => r.endpoint === 'onboarding-link' && r.testName.includes('Create'))
      .some(r => r.success);
      
    const statusWorks = this.results
      .filter(r => r.endpoint === 'account-status')
      .some(r => r.success);
    
    console.log(`Create Account: ${createAccountWorks ? '✅' : '❌'} ${createAccountWorks ? 'Ready' : 'Needs Fix'}`);
    console.log(`Onboarding Link: ${onboardingWorks ? '✅' : '❌'} ${onboardingWorks ? 'Ready' : 'Needs Fix'}`);
    console.log(`Account Status: ${statusWorks ? '✅' : '❌'} ${statusWorks ? 'Ready' : 'Needs Fix'}`);
    
    const allCriticalWork = createAccountWorks && onboardingWorks && statusWorks;
    
    if (allCriticalWork) {
      console.log('\n🚀 PRODUCTION READY: Core Stripe Connect functionality is working');
    } else {
      console.log('\n⚠️  NOT PRODUCTION READY: Critical functionality issues detected');
    }
    
    console.log('\n💡 Next Steps:');
    if (allCriticalWork) {
      console.log('- Test with real Stripe webhooks');
      console.log('- Verify end-to-end payment flow');
      console.log('- Load test under expected traffic');
      console.log('- Test error scenarios in production environment');
    } else {
      console.log('- Fix failing endpoints before production deployment');
      console.log('- Ensure all environment variables are set correctly');
      console.log('- Verify database schema matches expectations');
      console.log('- Check Stripe API key permissions');
    }
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  let endpoint = 'all';
  let environment = 'dev';
  
  // Parse arguments
  args.forEach(arg => {
    if (arg.startsWith('--env=')) {
      environment = arg.split('=')[1];
    } else if (['all', 'create-account', 'onboarding-link', 'account-status'].includes(arg)) {
      endpoint = arg;
    }
  });
  
  const validator = new StripeEndpointValidator(environment);
  await validator.validate(endpoint);
}

// Export for use in other scripts
module.exports = { StripeEndpointValidator };

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
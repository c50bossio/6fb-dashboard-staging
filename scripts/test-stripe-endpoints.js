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
    
    } environment`);
    
  }

  /**
   * Main validation runner
   */
  async validate(endpoint = 'all') {

    try {
      // Pre-validation checks
      await this.preValidationChecks();
      
      // Get test data
      const testData = await this.getTestData();
      if (!testData) {
        
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

    // Check environment variables
    const requiredEnvs = ['STRIPE_SECRET_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    let envOk = true;
    
    requiredEnvs.forEach(env => {
      if (!process.env[env]) {
        
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

    } catch (error) {
      
      throw error;
    }
    
    // Test API endpoint accessibility
    try {
      const response = await fetch(`${this.config.baseUrl}/api/health`, { 
        method: 'GET',
        timeout: 5000 
      });
      
      if (response.ok) {
        
      } else {
        ');
      }
    } catch (error) {
      ');
    }

  }

  /**
   * Get existing test data from database
   */
  async getTestData() {

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

      return testData;
      
    } catch (error) {
      
      return null;
    }
  }

  /**
   * Test /api/stripe/connect/create-account
   */
  async testCreateAccount(testData) {

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

  }

  /**
   * Test /api/stripe/connect/onboarding-link
   */
  async testOnboardingLink(testData) {

    // Get updated account ID after create-account test
    const { data: updated } = await this.supabase
      .from('financial_arrangements')
      .select('barber_stripe_account_id')
      .eq('id', testData.arrangementId)
      .single();
      
    const accountId = updated?.barber_stripe_account_id || testData.existingStripeAccountId;
    
    if (!accountId) {

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

  }

  /**
   * Test /api/stripe/connect/account-status
   */
  async testAccountStatus(testData) {

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
        `);
        continue;
      }
      await this.runEndpointTest('account-status', test.method, test, testData.barbershopOwnerId);
    }

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
      `);
      
      // Log additional details for failures
      if (!success) {
        
        if (parsedData?.error) {
          
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

    }
  }

  /**
   * Generate test results report
   */
  generateReport() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;

    );
    }`);

    }%`);

    // Group by endpoint
    const endpoints = [...new Set(this.results.map(r => r.endpoint))];
    
    endpoints.forEach(endpoint => {
      const endpointResults = this.results.filter(r => r.endpoint === endpoint);
      const endpointPassed = endpointResults.filter(r => r.success).length;

      endpointResults.forEach(result => {
        const status = result.success ? '✅' : '❌';
        const duration = result.duration ? `${result.duration}ms` : 'timeout';
        `);
        
        if (!result.success && result.error) {
          
        }
      });
      
    });
    
    // Overall assessment
    if (passedTests === totalTests) {
      
    } else if (passedTests / totalTests > 0.8) {
      
    } else {
      
    }

    );
    
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

    const allCriticalWork = createAccountWorks && onboardingWorks && statusWorks;
    
    if (allCriticalWork) {
      
    } else {
      
    }

    if (allCriticalWork) {

    } else {

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
#!/usr/bin/env node

/**
 * Production Launch Monitoring & Testing Suite
 * Comprehensive monitoring for the token-based billing system launch
 */

const fetch = require('node-fetch');
const fs = require('fs');

// Configuration
const CONFIG = {
  app_url: process.env.NEXT_PUBLIC_APP_URL || 'https://6fb-ai.com',
  stripe_webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
  test_email: 'test@6fb-ai.com',
  monitoring_interval: 60000, // 1 minute
  alert_thresholds: {
    response_time: 2000, // 2 seconds
    error_rate: 0.05,    // 5%
    uptime: 0.999        // 99.9%
  }
};

// Test suite for production validation
class ProductionTestSuite {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      overall_status: 'running',
      success_rate: 0
    };
  }

  async runTest(name, testFunction) {
    console.log(`🧪 Running test: ${name}`);
    const startTime = Date.now();
    
    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      this.results.tests.push({
        name,
        status: 'passed',
        duration,
        result,
        timestamp: new Date().toISOString()
      });
      
      console.log(`   ✅ PASSED (${duration}ms)`);
      return true;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.tests.push({
        name,
        status: 'failed',
        duration,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      console.log(`   ❌ FAILED (${duration}ms): ${error.message}`);
      return false;
    }
  }

  async testHealthEndpoint() {
    const response = await fetch(`${CONFIG.app_url}/api/health`);
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.status || data.status !== 'healthy') {
      throw new Error('Health check returned unhealthy status');
    }
    
    return {
      status: data.status,
      timestamp: data.timestamp,
      response_time: response.headers.get('x-response-time')
    };
  }

  async testBillingPlansEndpoint() {
    const response = await fetch(`${CONFIG.app_url}/api/billing?action=plans`);
    
    if (!response.ok) {
      throw new Error(`Billing plans failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success || !data.plans) {
      throw new Error('Billing plans response invalid');
    }
    
    // Verify all three plans exist
    const expectedPlans = ['starter', 'professional', 'enterprise'];
    const actualPlans = Object.keys(data.plans);
    
    for (const plan of expectedPlans) {
      if (!actualPlans.includes(plan)) {
        throw new Error(`Missing plan: ${plan}`);
      }
    }
    
    // Verify pricing
    if (data.plans.starter.price !== 1999) {
      throw new Error(`Starter plan price incorrect: ${data.plans.starter.price}`);
    }
    
    if (data.plans.professional.price !== 4999) {
      throw new Error(`Professional plan price incorrect: ${data.plans.professional.price}`);
    }
    
    if (data.plans.enterprise.price !== 9999) {
      throw new Error(`Enterprise plan price incorrect: ${data.plans.enterprise.price}`);
    }
    
    return {
      plans_count: actualPlans.length,
      plans: actualPlans,
      pricing_validated: true
    };
  }

  async testStripeWebhookEndpoint() {
    // Test webhook endpoint accessibility (not actual webhook processing)
    const response = await fetch(`${CONFIG.app_url}/api/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature'
      },
      body: JSON.stringify({
        type: 'test.event',
        data: { object: { id: 'test' } }
      })
    });
    
    // We expect this to fail signature verification, but endpoint should be accessible
    if (response.status === 404) {
      throw new Error('Webhook endpoint not found');
    }
    
    return {
      endpoint_accessible: true,
      status_code: response.status
    };
  }

  async testCustomerOnboardingPage() {
    const response = await fetch(`${CONFIG.app_url}/onboarding`);
    
    if (!response.ok) {
      throw new Error(`Onboarding page failed: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Check for key onboarding elements
    if (!html.includes('Welcome to 6FB AI') && !html.includes('onboarding')) {
      throw new Error('Onboarding page content missing');
    }
    
    return {
      page_loaded: true,
      content_length: html.length
    };
  }

  async testBillingDashboardPage() {
    const response = await fetch(`${CONFIG.app_url}/billing`);
    
    if (!response.ok) {
      throw new Error(`Billing dashboard failed: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Check for billing dashboard elements
    if (!html.includes('billing') && !html.includes('subscription')) {
      throw new Error('Billing dashboard content missing');
    }
    
    return {
      page_loaded: true,
      content_length: html.length
    };
  }

  async testTrialCreation() {
    const response = await fetch(`${CONFIG.app_url}/api/billing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'start_trial',
        tenant_id: `test_${Date.now()}`,
        plan: 'starter',
        business_info: {
          name: 'Test Barbershop',
          type: 'barbershop'
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Trial creation failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`Trial creation unsuccessful: ${data.error || 'Unknown error'}`);
    }
    
    return {
      trial_created: true,
      subscription: data.subscription
    };
  }

  async testPerformance() {
    const endpoints = [
      { name: 'health', url: `${CONFIG.app_url}/api/health` },
      { name: 'billing_plans', url: `${CONFIG.app_url}/api/billing?action=plans` },
      { name: 'homepage', url: `${CONFIG.app_url}/` }
    ];
    
    const results = {};
    
    for (const endpoint of endpoints) {
      const startTime = Date.now();
      
      try {
        const response = await fetch(endpoint.url);
        const duration = Date.now() - startTime;
        
        results[endpoint.name] = {
          response_time: duration,
          status: response.ok ? 'success' : 'error',
          status_code: response.status
        };
        
        if (duration > CONFIG.alert_thresholds.response_time) {
          console.log(`   ⚠️ Slow response for ${endpoint.name}: ${duration}ms`);
        }
        
      } catch (error) {
        results[endpoint.name] = {
          response_time: Date.now() - startTime,
          status: 'error',
          error: error.message
        };
      }
    }
    
    return results;
  }

  async runAllTests() {
    console.log('🚀 Starting Production Test Suite');
    console.log('=================================\n');
    
    const tests = [
      { name: 'Health Endpoint', fn: () => this.testHealthEndpoint() },
      { name: 'Billing Plans API', fn: () => this.testBillingPlansEndpoint() },
      { name: 'Stripe Webhook Endpoint', fn: () => this.testStripeWebhookEndpoint() },
      { name: 'Customer Onboarding Page', fn: () => this.testCustomerOnboardingPage() },
      { name: 'Billing Dashboard Page', fn: () => this.testBillingDashboardPage() },
      { name: 'Trial Creation Flow', fn: () => this.testTrialCreation() },
      { name: 'Performance Check', fn: () => this.testPerformance() }
    ];
    
    let passed = 0;
    
    for (const test of tests) {
      const success = await this.runTest(test.name, test.fn);
      if (success) passed++;
    }
    
    this.results.success_rate = (passed / tests.length) * 100;
    this.results.overall_status = passed === tests.length ? 'passed' : 'failed';
    
    console.log('\n📊 Test Results Summary');
    console.log('=====================');
    console.log(`✅ Passed: ${passed}/${tests.length}`);
    console.log(`📈 Success Rate: ${this.results.success_rate.toFixed(1)}%`);
    console.log(`🎯 Overall Status: ${this.results.overall_status.toUpperCase()}`);
    
    // Save results to file
    fs.writeFileSync('production-test-results.json', JSON.stringify(this.results, null, 2));
    console.log('💾 Results saved to production-test-results.json');
    
    return this.results;
  }
}

// Continuous monitoring class
class ProductionMonitor {
  constructor() {
    this.metrics = {
      uptime_checks: 0,
      successful_checks: 0,
      failed_checks: 0,
      avg_response_time: 0,
      last_check: null,
      alerts_sent: 0
    };
    
    this.isRunning = false;
  }

  async checkEndpoint(url, name) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(url);
      const duration = Date.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return {
        name,
        status: 'up',
        response_time: duration,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        name,
        status: 'down',
        response_time: duration,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async performHealthCheck() {
    const endpoints = [
      { name: 'API Health', url: `${CONFIG.app_url}/api/health` },
      { name: 'Billing System', url: `${CONFIG.app_url}/api/billing?action=plans` },
      { name: 'Homepage', url: `${CONFIG.app_url}/` }
    ];
    
    const results = [];
    
    for (const endpoint of endpoints) {
      const result = await this.checkEndpoint(endpoint.url, endpoint.name);
      results.push(result);
      
      // Update metrics
      this.metrics.uptime_checks++;
      
      if (result.status === 'up') {
        this.metrics.successful_checks++;
      } else {
        this.metrics.failed_checks++;
        console.log(`🚨 ALERT: ${result.name} is DOWN - ${result.error}`);
        this.metrics.alerts_sent++;
      }
      
      // Check response time alerts
      if (result.response_time > CONFIG.alert_thresholds.response_time) {
        console.log(`⚠️ SLOW RESPONSE: ${result.name} - ${result.response_time}ms`);
      }
    }
    
    // Calculate uptime percentage
    const uptime = this.metrics.uptime_checks > 0 ? 
      (this.metrics.successful_checks / this.metrics.uptime_checks) * 100 : 100;
    
    this.metrics.last_check = new Date().toISOString();
    
    // Log status
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ✓ Health check complete - Uptime: ${uptime.toFixed(2)}%`);
    
    return results;
  }

  start() {
    if (this.isRunning) {
      console.log('Monitor is already running');
      return;
    }
    
    this.isRunning = true;
    console.log(`🔍 Starting production monitoring (${CONFIG.monitoring_interval / 1000}s interval)`);
    
    // Initial check
    this.performHealthCheck();
    
    // Set up interval
    this.intervalId = setInterval(() => {
      this.performHealthCheck();
    }, CONFIG.monitoring_interval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.isRunning = false;
      console.log('🛑 Production monitoring stopped');
      
      // Save final metrics
      fs.writeFileSync('monitoring-metrics.json', JSON.stringify(this.metrics, null, 2));
      console.log('💾 Monitoring metrics saved');
    }
  }

  getStatus() {
    const uptime = this.metrics.uptime_checks > 0 ? 
      (this.metrics.successful_checks / this.metrics.uptime_checks) * 100 : 100;
    
    return {
      ...this.metrics,
      uptime_percentage: uptime,
      is_running: this.isRunning
    };
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'test';
  
  switch (command) {
    case 'test':
      console.log('🧪 Running production test suite...\n');
      const testSuite = new ProductionTestSuite();
      const results = await testSuite.runAllTests();
      
      if (results.overall_status === 'failed') {
        process.exit(1);
      }
      break;
      
    case 'monitor':
      console.log('🔍 Starting production monitoring...\n');
      const monitor = new ProductionMonitor();
      monitor.start();
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down monitor...');
        monitor.stop();
        process.exit(0);
      });
      
      // Keep process alive
      process.stdin.resume();
      break;
      
    case 'status':
      console.log('📊 Production system status...\n');
      const statusMonitor = new ProductionMonitor();
      const healthResults = await statusMonitor.performHealthCheck();
      
      console.log('\n📈 Current Status:');
      healthResults.forEach(result => {
        const status = result.status === 'up' ? '🟢' : '🔴';
        console.log(`   ${status} ${result.name}: ${result.response_time}ms`);
      });
      break;
      
    default:
      console.log('6FB AI Production Monitoring & Testing Suite');
      console.log('===========================================');
      console.log('');
      console.log('Commands:');
      console.log('  test     - Run comprehensive production test suite');
      console.log('  monitor  - Start continuous monitoring');
      console.log('  status   - Check current system status');
      console.log('');
      console.log('Examples:');
      console.log('  node launch-monitoring.js test');
      console.log('  node launch-monitoring.js monitor');
      console.log('  node launch-monitoring.js status');
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = { ProductionTestSuite, ProductionMonitor };
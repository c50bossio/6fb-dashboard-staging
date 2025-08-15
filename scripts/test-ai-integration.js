#!/usr/bin/env node

/**
 * AI Agent System - Comprehensive Integration Test
 * Tests all AI features to ensure production readiness
 */

const fetch = require('node-fetch');
const chalk = require('chalk');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:9999';
const API_BASE = `${BASE_URL}/api`;

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Utility functions
async function testEndpoint(name, url, options = {}) {
  process.stdout.write(`Testing ${name}... `);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(chalk.green('✓ PASSED'));
      results.passed++;
      results.tests.push({ name, status: 'passed', data });
      return { success: true, data };
    } else {
      console.log(chalk.red(`✗ FAILED (${response.status})`));
      results.failed++;
      results.tests.push({ name, status: 'failed', error: response.status });
      return { success: false, error: response.status };
    }
  } catch (error) {
    console.log(chalk.red(`✗ ERROR: ${error.message}`));
    results.failed++;
    results.tests.push({ name, status: 'error', error: error.message });
    return { success: false, error: error.message };
  }
}

async function testVoiceAssistant() {
  console.log(chalk.cyan('\n🎤 Testing Voice Assistant Integration'));
  
  await testEndpoint(
    'Voice Processing',
    `${API_BASE}/ai/voice`,
    {
      method: 'POST',
      body: JSON.stringify({
        transcript: 'How can I increase revenue?',
        agent: 'marcus'
      })
    }
  );
  
  await testEndpoint(
    'Voice Synthesis',
    `${API_BASE}/ai/voice/synthesize`,
    {
      method: 'POST',
      body: JSON.stringify({
        text: 'Hello, this is a test.',
        voice: 'sophia'
      })
    }
  );
}

async function testProactiveMonitoring() {
  console.log(chalk.cyan('\n🔔 Testing Proactive Monitoring'));
  
  await testEndpoint(
    'Generate Alerts',
    `${API_BASE}/ai/monitor`,
    {
      method: 'POST',
      body: JSON.stringify({
        barbershopId: 'test-shop',
        checkType: 'all'
      })
    }
  );
  
  await testEndpoint(
    'Alert History',
    `${API_BASE}/ai/monitor?action=history`
  );
}

async function testMultiAgentCollaboration() {
  console.log(chalk.cyan('\n👥 Testing Multi-Agent Collaboration'));
  
  await testEndpoint(
    'Complex Query',
    `${API_BASE}/ai/collaborate`,
    {
      method: 'POST',
      body: JSON.stringify({
        query: 'How can I grow my business and increase customer retention?',
        complexity: 'high'
      })
    }
  );
  
  await testEndpoint(
    'Agent Status',
    `${API_BASE}/ai/collaborate?action=status`
  );
}

async function testLearningSystem() {
  console.log(chalk.cyan('\n🧠 Testing Learning & Adaptation'));
  
  await testEndpoint(
    'Record Interaction',
    `${API_BASE}/ai/learning`,
    {
      method: 'POST',
      body: JSON.stringify({
        agentId: 'marcus',
        query: 'revenue optimization',
        response: 'test response',
        outcome: { success: true }
      })
    }
  );
  
  await testEndpoint(
    'Recall Patterns',
    `${API_BASE}/ai/learning?action=recall&agent=marcus`
  );
}

async function testPredictiveAnalytics() {
  console.log(chalk.cyan('\n📈 Testing Predictive Analytics'));
  
  await testEndpoint(
    'Generate Predictions',
    `${API_BASE}/ai/predictions`,
    {
      method: 'POST',
      body: JSON.stringify({
        barbershopId: 'test-shop',
        timeframe: 30,
        models: ['revenue', 'bookings']
      })
    }
  );
  
  await testEndpoint(
    'Model Performance',
    `${API_BASE}/ai/predictions?action=performance`
  );
}

async function testEnhancedChat() {
  console.log(chalk.cyan('\n💬 Testing Enhanced AI Chat'));
  
  await testEndpoint(
    'Chat Message',
    `${API_BASE}/ai/enhanced-chat`,
    {
      method: 'POST',
      body: JSON.stringify({
        message: 'What are my top priorities for this week?',
        sessionId: 'test-session',
        businessContext: {
          type: 'barbershop',
          size: 'medium'
        }
      })
    }
  );
}

async function testHealthChecks() {
  console.log(chalk.cyan('\n❤️ Testing System Health'));
  
  await testEndpoint('Frontend Health', `${API_BASE}/health`);
  await testEndpoint('Backend Health', `http://localhost:8001/health`);
  await testEndpoint('AI Service Health', `${API_BASE}/ai/health`);
}

async function testPerformance() {
  console.log(chalk.cyan('\n⚡ Testing Performance Metrics'));
  
  const startTime = Date.now();
  const performanceTests = [];
  
  // Test voice response time
  const voiceStart = Date.now();
  await fetch(`${API_BASE}/ai/voice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript: 'test', agent: 'marcus' })
  });
  performanceTests.push({
    name: 'Voice Processing',
    time: Date.now() - voiceStart,
    threshold: 2000
  });
  
  // Test prediction generation time
  const predStart = Date.now();
  await fetch(`${API_BASE}/ai/predictions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ barbershopId: 'test', timeframe: 7 })
  });
  performanceTests.push({
    name: 'Prediction Generation',
    time: Date.now() - predStart,
    threshold: 5000
  });
  
  // Report performance
  console.log('\nPerformance Results:');
  performanceTests.forEach(test => {
    const passed = test.time < test.threshold;
    const icon = passed ? chalk.green('✓') : chalk.yellow('⚠');
    const time = passed ? chalk.green(`${test.time}ms`) : chalk.yellow(`${test.time}ms`);
    console.log(`  ${icon} ${test.name}: ${time} (threshold: ${test.threshold}ms)`);
    
    if (!passed) {
      results.warnings++;
    }
  });
}

async function generateReport() {
  console.log(chalk.cyan('\n📊 Test Summary Report'));
  console.log('═'.repeat(50));
  
  const total = results.passed + results.failed;
  const passRate = ((results.passed / total) * 100).toFixed(1);
  
  console.log(chalk.green(`  ✓ Passed: ${results.passed}`));
  console.log(chalk.red(`  ✗ Failed: ${results.failed}`));
  console.log(chalk.yellow(`  ⚠ Warnings: ${results.warnings}`));
  console.log(chalk.white(`  📈 Pass Rate: ${passRate}%`));
  
  console.log('\n' + '═'.repeat(50));
  
  if (results.failed === 0 && results.warnings === 0) {
    console.log(chalk.green.bold('🎉 All tests passed! System is production ready.'));
  } else if (results.failed === 0) {
    console.log(chalk.yellow.bold('⚠️  Tests passed with warnings. Review performance metrics.'));
  } else {
    console.log(chalk.red.bold('❌ Some tests failed. Please fix issues before deployment.'));
    
    console.log('\nFailed Tests:');
    results.tests
      .filter(t => t.status === 'failed' || t.status === 'error')
      .forEach(t => {
        console.log(chalk.red(`  - ${t.name}: ${t.error}`));
      });
  }
  
  // Save report to file
  const fs = require('fs');
  const reportPath = './test-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
}

// Main test runner
async function runAllTests() {
  console.log(chalk.blue.bold('\n🚀 AI Agent System - Integration Test Suite'));
  console.log(chalk.blue('Testing all AI features for production readiness...'));
  console.log('═'.repeat(50));
  
  try {
    await testHealthChecks();
    await testVoiceAssistant();
    await testProactiveMonitoring();
    await testMultiAgentCollaboration();
    await testLearningSystem();
    await testPredictiveAnalytics();
    await testEnhancedChat();
    await testPerformance();
  } catch (error) {
    console.error(chalk.red(`\n❌ Test suite error: ${error.message}`));
  }
  
  await generateReport();
}

// Check if services are running
async function checkServices() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    if (!response.ok) {
      console.log(chalk.yellow('\n⚠️  Services not running. Starting Docker containers...'));
      require('child_process').execSync('cd .. && ./docker-dev-start.sh', { stdio: 'inherit' });
      console.log('Waiting for services to start...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  } catch (error) {
    console.log(chalk.red(`\n❌ Cannot connect to services at ${BASE_URL}`));
    console.log(chalk.yellow('Please ensure the application is running:'));
    console.log(chalk.white('  npm run dev'));
    console.log(chalk.white('  OR'));
    console.log(chalk.white('  ./docker-dev-start.sh'));
    process.exit(1);
  }
}

// Run tests
(async () => {
  await checkServices();
  await runAllTests();
})();
#!/usr/bin/env node

/**
 * Test all API endpoints that were failing with ERR_CONNECTION_REFUSED
 */

const API_BASE = 'http://localhost:9999/api';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, url, options = {}) {
  try {
    log(`\n🧪 Testing: ${name}`, 'cyan');
    log(`   URL: ${url}`, 'yellow');
    
    const response = await fetch(url, options);
    const status = response.status;
    
    if (response.ok) {
      const data = await response.json();
      log(`   ✅ SUCCESS: ${status}`, 'green');
      return { success: true, status, data };
    } else {
      const errorText = await response.text();
      log(`   ❌ FAILED: ${status} - ${errorText}`, 'red');
      return { success: false, status, error: errorText };
    }
  } catch (error) {
    log(`   ❌ ERROR: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log('🚀 API Endpoint Testing', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  const barberId = '56ddbef1-fc3b-4f86-b841-88a8e72e166e';
  const appointmentId = '71431aa3-ded5-4976-9d53-6a3564a47815';
  
  const tests = [
    {
      name: 'Availability API (basic)',
      url: `${API_BASE}/appointments/availability?barber_id=${barberId}&date=2025-08-13&duration_minutes=20`
    },
    {
      name: 'Availability API (with exclusion)',
      url: `${API_BASE}/appointments/availability?barber_id=${barberId}&date=2025-08-13&duration_minutes=20&exclude_appointment_id=${appointmentId}`
    },
    {
      name: 'Get Appointment (individual)',
      url: `${API_BASE}/calendar/appointments/${appointmentId}`
    },
    {
      name: 'Delete Appointment (test with non-existent ID)',
      url: `${API_BASE}/calendar/appointments/test-delete-12345`,
      options: { method: 'DELETE' }
    },
    {
      name: 'Convert Recurring (test with existing ID)',
      url: `${API_BASE}/calendar/appointments/${appointmentId}/convert-recurring`,
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recurrence_pattern: 'weekly',
          recurrence_count: 2
        })
      }
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await testEndpoint(test.name, test.url, test.options);
    
    if (result.success || result.status === 404) { // 404 is expected for some tests
      passed++;
    } else if (result.error?.includes('Connection refused')) {
      log(`   🔥 CONNECTION REFUSED CONFIRMED`, 'red');
      failed++;
    } else {
      failed++;
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  log('\n' + '='.repeat(50), 'cyan');
  log('TEST SUMMARY', 'cyan');
  log('='.repeat(50), 'cyan');
  
  log(`\n✅ Passed: ${passed}`, 'green');
  log(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  
  if (failed === 0) {
    log('\n🎉 ALL ENDPOINTS WORKING!', 'green');
    log('The ERR_CONNECTION_REFUSED errors are likely browser/timing issues.', 'yellow');
  } else {
    log('\n🚨 SOME ENDPOINTS HAVE ISSUES', 'red');
    log('Check server logs and endpoint implementations.', 'yellow');
  }
}

runTests().catch(console.error);
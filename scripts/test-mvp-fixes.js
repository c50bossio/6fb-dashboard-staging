#!/usr/bin/env node

/**
 * MVP Fixes Verification Script
 * Tests all critical fixes implemented for the MVP
 * Date: 2025-08-29
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9999';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Test results tracking
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper functions
const log = {
  success: (msg) => console.log(chalk.green('✓'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  warning: (msg) => console.log(chalk.yellow('⚠'), msg),
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  header: (msg) => console.log(chalk.bold.cyan(`\n=== ${msg} ===\n`))
};

const recordTest = (name, status, message = '') => {
  if (status === 'passed') {
    testResults.passed.push(name);
    log.success(`${name}${message ? ': ' + message : ''}`);
  } else if (status === 'failed') {
    testResults.failed.push({ name, message });
    log.error(`${name}: ${message}`);
  } else if (status === 'warning') {
    testResults.warnings.push({ name, message });
    log.warning(`${name}: ${message}`);
  }
};

// Test Functions
async function testSupabaseConnection() {
  log.header('Testing Supabase Connection');
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Test basic connection
    const { data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact' });
    
    if (error) {
      recordTest('Supabase Connection', 'failed', error.message);
      return false;
    }
    
    recordTest('Supabase Connection', 'passed', `Connected successfully`);
    return true;
  } catch (error) {
    recordTest('Supabase Connection', 'failed', error.message);
    return false;
  }
}

async function testMonitoringTables() {
  log.header('Testing Monitoring Database Tables');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const tables = [
    'system_health_snapshots',
    'production_errors',
    'production_metrics',
    'ai_model_usage',
    'production_alerts'
  ];
  
  let allTablesExist = true;
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.message.includes('does not exist')) {
          recordTest(`Table: ${table}`, 'failed', 'Table does not exist - run migration');
          allTablesExist = false;
        } else {
          recordTest(`Table: ${table}`, 'warning', `Query error: ${error.message}`);
        }
      } else {
        recordTest(`Table: ${table}`, 'passed', 'Table exists and is accessible');
      }
    } catch (error) {
      recordTest(`Table: ${table}`, 'failed', error.message);
      allTablesExist = false;
    }
  }
  
  return allTablesExist;
}

async function testProfilesColumns() {
  log.header('Testing Profiles Table Schema');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const requiredColumns = [
    'avatar_url',
    'first_name',
    'last_name',
    'phone',
    'barbershop_id',
    'bio',
    'specialties',
    'experience_years',
    'onboarding_completed',
    'subscription_tier',
    'is_active',
    'metadata'
  ];
  
  try {
    // Create a test query that uses all columns
    const { data, error } = await supabase
      .from('profiles')
      .select(requiredColumns.join(','))
      .limit(1);
    
    if (error) {
      const missingColumns = [];
      for (const col of requiredColumns) {
        if (error.message.includes(`column profiles.${col} does not exist`)) {
          missingColumns.push(col);
        }
      }
      
      if (missingColumns.length > 0) {
        recordTest('Profiles Schema', 'failed', 
          `Missing columns: ${missingColumns.join(', ')} - run fix-profiles-table-columns.sql`);
        return false;
      } else {
        recordTest('Profiles Schema', 'warning', `Query error: ${error.message}`);
        return false;
      }
    }
    
    recordTest('Profiles Schema', 'passed', 'All required columns exist');
    return true;
  } catch (error) {
    recordTest('Profiles Schema', 'failed', error.message);
    return false;
  }
}

async function testHealthEndpoints() {
  log.header('Testing Health Check Endpoints');
  
  const endpoints = [
    { path: '/api/health', name: 'Main Health' },
    { path: '/api/health/stripe', name: 'Stripe Health' },
    { path: '/api/health/supabase', name: 'Supabase Health' },
    { path: '/api/health/ai', name: 'AI Health' },
    { path: '/api/monitoring', name: 'Monitoring', params: '?type=health' }
  ];
  
  let allHealthy = true;
  
  for (const endpoint of endpoints) {
    try {
      const url = `${BASE_URL}${endpoint.path}${endpoint.params || ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 404) {
        recordTest(`Endpoint: ${endpoint.name}`, 'failed', `404 Not Found at ${endpoint.path}`);
        allHealthy = false;
      } else if (response.status >= 500) {
        const text = await response.text();
        recordTest(`Endpoint: ${endpoint.name}`, 'failed', `Server error (${response.status}): ${text.substring(0, 100)}`);
        allHealthy = false;
      } else if (response.status >= 400) {
        recordTest(`Endpoint: ${endpoint.name}`, 'warning', `Client error (${response.status})`);
      } else {
        const data = await response.json();
        recordTest(`Endpoint: ${endpoint.name}`, 'passed', `Status: ${data.status || 'OK'}`);
      }
    } catch (error) {
      recordTest(`Endpoint: ${endpoint.name}`, 'failed', `Network error: ${error.message}`);
      allHealthy = false;
    }
  }
  
  return allHealthy;
}

async function testAuthenticationFlow() {
  log.header('Testing Authentication System');
  
  try {
    // Test auth session endpoint
    const response = await fetch(`${BASE_URL}/api/auth/session`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 401) {
      recordTest('Auth Session', 'passed', 'Correctly returns 401 when not authenticated');
    } else if (response.status === 200) {
      const data = await response.json();
      if (data.user) {
        recordTest('Auth Session', 'passed', `User authenticated: ${data.user.email}`);
      } else {
        recordTest('Auth Session', 'warning', 'Session endpoint returns 200 but no user');
      }
    } else {
      recordTest('Auth Session', 'failed', `Unexpected status: ${response.status}`);
      return false;
    }
    
    // Test OAuth callback route exists
    const callbackResponse = await fetch(`${BASE_URL}/auth/callback`, {
      method: 'GET',
      redirect: 'manual'
    });
    
    if (callbackResponse.status === 302 || callbackResponse.status === 307) {
      recordTest('OAuth Callback', 'passed', 'Callback route exists and redirects');
    } else {
      recordTest('OAuth Callback', 'warning', `Unexpected status: ${callbackResponse.status}`);
    }
    
    return true;
  } catch (error) {
    recordTest('Authentication System', 'failed', error.message);
    return false;
  }
}

async function testDatabasePerformance() {
  log.header('Testing Database Performance');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  try {
    // Test query performance
    const startTime = Date.now();
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .limit(100);
    
    const queryTime = Date.now() - startTime;
    
    if (error) {
      recordTest('Database Query Performance', 'failed', error.message);
      return false;
    }
    
    if (queryTime < 500) {
      recordTest('Database Query Performance', 'passed', `Query completed in ${queryTime}ms`);
    } else if (queryTime < 1000) {
      recordTest('Database Query Performance', 'warning', `Query took ${queryTime}ms (consider optimization)`);
    } else {
      recordTest('Database Query Performance', 'failed', `Query too slow: ${queryTime}ms`);
      return false;
    }
    
    // Test indexes exist
    const { data: indexData, error: indexError } = await supabase
      .rpc('get_indexes', { table_name: 'profiles' });
    
    if (!indexError && indexData) {
      recordTest('Database Indexes', 'passed', `Found ${indexData.length || 0} indexes`);
    } else {
      recordTest('Database Indexes', 'warning', 'Could not verify indexes');
    }
    
    return true;
  } catch (error) {
    recordTest('Database Performance', 'failed', error.message);
    return false;
  }
}

async function checkEnvironmentVariables() {
  log.header('Checking Environment Variables');
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY'
  ];
  
  const optionalVars = [
    'STRIPE_SECRET_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'SENDGRID_API_KEY',
    'TWILIO_ACCOUNT_SID'
  ];
  
  let allRequired = true;
  
  // Check required variables
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      const value = process.env[varName];
      const masked = value.substring(0, 10) + '...' + value.substring(value.length - 4);
      recordTest(`ENV: ${varName}`, 'passed', `Set (${masked})`);
    } else {
      recordTest(`ENV: ${varName}`, 'failed', 'Not set - REQUIRED');
      allRequired = false;
    }
  }
  
  // Check optional variables
  for (const varName of optionalVars) {
    if (process.env[varName]) {
      recordTest(`ENV: ${varName}`, 'passed', 'Set');
    } else {
      recordTest(`ENV: ${varName}`, 'warning', 'Not set (optional)');
    }
  }
  
  return allRequired;
}

// Main test runner
async function runAllTests() {
  console.log(chalk.bold.magenta('\n🧪 MVP Fixes Verification Suite\n'));
  console.log(chalk.gray(`Testing against: ${BASE_URL}`));
  console.log(chalk.gray(`Timestamp: ${new Date().toISOString()}\n`));
  
  // Run all tests
  await checkEnvironmentVariables();
  await testSupabaseConnection();
  await testMonitoringTables();
  await testProfilesColumns();
  await testHealthEndpoints();
  await testAuthenticationFlow();
  await testDatabasePerformance();
  
  // Print summary
  log.header('Test Summary');
  
  console.log(chalk.green(`✓ Passed: ${testResults.passed.length}`));
  console.log(chalk.yellow(`⚠ Warnings: ${testResults.warnings.length}`));
  console.log(chalk.red(`✗ Failed: ${testResults.failed.length}`));
  
  if (testResults.failed.length > 0) {
    console.log(chalk.red('\nFailed Tests:'));
    testResults.failed.forEach(test => {
      console.log(chalk.red(`  - ${test.name}: ${test.message}`));
    });
  }
  
  if (testResults.warnings.length > 0) {
    console.log(chalk.yellow('\nWarnings:'));
    testResults.warnings.forEach(test => {
      console.log(chalk.yellow(`  - ${test.name}: ${test.message}`));
    });
  }
  
  // Exit with appropriate code
  if (testResults.failed.length > 0) {
    console.log(chalk.red('\n❌ Some tests failed. Please review the implementation guide.'));
    process.exit(1);
  } else if (testResults.warnings.length > 0) {
    console.log(chalk.yellow('\n⚠️  All critical tests passed with warnings.'));
    process.exit(0);
  } else {
    console.log(chalk.green('\n✅ All tests passed! MVP fixes are working correctly.'));
    process.exit(0);
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('\n💥 Unhandled error:'), error);
  process.exit(1);
});

// Run tests
runAllTests().catch(error => {
  console.error(chalk.red('\n💥 Test suite error:'), error);
  process.exit(1);
});
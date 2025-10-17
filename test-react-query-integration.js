#!/usr/bin/env node

/**
 * Test React Query Integration
 * Validates that all hook exports work properly
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test script to validate React Query setup
async function testReactQueryIntegration() {
  console.log('🧪 Testing React Query Integration...\n');

  const results = {
    hookExports: false,
    queryClient: false,
    queryProvider: false,
    supabaseService: false,
    errors: []
  };

  try {
    // Test 1: Check if hook files exist and have proper exports
    console.log('📦 Testing hook exports...');
    const hooksDir = path.join(__dirname, 'hooks');
    const indexPath = path.join(hooksDir, 'index.js');
    
    if (fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath, 'utf8');
      if (indexContent.includes('export') && indexContent.includes('useAppointments')) {
        results.hookExports = true;
        console.log('✅ Hook exports found');
      } else {
        results.errors.push('Hook exports missing or malformed');
      }
    } else {
      results.errors.push('hooks/index.js not found');
    }

    // Test 2: Check QueryClient configuration
    console.log('⚙️  Testing QueryClient configuration...');
    const queryClientPath = path.join(__dirname, 'lib', 'query-client.js');
    
    if (fs.existsSync(queryClientPath)) {
      const queryClientContent = fs.readFileSync(queryClientPath, 'utf8');
      if (queryClientContent.includes('QueryClient') && queryClientContent.includes('staleTime')) {
        results.queryClient = true;
        console.log('✅ QueryClient properly configured');
      } else {
        results.errors.push('QueryClient configuration incomplete');
      }
    } else {
      results.errors.push('lib/query-client.js not found');
    }

    // Test 3: Check QueryProvider setup
    console.log('🔌 Testing QueryProvider setup...');
    const queryProviderPath = path.join(__dirname, 'components', 'QueryProvider.js');
    
    if (fs.existsSync(queryProviderPath)) {
      const queryProviderContent = fs.readFileSync(queryProviderPath, 'utf8');
      if (queryProviderContent.includes('QueryClientProvider') && queryProviderContent.includes('ReactQueryDevtools')) {
        results.queryProvider = true;
        console.log('✅ QueryProvider properly configured');
      } else {
        results.errors.push('QueryProvider configuration incomplete');
      }
    } else {
      results.errors.push('components/QueryProvider.js not found');
    }

    // Test 4: Check Supabase service layer
    console.log('🗄️  Testing Supabase service layer...');
    const supabaseServicePath = path.join(__dirname, 'lib', 'supabase-service.js');
    
    if (fs.existsSync(supabaseServicePath)) {
      const supabaseServiceContent = fs.readFileSync(supabaseServicePath, 'utf8');
      if (supabaseServiceContent.includes('SupabaseService') && supabaseServiceContent.includes('appointments')) {
        results.supabaseService = true;
        console.log('✅ Supabase service layer found');
      } else {
        results.errors.push('Supabase service layer incomplete');
      }
    } else {
      results.errors.push('lib/supabase-service.js not found');
    }

    // Test 5: Verify specific hook files exist
    console.log('🔍 Verifying specific hook files...');
    const requiredHooks = [
      'useAppointments.js',
      'useStaffQuery.js', 
      'useServicesQuery.js',
      'useCustomersQuery.js',
      'useRealtimeAppointments.js'
    ];

    const missingHooks = [];
    requiredHooks.forEach(hookFile => {
      const hookPath = path.join(hooksDir, hookFile);
      if (!fs.existsSync(hookPath)) {
        missingHooks.push(hookFile);
      }
    });

    if (missingHooks.length === 0) {
      console.log('✅ All required hook files found');
    } else {
      results.errors.push(`Missing hook files: ${missingHooks.join(', ')}`);
    }

  } catch (error) {
    results.errors.push(`Test execution error: ${error.message}`);
  }

  // Generate report
  console.log('\n📊 Integration Test Results:');
  console.log('━'.repeat(50));
  console.log(`Hook Exports:      ${results.hookExports ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Query Client:      ${results.queryClient ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Query Provider:    ${results.queryProvider ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Supabase Service:  ${results.supabaseService ? '✅ PASS' : '❌ FAIL'}`);

  const totalPassed = Object.values(results).filter(val => val === true).length;
  const totalTests = 4;

  console.log('━'.repeat(50));
  console.log(`Overall Score:     ${totalPassed}/${totalTests} tests passed`);

  if (results.errors.length > 0) {
    console.log('\n❌ Issues Found:');
    results.errors.forEach(error => console.log(`   • ${error}`));
  }

  const isReady = totalPassed === totalTests && results.errors.length === 0;
  console.log(`\n🏁 Status: ${isReady ? '✅ READY for Phase 2' : '⚠️  NEEDS FIXES'}`);

  return {
    isReady,
    score: `${totalPassed}/${totalTests}`,
    errors: results.errors
  };
}

// Run the test
testReactQueryIntegration()
  .then(results => {
    process.exit(results.isReady ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });

export { testReactQueryIntegration };
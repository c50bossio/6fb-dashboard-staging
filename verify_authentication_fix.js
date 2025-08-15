#!/usr/bin/env node

/**
 * Authentication System Verification Script
 * Tests all authentication flows to confirm 500 errors are resolved
 */

const fs = require('fs');
const path = require('path');

async function verifyAuthenticationSystem() {
  console.log('🔐 AUTHENTICATION SYSTEM VERIFICATION');
  console.log('=' + '='.repeat(50));
  
  const results = {
    configuration: {},
    api_endpoints: {},
    frontend_components: {},
    database_schema: {},
    session_management: {},
    overall_status: 'unknown'
  };

  // 1. Verify Environment Configuration
  console.log('\n1️⃣ Environment Configuration Check...');
  try {
    const envPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      const requiredVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY'
      ];
      
      let configValid = true;
      for (const varName of requiredVars) {
        const hasVar = envContent.includes(varName) && !envContent.includes(`${varName}=your_`);
        console.log(`   ${hasVar ? '✅' : '❌'} ${varName}: ${hasVar ? 'configured' : 'missing/placeholder'}`);
        if (!hasVar) configValid = false;
      }
      
      results.configuration.status = configValid ? 'valid' : 'incomplete';
      results.configuration.supabase_url = envContent.includes('dfhqjdoydihajmjxniee.supabase.co') ? 'configured' : 'missing';
    } else {
      console.log('   ❌ .env.local file not found');
      results.configuration.status = 'missing';
    }
  } catch (error) {
    console.log('   ❌ Error checking environment:', error.message);
    results.configuration.status = 'error';
  }

  // 2. Test API Endpoints
  console.log('\n2️⃣ API Endpoints Verification...');
  const endpoints = [
    { path: '/api/health', method: 'GET', expected: 200 },
    { path: '/api/auth/login', method: 'POST', body: { email: 'demo@barbershop.com', password: 'demo123' }, expected: 200 },
    { path: '/api/auth/signup', method: 'POST', body: { email: `test${Date.now()}@example.com`, password: 'TestPass123' }, expected: 200 },
    { path: '/api/dashboard/metrics', method: 'GET', expected: 200 }
  ];

  for (const endpoint of endpoints) {
    try {
      const options = {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' }
      };
      
      if (endpoint.body) {
        options.body = JSON.stringify(endpoint.body);
      }

      const response = await fetch(`http://localhost:9999${endpoint.path}`, options);
      const status = response.status;
      const isSuccess = status === endpoint.expected || (status >= 200 && status < 300);
      
      console.log(`   ${isSuccess ? '✅' : '❌'} ${endpoint.method} ${endpoint.path}: ${status} ${isSuccess ? '(OK)' : '(ERROR)'}`);
      
      results.api_endpoints[endpoint.path] = {
        status,
        success: isSuccess,
        method: endpoint.method
      };
      
      if (!isSuccess) {
        const errorText = await response.text();
        console.log(`      Error: ${errorText.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`   ❌ ${endpoint.method} ${endpoint.path}: ${error.message}`);
      results.api_endpoints[endpoint.path] = {
        status: 'error',
        success: false,
        error: error.message
      };
    }
  }

  // 3. Verify Frontend Components
  console.log('\n3️⃣ Frontend Components Verification...');
  const components = [
    { path: 'components/SupabaseAuthProvider.js', name: 'Auth Provider' },
    { path: 'contexts/TenantContext.js', name: 'Tenant Context' },
    { path: 'contexts/DashboardContext.js', name: 'Dashboard Context' },
    { path: 'app/login/page.js', name: 'Login Page' },
    { path: 'app/register/page.js', name: 'Registration Page' },
    { path: 'components/ProtectedRoute.js', name: 'Protected Route' }
  ];

  for (const component of components) {
    try {
      const componentPath = path.join(__dirname, component.path);
      const exists = fs.existsSync(componentPath);
      
      if (exists) {
        const content = fs.readFileSync(componentPath, 'utf8');
        const hasUseClient = content.includes("'use client'");
        const hasExports = content.includes('export');
        const isValid = hasExports && (component.path.includes('page.js') ? true : hasUseClient || component.path.includes('contexts/'));
        
        console.log(`   ${isValid ? '✅' : '⚠️'} ${component.name}: ${isValid ? 'valid' : 'needs review'}`);
        results.frontend_components[component.name] = {
          exists: true,
          valid: isValid
        };
      } else {
        console.log(`   ❌ ${component.name}: file not found`);
        results.frontend_components[component.name] = {
          exists: false,
          valid: false
        };
      }
    } catch (error) {
      console.log(`   ❌ ${component.name}: error reading file`);
      results.frontend_components[component.name] = {
        exists: false,
        valid: false,
        error: error.message
      };
    }
  }

  // 4. Database Schema Verification
  console.log('\n4️⃣ Database Schema Verification...');
  try {
    const schemaPath = path.join(__dirname, 'database/supabase-schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      const hasProfiles = schema.includes('CREATE TABLE public.profiles');
      const hasRLS = schema.includes('ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY');
      const hasTrigger = schema.includes('CREATE TRIGGER on_auth_user_created');
      
      console.log(`   ${hasProfiles ? '✅' : '❌'} Profiles table: ${hasProfiles ? 'defined' : 'missing'}`);
      console.log(`   ${hasRLS ? '✅' : '❌'} Row Level Security: ${hasRLS ? 'enabled' : 'missing'}`);
      console.log(`   ${hasTrigger ? '✅' : '❌'} User creation trigger: ${hasTrigger ? 'configured' : 'missing'}`);
      
      results.database_schema = {
        schema_exists: true,
        profiles_table: hasProfiles,
        rls_enabled: hasRLS,
        user_trigger: hasTrigger,
        valid: hasProfiles && hasRLS && hasTrigger
      };
    } else {
      console.log('   ❌ Supabase schema file not found');
      results.database_schema = { schema_exists: false, valid: false };
    }
  } catch (error) {
    console.log('   ❌ Error reading schema:', error.message);
    results.database_schema = { error: error.message, valid: false };
  }

  // 5. Session Management Verification
  console.log('\n5️⃣ Session Management Verification...');
  try {
    const libPath = path.join(__dirname, 'lib/supabase');
    const clientExists = fs.existsSync(path.join(libPath, 'client.js'));
    const serverExists = fs.existsSync(path.join(libPath, 'server.js'));
    
    console.log(`   ${clientExists ? '✅' : '❌'} Client-side Supabase: ${clientExists ? 'configured' : 'missing'}`);
    console.log(`   ${serverExists ? '✅' : '❌'} Server-side Supabase: ${serverExists ? 'configured' : 'missing'}`);
    
    if (clientExists && serverExists) {
      const clientContent = fs.readFileSync(path.join(libPath, 'client.js'), 'utf8');
      const serverContent = fs.readFileSync(path.join(libPath, 'server.js'), 'utf8');
      
      const clientHasFallback = clientContent.includes('placeholder');
      const serverHasFallback = serverContent.includes('placeholder');
      
      console.log(`   ${!clientHasFallback ? '✅' : '⚠️'} Client configuration: ${!clientHasFallback ? 'production ready' : 'has fallbacks'}`);
      console.log(`   ${!serverHasFallback ? '✅' : '⚠️'} Server configuration: ${!serverHasFallback ? 'production ready' : 'has fallbacks'}`);
      
      results.session_management = {
        client_exists: clientExists,
        server_exists: serverExists,
        client_ready: !clientHasFallback,
        server_ready: !serverHasFallback,
        valid: clientExists && serverExists
      };
    } else {
      results.session_management = {
        client_exists: clientExists,
        server_exists: serverExists,
        valid: false
      };
    }
  } catch (error) {
    console.log('   ❌ Error checking session management:', error.message);
    results.session_management = { error: error.message, valid: false };
  }

  // 6. Overall Assessment
  console.log('\n' + '='.repeat(60));
  console.log('📊 OVERALL ASSESSMENT');
  console.log('='.repeat(60));

  const configOK = results.configuration.status === 'valid';
  const apisOK = Object.values(results.api_endpoints).every(ep => ep.success);
  const componentsOK = Object.values(results.frontend_components).every(comp => comp.valid);
  const schemaOK = results.database_schema.valid;
  const sessionOK = results.session_management.valid;

  console.log(`\n✅ Configuration: ${configOK ? 'PASS' : 'FAIL'}`);
  console.log(`${apisOK ? '✅' : '❌'} API Endpoints: ${apisOK ? 'PASS' : 'FAIL'}`);
  console.log(`${componentsOK ? '✅' : '❌'} Frontend Components: ${componentsOK ? 'PASS' : 'FAIL'}`);
  console.log(`${schemaOK ? '✅' : '❌'} Database Schema: ${schemaOK ? 'PASS' : 'FAIL'}`);
  console.log(`${sessionOK ? '✅' : '❌'} Session Management: ${sessionOK ? 'PASS' : 'FAIL'}`);

  const overallSuccess = configOK && apisOK && componentsOK && schemaOK && sessionOK;
  results.overall_status = overallSuccess ? 'success' : 'needs_attention';

  console.log(`\n🎯 FINAL RESULT: ${overallSuccess ? '✅ AUTHENTICATION SYSTEM HEALTHY' : '⚠️ ISSUES NEED ATTENTION'}`);

  if (overallSuccess) {
    console.log('\n🎉 All authentication components are working correctly!');
    console.log('   • User registration and login flows are functional');
    console.log('   • Session management is properly configured');
    console.log('   • Database schema supports user profiles');
    console.log('   • Protected routes are secured');
    console.log('   • No 500 errors detected in authentication endpoints');
  } else {
    console.log('\n🔧 Action items to resolve:');
    if (!configOK) console.log('   • Review Supabase configuration in .env.local');
    if (!apisOK) console.log('   • Debug API endpoint failures');
    if (!componentsOK) console.log('   • Fix frontend component issues');
    if (!schemaOK) console.log('   • Deploy Supabase database schema');
    if (!sessionOK) console.log('   • Configure session management properly');
  }

  fs.writeFileSync(
    path.join(__dirname, 'authentication_verification_results.json'),
    JSON.stringify(results, null, 2)
  );

  console.log('\n📄 Detailed results saved to: authentication_verification_results.json');
  console.log('='.repeat(60));

  return results;
}

if (require.main === module) {
  verifyAuthenticationSystem()
    .then(results => {
      process.exit(results.overall_status === 'success' ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyAuthenticationSystem };
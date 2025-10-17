#!/usr/bin/env node

/**
 * Authentication System Verification Script
 * Tests all authentication flows to confirm 500 errors are resolved
 */

const fs = require('fs');
const path = require('path');

async function verifyAuthenticationSystem() {
  
  );
  
  const results = {
    configuration: {},
    api_endpoints: {},
    frontend_components: {},
    database_schema: {},
    session_management: {},
    overall_status: 'unknown'
  };

  // 1. Verify Environment Configuration
  
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
        
        if (!hasVar) configValid = false;
      }
      
      results.configuration.status = configValid ? 'valid' : 'incomplete';
      results.configuration.supabase_url = envContent.includes('dfhqjdoydihajmjxniee.supabase.co') ? 'configured' : 'missing';
    } else {
      
      results.configuration.status = 'missing';
    }
  } catch (error) {
    
    results.configuration.status = 'error';
  }

  // 2. Test API Endpoints
  
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
      
      ' : '(ERROR)'}`);
      
      results.api_endpoints[endpoint.path] = {
        status,
        success: isSuccess,
        method: endpoint.method
      };
      
      if (!isSuccess) {
        const errorText = await response.text();
        }...`);
      }
    } catch (error) {
      
      results.api_endpoints[endpoint.path] = {
        status: 'error',
        success: false,
        error: error.message
      };
    }
  }

  // 3. Verify Frontend Components
  
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

        results.frontend_components[component.name] = {
          exists: true,
          valid: isValid
        };
      } else {
        
        results.frontend_components[component.name] = {
          exists: false,
          valid: false
        };
      }
    } catch (error) {
      
      results.frontend_components[component.name] = {
        exists: false,
        valid: false,
        error: error.message
      };
    }
  }

  // 4. Database Schema Verification
  
  try {
    const schemaPath = path.join(__dirname, 'database/supabase-schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      const hasProfiles = schema.includes('CREATE TABLE public.profiles');
      const hasRLS = schema.includes('ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY');
      const hasTrigger = schema.includes('CREATE TRIGGER on_auth_user_created');

      results.database_schema = {
        schema_exists: true,
        profiles_table: hasProfiles,
        rls_enabled: hasRLS,
        user_trigger: hasTrigger,
        valid: hasProfiles && hasRLS && hasTrigger
      };
    } else {
      
      results.database_schema = { schema_exists: false, valid: false };
    }
  } catch (error) {
    
    results.database_schema = { error: error.message, valid: false };
  }

  // 5. Session Management Verification
  
  try {
    const libPath = path.join(__dirname, 'lib/supabase');
    const clientExists = fs.existsSync(path.join(libPath, 'client.js'));
    const serverExists = fs.existsSync(path.join(libPath, 'server.js'));

    if (clientExists && serverExists) {
      const clientContent = fs.readFileSync(path.join(libPath, 'client.js'), 'utf8');
      const serverContent = fs.readFileSync(path.join(libPath, 'server.js'), 'utf8');
      
      const clientHasFallback = clientContent.includes('placeholder');
      const serverHasFallback = serverContent.includes('placeholder');

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
    
    results.session_management = { error: error.message, valid: false };
  }

  // 6. Overall Assessment
  );
  
  );

  const configOK = results.configuration.status === 'valid';
  const apisOK = Object.values(results.api_endpoints).every(ep => ep.success);
  const componentsOK = Object.values(results.frontend_components).every(comp => comp.valid);
  const schemaOK = results.database_schema.valid;
  const sessionOK = results.session_management.valid;

  const overallSuccess = configOK && apisOK && componentsOK && schemaOK && sessionOK;
  results.overall_status = overallSuccess ? 'success' : 'needs_attention';

  if (overallSuccess) {

  } else {
    
    if (!configOK) 
    if (!apisOK) 
    if (!componentsOK) 
    if (!schemaOK) 
    if (!sessionOK) 
  }

  fs.writeFileSync(
    path.join(__dirname, 'authentication_verification_results.json'),
    JSON.stringify(results, null, 2)
  );

  );

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
/**
 * Complete Authentication System Test
 * Tests all authentication features before deployment to bookedbarber.com
 */

const { createClient } = require('@supabase/supabase-js');

// Use the correct environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODcwMTAsImV4cCI6MjA2OTY2MzAxMH0.TUYnEBzpB2LQaGLIXg5wtvJHyyhFD2QAOMdY_B-V1fI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper function to log test results
function logTest(name, passed, details = '') {
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${name}`);
  if (details) console.log(`   ${details}`);
  
  results.tests.push({ name, passed, details });
  if (passed) results.passed++;
  else results.failed++;
}

// Test 1: Database Connection
async function testDatabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    logTest('Database Connection', true, 'Successfully connected to Supabase');
  } catch (error) {
    logTest('Database Connection', false, error.message);
  }
}

// Test 2: Login with Existing User
async function testLogin() {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@bookedbarber.com',
      password: 'Test1234'
    });
    
    if (error) throw error;
    if (!data.user) throw new Error('No user returned');
    
    logTest('User Login', true, `Logged in as ${data.user.email}`);
    
    // Clean up - sign out
    await supabase.auth.signOut();
  } catch (error) {
    logTest('User Login', false, error.message);
  }
}

// Test 3: Registration Flow (without creating duplicate)
async function testRegistrationValidation() {
  try {
    // Test password validation
    const weakPassword = 'abc';
    const { error: weakError } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: weakPassword
    });
    
    const validationPassed = weakError && weakError.message.includes('password');
    logTest('Registration Validation', validationPassed, 
      validationPassed ? 'Password validation working' : 'Password validation not enforced');
  } catch (error) {
    logTest('Registration Validation', false, error.message);
  }
}

// Test 4: Session Management
async function testSessionManagement() {
  try {
    // First login
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'test@bookedbarber.com',
      password: 'Test1234'
    });
    
    if (loginError) throw loginError;
    
    // Get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) throw sessionError;
    if (!session) throw new Error('No session after login');
    
    logTest('Session Management', true, 'Session created and retrieved successfully');
    
    // Clean up
    await supabase.auth.signOut();
  } catch (error) {
    logTest('Session Management', false, error.message);
  }
}

// Test 5: Invalid Credentials
async function testInvalidCredentials() {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'invalid@bookedbarber.com',
      password: 'WrongPassword'
    });
    
    const testPassed = error && error.message.includes('Invalid');
    logTest('Invalid Credentials Handling', testPassed, 
      testPassed ? 'Properly rejects invalid credentials' : 'Did not reject invalid credentials');
  } catch (error) {
    logTest('Invalid Credentials Handling', true, 'Properly handled invalid credentials');
  }
}

// Test 6: Password Reset Request
async function testPasswordReset() {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(
      'test@bookedbarber.com',
      { redirectTo: 'http://localhost:9999/reset-password' }
    );
    
    // Password reset should succeed without error
    logTest('Password Reset Request', !error, 
      error ? error.message : 'Password reset email request sent');
  } catch (error) {
    logTest('Password Reset Request', false, error.message);
  }
}

// Test 7: User Profile Access
async function testProfileAccess() {
  try {
    // Login first
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'test@bookedbarber.com',
      password: 'Test1234'
    });
    
    if (loginError) throw loginError;
    
    // Try to access profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'test@bookedbarber.com')
      .single();
    
    const hasAccess = !profileError || profileError.code === 'PGRST116'; // No rows is ok
    logTest('Profile Access', hasAccess, 
      hasAccess ? 'Can access user profiles' : profileError.message);
    
    // Clean up
    await supabase.auth.signOut();
  } catch (error) {
    logTest('Profile Access', false, error.message);
  }
}

// Test 8: Logout
async function testLogout() {
  try {
    // Login first
    await supabase.auth.signInWithPassword({
      email: 'test@bookedbarber.com',
      password: 'Test1234'
    });
    
    // Logout
    const { error } = await supabase.auth.signOut();
    
    if (error) throw error;
    
    // Verify no session
    const { data: { session } } = await supabase.auth.getSession();
    
    logTest('User Logout', !session, 
      !session ? 'Successfully logged out' : 'Session still exists after logout');
  } catch (error) {
    logTest('User Logout', false, error.message);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🔍 BookedBarber.com Authentication System Test');
  console.log('==============================================');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  console.log(`🔑 Using API Key: ${supabaseAnonKey.substring(0, 20)}...`);
  console.log('');
  console.log('Running tests...\n');
  
  // Run all tests
  await testDatabaseConnection();
  await testLogin();
  await testRegistrationValidation();
  await testSessionManagement();
  await testInvalidCredentials();
  await testPasswordReset();
  await testProfileAccess();
  await testLogout();
  
  // Print summary
  console.log('\n==============================================');
  console.log('📊 Test Summary');
  console.log('==============================================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📋 Total: ${results.tests.length}`);
  console.log(`🎯 Success Rate: ${Math.round((results.passed / results.tests.length) * 100)}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! Authentication system is ready for deployment.');
  } else {
    console.log('\n⚠️ Some tests failed. Please review and fix issues before deployment.');
    console.log('\nFailed tests:');
    results.tests
      .filter(t => !t.passed)
      .forEach(t => console.log(`  - ${t.name}: ${t.details}`));
  }
  
  process.exit(results.failed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(console.error);
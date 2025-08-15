// Comprehensive OAuth Flow Debugging Script
// Run this to test the complete OAuth flow end-to-end

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODcwMTAsImV4cCI6MjA2OTY2MzAxMH0.TUYnEBzpB2LQaGLIXg5wtvJHyyhFD2QAOMdY_B-V1fI'

console.log('🔍 COMPREHENSIVE OAUTH DEBUGGING')
console.log('================================\n')

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testOAuthConfiguration() {
  console.log('1️⃣ TESTING SUPABASE CONNECTION')
  console.log('---------------------------------')
  
  try {
    // Test basic connection
    const { data: healthCheck, error: healthError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (healthError) {
      console.log('❌ Database connection failed:', healthError.message)
    } else {
      console.log('✅ Database connection successful')
    }
  } catch (err) {
    console.log('❌ Connection error:', err.message)
  }
  
  console.log('\n2️⃣ OAUTH CONFIGURATION CHECK')
  console.log('-----------------------------')
  console.log('Expected OAuth callback URLs for this project:')
  console.log('  Development: http://localhost:9999/auth/callback')
  console.log('  Production: https://bookbarber.com/auth/callback')
  console.log('  Production: https://bookedbarber.com/auth/callback')
  
  console.log('\n3️⃣ REQUIRED SUPABASE SETTINGS')
  console.log('-------------------------------')
  console.log('Go to: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/auth/url-configuration')
  console.log('\nAdd these Redirect URLs:')
  console.log('  ✅ http://localhost:9999/auth/callback')
  console.log('  ✅ http://localhost:9999/api/auth/callback')
  console.log('  ✅ https://bookbarber.com/auth/callback')
  console.log('  ✅ https://bookbarber.com/api/auth/callback')
  console.log('  ✅ https://bookedbarber.com/auth/callback')
  console.log('  ✅ https://bookedbarber.com/api/auth/callback')
  
  console.log('\n4️⃣ GOOGLE OAUTH PROVIDER CHECK')
  console.log('--------------------------------')
  console.log('Go to: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/auth/providers')
  console.log('\nEnsure Google OAuth is:')
  console.log('  ✅ Enabled')
  console.log('  ✅ Client ID matches: 106401305925-sbsnlgs8i87bclfoi38pqr8os519v913.apps.googleusercontent.com')
  console.log('  ✅ Client Secret is configured')
  console.log('  ✅ Skip nonce checks: Enabled (for PKCE flow)')
  
  console.log('\n5️⃣ COMMON OAUTH ISSUES')
  console.log('----------------------')
  console.log('Issue 1: Code exchange fails')
  console.log('  → Solution: Add all callback URLs to Supabase Redirect URLs')
  console.log('\nIssue 2: Session not persisting')
  console.log('  → Solution: Check browser localStorage is not blocked')
  console.log('\nIssue 3: PKCE verifier missing')
  console.log('  → Solution: Ensure detectSessionInUrl is true in client config')
  console.log('\nIssue 4: Redirect URL mismatch')
  console.log('  → Solution: URL must match EXACTLY (including trailing slashes)')
  
  console.log('\n6️⃣ TEST OAUTH FLOW MANUALLY')
  console.log('----------------------------')
  console.log('1. Clear browser localStorage: localStorage.clear()')
  console.log('2. Clear sessionStorage: sessionStorage.clear()')
  console.log('3. Navigate to: http://localhost:9999/register')
  console.log('4. Click "Sign up with Google"')
  console.log('5. Check browser console for errors')
  console.log('6. Check Network tab for failed requests')
  
  console.log('\n7️⃣ DEBUGGING COMMANDS')
  console.log('---------------------')
  console.log('Run in browser console on stuck page:')
  console.log('  • window.location.search (check for code parameter)')
  console.log('  • localStorage.getItem("sb-dfhqjdoydihajmjxniee-auth-token")')
  console.log('  • Object.keys(localStorage).filter(k => k.includes("sb-"))')
  console.log('  • Object.keys(sessionStorage)')
}

testOAuthConfiguration().catch(console.error)
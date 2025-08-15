// Comprehensive OAuth Flow Analysis
// Run this to understand exactly what's happening

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODcwMTAsImV4cCI6MjA2OTY2MzAxMH0.TUYnEBzpB2LQaGLIXg5wtvJHyyhFD2QAOMdY_B-V1fI'

console.log('🔍 COMPREHENSIVE OAUTH ANALYSIS')
console.log('================================\n')

async function analyzeOAuthIssue() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  
  console.log('1️⃣ CHECKING SUPABASE CONNECTION')
  console.log('---------------------------------')
  
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (error) {
      console.log('❌ Database connection failed:', error.message)
    } else {
      console.log('✅ Database connection successful')
    }
  } catch (err) {
    console.log('❌ Connection error:', err.message)
  }
  
  console.log('\n2️⃣ ANALYZING OAUTH CALLBACK FLOW')
  console.log('----------------------------------')
  console.log('When OAuth callback gets stuck, it means:')
  console.log('')
  console.log('WORKING PARTS:')
  console.log('✅ OAuth initiation - Redirects to Google')
  console.log('✅ Google authentication - User signs in')
  console.log('✅ Callback URL - Returns to /auth/callback with code')
  console.log('✅ PKCE verifier - Stored in localStorage')
  console.log('')
  console.log('FAILING PART:')
  console.log('❌ Code exchange - The code-for-session exchange fails')
  console.log('   OR')
  console.log('❌ Redirect logic - The post-auth redirect isn\'t happening')
  
  console.log('\n3️⃣ COMMON CAUSES OF STUCK CALLBACK')
  console.log('------------------------------------')
  console.log('1. JavaScript Error in callback page')
  console.log('   → Check browser console for red errors')
  console.log('')
  console.log('2. Router navigation failing')
  console.log('   → Next.js router.push() not working')
  console.log('   → Could be due to middleware interference')
  console.log('')
  console.log('3. Infinite loop in useEffect')
  console.log('   → Check if hasStarted guard is working')
  console.log('')
  console.log('4. Profile creation/fetch failing')
  console.log('   → Database operation blocking redirect')
  
  console.log('\n4️⃣ DEBUG STEPS TO RUN IN BROWSER')
  console.log('----------------------------------')
  console.log('1. Open Chrome DevTools (F12)')
  console.log('2. Go to Network tab')
  console.log('3. Clear browser storage:')
  console.log('   localStorage.clear(); sessionStorage.clear();')
  console.log('4. Navigate to: http://localhost:9999/register')
  console.log('5. Click "Sign up with Google"')
  console.log('6. Complete authentication')
  console.log('7. When stuck on callback, check:')
  console.log('   - Console tab for errors')
  console.log('   - Network tab for failed requests')
  console.log('   - Application tab > Local Storage for session data')
  
  console.log('\n5️⃣ CHECKING CURRENT SESSION')
  console.log('-----------------------------')
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.log('❌ Session check error:', error.message)
    } else if (session) {
      console.log('✅ Active session found!')
      console.log('   User:', session.user.email)
      console.log('   Provider:', session.user.app_metadata?.provider)
    } else {
      console.log('ℹ️ No active session')
    }
  } catch (err) {
    console.log('❌ Session check failed:', err.message)
  }
  
  console.log('\n6️⃣ TESTING PROFILE OPERATIONS')
  console.log('-------------------------------')
  
  // Test if we can query profiles
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, subscription_status, onboarding_completed')
      .limit(1)
    
    if (error) {
      console.log('❌ Profile query failed:', error.message)
    } else {
      console.log('✅ Profile query works')
      if (profiles && profiles.length > 0) {
        console.log('   Sample profile:', {
          hasSubscription: profiles[0].subscription_status === 'active',
          needsOnboarding: !profiles[0].onboarding_completed
        })
      }
    }
  } catch (err) {
    console.log('❌ Profile operation error:', err.message)
  }
  
  console.log('\n7️⃣ MANUAL TESTING INSTRUCTIONS')
  console.log('--------------------------------')
  console.log('1. Open a REGULAR browser (not Puppeteer)')
  console.log('2. Open Developer Console (F12)')
  console.log('3. Run this in console:')
  console.log('   localStorage.clear(); sessionStorage.clear();')
  console.log('4. Go to: http://localhost:9999/register')
  console.log('5. Watch console AS you click "Sign up with Google"')
  console.log('6. Look for these specific logs:')
  console.log('   - "🔑 PKCE verifier check:"')
  console.log('   - "✅ Session auto-detected!" or "🔐 No auto-detection"')
  console.log('   - "🎯 Determining redirect based on profile:"')
  console.log('   - Any red error messages')
  console.log('')
  console.log('7. If stuck, run this in console:')
  console.log('   window.location.pathname // Should be /auth/callback')
  console.log('   window.location.search   // Should have ?code=...')
}

analyzeOAuthIssue().catch(console.error)
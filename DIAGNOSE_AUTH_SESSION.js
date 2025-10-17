/**
 * Comprehensive Authentication & Session Diagnostic Tool
 * 
 * Use this in the browser console to debug authentication issues
 * after OAuth login attempts.
 */

// Run this in browser console to diagnose session issues
async function diagnoseAuthSession() {
  console.log('🔍 === AUTHENTICATION SESSION DIAGNOSTIC ===')
  
  const results = {
    timestamp: new Date().toISOString(),
    cookies: {},
    localStorage: {},
    sessionStorage: {},
    supabaseClient: null,
    serverTest: null,
    recommendations: []
  }
  
  // 1. Check cookies
  console.log('🍪 1. Checking cookies...')
  try {
    const allCookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      return { ...acc, [key]: value }
    }, {})
    
    results.cookies = {
      total: Object.keys(allCookies).length,
      supabaseRelated: Object.keys(allCookies).filter(k => 
        k.includes('sb-') || k.includes('supabase')
      ),
      authTokens: Object.keys(allCookies).filter(k => 
        k.includes('auth') || k.includes('token')
      ),
      allCookies: allCookies
    }
    
    console.log('✅ Cookies analyzed:', results.cookies)
  } catch (error) {
    console.error('❌ Cookie analysis failed:', error)
    results.cookies.error = error.message
  }
  
  // 2. Check localStorage
  console.log('💾 2. Checking localStorage...')
  try {
    const lsKeys = Object.keys(localStorage)
    results.localStorage = {
      total: lsKeys.length,
      supabaseKeys: lsKeys.filter(k => k.includes('supabase')),
      authKeys: lsKeys.filter(k => k.includes('auth')),
      allKeys: lsKeys
    }
    
    console.log('✅ LocalStorage analyzed:', results.localStorage)
  } catch (error) {
    console.error('❌ LocalStorage analysis failed:', error)
    results.localStorage.error = error.message
  }
  
  // 3. Check sessionStorage  
  console.log('📝 3. Checking sessionStorage...')
  try {
    const ssKeys = Object.keys(sessionStorage)
    results.sessionStorage = {
      total: ssKeys.length,
      oauthInProgress: sessionStorage.getItem('oauth-in-progress'),
      allKeys: ssKeys
    }
    
    console.log('✅ SessionStorage analyzed:', results.sessionStorage)
  } catch (error) {
    console.error('❌ SessionStorage analysis failed:', error)
    results.sessionStorage.error = error.message
  }
  
  // 4. Test Supabase client
  console.log('🔧 4. Testing Supabase client...')
  try {
    // Try to create client (assumes Supabase is available globally)
    if (typeof window !== 'undefined' && window.supabase) {
      const supabase = window.supabase
      
      const { data: { session }, error } = await supabase.auth.getSession()
      
      results.supabaseClient = {
        available: true,
        hasSession: !!session,
        sessionError: error?.message || 'none',
        user: session?.user ? {
          id: session.user.id,
          email: session.user.email,
          provider: session.user.app_metadata?.provider
        } : null,
        accessToken: session?.access_token ? 'present' : 'missing',
        refreshToken: session?.refresh_token ? 'present' : 'missing',
        expiresAt: session?.expires_at
      }
      
      console.log('✅ Supabase client tested:', results.supabaseClient)
    } else {
      results.supabaseClient = { available: false, error: 'Supabase not found on window' }
      console.warn('⚠️ Supabase client not available on window')
    }
  } catch (error) {
    console.error('❌ Supabase client test failed:', error)
    results.supabaseClient = { available: false, error: error.message }
  }
  
  // 5. Test server-side session
  console.log('🌐 5. Testing server-side session...')
  try {
    const response = await fetch('/api/staff', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    
    results.serverTest = {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    }
    
    if (response.status === 401) {
      const body = await response.text()
      results.serverTest.body = body
      console.warn('⚠️ Server returned 401 Unauthorized:', body)
    } else if (response.ok) {
      console.log('✅ Server-side session working')
    } else {
      console.warn('⚠️ Unexpected server response:', response.status)
    }
    
  } catch (error) {
    console.error('❌ Server test failed:', error)
    results.serverTest = { error: error.message }
  }
  
  // 6. Generate recommendations
  console.log('💡 6. Generating recommendations...')
  
  // No cookies
  if (results.cookies.supabaseRelated?.length === 0) {
    results.recommendations.push('❌ No Supabase cookies found - session not established')
  }
  
  // No session but has cookies
  if (results.cookies.supabaseRelated?.length > 0 && !results.supabaseClient?.hasSession) {
    results.recommendations.push('⚠️ Cookies present but no client session - try refreshing session')
  }
  
  // Client session but server fails
  if (results.supabaseClient?.hasSession && results.serverTest?.status === 401) {
    results.recommendations.push('🔄 Client has session but server rejects - try session refresh')
  }
  
  // OAuth in progress
  if (results.sessionStorage?.oauthInProgress) {
    results.recommendations.push('🎯 OAuth still in progress - complete the flow')
  }
  
  // No session at all
  if (!results.supabaseClient?.hasSession && results.serverTest?.status === 401) {
    results.recommendations.push('🚫 No authentication found - please log in again')
  }
  
  console.log('📋 Recommendations:', results.recommendations)
  
  // 7. Suggested actions
  console.log('🔨 === SUGGESTED ACTIONS ===')
  
  if (results.recommendations.length === 0) {
    console.log('✅ Everything looks good! No issues detected.')
  } else {
    console.log('🔧 Try these fixes in order:')
    
    if (results.recommendations.some(r => r.includes('session refresh'))) {
      console.log('1. 🔄 Refresh session:')
      console.log('   supabase.auth.refreshSession().then(r => console.log("Refresh result:", r))')
    }
    
    if (results.recommendations.some(r => r.includes('log in again'))) {
      console.log('2. 🚪 Re-authenticate:')
      console.log('   window.location.href = "/login"')
    }
    
    console.log('3. 🔄 Force reload:')
    console.log('   window.location.reload()')
    
    console.log('4. 🧹 Clear storage and retry:')
    console.log('   localStorage.clear(); sessionStorage.clear(); window.location.href = "/login"')
  }
  
  console.log('🔍 === END DIAGNOSTIC ===')
  console.log('📊 Full results object:', results)
  
  return results
}

// Auto-run diagnostic
console.log('🚀 Starting authentication diagnostic...')
console.log('📋 Copy and paste this in browser console on the problematic page:')
console.log('diagnoseAuthSession()')

// Make function available globally for manual use
window.diagnoseAuthSession = diagnoseAuthSession
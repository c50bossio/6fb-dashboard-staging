import { NextResponse } from 'next/server'

export async function GET() {
  // Use hardcoded values to ensure they're correct
  const supabaseUrl = 'https://dfhqjdoydihajmjxniee.supabase.co'
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUyMTI1MzIsImV4cCI6MjA1MDc4ODUzMn0.qOJBWy5BEu6LYo0n2CYjgvYOJHPYC7K5KnL7y2O6Uws'
  
  const tests = []
  
  // Test 1: Basic connection
  try {
    const healthResponse = await fetch(`${supabaseUrl}/auth/v1/health`)
    tests.push({
      test: 'Auth Health',
      status: healthResponse.status,
      ok: healthResponse.ok,
      result: healthResponse.ok ? '✅ PASS' : '❌ FAIL'
    })
  } catch (error) {
    tests.push({
      test: 'Auth Health',
      error: error.message,
      result: '❌ FAIL'
    })
  }
  
  // Test 2: Google OAuth URL
  const googleOAuthUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent('https://bookedbarber.com/login-clean')}`
  tests.push({
    test: 'Google OAuth URL',
    url: googleOAuthUrl,
    result: '✅ GENERATED'
  })
  
  // Test 3: Can we initiate OAuth?
  try {
    const oauthResponse = await fetch(googleOAuthUrl, {
      method: 'GET',
      redirect: 'manual'
    })
    
    tests.push({
      test: 'OAuth Initiation',
      status: oauthResponse.status,
      location: oauthResponse.headers.get('location')?.substring(0, 50) + '...',
      result: oauthResponse.status === 302 ? '✅ PASS' : '❌ FAIL'
    })
  } catch (error) {
    tests.push({
      test: 'OAuth Initiation',
      error: error.message,
      result: '❌ FAIL'
    })
  }
  
  return NextResponse.json({
    supabase_config: {
      url: supabaseUrl,
      project_ref: 'dfhqjdoydihajmjxniee',
      anon_key: supabaseAnonKey.substring(0, 20) + '...'
    },
    tests,
    summary: {
      all_passed: tests.every(t => t.result.includes('✅')),
      recommendation: tests.every(t => t.result.includes('✅')) 
        ? 'Everything looks good! Try the login at /login-clean'
        : 'Some tests failed. Check Supabase configuration.'
    },
    login_page: 'https://bookedbarber.com/login-clean'
  })
}
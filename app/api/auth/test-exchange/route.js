import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  
  if (!code) {
    return NextResponse.json({ 
      error: 'No code provided. Add ?code=YOUR_CODE to test' 
    }, { status: 400 })
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log('Test exchange starting...')
  console.log('Code:', code.substring(0, 10) + '...')
  console.log('Supabase URL:', supabaseUrl)
  
  // Test 1: Direct token exchange without any SDK
  const tokenUrl = `${supabaseUrl}/auth/v1/token`
  
  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code
      })
    })
    
    const data = await response.json()
    
    return NextResponse.json({
      test: 'Token Exchange Test',
      request: {
        url: tokenUrl,
        code: code.substring(0, 10) + '...',
        grant_type: 'authorization_code'
      },
      response: {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      },
      result: {
        hasAccessToken: !!data.access_token,
        hasRefreshToken: !!data.refresh_token,
        hasUser: !!data.user,
        error: data.error,
        errorDescription: data.error_description,
        raw: data
      },
      diagnosis: getDiagnosis(response.status, data)
    })
  } catch (error) {
    return NextResponse.json({
      test: 'Token Exchange Test',
      error: 'Network or server error',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

function getDiagnosis(status, data) {
  if (status === 200 && data.access_token) {
    return '✅ Exchange successful - OAuth is working correctly'
  }
  
  if (status === 400) {
    if (data.error === 'invalid_grant') {
      return '❌ Invalid or expired authorization code - code may have already been used'
    }
    if (data.error === 'invalid_request') {
      if (data.error_description?.includes('code_verifier')) {
        return '❌ PKCE code_verifier required but not provided'
      }
      return '❌ Invalid request - missing required parameters'
    }
  }
  
  if (status === 401) {
    return '❌ Authentication failed - check Supabase API key'
  }
  
  if (status === 404) {
    return '❌ Endpoint not found - check Supabase URL'
  }
  
  if (status === 500) {
    return '❌ Supabase server error'
  }
  
  return `❓ Unexpected response: ${status} - ${data.error || 'Unknown error'}`
}
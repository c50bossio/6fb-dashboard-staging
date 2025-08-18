import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { code } = await request.json()
    
    if (!code) {
      return NextResponse.json({ error: 'No code provided' }, { status: 400 })
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ 
        error: 'Supabase not configured',
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey
      }, { status: 500 })
    }
    
    // Make direct HTTP request to Supabase Auth API
    const tokenUrl = `${supabaseUrl}/auth/v1/token?grant_type=authorization_code`
    
    console.log('Making direct token exchange request to:', tokenUrl)
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        code,
        grant_type: 'authorization_code'
      })
    })
    
    const data = await response.json()
    
    console.log('Token exchange response:', {
      status: response.status,
      ok: response.ok,
      hasAccessToken: !!data.access_token,
      hasUser: !!data.user,
      error: data.error
    })
    
    if (!response.ok) {
      return NextResponse.json({
        error: 'Token exchange failed',
        status: response.status,
        details: data
      }, { status: response.status })
    }
    
    if (data.access_token && data.user) {
      // Set cookies for session
      const cookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      }
      
      const response = NextResponse.json({
        success: true,
        user: data.user,
        session: {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_in: data.expires_in,
          user: data.user
        }
      })
      
      // Set auth cookies
      response.cookies.set('sb-access-token', data.access_token, cookieOptions)
      response.cookies.set('sb-refresh-token', data.refresh_token, cookieOptions)
      
      return response
    }
    
    return NextResponse.json({
      error: 'No session created',
      data
    }, { status: 400 })
    
  } catch (error) {
    console.error('Direct token exchange error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

// Test endpoint to check if Supabase is reachable
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ 
      error: 'Supabase not configured',
      env: {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey
      }
    }, { status: 500 })
  }
  
  try {
    // Test 1: Check if Supabase URL is reachable
    const healthUrl = `${supabaseUrl}/auth/v1/health`
    const healthResponse = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey
      }
    })
    
    const healthData = await healthResponse.text()
    
    // Test 2: Check auth settings
    const settingsUrl = `${supabaseUrl}/auth/v1/settings`
    const settingsResponse = await fetch(settingsUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey
      }
    })
    
    const settingsData = await settingsResponse.json()
    
    return NextResponse.json({
      status: 'Supabase connection test',
      supabaseUrl: supabaseUrl.replace(/https:\/\/([^.]+)\..*/, 'https://$1.[hidden]'),
      health: {
        url: healthUrl,
        status: healthResponse.status,
        ok: healthResponse.ok,
        data: healthData
      },
      settings: {
        url: settingsUrl,
        status: settingsResponse.status,
        ok: settingsResponse.ok,
        data: settingsData
      },
      recommendation: 'If health check fails, check Supabase project status and environment variables'
    })
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to reach Supabase',
      message: error.message,
      supabaseUrl,
      recommendation: 'Check if Supabase project is active and URLs are correct'
    }, { status: 500 })
  }
}
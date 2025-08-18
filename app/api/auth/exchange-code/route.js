import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { code } = await request.json()
    
    if (!code) {
      return NextResponse.json({ error: 'No code provided' }, { status: 400 })
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    // Exchange code for session using Supabase Auth API directly
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=authorization_code`, {
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
    
    if (response.ok && data.access_token) {
      // Set cookies for the session
      const res = NextResponse.json({
        success: true,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user: data.user
      })
      
      // Set secure HTTP-only cookies
      res.cookies.set('sb-access-token', data.access_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      })
      
      if (data.refresh_token) {
        res.cookies.set('sb-refresh-token', data.refresh_token, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30, // 30 days
          path: '/'
        })
      }
      
      return res
    }
    
    return NextResponse.json({
      error: 'Token exchange failed',
      details: data
    }, { status: 400 })
    
  } catch (error) {
    console.error('Exchange code error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 })
  }
}
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'

export async function POST(request) {
  try {
    const { code } = await request.json()
    
    if (!code) {
      return NextResponse.json({ error: 'No code provided' }, { status: 400 })
    }
    
    console.log('Exchange code v2: Starting exchange for code:', code.substring(0, 10) + '...')
    
    // Try using the server-side Supabase client
    try {
      const supabase = createClient()
      
      // Use the server client to exchange the code
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Supabase exchange error:', error)
        // Fall through to manual exchange
      } else if (data?.session) {
        console.log('Exchange successful via Supabase client')
        
        const res = NextResponse.json({
          success: true,
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          user: data.session.user
        })
        
        // Set cookies
        res.cookies.set('sb-access-token', data.session.access_token, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/'
        })
        
        if (data.session.refresh_token) {
          res.cookies.set('sb-refresh-token', data.session.refresh_token, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30,
            path: '/'
          })
        }
        
        return res
      }
    } catch (supabaseError) {
      console.error('Supabase client error, trying manual exchange:', supabaseError.message)
    }
    
    // Manual exchange as fallback
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    console.log('Attempting manual token exchange...')
    
    // Try without code_verifier first (for non-PKCE flow)
    const tokenUrl = `${supabaseUrl}/auth/v1/token`
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        // redirect_uri might be needed
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'https://bookedbarber.com'}/auth/callback-fixed`
      })
    })
    
    const data = await response.json()
    
    console.log('Manual exchange response:', {
      status: response.status,
      ok: response.ok,
      hasAccessToken: !!data.access_token,
      hasError: !!data.error,
      error: data.error,
      errorDescription: data.error_description
    })
    
    if (response.ok && data.access_token) {
      const res = NextResponse.json({
        success: true,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user: data.user
      })
      
      res.cookies.set('sb-access-token', data.access_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/'
      })
      
      if (data.refresh_token) {
        res.cookies.set('sb-refresh-token', data.refresh_token, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30,
          path: '/'
        })
      }
      
      return res
    }
    
    // If PKCE is required, the error will indicate it
    if (data.error === 'invalid_request' && data.error_description?.includes('code_verifier')) {
      return NextResponse.json({
        error: 'PKCE verification required',
        details: 'OAuth flow requires PKCE code_verifier which was not stored',
        raw: data
      }, { status: 400 })
    }
    
    return NextResponse.json({
      error: 'Token exchange failed',
      details: data,
      status: response.status
    }, { status: 400 })
    
  } catch (error) {
    console.error('Exchange code v2 error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
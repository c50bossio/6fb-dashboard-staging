import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  console.log('OAuth callback received:', {
    origin,
    code: code ? `${code.substring(0, 10)}...` : null,
    hasCode: !!code,
    cookies: request.headers.get('cookie') ? 'present' : 'missing'
  })

  if (code) {
    const supabase = createClient()
    
    // Debug cookie presence for PKCE
    const cookies = request.headers.get('cookie') || ''
    const hasPKCECookie = cookies.includes('sb-') && (cookies.includes('code_verifier') || cookies.includes('pkce'))
    console.log('PKCE cookie check:', { hasPKCECookie, cookieCount: cookies.split(';').length })
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data?.session) {
      console.log('OAuth exchange successful, redirecting to:', `${origin}${next}`)
      // Create response with explicit cookie forwarding
      const response = NextResponse.redirect(`${origin}${next}`)
      
      // Ensure session cookies are properly set
      if (data.session) {
        const accessToken = data.session.access_token
        const refreshToken = data.session.refresh_token
        
        // Set cookies manually to ensure they persist
        response.cookies.set('sb-access-token', accessToken, {
          maxAge: 60 * 60, // 1 hour
          httpOnly: false, // Allow client access
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/'
        })
        
        response.cookies.set('sb-refresh-token', refreshToken, {
          maxAge: 60 * 60 * 24 * 7, // 7 days
          httpOnly: false, // Allow client access  
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/'
        })
      }
      
      return response
    } else {
      console.error('OAuth exchange failed:', {
        error: error?.message,
        errorCode: error?.status,
        errorName: error?.name,
        hasSession: !!data?.session,
        hasPKCECookie,
        possibleCause: !hasPKCECookie ? 'Missing PKCE cookies - check cookie persistence' : 'Unknown'
      })
    }
  } else {
    console.error('No authorization code received in callback')
  }

  // return the user to an error page with instructions
  console.log('Redirecting to error page')
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  
  console.log('🚀 Server-side OAuth callback:', {
    hasCode: !!code,
    hasError: !!error,
    timestamp: new Date().toISOString()
  })

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
    )
  }

  if (code) {
    try {
      const supabase = createClient()
      
      // Exchange the code for a session
      console.log('Exchanging code for session...')
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('Exchange error:', exchangeError)
        
        // Try to get session anyway
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          console.log('Found existing session despite error')
          return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
        }
        
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
        )
      }
      
      if (data?.session) {
        console.log('Session created successfully')
        return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
      }
      
      // No session created
      return NextResponse.redirect(
        new URL('/login?error=no_session', requestUrl.origin)
      )
      
    } catch (error) {
      console.error('Server callback error:', error)
      return NextResponse.redirect(
        new URL('/login?error=server_error', requestUrl.origin)
      )
    }
  }
  
  // No code provided
  return NextResponse.redirect(
    new URL('/login?error=no_code', requestUrl.origin)
  )
}
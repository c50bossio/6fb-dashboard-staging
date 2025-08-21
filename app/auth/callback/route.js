import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  console.log('OAuth callback - URL:', requestUrl.toString())
  console.log('OAuth callback - Code present:', !!code)
  console.log('OAuth callback - Error:', error)

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      new URL(`/auth/auth-code-error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || '')}`, request.url)
    )
  }

  // Handle missing authorization code
  if (!code) {
    console.error('OAuth callback: No authorization code received')
    return NextResponse.redirect(
      new URL('/auth/auth-code-error?error=missing_code&description=No authorization code received', request.url)
    )
  }

  try {
    const supabase = await createClient()
    
    console.log('Attempting to exchange code for session...')
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('Code exchange failed:', exchangeError)
      
      // Specific handling for PKCE-related errors
      if (exchangeError.message?.includes('code verifier') || 
          exchangeError.message?.includes('invalid request')) {
        console.error('PKCE validation failed - check cookie configuration')
      }
      
      return NextResponse.redirect(
        new URL(`/auth/auth-code-error?error=exchange_failed&description=${encodeURIComponent(exchangeError.message)}`, request.url)
      )
    }

    console.log('OAuth exchange successful:', {
      user: data.user?.email,
      session: !!data.session
    })

    // Check for stored return URL from ProtectedRoute
    // This will be set if the user was redirected from a protected page
    const returnUrl = requestUrl.searchParams.get('return_url') || '/dashboard'
    console.log('OAuth callback - Return URL:', returnUrl)

    // Successful authentication - redirect to original page or dashboard
    return NextResponse.redirect(new URL(returnUrl, request.url))

  } catch (error) {
    console.error('OAuth callback exception:', error)
    return NextResponse.redirect(
      new URL(`/auth/auth-code-error?error=callback_exception&description=${encodeURIComponent(error.message)}`, request.url)
    )
  }
}
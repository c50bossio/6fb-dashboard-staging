import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/UNIFIED_CLIENT'
import { authLogger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const error = requestUrl.searchParams.get('error')
  
  // Handle OAuth errors
  if (error) {
    authLogger.error('OAuth callback error', { error }, {
      context: 'oauth_callback',
      provider: 'google',
      error_type: error
    })
    
    const errorUrl = new URL('/login', requestUrl.origin)
    errorUrl.searchParams.set('error', `OAuth error: ${error}`)
    return NextResponse.redirect(errorUrl)
  }
  
  // Handle missing code
  if (!code) {
    authLogger.error('OAuth callback missing code parameter', null, {
      context: 'oauth_callback',
      provider: 'google',
      search_params: Object.fromEntries(requestUrl.searchParams)
    })
    
    const errorUrl = new URL('/login', requestUrl.origin)
    errorUrl.searchParams.set('error', 'Authentication failed - missing authorization code')
    return NextResponse.redirect(errorUrl)
  }

  try {
    const supabase = await createServerSupabaseClient()
    
    // Exchange the code for a session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      authLogger.error('Failed to exchange OAuth code for session', exchangeError, {
        context: 'oauth_code_exchange',
        provider: 'google',
        supabase_error: exchangeError.message
      })
      
      const errorUrl = new URL('/login', requestUrl.origin)
      errorUrl.searchParams.set('error', 'Authentication failed - could not create session')
      return NextResponse.redirect(errorUrl)
    }
    
    if (data.user) {
      authLogger.info('OAuth callback successful', {
        user_id: data.user.id,
        email: data.user.email,
        provider: 'google'
      }, {
        context: 'oauth_callback_success'
      })
      
      // Profile creation will be handled by SupabaseAuthProvider
      
      // Redirect to the intended destination
      const redirectUrl = new URL(next, requestUrl.origin)
      return NextResponse.redirect(redirectUrl)
    }
    
    // Fallback if no user in session
    authLogger.error('OAuth code exchange succeeded but no user found', null, {
      context: 'oauth_callback_no_user',
      provider: 'google'
    })
    
    const errorUrl = new URL('/login', requestUrl.origin)
    errorUrl.searchParams.set('error', 'Authentication succeeded but user not found')
    return NextResponse.redirect(errorUrl)
    
  } catch (error) {
    authLogger.error('Unexpected error in OAuth callback', error, {
      context: 'oauth_callback_exception',
      provider: 'google'
    })
    
    const errorUrl = new URL('/login', requestUrl.origin)
    errorUrl.searchParams.set('error', 'Authentication failed - unexpected error')
    return NextResponse.redirect(errorUrl)
  }
}
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Clean OAuth callback handler for Google authentication
 * Handles both new users and existing subscribers properly
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')
  
  console.log('🔐 OAuth Callback Started:', {
    hasCode: !!code,
    hasError: !!error,
    hasState: !!state,
    origin
  })

  // Handle OAuth provider errors first
  if (error) {
    console.error('❌ OAuth Provider Error:', error)
    return redirectToLogin('oauth_provider_error', origin)
  }

  // No code means invalid callback
  if (!code) {
    console.error('❌ No authorization code received')
    return redirectToLogin('no_auth_code', origin)
  }

  try {
    const supabase = createClient()
    
    // Enhanced PKCE debugging - inspect all available cookies
    console.log('🔄 Exchanging OAuth code for session...')
    console.log('🔍 PKCE Debug - Available cookies:')
    
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll()
    
    // Log all cookies for debugging
    allCookies.forEach(cookie => {
      if (cookie.name.includes('pkce') || cookie.name.includes('code') || cookie.name.includes('verifier') || cookie.name.includes('supabase')) {
        console.log(`  🍪 ${cookie.name}: ${cookie.value ? `${cookie.value.substring(0, 20)}...` : 'empty'}`)
      }
    })
    
    console.log(`📊 Total cookies found: ${allCookies.length}`)
    console.log(`🔐 PKCE-related cookies: ${allCookies.filter(c => c.name.includes('pkce') || c.name.includes('code') || c.name.includes('verifier')).length}`)
    
    const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code)
    
    // Handle authentication failures
    if (authError) {
      console.error('❌ Code Exchange Failed:', {
        message: authError.message,
        code: authError.code,
        status: authError.status
      })
      
      // Special handling for PKCE code verifier issues
      if (authError.message?.includes('code verifier') || authError.code === 'validation_failed') {
        console.log('🔧 PKCE issue detected - attempting direct session recovery...')
        
        // Try alternative auth flow for PKCE failures
        try {
          // Clear any stale auth state
          await supabase.auth.signOut()
          console.log('🧹 Cleared stale auth state, redirecting for fresh OAuth attempt')
          
          const loginUrl = new URL('/login', origin)
          loginUrl.searchParams.set('error', 'oauth_retry_needed')
          loginUrl.searchParams.set('message', 'Please try signing in again')
          return NextResponse.redirect(loginUrl.toString())
        } catch (clearError) {
          console.warn('⚠️ Could not clear auth state:', clearError.message)
        }
      }
      
      return handleAuthError(authError, origin)
    }

    // Ensure we have a valid session
    if (!authData?.session?.user) {
      console.error('❌ No valid session returned from code exchange')
      return redirectToLogin('no_session_data', origin)
    }

    const { session, user } = authData
    console.log('✅ Session Created Successfully:', {
      userEmail: user.email,
      userId: user.id,
      hasAccessToken: !!session.access_token,
      hasRefreshToken: !!session.refresh_token
    })

    // Check user's profile and subscription status
    return await handleAuthententicatedUser(supabase, user, origin)
    
  } catch (error) {
    console.error('💥 Unexpected OAuth Callback Error:', error)
    return redirectToLogin('callback_exception', origin)
  }
}

/**
 * Handle different authentication error types
 */
function handleAuthError(authError, origin) {
  // Code verifier issues (PKCE flow problems)
  if (authError.message.includes('code verifier') || authError.code === 'invalid_request') {
    console.log('🔍 PKCE Code Verifier Issue - User needs to retry OAuth')
    return redirectToLogin('oauth_session_error', origin, true)
  }

  // Expired OAuth flow
  if (authError.code === 'flow_state_expired' || authError.code === 'flow_state_not_found') {
    console.log('⏰ OAuth Flow Expired - User needs fresh OAuth')
    return redirectToLogin('oauth_expired', origin, true)
  }

  // Other authentication failures
  console.log('⚠️ General Authentication Failure')
  return redirectToLogin('auth_failed', origin, true)
}

/**
 * Handle successfully authenticated user - route based on profile status
 */
async function handleAuthententicatedUser(supabase, user, origin) {
  console.log('👤 Looking up user profile for:', user.email)
  
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id, 
        email, 
        role, 
        subscription_status, 
        stripe_customer_id, 
        shop_name, 
        onboarding_completed
      `)
      .eq('email', user.email)
      .single()

    if (profileError) {
      console.log('📝 Profile Query Error (might be new user):', profileError.message)
      return handleNewUser(origin)
    }

    if (!profile) {
      console.log('👤 No profile found - treating as new user')
      return handleNewUser(origin)
    }

    console.log('📋 User Profile Found:', {
      email: profile.email,
      role: profile.role,
      subscriptionStatus: profile.subscription_status,
      hasStripeCustomerId: !!profile.stripe_customer_id,
      onboardingCompleted: profile.onboarding_completed
    })

    return routeExistingUser(profile, origin)

  } catch (error) {
    console.error('💥 Profile Lookup Error:', error)
    return handleNewUser(origin)
  }
}

/**
 * Route existing user based on their subscription and onboarding status
 */
function routeExistingUser(profile, origin) {
  // Active subscription - route based on onboarding status
  if (profile.subscription_status === 'active') {
    if (profile.onboarding_completed) {
      console.log('✅ Active subscriber with completed onboarding → Dashboard')
      return NextResponse.redirect(new URL('/dashboard', origin))
    } else {
      console.log('⚠️ Active subscriber needs onboarding → Welcome page')
      return NextResponse.redirect(new URL('/welcome?from=oauth_success', origin))
    }
  }

  // User has Stripe customer ID but inactive subscription
  if (profile.stripe_customer_id) {
    console.log('💳 Previous subscriber with inactive subscription → Dashboard with notice')
    return NextResponse.redirect(new URL('/dashboard?subscription_status=inactive', origin))
  }

  // User exists but never had a subscription
  console.log('👤 Existing user without subscription history → Welcome flow')
  return NextResponse.redirect(new URL('/welcome?from=oauth_success', origin))
}

/**
 * Handle new user signup flow
 */
function handleNewUser(origin) {
  console.log('🆕 New user signup → Checkout flow')
  const checkoutUrl = new URL('/api/stripe/checkout', origin)
  checkoutUrl.searchParams.set('plan', 'shop')
  checkoutUrl.searchParams.set('billing', 'monthly')
  return NextResponse.redirect(checkoutUrl.toString())
}

/**
 * Consistent login redirect helper
 */
function redirectToLogin(errorType, origin, retry = false) {
  const loginUrl = new URL('/login', origin)
  loginUrl.searchParams.set('error', errorType)
  if (retry) {
    loginUrl.searchParams.set('retry', 'true')
  }
  
  console.log(`🔄 Redirecting to login with error: ${errorType}`)
  return NextResponse.redirect(loginUrl.toString())
}
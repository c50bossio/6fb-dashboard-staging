import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const origin = requestUrl.origin

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || '')}`
    )
  }

  // Handle missing authorization code
  if (!code) {
    console.error('OAuth callback: No authorization code received')
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?error=missing_code&description=No authorization code received`
    )
  }

  if (code) {
    const cookieStore = cookies()
    
    // Create a Supabase client that properly handles PKCE cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          },
          set(name, value, options) {
            // Important: We need to collect cookies to be set later
            cookieStore.set({ name, value, ...options })
          },
          remove(name, options) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    // Exchange the OAuth code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('Code exchange failed:', exchangeError)
      
      // Specific handling for PKCE-related errors  
      if (exchangeError.message?.includes('code verifier') || 
          exchangeError.message?.includes('invalid request') ||
          exchangeError.code === 'validation_failed') {
        console.error('PKCE validation failed - code verifier not found')
        
        return NextResponse.redirect(
          `${origin}/login?error=pkce_failed&message=Please try signing in again`
        )
      }
      
      return NextResponse.redirect(
        `${origin}/auth/auth-code-error?error=exchange_failed&description=${encodeURIComponent(exchangeError.message)}`
      )
    }

    if (!exchangeError && data?.session) {
      // Get user from session
      const user = data.session.user
      
      // CRITICAL FIX: Manually set session cookies using proper Supabase format
      // Extract project reference from URL for correct cookie naming
      const urlParts = process.env.NEXT_PUBLIC_SUPABASE_URL.split('/')
      const host = urlParts[2] // gets "project.supabase.co"
      const projectRef = host.split('.')[0] // gets just "project"
      
      const cookieName = `sb-${projectRef}-auth-token`
      
      // Format the session data exactly how Supabase expects it
      const sessionData = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in,
        token_type: data.session.token_type,
        user: data.session.user
      }
      
      console.log(`Setting session cookie: ${cookieName}`)
      
      // Set the session cookie with proper options
      cookieStore.set({
        name: cookieName,
        value: JSON.stringify(sessionData),
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 7 // 7 days
      })
      
      // Add a small delay to ensure cookies are properly set
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Verify the session is actually established
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.error('Session not established after code exchange:', sessionError)
        // Retry once more with a longer delay
        await new Promise(resolve => setTimeout(resolve, 500))
        const { data: { session: retrySession } } = await supabase.auth.getSession()
        
        if (!retrySession) {
          console.error('Session still not established after retry')
          // Try to refresh the session
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
          if (refreshError || !refreshData?.session) {
            console.error('Session refresh failed:', refreshError)
            return NextResponse.redirect(`${origin}/login?error=session_not_established`)
          }
        }
      }
      
      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      // Get plan and billing parameters from OAuth flow (passed from pricing page)
      const plan = requestUrl.searchParams.get('plan')
      const billing = requestUrl.searchParams.get('billing')

      // Determine redirect URL
      let redirectTo = '/dashboard'
      
      // Handle profile not found (new user)
      if (profileError && profileError.code === 'PGRST116') {
        // Create new profile
        const profileData = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          onboarding_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        const { error: insertError } = await supabase.from('profiles').insert(profileData)
        if (insertError) {
          console.error('Failed to create profile:', insertError)
        }
        redirectTo = '/welcome'
      } else if (profile) {
        // Update existing profile with Google name if different
        const googleName = user.user_metadata?.full_name || user.user_metadata?.name
        if (googleName && googleName !== profile.full_name) {
          await supabase
            .from('profiles')
            .update({ 
              full_name: googleName,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
        }
        
        // Check onboarding status
        if (profile.onboarding_completed === false) {
          redirectTo = '/welcome'
        }
      }
      
      // If we have plan info, this is a new signup - redirect to success page
      if (plan) {
        redirectTo = `/success?plan=${plan}&billing=${billing || 'monthly'}`
      }
      
      // Check for stored return URL from ProtectedRoute
      const returnUrl = requestUrl.searchParams.get('return_url') || 
                       requestUrl.searchParams.get('next')
      
      if (returnUrl && !plan) {
        redirectTo = returnUrl
      }
      
      // Log successful authentication
      console.log('OAuth successful, redirecting to:', redirectTo)
      
      // Return redirect with session established
      return NextResponse.redirect(`${origin}${redirectTo}`)
    } else {
      console.error('OAuth error: No session returned')
      // Redirect to login with error
      return NextResponse.redirect(`${origin}/login?error=oauth_error`)
    }
  }

  // No code, redirect to login
  return NextResponse.redirect(`${origin}/login`)
}
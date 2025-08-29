import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const origin = requestUrl.origin

  if (process.env.NODE_ENV === 'development') {
    console.log('🎯 OAuth Callback: Starting callback processing', {
      hasCode: !!code,
      hasError: !!error,
      origin,
      searchParams: Object.fromEntries(requestUrl.searchParams.entries())
    })
  }

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    if (process.env.NODE_ENV === 'development') {
      console.log('❌ OAuth Callback: Redirecting to error page due to OAuth error')
    }
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || '')}`
    )
  }

  // Handle missing authorization code
  if (!code) {
    console.error('OAuth callback: No authorization code received')
    if (process.env.NODE_ENV === 'development') {
      console.log('❌ OAuth Callback: Redirecting to error page - missing auth code')
    }
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?error=missing_code&description=No authorization code received`
    )
  }

  if (code) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 OAuth Callback: Processing authorization code...')
    }
    
    const cookieStore = cookies()
    
    // Create a Supabase client that properly handles PKCE cookies
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 OAuth Callback: Creating Supabase server client...')
    }
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            const value = cookieStore.get(name)?.value
            if (process.env.NODE_ENV === 'development') {
              console.log(`🍪 OAuth Callback: Getting cookie ${name}: ${value ? 'present' : 'missing'}`)
            }
            return value
          },
          set(name, value, options) {
            // Enhanced cookie setting with proper session persistence
            const isSessionCookie = name.includes('auth-token') || name.includes('sb-')
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`🍪 OAuth Callback: Setting cookie ${name} (session: ${isSessionCookie})`)
            }
            
            // Ensure session cookies have proper persistence settings
            const cookieOptions = {
              name,
              value,
              path: '/',
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              httpOnly: false, // Required for client-side Supabase access
              maxAge: isSessionCookie ? 60 * 60 * 24 * 7 : (options?.maxAge || 60 * 60), // 7 days for session cookies
              ...options
            }
            
            cookieStore.set(cookieOptions)
          },
          remove(name, options) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`🗑️ OAuth Callback: Removing cookie ${name}`)
            }
            cookieStore.set({ name, value: '', maxAge: 0, path: '/', ...options })
          },
        },
      }
    )

    // Exchange the OAuth code for session
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 OAuth Callback: Exchanging code for session...')
      console.log('🍪 OAuth Callback: Current cookies before exchange:', 
        Object.fromEntries(cookieStore.getAll().map(c => [c.name, c.value ? 'present' : 'missing'])))
    }
    
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (process.env.NODE_ENV === 'development' && !exchangeError && data?.session) {
      console.log('🍪 OAuth Callback: Current cookies after exchange:', 
        Object.fromEntries(cookieStore.getAll().map(c => [c.name, c.value ? 'present' : 'missing'])))
    }
    
    if (exchangeError) {
      console.error('❌ OAuth Callback: Code exchange failed:', exchangeError)
      
      if (process.env.NODE_ENV === 'development') {
        console.log('💥 OAuth Callback: Exchange error details:', {
          message: exchangeError.message,
          code: exchangeError.code,
          details: exchangeError.details,
          hint: exchangeError.hint
        })
      }
      
      // Specific handling for PKCE-related errors  
      if (exchangeError.message?.includes('code verifier') || 
          exchangeError.message?.includes('invalid request') ||
          exchangeError.code === 'validation_failed') {
        console.error('❌ OAuth Callback: PKCE validation failed - code verifier not found')
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 OAuth Callback: Redirecting to login with PKCE error')
        }
        
        return NextResponse.redirect(
          `${origin}/login?error=pkce_failed&message=Please try signing in again`
        )
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 OAuth Callback: Redirecting to error page with exchange failure')
      }
      
      return NextResponse.redirect(
        `${origin}/auth/auth-code-error?error=exchange_failed&description=${encodeURIComponent(exchangeError.message)}`
      )
    }

    if (!exchangeError && data?.session) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ OAuth Callback: Code exchange successful, processing session...')
      }
      
      // Get user from session
      const user = data.session.user
      
      if (process.env.NODE_ENV === 'development') {
        console.log('👤 OAuth Callback: User data retrieved:', {
          id: user.id,
          email: user.email,
          provider: user.app_metadata?.provider,
          confirmed_at: user.confirmed_at,
          last_sign_in_at: user.last_sign_in_at
        })
      }
      
      // Session cookies are now automatically handled by Supabase SSR client
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ OAuth Callback: Session established via Supabase SSR - cookies handled automatically')
        console.log('🔄 OAuth Callback: Note - Client-side session sync will happen automatically on page load')
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 OAuth Callback: Verifying session establishment...')
      }
      
      // Verify the session is actually established
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.error('❌ OAuth Callback: Session not established after code exchange:', sessionError)
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 OAuth Callback: Retrying session verification with 500ms delay...')
        }
        
        // Retry once more with a longer delay
        await new Promise(resolve => setTimeout(resolve, 500))
        const { data: { session: retrySession } } = await supabase.auth.getSession()
        
        if (!retrySession) {
          console.error('❌ OAuth Callback: Session still not established after retry')
          
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 OAuth Callback: Attempting session refresh as last resort...')
          }
          
          // Try to refresh the session
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
          if (refreshError || !refreshData?.session) {
            console.error('❌ OAuth Callback: Session refresh failed:', refreshError)
            
            if (process.env.NODE_ENV === 'development') {
              console.log('🔄 OAuth Callback: All session establishment attempts failed, redirecting to login')
            }
            
            return NextResponse.redirect(`${origin}/login?error=session_not_established`)
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ OAuth Callback: Session established via refresh')
            }
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ OAuth Callback: Session established on retry')
          }
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ OAuth Callback: Session verification successful on first attempt')
        }
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('👤 OAuth Callback: Checking for existing user profile...')
      }
      
      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📋 OAuth Callback: Profile lookup result:', {
          profileFound: !!profile,
          profileError: profileError?.code || 'none',
          profileId: profile?.id,
          onboardingCompleted: profile?.onboarding_completed
        })
      }
      
      // Get plan and billing parameters from OAuth flow (passed from pricing page)
      const plan = requestUrl.searchParams.get('plan')
      const billing = requestUrl.searchParams.get('billing')

      if (process.env.NODE_ENV === 'development') {
        console.log('🎯 OAuth Callback: OAuth parameters:', {
          plan,
          billing,
          hasReturnUrl: !!requestUrl.searchParams.get('return_url'),
          hasNext: !!requestUrl.searchParams.get('next')
        })
      }

      // Determine redirect URL
      let redirectTo = '/dashboard'
      
      // Handle profile not found (new user)
      if (profileError && profileError.code === 'PGRST116') {
        if (process.env.NODE_ENV === 'development') {
          console.log('🆕 OAuth Callback: No profile found - creating new user profile')
        }
        
        // Create new profile
        const profileData = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          onboarding_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('📝 OAuth Callback: Creating profile with data:', {
            id: profileData.id,
            email: profileData.email,
            full_name: profileData.full_name,
            onboarding_completed: profileData.onboarding_completed
          })
        }
        
        const { error: insertError } = await supabase.from('profiles').insert(profileData)
        if (insertError) {
          console.error('❌ OAuth Callback: Failed to create profile:', insertError)
          if (process.env.NODE_ENV === 'development') {
            console.log('💥 OAuth Callback: Profile creation error details:', {
              code: insertError.code,
              message: insertError.message,
              details: insertError.details
            })
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ OAuth Callback: New user profile created successfully')
          }
        }
        
        redirectTo = '/welcome'
        if (process.env.NODE_ENV === 'development') {
          console.log('🎯 OAuth Callback: New user - redirecting to welcome page')
        }
      } else if (profile) {
        if (process.env.NODE_ENV === 'development') {
          console.log('👤 OAuth Callback: Existing user profile found, checking for updates...')
        }
        
        // Update existing profile with Google name if different
        const googleName = user.user_metadata?.full_name || user.user_metadata?.name
        if (googleName && googleName !== profile.full_name) {
          if (process.env.NODE_ENV === 'development') {
            console.log('📝 OAuth Callback: Updating profile name:', {
              oldName: profile.full_name,
              newName: googleName
            })
          }
          
          await supabase
            .from('profiles')
            .update({ 
              full_name: googleName,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
            
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ OAuth Callback: Profile name updated from Google metadata')
          }
        }
        
        // Check onboarding status
        if (profile.onboarding_completed === false) {
          redirectTo = '/welcome'
          if (process.env.NODE_ENV === 'development') {
            console.log('🎯 OAuth Callback: Existing user with incomplete onboarding - redirecting to welcome')
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('🎯 OAuth Callback: Existing user with completed onboarding - redirecting to dashboard')
          }
        }
      }
      
      // If we have plan info, this is a new signup - redirect to success page
      if (plan) {
        redirectTo = `/success?plan=${plan}&billing=${billing || 'monthly'}`
        if (process.env.NODE_ENV === 'development') {
          console.log('🎯 OAuth Callback: Plan detected - redirecting to success page:', {
            plan,
            billing: billing || 'monthly',
            redirectTo
          })
        }
      }
      
      // Check for stored return URL from ProtectedRoute
      const returnUrl = requestUrl.searchParams.get('return_url') || 
                       requestUrl.searchParams.get('next')
      
      if (returnUrl && !plan) {
        redirectTo = returnUrl
        if (process.env.NODE_ENV === 'development') {
          console.log('🎯 OAuth Callback: Return URL detected - overriding redirect:', {
            returnUrl,
            finalRedirectTo: redirectTo
          })
        }
      }
      
      // Log successful authentication
      console.log('🎉 OAuth Callback: OAuth successful, redirecting to:', redirectTo)
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🏁 OAuth Callback: Final redirect summary:', {
          userId: user.id,
          userEmail: user.email,
          isNewUser: profileError?.code === 'PGRST116',
          hasPlan: !!plan,
          hasReturnUrl: !!returnUrl,
          finalDestination: redirectTo,
          fullRedirectUrl: `${origin}${redirectTo}`
        })
      }
      
      // Return redirect with session established
      return NextResponse.redirect(`${origin}${redirectTo}`)
    } else {
      console.error('❌ OAuth Callback: OAuth error - No session returned')
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 OAuth Callback: Redirecting to login with oauth_error')
      }
      // Redirect to login with error
      return NextResponse.redirect(`${origin}/login?error=oauth_error`)
    }
  }

  // No code, redirect to login
  if (process.env.NODE_ENV === 'development') {
    console.log('⚠️ OAuth Callback: No authorization code found - redirecting to login')
  }
  return NextResponse.redirect(`${origin}/login`)
}
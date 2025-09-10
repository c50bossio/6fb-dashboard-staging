import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Safe logger helper to prevent circular dependency issues
const getSafeLogger = () => {
  // Return fallback logger that always works
  return {
    error: (...args) => {
      try {
        // Try to use real logger if available, fall back to console
        console.error('[AUTH]', ...args)
      } catch (error) {
        console.error('[AUTH-FALLBACK]', ...args)
      }
    },
    warn: (...args) => {
      try {
        console.warn('[AUTH]', ...args)
      } catch (error) {
        console.warn('[AUTH-FALLBACK]', ...args)
      }
    },
    info: (...args) => {
      try {
        console.info('[AUTH]', ...args)
      } catch (error) {
        console.info('[AUTH-FALLBACK]', ...args)
      }
    }
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const error = requestUrl.searchParams.get('error')
  const logger = getSafeLogger()
  
  // Handle OAuth errors
  if (error) {
    logger.error('OAuth callback error:', { error, context: 'oauth_callback', provider: 'google', error_type: error })
    
    const errorUrl = new URL('/login', requestUrl.origin)
    errorUrl.searchParams.set('error', `OAuth error: ${error}`)
    return NextResponse.redirect(errorUrl)
  }
  
  // Handle missing code
  if (!code) {
    logger.error('OAuth callback missing code parameter:', { context: 'oauth_callback', provider: 'google', search_params: Object.fromEntries(requestUrl.searchParams) })
    
    const errorUrl = new URL('/login', requestUrl.origin)
    errorUrl.searchParams.set('error', 'Authentication failed - missing authorization code')
    return NextResponse.redirect(errorUrl)
  }

  try {
    const supabase = createClient()
    
    // Exchange the code for a session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      logger.error('Failed to exchange OAuth code for session:', { exchangeError: exchangeError.message, context: 'oauth_code_exchange', provider: 'google' })
      
      const errorUrl = new URL('/login', requestUrl.origin)
      errorUrl.searchParams.set('error', 'Authentication failed - could not create session')
      return NextResponse.redirect(errorUrl)
    }
    
    if (data.user) {
      logger.info('OAuth callback successful:', { user_id: data.user.id, email: data.user.email, provider: 'google', context: 'oauth_callback_success' })
      
      // Ensure profile exists for OAuth users (with retry logic)
      try {
        let profileAttempts = 0
        const maxProfileAttempts = 3
        let profileExists = false
        
        while (!profileExists && profileAttempts < maxProfileAttempts) {
          profileAttempts++
          
          // Check if profile exists
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', data.user.id)
            .single()
          
          if (existingProfile) {
            profileExists = true
            logger.info('Profile already exists for OAuth user:', { user_id: data.user.id, attempt: profileAttempts })
          } else {
            // Create profile from OAuth user metadata
            const userMetadata = data.user.user_metadata || {}
            const profileData = {
              id: data.user.id,
              email: data.user.email,
              full_name: userMetadata.full_name || userMetadata.name || null,
              first_name: userMetadata.given_name || null,
              last_name: userMetadata.family_name || null,
              avatar_url: userMetadata.avatar_url || userMetadata.picture || null,
              role: 'CLIENT',
              subscription_tier: 'FREE',
              subscription_status: 'ACTIVE'
            }
            
            const { data: newProfile, error: profileError } = await supabase
              .from('profiles')
              .insert(profileData)
              .select()
              .single()
            
            if (newProfile) {
              profileExists = true
              logger.info('Created profile for OAuth user:', { user_id: data.user.id, profile_data: profileData, attempt: profileAttempts })
            } else if (profileError) {
              logger.warn(`Profile creation attempt ${profileAttempts} failed:`, { error: profileError.message, user_id: data.user.id })
              if (profileAttempts < maxProfileAttempts) {
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, profileAttempts) * 1000))
              }
            }
          }
        }
        
        if (!profileExists) {
          logger.error('Failed to create profile for OAuth user after all attempts:', { user_id: data.user.id, attempts: maxProfileAttempts })
        }
        
      } catch (profileCreationError) {
        logger.error('Error during OAuth profile creation:', { error: profileCreationError.message, user_id: data.user.id })
        // Continue with redirect even if profile creation fails - SupabaseAuthProvider will handle retry
      }
      
      // Redirect to the intended destination
      const redirectUrl = new URL(next, requestUrl.origin)
      return NextResponse.redirect(redirectUrl)
    }
    
    // Fallback if no user in session
    logger.error('OAuth code exchange succeeded but no user found:', { context: 'oauth_callback_no_user', provider: 'google' })
    
    const errorUrl = new URL('/login', requestUrl.origin)
    errorUrl.searchParams.set('error', 'Authentication succeeded but user not found')
    return NextResponse.redirect(errorUrl)
    
  } catch (error) {
    logger.error('Unexpected error in OAuth callback:', { error: error.message, context: 'oauth_callback_exception', provider: 'google' })
    
    const errorUrl = new URL('/login', requestUrl.origin)
    errorUrl.searchParams.set('error', 'Authentication failed - unexpected error')
    return NextResponse.redirect(errorUrl)
  }
}
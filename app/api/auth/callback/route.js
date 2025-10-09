import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Safe logger helper to prevent circular dependency issues
const getSafeLogger = () => {
  return {
    error: (...args) => console.error('[AUTH]', ...args),
    warn: (...args) => console.warn('[AUTH]', ...args),
    info: (...args) => console.info('[AUTH]', ...args)
  }
}

// Helper to poll for profile creation (handles async trigger delay)
const waitForProfile = async (supabase, userId, maxWaitMs = 3000) => {
  const logger = getSafeLogger()
  const startTime = Date.now()
  const pollInterval = 500 // Poll every 500ms

  while (Date.now() - startTime < maxWaitMs) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (profile) {
      logger.info('Profile found via trigger:', { user_id: userId, wait_time_ms: Date.now() - startTime })
      return true
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval))
  }

  logger.warn('Profile not created by trigger within timeout:', { user_id: userId, max_wait_ms: maxWaitMs })
  return false
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
    logger.error('OAuth callback error:', { error, context: 'oauth_callback' })
    const errorUrl = new URL('/login', requestUrl.origin)
    errorUrl.searchParams.set('error', `OAuth error: ${error}`)
    return NextResponse.redirect(errorUrl)
  }

  // Handle missing code
  if (!code) {
    logger.error('OAuth callback missing code parameter')
    const errorUrl = new URL('/login', requestUrl.origin)
    errorUrl.searchParams.set('error', 'Authentication failed - missing authorization code')
    return NextResponse.redirect(errorUrl)
  }

  try {
    // Create response first (required for cookie setting)
    const redirectUrl = new URL(next, requestUrl.origin)
    const response = NextResponse.redirect(redirectUrl)

    // Create Supabase client with official SSR cookie pattern
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return request.cookies.get(name)?.value
          },
          set(name, value, options) {
            response.cookies.set({ name, value, ...options })
          },
          remove(name, options) {
            response.cookies.set({ name, value: '', ...options })
          }
        }
      }
    )

    // Exchange the code for a session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      logger.error('Failed to exchange OAuth code for session:', { error: exchangeError.message })
      const errorUrl = new URL('/login', requestUrl.origin)
      errorUrl.searchParams.set('error', 'Authentication failed - could not create session')
      return NextResponse.redirect(errorUrl)
    }

    if (data.user) {
      logger.info('OAuth callback successful:', { user_id: data.user.id, email: data.user.email })

      // CRITICAL: Verify session is properly set before proceeding
      const { data: { session: verifySession } } = await supabase.auth.getSession()
      if (!verifySession) {
        logger.error('Session verification failed after code exchange')
        const errorUrl = new URL('/login', requestUrl.origin)
        errorUrl.searchParams.set('error', 'Session creation failed - please try again')
        return NextResponse.redirect(errorUrl)
      }
      logger.info('Session verified successfully:', { session_user_id: verifySession.user.id })

      // CRITICAL: Wait for database trigger to create profile (handles async delay)
      try {
        const profileCreatedByTrigger = await waitForProfile(supabase, data.user.id, 3000)

        // Extract Google user metadata
        const userMetadata = data.user.user_metadata || {}
        const googleMetadata = {
          full_name: userMetadata.full_name || userMetadata.name || null,
          first_name: userMetadata.given_name || null,
          last_name: userMetadata.family_name || null,
          avatar_url: userMetadata.avatar_url || userMetadata.picture || null
        }

        logger.info('Google OAuth metadata extracted:', googleMetadata)

        if (!profileCreatedByTrigger) {
          // Trigger didn't create profile - create manually
          logger.warn('Creating profile manually (trigger timeout):', { user_id: data.user.id })

          const profileData = {
            id: data.user.id,
            email: data.user.email,
            ...googleMetadata,
            role: 'CLIENT',
            shop_id: null,
            subscription_tier: 'FREE',
            subscription_status: 'ACTIVE'
          }

          const { data: newProfile, error: profileError } = await supabase
            .from('profiles')
            .insert(profileData)
            .select()
            .single()

          if (newProfile) {
            logger.info('Created profile manually with Google metadata:', { user_id: data.user.id })

            // Query user's barbershops to set correct shop_id
            const { data: userBarbershops } = await supabase
              .from('barbershops')
              .select('id, name')
              .eq('owner_id', data.user.id)
              .order('created_at', { ascending: true })
              .limit(1)

            if (userBarbershops && userBarbershops.length > 0) {
              const firstShop = userBarbershops[0]
              await supabase
                .from('profiles')
                .update({ shop_id: firstShop.id })
                .eq('id', data.user.id)

              logger.info('Set shop_id for user:', { user_id: data.user.id, shop_id: firstShop.id })
            }
          } else if (profileError) {
            logger.error('Failed to create profile manually:', { error: profileError.message, user_id: data.user.id })
            // Continue with redirect - SupabaseAuthProvider will retry
          }
        } else {
          // Profile exists (created by trigger) - update with Google metadata
          logger.info('Profile exists, syncing Google metadata:', { user_id: data.user.id })

          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              full_name: googleMetadata.full_name || userMetadata.name,
              first_name: googleMetadata.first_name,
              last_name: googleMetadata.last_name,
              avatar_url: googleMetadata.avatar_url
            })
            .eq('id', data.user.id)

          if (updateError) {
            logger.error('Failed to sync Google metadata to profile:', { error: updateError.message })
          } else {
            logger.info('Successfully synced Google metadata to profile')
          }
        }
      } catch (profileCreationError) {
        logger.error('Error during OAuth profile creation:', { error: profileCreationError.message, user_id: data.user.id })
        // Continue with redirect - SupabaseAuthProvider will handle retry
      }

      // Final session refresh to ensure cookies are fresh before redirect
      try {
        await supabase.auth.refreshSession()
        logger.info('Final session refresh completed before redirect')
      } catch (refreshError) {
        logger.warn('Final session refresh failed (non-critical):', { error: refreshError.message })
      }

      // CRITICAL: Add small delay to ensure cookie processing completes
      // This prevents race conditions where browser redirects before cookies are fully written
      await new Promise(resolve => setTimeout(resolve, 100))

      logger.info('Redirecting to dashboard with session and profile')
      // Return the response with attached cookies
      return response
    }

    // Fallback if no user in session
    logger.error('OAuth code exchange succeeded but no user found')
    const errorUrl = new URL('/login', requestUrl.origin)
    errorUrl.searchParams.set('error', 'Authentication succeeded but user not found')
    return NextResponse.redirect(errorUrl)

  } catch (error) {
    logger.error('Unexpected error in OAuth callback:', { error: error.message })
    const errorUrl = new URL('/login', requestUrl.origin)
    errorUrl.searchParams.set('error', 'Authentication failed - unexpected error')
    return NextResponse.redirect(errorUrl)
  }
}

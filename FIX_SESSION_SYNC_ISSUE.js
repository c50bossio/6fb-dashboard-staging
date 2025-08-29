/**
 * Session Synchronization Fix for OAuth Authentication Issues
 * 
 * PROBLEM: After OAuth callback, server-side API routes can't read the session
 * from cookies, causing 401 Unauthorized errors on /api/staff and other endpoints.
 * 
 * ROOT CAUSE: OAuth callback establishes session but client-side doesn't
 * immediately sync with server-side cookie state.
 * 
 * SOLUTION: Force session refresh and cookie synchronization after OAuth
 */

// 1. Add this to layout.tsx or auth provider to ensure session sync after OAuth
export function usePostOAuthSessionSync() {
  const [isSessionSynced, setIsSessionSynced] = useState(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function syncSessionAfterOAuth() {
      try {
        // Check if we just came from OAuth (callback URL patterns)
        const hasOAuthParams = window.location.search.includes('code=') || 
                              document.referrer.includes('/auth/callback')
        
        if (!hasOAuthParams && isSessionSynced) return

        console.log('🔄 [Session Sync] Checking session state after OAuth...')
        
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ [Session Sync] Session check failed:', error)
          return
        }

        if (!session) {
          console.log('⚠️ [Session Sync] No session found, attempting refresh...')
          
          // Try to refresh the session to establish proper cookies
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
          
          if (refreshError) {
            console.error('❌ [Session Sync] Session refresh failed:', refreshError)
            return
          }
          
          if (refreshData?.session) {
            console.log('✅ [Session Sync] Session refreshed successfully')
            setIsSessionSynced(true)
            return
          }
        }

        if (session) {
          console.log('✅ [Session Sync] Session already established')
          setIsSessionSynced(true)
          
          // Force a test API call to verify server-side session works
          try {
            const response = await fetch('/api/health', {
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            })
            
            if (response.ok) {
              console.log('✅ [Session Sync] Server-side session verified')
            } else {
              console.warn('⚠️ [Session Sync] Server-side session not working, trying manual cookie sync...')
              
              // Manual cookie sync as last resort
              document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${60*60*24*7}; samesite=lax`
              document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=${60*60*24*7}; samesite=lax`
            }
          } catch (apiError) {
            console.error('❌ [Session Sync] API test failed:', apiError)
          }
        }
        
      } catch (error) {
        console.error('❌ [Session Sync] Unexpected error:', error)
      }
    }

    // Run immediately and after a short delay to catch OAuth redirects
    syncSessionAfterOAuth()
    
    const timeout = setTimeout(syncSessionAfterOAuth, 2000)
    return () => clearTimeout(timeout)
  }, [supabase, isSessionSynced])

  return isSessionSynced
}

// 2. Enhanced middleware to handle session edge cases
export function createSessionAwareMiddleware() {
  return async function middleware(request) {
    try {
      const response = NextResponse.next()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            get(name) {
              return request.cookies.get(name)?.value
            },
            set(name, value, options) {
              request.cookies.set(name, value)
              response.cookies.set(name, value, options)
            },
            remove(name, options) {
              request.cookies.delete(name)
              response.cookies.delete(name, options)
            },
          },
        }
      )

      // Try to get session with enhanced error handling
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('🔧 [Middleware] Session error:', error.message)
      }

      // For OAuth callback, ensure cookies are properly set
      if (request.nextUrl.pathname.startsWith('/auth/callback') && session) {
        console.log('🔄 [Middleware] OAuth callback - ensuring session cookies')
        
        // Explicitly set session cookies with proper options
        response.cookies.set(`sb-access-token`, session.access_token, {
          path: '/',
          httpOnly: false, // Required for client-side access
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7 // 7 days
        })
        
        response.cookies.set(`sb-refresh-token`, session.refresh_token, {
          path: '/',
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production', 
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7 // 7 days
        })
      }

      return response
    } catch (error) {
      console.error('❌ [Middleware] Unexpected error:', error)
      return NextResponse.next()
    }
  }
}

// 3. API route session helper with retry logic
export async function getServerSessionWithRetry(supabase, maxRetries = 3) {
  let lastError = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 [Session Retry] Attempt ${attempt}/${maxRetries}`)
      
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        lastError = error
        console.warn(`⚠️ [Session Retry] Attempt ${attempt} failed:`, error.message)
        
        // Don't retry certain errors
        if (error.message?.includes('JWT') || 
            error.message?.includes('expired') ||
            error.message?.includes('malformed')) {
          console.log('🚫 [Session Retry] Not retrying JWT/expiry error')
          break
        }
        
        // Wait before retry with exponential backoff
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 200 * attempt))
        }
        continue
      }
      
      if (session) {
        console.log(`✅ [Session Retry] Session found on attempt ${attempt}`)
        return { session, user: session.user }
      }
      
      // No session but no error - might be unauthenticated
      if (attempt === maxRetries) {
        console.log('ℹ️ [Session Retry] No session found after all retries (user likely not authenticated)')
        return { session: null, user: null }
      }
      
      // Wait before retry for session establishment
      await new Promise(resolve => setTimeout(resolve, 500 * attempt))
      
    } catch (error) {
      lastError = error
      console.error(`❌ [Session Retry] Attempt ${attempt} exception:`, error.message)
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }
  }
  
  console.error('❌ [Session Retry] All attempts failed:', lastError?.message || 'Unknown error')
  return { session: null, user: null, error: lastError }
}

// 4. Updated staff API route with enhanced authentication
export async function GET_STAFF_WITH_ENHANCED_AUTH(request) {
  try {
    console.log('🏁 [Staff API Enhanced] Starting authentication...')
    
    // Create Supabase client
    const supabase = await createClient()
    
    if (!supabase) {
      console.error('❌ [Staff API Enhanced] Supabase client creation failed')
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }
    
    // Get session with retry logic
    const { session, user, error: sessionError } = await getServerSessionWithRetry(supabase, 3)
    
    if (sessionError) {
      console.error('❌ [Staff API Enhanced] Session error:', sessionError.message)
      return NextResponse.json({ 
        error: 'Authentication failed', 
        details: sessionError.message 
      }, { status: 401 })
    }
    
    if (!session || !user) {
      console.warn('⚠️ [Staff API Enhanced] No authenticated user found')
      return NextResponse.json({ 
        error: 'Unauthorized',
        hint: 'Please refresh the page and try again'
      }, { status: 401 })
    }
    
    console.log(`✅ [Staff API Enhanced] User authenticated:`, {
      userId: user.id,
      email: user.email
    })
    
    // Continue with rest of staff logic...
    // [rest of the staff API logic here]
    
    return NextResponse.json({
      success: true,
      message: 'Authentication working - staff data would be returned here'
    })
    
  } catch (error) {
    console.error('💥 [Staff API Enhanced] Unexpected error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * IMPLEMENTATION INSTRUCTIONS:
 * 
 * 1. Add usePostOAuthSessionSync hook to your main layout or auth provider
 * 2. Update middleware.js with createSessionAwareMiddleware() 
 * 3. Replace staff API route authentication with GET_STAFF_WITH_ENHANCED_AUTH logic
 * 4. Test the complete OAuth flow: login → callback → API access
 * 
 * This should resolve the 401 Unauthorized errors after OAuth authentication.
 */
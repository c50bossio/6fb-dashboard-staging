import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * CLIENT-SIDE TOKEN REFRESH API
 * 
 * This API endpoint handles token refresh in the background without blocking page loads.
 * It's called by the client-side auth provider to refresh tokens asynchronously.
 * 
 * Benefits:
 * - Non-blocking: Runs in background, doesn't delay page navigation
 * - Reduces middleware load: Token refresh happens via API call, not middleware
 * - Better performance: No network delay during tab switches
 */
export async function POST(request) {
  try {
    const cookieStore = cookies()
    
    // Create server client for token refresh
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Refresh the user token (this validates and refreshes if needed)
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Token refresh error:', error.message)
      return NextResponse.json(
        { error: 'Token refresh failed', message: error.message },
        { status: 401 }
      )
    }

    // Return success with basic user info (don't send sensitive data)
    return NextResponse.json({
      success: true,
      user: user ? {
        id: user.id,
        email: user.email,
        last_sign_in_at: user.last_sign_in_at
      } : null,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Unexpected error in token refresh:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'auth-refresh',
    timestamp: new Date().toISOString()
  })
}
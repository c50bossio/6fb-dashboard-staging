import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authLogger } from '@/lib/logger'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const cookieStore = cookies()
    
    // Get force parameter to determine logout level
    const body = await request.json().catch(() => ({}))
    const forceLogout = body?.force || false
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          },
          set(name, value, options) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name, options) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    
    // Attempt to sign out on the server side
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      authLogger.error('Server-side signOut error', error, {
        context: 'signout_api',
        force_logout: forceLogout
      })
      // Don't fail the request if server-side signout fails
      // Client-side cleanup is more important
    } else {
      authLogger.info('Signout successful', {}, {
        context: 'signout_api_success',
        force_logout: forceLogout
      })
    }
    
    // Create response
    const response = NextResponse.json({ 
      success: true,
      message: forceLogout ? 'Complete session termination successful' : 'Logout successful'
    })
    
    // Get cookies to clear
    let cookiesToClear = [
      'sb-access-token',
      'sb-refresh-token', 
      'supabase-auth-token'
    ]
    
    // For force logout, clear ALL auth-related cookies
    if (forceLogout) {
      const allCookies = cookieStore.getAll()
      const authCookies = allCookies.filter(cookie => 
        cookie.name.includes('sb-') || 
        cookie.name.includes('supabase') ||
        cookie.name.includes('auth')
      )
      cookiesToClear = authCookies.map(c => c.name)
      
      // Add to response for debugging
      response.headers.set('X-Cleared-Cookies', JSON.stringify(cookiesToClear))
    }
    
    // Clear cookies with comprehensive options
    const clearOptions = {
      expires: new Date(0),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0
    }
    
    cookiesToClear.forEach(cookieName => {
      // Clear cookie for different paths
      response.cookies.set(cookieName, '', { ...clearOptions, path: '/' })
      response.cookies.set(cookieName, '', { ...clearOptions, path: '/api' })
      response.cookies.set(cookieName, '', { ...clearOptions, path: '/auth' })
    })
    
    // Add cache control headers for security
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
  } catch (error) {
    authLogger.error('Unexpected error in signout API', error, {
      context: 'signout_api_exception'
    })
    // Still return success since client-side cleanup is primary
    return NextResponse.json({ 
      success: true, 
      warning: error.message 
    })
  }
}
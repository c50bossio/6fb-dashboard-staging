import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { withTimeout } from './timeout-helpers'

export async function updateSession(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Temporarily bypass Supabase for testing if not configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
    console.log('⚠️ Bypassing Supabase middleware - not configured')
    return response
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          // Enhanced cookie options for better persistence
          const isProduction = process.env.NODE_ENV === 'production'
          const cookieOptions = {
            name,
            value,
            ...options,
            sameSite: 'lax',
            secure: isProduction,
            // CRITICAL: httpOnly must be false in development for @supabase/ssr
            // Browser client needs to read session cookies via document.cookie
            // In production, consider server-only session handling
            httpOnly: isProduction,
            path: '/',
            maxAge: 60 * 60 * 24 * 30, // 30 days
            // Add domain for production to ensure cookies work across subdomains
            ...(isProduction && { domain: '.bookedbarber.com' })
          }
          
          request.cookies.set(cookieOptions)
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set(cookieOptions)
        },
        remove(name, options) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  try {
    // CRITICAL: Use getUser() instead of getSession() for security
    // Per Supabase 2025 best practices: "Session can be spoofed, always use getUser()"
    // getUser() validates the session server-side with Supabase API
    //
    // TIMEOUT PROTECTION: Wrap with 3-second timeout to prevent middleware hanging
    // If getUser() hangs, we fail open and let the request through
    // The client-side auth provider will handle the actual authentication
    const { data: { user }, error } = await withTimeout(
      supabase.auth.getUser(),
      3000, // 3 second timeout for middleware (faster than client-side)
      'middleware-getUser'
    ).catch(timeoutError => {
      console.warn('⚠️ [Middleware] getUser() timed out, allowing request through:', timeoutError.message)
      // Fail open - let request through and client will handle auth
      return { data: { user: null }, error: timeoutError }
    })

    if (error) {
      // Check if it's a timeout error
      if (error.message && error.message.includes('timed out')) {
        console.warn('⚠️ [Middleware] Auth check timed out, failing open')
      } else {
        console.warn('⚠️ [Middleware] Auth validation error:', error.message)
      }
    } else if (user) {
      // User authenticated and session validated
      console.log('✅ [Middleware] User authenticated:', user.email)
    } else {
      console.log('ℹ️ [Middleware] No authenticated user')
    }

    // Return user info for downstream use
    return {
      response,
      user,
      error
    }
  } catch (error) {
    console.warn('⚠️ [Middleware] Unexpected auth error:', error.message)
    return {
      response,
      user: null,
      error
    }
  }
}
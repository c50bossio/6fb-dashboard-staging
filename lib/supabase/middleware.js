import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

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
          const cookieOptions = {
            name,
            value,
            ...options,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            path: '/',
            maxAge: 60 * 60 * 24 * 30 // 30 days
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
    // CRITICAL: getSession() refreshes the auth token if needed
    // This ensures the session persists across page refreshes
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.warn('Supabase auth error in middleware:', error.message)
    } else if (session) {
      // Session found and refreshed
      console.log('✅ Session refreshed for user:', session.user?.email)
    }
  } catch (error) {
    console.warn('Supabase auth error in middleware:', error.message)
  }

  return response
}
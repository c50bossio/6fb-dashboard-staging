import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request) {
  console.log('🔐 OAuth callback started')
  
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  
  // Handle OAuth errors
  if (error) {
    console.error('❌ OAuth error:', error, errorDescription)
    const forwardedHost = request.headers.get('x-forwarded-host')
    const host = request.headers.get('host')
    const actualHost = forwardedHost || host || new URL(origin).host
    const protocol = actualHost.includes('localhost') ? 'http' : 'https'
    
    return NextResponse.redirect(`${protocol}://${actualHost}/login?error=${encodeURIComponent(errorDescription || error)}`)
  }
  
  if (code) {
    console.log('🔄 Exchanging code for session...')
    const cookieStore = cookies()
    
    // Create Supabase server client with proper cookie handling for Next.js 14
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                // Ensure cookies are set with proper options for production
                const cookieOptions = {
                  name,
                  value,
                  ...options,
                  // Ensure secure cookies in production
                  secure: process.env.NODE_ENV === 'production',
                  // Allow cookies across subdomains
                  sameSite: 'lax',
                  // Ensure cookies are accessible
                  httpOnly: true,
                  // Set path to root
                  path: '/'
                }
                cookieStore.set(cookieOptions)
              })
            } catch (error) {
              // This is expected in the app directory
              console.log('Cookie setting handled by Next.js')
            }
          },
        },
      }
    )
    
    // Exchange code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!exchangeError && data?.session) {
      console.log('✅ Session created successfully for:', data.session.user.email)
      
      // Get the host for proper redirect
      const forwardedHost = request.headers.get('x-forwarded-host')
      const host = request.headers.get('host')
      const actualHost = forwardedHost || host || new URL(origin).host
      const protocol = actualHost.includes('localhost') ? 'http' : 'https'
      const redirectUrl = `${protocol}://${actualHost}${next}`
      
      console.log('🔄 Redirecting to:', redirectUrl)
      
      // Create response with redirect
      const response = NextResponse.redirect(redirectUrl)
      
      // Ensure cookies are set on the response
      cookieStore.getAll().forEach((cookie) => {
        if (cookie.name.startsWith('sb-')) {
          response.cookies.set({
            name: cookie.name,
            value: cookie.value,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
          })
        }
      })
      
      return response
    } else {
      console.error('❌ Failed to exchange code for session:', exchangeError)
    }
  }
  
  // Auth failed - redirect to login with proper host handling
  console.log('⚠️ No code provided or exchange failed, redirecting to login')
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = request.headers.get('host')
  const actualHost = forwardedHost || host || new URL(origin).host
  const protocol = actualHost.includes('localhost') ? 'http' : 'https'
  
  return NextResponse.redirect(`${protocol}://${actualHost}/login`)
}
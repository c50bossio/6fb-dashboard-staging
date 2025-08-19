import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  let next = searchParams.get('next') ?? '/dashboard'  // Default to dashboard
  
  // Only allow relative URLs for security
  if (!next.startsWith('/')) {
    next = '/dashboard'
  }

  console.log('🔐 OAuth callback received:', { code: !!code, next, origin })

  if (code) {
    const cookieStore = await cookies()
    
    // Create Supabase client with proper cookie handling
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
                cookieStore.set(name, value, {
                  ...options,
                  sameSite: 'lax',  // Important for OAuth callbacks
                  secure: process.env.NODE_ENV === 'production',
                  httpOnly: true
                })
              })
            } catch (error) {
              // This is expected in Server Components
              console.log('Cookie set error (expected):', error.message)
            }
          },
        },
      }
    )
    
    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data?.session) {
      console.log('✅ OAuth callback successful, session created for:', data.session.user.email)
      
      // Successful authentication - redirect to dashboard
      const redirectTo = next === '/' ? '/dashboard' : next
      
      // Handle production environment with potential load balancers
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        // Local development - no load balancer
        return NextResponse.redirect(`${origin}${redirectTo}`)
      } else if (forwardedHost) {
        // Production with load balancer
        return NextResponse.redirect(`https://${forwardedHost}${redirectTo}`)
      } else {
        // Production without load balancer
        return NextResponse.redirect(`${origin}${redirectTo}`)
      }
    }
    
    // Log error for debugging
    if (error) {
      console.error('❌ OAuth exchange error:', error)
      // Return to login with error
      return NextResponse.redirect(`${origin}/login?error=Unable to sign in`)
    }
    
    // Check if session already exists (in case of double callback)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      console.log('🔄 Session already exists, redirecting to dashboard')
      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  // Only redirect with error if we don't have code or session
  console.warn('⚠️ OAuth callback called without code parameter')
  return NextResponse.redirect(`${origin}/login?error=OAuth callback failed`)
}
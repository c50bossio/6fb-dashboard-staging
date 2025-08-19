import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  
  // Only allow relative URLs for security
  if (!next.startsWith('/')) {
    next = '/'
  }

  if (code) {
    const cookieStore = cookies()
    
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
                cookieStore.set(name, value, options)
              })
            } catch (error) {
              // This is expected in Server Components
            }
          },
        },
      }
    )
    
    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Handle production environment with potential load balancers
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        // Local development - no load balancer
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        // Production with load balancer
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        // Production without load balancer
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Return to error page if something went wrong
  return NextResponse.redirect(`${origin}/login?error=Unable to sign in`)
}
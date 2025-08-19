import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  
  if (code) {
    const cookieStore = cookies()
    
    // Create Supabase server client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          },
          set(name, value, options) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch {
              // Server component cookie handling - this is expected
            }
          },
          remove(name, options) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch {
              // Server component cookie handling - this is expected
            }
          },
        },
      }
    )
    
    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Successfully authenticated - redirect to dashboard
      // Handle both domain variations (bookedbarber.com and bookedibarber.com)
      const forwardedHost = request.headers.get('x-forwarded-host')
      const host = request.headers.get('host')
      
      // Use the actual host the user is accessing
      const actualHost = forwardedHost || host || new URL(origin).host
      const protocol = actualHost.includes('localhost') ? 'http' : 'https'
      const redirectUrl = `${protocol}://${actualHost}${next}`
      
      return NextResponse.redirect(redirectUrl)
    }
  }
  
  // Auth failed - redirect to login with proper host handling
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = request.headers.get('host')
  const actualHost = forwardedHost || host || new URL(origin).host
  const protocol = actualHost.includes('localhost') ? 'http' : 'https'
  
  return NextResponse.redirect(`${protocol}://${actualHost}/login`)
}
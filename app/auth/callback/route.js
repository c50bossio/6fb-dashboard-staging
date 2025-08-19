import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  
  console.log('🔐 OAuth callback received:', { 
    hasCode: !!code, 
    next,
    origin,
    url: request.url 
  })

  if (code) {
    const cookieStore = cookies()
    
    // Create Supabase client with proper cookie handling for OAuth
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
              cookieStore.set({ 
                name, 
                value, 
                ...options,
                sameSite: 'lax',
                secure: true 
              })
            } catch (error) {
              // This is fine - Server Components can't set cookies after streaming starts
            }
          },
          remove(name, options) {
            try {
              cookieStore.delete(name)
            } catch (error) {
              // This is fine - Server Components can't set cookies after streaming starts
            }
          },
        },
      }
    )
    
    try {
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('❌ OAuth exchange error:', error)
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
      }
      
      if (data?.session) {
        console.log('✅ OAuth successful, session created for:', data.session.user.email)
        
        // Successfully authenticated - redirect to dashboard or requested page
        const forwardedHost = request.headers.get('x-forwarded-host')
        const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https'
        
        if (forwardedHost) {
          // Production environment with custom domain
          return NextResponse.redirect(`${forwardedProto}://${forwardedHost}${next}`)
        }
        
        // Default redirect
        return NextResponse.redirect(`${origin}${next}`)
      }
      
      // No error but also no session - something went wrong
      console.warn('⚠️ No session created after code exchange')
      return NextResponse.redirect(`${origin}/login?error=Failed to create session`)
      
    } catch (error) {
      console.error('❌ Unexpected error in OAuth callback:', error)
      return NextResponse.redirect(`${origin}/login?error=Authentication failed`)
    }
  }

  // No code provided - redirect to login
  console.warn('⚠️ OAuth callback called without code parameter')
  return NextResponse.redirect(`${origin}/login?error=No authorization code provided`)
}
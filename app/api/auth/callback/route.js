import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'
  
  console.log('OAuth callback received:', {
    hasCode: !!code,
    hasError: !!error,
    error: error,
    errorDescription: error_description
  })
  
  if (error) {
    console.error('OAuth error:', error, error_description)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error_description || error)}`, requestUrl.origin)
    )
  }
  
  if (code) {
    // Create server client with proper cookie handling for PKCE
    const cookieStore = cookies()
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
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing user sessions.
            }
          },
        },
      }
    )
    
    try {
      // Exchange code for session - the server client handles PKCE automatically
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('Code exchange error:', exchangeError)
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
        )
      }
      
      // Get the user to check if session was created
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        console.log('Session established for:', user.email)
        
        // Create profile if needed
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (!profile) {
          // Create new profile
          await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || 
                      user.user_metadata?.name || 
                      user.email.split('@')[0],
            role: 'SHOP_OWNER',
            subscription_status: 'active',
            onboarding_completed: false,
            onboarding_step: 0
          })
        }
        
        // Redirect to dashboard
        return NextResponse.redirect(new URL(next, requestUrl.origin))
      } else {
        // No session created
        return NextResponse.redirect(
          new URL('/login?error=Failed to create session', requestUrl.origin)
        )
      }
    } catch (err) {
      console.error('Callback processing error:', err)
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent('Authentication failed')}`, requestUrl.origin)
      )
    }
  }
  
  // No code or error, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
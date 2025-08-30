import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  console.log('🔄 OAuth callback - URL:', requestUrl.toString())
  console.log('🔄 OAuth callback - Code:', code ? 'present' : 'missing')
  console.log('🔄 OAuth callback - Next:', next)

  if (!code) {
    console.error('❌ OAuth callback - No code provided')
    return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin))
  }

  const cookieStore = cookies()
  
  console.log('🔄 Exchanging code for session...')
  
  // Following Supabase best practices - create supabase client with proper cookie handling
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
              console.log('🍪 Setting cookie:', name)
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            console.error('Cookie set error (can be ignored):', error.message)
          }
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('❌ OAuth callback error:', error.message)
    return NextResponse.redirect(new URL('/login?error=auth_callback_error', requestUrl.origin))
  }

  console.log('✅ OAuth callback successful - Session data:', data?.session ? 'present' : 'missing')
  
  if (data?.session) {
    // Get the session to verify it worked
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session?.user) {
      // Check if user has a profile
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      
      // Create profile if it doesn't exist (ignore PGRST116 - row not found error)
      if (!existingProfile && (!profileError || profileError.code === 'PGRST116')) {
        // Extract name from OAuth metadata
        const metadata = session.user.user_metadata || {}
        const fullName = metadata.full_name || metadata.name || session.user.email.split('@')[0]
        
        // Create minimal profile - dashboard will handle onboarding
        const { error: createError } = await supabase
          .from('profiles')
          .upsert({
            id: session.user.id,
            email: session.user.email,
            full_name: fullName,
            first_name: metadata.given_name || metadata.first_name || '',
            last_name: metadata.family_name || metadata.last_name || '',
            avatar_url: metadata.avatar_url || metadata.picture || '',
            role: 'CLIENT', // Start as client, upgrade during onboarding
            onboarding_completed: false,
            onboarding_step: 0,
            subscription_tier: 'trial',
            subscription_status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id',
            ignoreDuplicates: false
          })
        
        if (createError) {
          console.error('Failed to create profile:', createError)
          // Don't block login even if profile creation fails
        }
      }
    }
  }

  console.log('✅ Redirecting to:', next)
  
  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
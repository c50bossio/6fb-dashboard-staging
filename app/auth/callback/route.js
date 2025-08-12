import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  console.log('🔐 OAuth callback received:', {
    hasCode: !!code,
    hasError: !!error,
    next,
    error,
    errorDescription
  })

  // Handle OAuth errors
  if (error) {
    console.error('❌ OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
    )
  }

  if (code) {
    try {
      const supabase = createClient()
      
      // Exchange the code for a session
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('❌ Code exchange error:', exchangeError)
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
        )
      }

      console.log('✅ OAuth session created for:', data?.user?.email)

      // Check if user profile exists, create if not
      if (data?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()

        if (profileError && profileError.code === 'PGRST116') {
          // Profile doesn't exist, create it
          console.log('📝 Creating profile for OAuth user')
          
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email,
              full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || 'User',
              avatar_url: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture,
              role: 'CLIENT', // Default role for OAuth users
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (insertError) {
            console.error('❌ Profile creation error:', insertError)
            // Continue anyway - user is authenticated
          } else {
            console.log('✅ Profile created successfully')
          }
        } else if (profile) {
          console.log('✅ Existing profile found for:', profile.email)
        }
      }

      // Redirect to the specified next URL or dashboard
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    } catch (error) {
      console.error('❌ OAuth callback error:', error)
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent('Authentication failed. Please try again.')}`, requestUrl.origin)
      )
    }
  }

  // No code provided
  console.error('❌ No authorization code provided')
  return NextResponse.redirect(
    new URL('/login?error=No%20authorization%20code%20provided', requestUrl.origin)
  )
}
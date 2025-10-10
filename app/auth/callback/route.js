import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

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
      
      // Exchange the code for a session - Supabase handles everything
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('❌ Code exchange error:', exchangeError)
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
        )
      }

      // Supabase Auth handles user creation and metadata
      // Our database trigger will create the profile automatically
      
      // Check if profile exists (in case trigger didn't fire)
      if (data?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single()

        // If profile doesn't exist and trigger didn't create it, create it manually
        if (profileError && profileError.code === 'PGRST116') {
          console.warn('⚠️ Profile not created by trigger, creating manually...')
          
          const userMetadata = data.user.user_metadata || {}
          
          // Extract name from OAuth metadata with fallbacks
          const fullName = userMetadata.full_name || 
                          userMetadata.name || 
                          userMetadata.display_name ||
                          `${userMetadata.given_name || ''} ${userMetadata.family_name || ''}`.trim() ||
                          data.user.email?.split('@')[0] || 
                          'User'
          
          // Extract avatar URL
          const avatarUrl = userMetadata.avatar_url || 
                           userMetadata.picture || 
                           userMetadata.profile_picture ||
                           null

          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email,
              full_name: fullName,
              first_name: userMetadata.given_name || null,
              last_name: userMetadata.family_name || null,
              avatar_url: avatarUrl,
              role: 'CLIENT', // Default role
              subscription_tier: 'free',
              subscription_status: 'trial',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (insertError) {
            console.error('❌ Manual profile creation error:', insertError)
            // Continue anyway - user is still authenticated
          }
        }
      }

      // Redirect to dashboard - user is now authenticated with profile
      return NextResponse.redirect(new URL(next, requestUrl.origin))
      
    } catch (error) {
      console.error('❌ OAuth callback error:', error)
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent('Authentication failed. Please try again.')}`, requestUrl.origin)
      )
    }
  }

  // No code provided
  return NextResponse.redirect(
    new URL('/login?error=No%20authorization%20code%20provided', requestUrl.origin)
  )
}
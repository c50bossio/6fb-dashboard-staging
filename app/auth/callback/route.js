import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const cookieStore = cookies()
    
    // Create the redirect response FIRST
    const redirectUrl = `${origin}/dashboard`
    const response = NextResponse.redirect(redirectUrl)
    
    // Create Supabase client that will set cookies on the RESPONSE
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          },
          set(name, value, options) {
            // Set cookie on both the cookieStore AND the response
            cookieStore.set({ name, value, ...options })
            response.cookies.set({ name, value, ...options })
          },
          remove(name, options) {
            // Remove cookie from both
            cookieStore.set({ name, value: '', ...options })
            response.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )

    // Exchange code for session - cookies will be set on the response
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
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
        
        // Return the response with cookies attached
        return response
      }
    }
  }

  // Auth failed or no code - redirect to login
  return NextResponse.redirect(`${origin}/login`)
}
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  
  console.log('🔐 OAuth callback API route called with code:', !!code)

  if (code) {
    const cookieStore = cookies()
    
    // Debug: Check what cookies are available
    console.log('🍪 Available cookies:', cookieStore.getAll().map(c => c.name))
    
    // Create Supabase client with proper cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            const cookie = cookieStore.get(name)
            console.log(`🔍 Looking for cookie: ${name}, found:`, !!cookie?.value)
            return cookie?.value
          },
          set(name, value, options) {
            try {
              // Enhanced cookie options for better session persistence
              const enhancedOptions = {
                ...options,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                // Ensure proper domain handling
                domain: process.env.NODE_ENV === 'production' ? '.bookedbarber.com' : undefined
              }
              cookieStore.set({ name, value, ...enhancedOptions })
              console.log(`✅ Set cookie: ${name} with options:`, enhancedOptions)
            } catch (error) {
              console.error(`❌ Failed to set cookie ${name}:`, error)
            }
          },
          remove(name, options) {
            try {
              const enhancedOptions = {
                ...options,
                path: '/',
                domain: process.env.NODE_ENV === 'production' ? '.bookedbarber.com' : undefined
              }
              cookieStore.set({ name, value: '', ...enhancedOptions })
              console.log(`🗑️ Removed cookie: ${name}`)
            } catch (error) {
              console.error(`❌ Failed to remove cookie ${name}:`, error)
            }
          },
        },
      }
    )
    
    try {
      // Exchange the code for a session - this will use the code verifier from cookies
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('❌ OAuth code exchange error:', error)
        return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
      }
      
      console.log('✅ OAuth session created for:', data?.user?.email)
      console.log('📊 User metadata:', data?.user?.user_metadata)
      console.log('🆔 User ID:', data?.user?.id)
      
      // Check/create profile and determine if this is a new signup
      let isNewUser = false
      
      if (data?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()
          
        if (profileError) {
          if (profileError.code === 'PGRST116') {
            // Profile doesn't exist, create it (new user registration)
            console.log('📝 Creating NEW profile for OAuth user:', data.user.email)
            isNewUser = true // Mark as new user for welcome flow
            
            const newProfile = {
              id: data.user.id,
              email: data.user.email,
              full_name: data.user.user_metadata?.full_name || 
                       data.user.user_metadata?.name || 
                       data.user.email?.split('@')[0] || 
                       'User',
              avatar_url: data.user.user_metadata?.avatar_url || 
                         data.user.user_metadata?.picture || 
                         null,
              role: 'SHOP_OWNER', // Default role for barbershop app
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
            
            console.log('📝 Profile data to insert:', newProfile)
            
            const { error: insertError } = await supabase
              .from('profiles')
              .insert(newProfile)
              
            if (insertError) {
              console.error('❌ Profile creation error:', insertError)
              // Don't fail the whole flow, just log the error
              // The user is authenticated, they can update their profile later
            } else {
              console.log('✅ Profile created successfully for new user')
              
              // TODO: Send welcome email
              // await sendWelcomeEmail(data.user.email, newProfile.full_name)
            }
          } else {
            console.error('❌ Profile query error:', profileError)
          }
        } else {
          console.log('✅ Existing profile found for:', profile.email)
          
          // Check if profile is incomplete (needs onboarding)
          if (!profile.shop_name || !profile.shop_id) {
            console.log('📋 Profile needs completion - redirecting to onboarding')
            isNewUser = true // Treat incomplete profiles as needing onboarding
          }
        }
      }
      
      // Determine where to redirect based on user status
      const redirectUrl = isNewUser 
        ? '/welcome' // New users go to welcome/onboarding page
        : next       // Existing users go to their intended destination
      
      console.log('🚀 Redirecting to:', redirectUrl, isNewUser ? '(NEW USER)' : '(EXISTING USER)')
      
      // Create redirect response with proper headers
      const response = NextResponse.redirect(new URL(redirectUrl, requestUrl.origin))
      
      // Ensure session cookies are properly set on the response
      const sessionCookies = cookieStore.getAll().filter(c => 
        c.name.includes('sb-') || c.name.includes('supabase')
      )
      
      console.log('📦 Setting session cookies on response:', sessionCookies.map(c => c.name))
      
      // Add cache control headers to ensure fresh session
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
      
      return response
    } catch (error) {
      console.error('❌ OAuth callback error:', error)
      return NextResponse.redirect(new URL('/login?error=callback_failed', requestUrl.origin))
    }
  }

  // No code, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
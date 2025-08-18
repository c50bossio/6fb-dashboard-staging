import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'

export async function GET(request) {
  console.log('🔐 OAuth callback handler invoked')
  
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  
  // Use the correct origin for production
  const origin = process.env.NODE_ENV === 'production' 
    ? 'https://www.bookedbarber.com'
    : requestUrl.origin
  
  console.log('📍 Callback params:', {
    hasCode: !!code,
    hasError: !!error,
    next,
    origin,
    fullUrl: requestUrl.toString()
  })
  
  // Handle OAuth errors
  if (error) {
    console.error('❌ OAuth error from provider:', error, errorDescription)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}&message=${encodeURIComponent(errorDescription || 'Authentication failed')}`)
  }

  if (code) {
    try {
      const supabase = createClient()
      
      console.log('🔄 Exchanging code for session...')
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('❌ OAuth exchange error:', exchangeError.message)
        return NextResponse.redirect(`${origin}/login?error=oauth_failed&message=${encodeURIComponent(exchangeError.message)}`)
      }
      
      console.log('✅ Code exchanged successfully')
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('❌ Error getting user:', userError.message)
        return NextResponse.redirect(`${origin}/login?error=user_fetch_failed`)
      }
      
      if (user) {
        console.log('👤 User authenticated:', user.email)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('⚠️ Profile fetch error:', profileError)
        }
        
        if (!profile) {
          console.log('📝 Creating new profile for user')
          const { error: insertError } = await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
            role: 'SHOP_OWNER',
            created_at: new Date().toISOString()
          })
          
          if (insertError) {
            console.error('❌ Profile creation error:', insertError)
          }
          return NextResponse.redirect(`${origin}/welcome`)
        }
        
        // Check if profile needs onboarding
        if (!profile.shop_name) {
          console.log('🎯 Profile needs onboarding')
          return NextResponse.redirect(`${origin}/welcome`)
        }
        
        console.log('✅ Authentication complete, redirecting to:', next)
        return NextResponse.redirect(`${origin}${next}`)
      } else {
        console.error('❌ No user after code exchange')
        return NextResponse.redirect(`${origin}/login?error=no_user`)
      }
    } catch (error) {
      console.error('❌ Unexpected error in OAuth callback:', error)
      return NextResponse.redirect(`${origin}/login?error=unexpected&message=${encodeURIComponent(error.message || 'An unexpected error occurred')}`)
    }
  }

  console.log('⚠️ No code parameter in callback, redirecting to login')
  return NextResponse.redirect(`${origin}/login?error=no_code`)
}
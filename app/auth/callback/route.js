import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  console.log('🔐 OAuth callback route handler - Code:', code ? 'received' : 'missing')
  console.log('🌐 Origin:', origin)
  
  if (code) {
    try {
      const supabase = createClient()
      
      console.log('🔄 Exchanging code for session...')
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('❌ Code exchange error:', error.message)
        if (error.code === 'flow_state_expired' || error.code === 'flow_state_not_found') {
          console.log('⚠️ Flow state expired - redirecting to restart OAuth')
          return NextResponse.redirect(new URL('/pricing?error=oauth_expired', origin))
        }
        return NextResponse.redirect(new URL('/pricing?error=auth_failed', origin))
      }
      
      if (data?.session) {
        console.log('✅ Session established for user:', data.session.user.email)
        console.log('📝 Session tokens:', {
          access_token: data.session.access_token ? 'present' : 'missing',
          refresh_token: data.session.refresh_token ? 'present' : 'missing'
        })
        
        console.log('🔍 Checking user profile and subscription...')
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, role, subscription_status, stripe_customer_id, shop_name, onboarding_completed')
          .eq('email', data.session.user.email)
          .single()
        
        if (profile && profile.subscription_status === 'active') {
          console.log('✅ User has active subscription:', {
            role: profile.role,
            status: profile.subscription_status,
            hasStripeId: !!profile.stripe_customer_id,
            hasShopName: !!profile.shop_name,
            onboardingCompleted: profile.onboarding_completed
          })
          
          // Check if user has completed onboarding
          if (profile.onboarding_completed === false) {
            console.log('🚨 User has not completed onboarding, redirecting to welcome')
            const welcomeUrl = new URL('/welcome', origin)
            welcomeUrl.searchParams.set('from', 'oauth_success')
            return NextResponse.redirect(welcomeUrl.toString())
          } else {
            console.log('✅ User onboarding complete, redirecting to dashboard')
            return NextResponse.redirect(new URL('/dashboard', origin))
          }
        }
        
        console.log('⚠️ No active subscription found - redirecting to payment')
        if (profileError) {
          console.log('Profile error:', profileError.message)
        }
        
        const plan = searchParams.get('plan') || 'shop'
        const billing = searchParams.get('billing') || 'monthly'
        
        console.log('📦 Plan data:', { plan, billing })
        
        const checkoutUrl = new URL('/api/stripe/checkout', origin)
        checkoutUrl.searchParams.set('plan', plan)
        checkoutUrl.searchParams.set('billing', billing)
        
        console.log('🔄 Redirecting to checkout:', checkoutUrl.toString())
        
        return NextResponse.redirect(checkoutUrl.toString())
      }
      
      console.error('❌ No session in response data')
      return NextResponse.redirect(new URL('/pricing?error=no_session', origin))
      
    } catch (error) {
      console.error('❌ OAuth callback error:', error)
      return NextResponse.redirect(new URL('/pricing?error=callback_failed', origin))
    }
  }
  
  console.error('❌ No authorization code received')
  return NextResponse.redirect(new URL('/pricing?error=no_code', origin))
}
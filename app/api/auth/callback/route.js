// Simplified OAuth callback following Supabase best practices
import { createClient } from '@/lib/supabase/server-client'
import { NextResponse } from 'next/server'

// Force Node.js runtime to support Supabase dependencies
export const runtime = 'nodejs'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const origin = requestUrl.origin

  if (code) {
    const supabase = createClient()
    
    // Simple exchange - let Supabase handle all PKCE complexity
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('OAuth exchange error:', error.message)
      // Redirect to error page with error details
      return NextResponse.redirect(`${origin}/login?error=oauth_failed&message=${encodeURIComponent(error.message)}`)
    }
    
    // Successful authentication - check if user needs onboarding
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Check if user exists in our users table (not profiles - using correct table)
      const { data: userData } = await supabase
        .from('users')
        .select('subscription_status, subscription_tier, onboarding_completed')
        .eq('id', user.id)
        .single()
      
      // If user doesn't exist, create them
      if (!userData) {
        await supabase.from('users').insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email?.split('@')[0],
          role: 'SHOP_OWNER',
          created_at: new Date().toISOString()
        })
      }
      
      // Check subscription status
      const hasActiveSubscription = userData?.subscription_status === 'active'
      const needsOnboarding = !userData?.onboarding_completed
      
      // Redirect logic:
      // 1. No subscription -> go to pricing page
      // 2. Has subscription but needs onboarding -> go to welcome/onboarding
      // 3. Has subscription and completed onboarding -> go to dashboard
      
      if (!hasActiveSubscription) {
        // No active subscription - redirect to pricing
        return NextResponse.redirect(`${origin}/subscribe?source=oauth`)
      }
      
      if (needsOnboarding) {
        // Has subscription but needs onboarding
        return NextResponse.redirect(`${origin}/welcome`)
      }
      
      // Has subscription and completed onboarding - go to requested page or dashboard
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // No code present, redirect to login
  return NextResponse.redirect(`${origin}/login`)
}
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Debug endpoint to manually create a session for testing
 * This should only be used in development
 */
export async function POST(request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Only available in development' }, { status: 403 })
  }
  
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }
    
    
    // For development, we'll create a manual redirect to welcome or dashboard
    // based on the user's actual status
    const supabase = createClient()
    
    // Look up user profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()
    
    if (error || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Determine where user should go based on their status
    let redirectUrl = '/dashboard' // default
    
    if (profile.subscription_status === 'active') {
      if (profile.onboarding_completed) {
        redirectUrl = '/dashboard'
      } else {
        redirectUrl = '/welcome?from=manual_login'
      }
    } else if (profile.stripe_customer_id) {
      redirectUrl = '/dashboard?subscription_status=inactive'
    } else {
      redirectUrl = '/welcome?from=manual_login'
    }
    
    return NextResponse.json({
      success: true,
      profile: {
        email: profile.email,
        subscription_status: profile.subscription_status,
        onboarding_completed: profile.onboarding_completed,
        has_stripe_customer: !!profile.stripe_customer_id
      },
      redirect_url: redirectUrl,
      message: `User should be redirected to: ${redirectUrl}`
    })
    
  } catch (error) {
    console.error('💥 Manual login error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
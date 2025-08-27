import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    
    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 })
    }

    // Use service role key for database access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    // Check profiles table for user with this email
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        subscription_tier,
        subscription_status,
        role,
        shop_id,
        barbershop_id,
        created_at,
        updated_at
      `)
      .eq('email', email)
      .single()
    
    if (userError) {
      if (userError.code === 'PGRST116') {
        return NextResponse.json({ 
          error: 'User not found',
          email: email,
          message: 'No user exists with this email address in the profiles table'
        }, { status: 404 })
      }
      
      console.error('Error fetching user data:', userError)
      return NextResponse.json(
        { error: 'Database error', details: userError.message },
        { status: 500 }
      )
    }

    // Check if there are any Stripe-related tables
    let stripeData = null
    try {
      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userData.id)
      
      if (!subError && subscriptions) {
        stripeData = subscriptions
      }
    } catch (e) {
      // Subscriptions table might not exist
      console.log('Subscriptions table not found or accessible')
    }

    // Also check auth.users table for Stripe customer info
    let authUserData = null
    try {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userData.id)
      if (!authError && authUser) {
        authUserData = {
          id: authUser.user.id,
          email: authUser.user.email,
          created_at: authUser.user.created_at,
          user_metadata: authUser.user.user_metadata,
          app_metadata: authUser.user.app_metadata
        }
      }
    } catch (e) {
      console.log('Could not fetch auth user data')
    }

    // Pricing tier mapping
    const pricingTiers = {
      'INDIVIDUAL': { name: 'Individual', monthlyPrice: 49, yearlyPrice: 470 },
      'SHOP_OWNER': { name: 'Shop Owner', monthlyPrice: 99, yearlyPrice: 950 },
      'PROFESSIONAL': { name: 'Shop Owner', monthlyPrice: 99, yearlyPrice: 950 }, // Legacy mapping
      'ENTERPRISE': { name: 'Enterprise', monthlyPrice: 249, yearlyPrice: 2390 },
      'FREE': { name: 'Free', monthlyPrice: 0, yearlyPrice: 0 }
    }

    const currentTier = userData.subscription_tier?.toUpperCase() || 'FREE'
    const pricingInfo = pricingTiers[currentTier] || pricingTiers['FREE']

    const response = {
      found: true,
      user: userData,
      auth_user: authUserData,
      stripe_subscriptions: stripeData,
      subscription_summary: {
        tier: userData.subscription_tier || 'free',
        status: userData.subscription_status || 'inactive',
        hasActiveSubscription: userData.subscription_status === 'active',
        role: userData.role,
        isSubscribedBarber: userData.role === 'BARBER' && userData.subscription_status === 'active'
      },
      pricing_info: {
        tier_name: pricingInfo.name,
        monthly_price: pricingInfo.monthlyPrice,
        yearly_price: pricingInfo.yearlyPrice,
        raw_tier: userData.subscription_tier
      },
      message: userData.subscription_status === 'active' ? 
        `✅ ${email} has an ACTIVE ${pricingInfo.name} subscription ($${pricingInfo.monthlyPrice}/month)` :
        `❌ ${email} does not have an active subscription (status: ${userData.subscription_status || 'inactive'})`
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('User subscription check error:', error)
    return NextResponse.json(
      { error: 'Server error', details: error.message },
      { status: 500 }
    )
  }
}
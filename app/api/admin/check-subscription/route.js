import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    
    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 })
    }

    // Use service role key for admin access
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
        barbershop_id,
        barberbarbershop_id,
        created_at,
        updated_at
      `)
      .eq('email', email)
      .single()
    
    if (userError) {
      if (userError.code === 'PGRST116') {
        return NextResponse.json({ 
          error: 'User not found',
          email: email 
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
      
    }

    const response = {
      user: userData,
      stripe_subscriptions: stripeData,
      subscription_summary: {
        tier: userData.subscription_tier || 'free',
        status: userData.subscription_status || 'inactive',
        hasActiveSubscription: userData.subscription_status === 'active',
        role: userData.role
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Admin subscription check error:', error)
    return NextResponse.json(
      { error: 'Server error', details: error.message },
      { status: 500 }
    )
  }
}
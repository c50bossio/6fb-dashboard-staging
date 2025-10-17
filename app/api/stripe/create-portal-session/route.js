import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/lib/supabase/UNIFIED_CLIENT'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20'
})

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    // Get user's profile data (correct table name)
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, full_name, subscription_tier')
      .eq('id', user.id)
      .single()
    
    if (userError) {
      console.error('Error fetching user profile:', userError)
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      )
    }
    
    // Check if Stripe is properly configured
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('placeholder')) {
      
      return NextResponse.json({ 
        url: '/dashboard/billing',
        message: 'Redirecting to billing management page'
      })
    }
    
    let customerId = userData.stripe_customer_id
    
    // If no Stripe customer ID exists, create one
    if (!customerId) {

      const customer = await stripe.customers.create({
        email: userData.email,
        name: userData.full_name,
        metadata: {
          supabase_user_id: user.id,
          subscription_tier: userData.subscription_tier || 'free'
        }
      })
      
      customerId = customer.id
      
      // Update the user's profile with the new Stripe customer ID
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
      
      if (updateError) {
        console.error('Error updating stripe_customer_id:', updateError)
        // Continue anyway - we can still create the portal session
      }
    }
    
    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'}/dashboard/billing`,
    })
    
    return NextResponse.json({ url: session.url })
    
  } catch (error) {
    console.error('Portal session error:', error)
    
    // If error is due to missing Stripe config or portal configuration, redirect to billing page instead
    if (error.message?.includes('Invalid API Key') || 
        error.message?.includes('No API key') ||
        error.message?.includes('No configuration provided') ||
        error.message?.includes('default configuration has not been created') ||
        error.type === 'StripeInvalidRequestError') {

      return NextResponse.json({ 
        url: '/dashboard/billing',
        message: 'Using local billing management'
      })
    }
    
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
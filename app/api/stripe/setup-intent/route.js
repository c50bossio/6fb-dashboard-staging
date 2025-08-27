import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'
import Stripe from 'stripe'

// Check if Stripe is properly configured
const stripeKey = process.env.STRIPE_SECRET_KEY;
const isStripeConfigured = stripeKey && 
  stripeKey !== 'undefined' && 
  !stripeKey.includes('placeholder') && 
  !stripeKey.includes('disabled');

// Only initialize Stripe if we have valid keys
let stripe = null;
if (isStripeConfigured) {
  try {
    stripe = new Stripe(stripeKey, {
      apiVersion: '2024-06-20'
    });
  } catch (error) {
    console.error('Failed to initialize Stripe:', error.message);
    stripe = null;
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    
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
    if (!isStripeConfigured) {
      console.log('Stripe not configured - keys disabled or invalid')
      return NextResponse.json({ 
        error: 'Stripe not configured. Please contact support.',
        configured: false
      }, { status: 503 })
    }
    
    let customerId = userData.stripe_customer_id
    
    // If no Stripe customer ID exists, create one
    if (!customerId) {
      console.log('Creating new Stripe customer for user:', user.id)
      
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
        // Continue anyway - we can still create the setup intent
      }
    }
    
    // Create setup intent for collecting payment method
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session', // For future payments
      metadata: {
        user_id: user.id,
        purpose: 'payment_method_setup'
      }
    })
    
    return NextResponse.json({ 
      client_secret: setupIntent.client_secret,
      customer_id: customerId
    })
    
  } catch (error) {
    console.error('Setup intent error:', error)
    
    return NextResponse.json(
      { error: 'Failed to create setup intent' },
      { status: 500 }
    )
  }
}
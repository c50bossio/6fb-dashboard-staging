import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/lib/supabase/UNIFIED_CLIENT'

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

export async function GET(request) {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    // Get user's profile data
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single()
    
    if (userError || !userData?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer found' },
        { status: 404 }
      )
    }
    
    // Check if Stripe is properly configured
    if (!isStripeConfigured) {
      return NextResponse.json({ 
        paymentMethods: [],
        message: 'Stripe not configured',
        configured: false
      })
    }
    
    // Fetch payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: userData.stripe_customer_id,
      type: 'card',
    })
    
    const formattedMethods = paymentMethods.data.map(pm => ({
      id: pm.id,
      brand: pm.card.brand,
      last4: pm.card.last4,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year,
      isDefault: false // TODO: Determine default payment method
    }))
    
    return NextResponse.json({ paymentMethods: formattedMethods })
    
  } catch (error) {
    console.error('Payment methods error:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch payment methods' },
      { status: 500 }
    )
  }
}

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
    
    const { paymentMethodId, setAsDefault } = await request.json()
    
    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID required' },
        { status: 400 }
      )
    }
    
    // Get user's profile data
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()
    
    if (userError || !userData?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer found' },
        { status: 404 }
      )
    }
    
    // Check if Stripe is properly configured
    if (!isStripeConfigured) {
      return NextResponse.json({ 
        success: false,
        message: 'Stripe not configured',
        configured: false
      }, { status: 503 })
    }
    
    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: userData.stripe_customer_id,
    })
    
    // Set as default if requested
    if (setAsDefault) {
      await stripe.customers.update(userData.stripe_customer_id, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      })
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Payment method added successfully'
    })
    
  } catch (error) {
    console.error('Add payment method error:', error)
    
    return NextResponse.json(
      { error: 'Failed to add payment method' },
      { status: 500 }
    )
  }
}

export async function DELETE(request) {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const url = new URL(request.url)
    const paymentMethodId = url.searchParams.get('paymentMethodId')
    
    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID required' },
        { status: 400 }
      )
    }
    
    // Check if Stripe is properly configured
    if (!isStripeConfigured) {
      return NextResponse.json({ 
        success: false,
        message: 'Stripe not configured',
        configured: false
      }, { status: 503 })
    }
    
    // Detach payment method from customer
    await stripe.paymentMethods.detach(paymentMethodId)
    
    return NextResponse.json({ 
      success: true,
      message: 'Payment method removed successfully'
    })
    
  } catch (error) {
    console.error('Remove payment method error:', error)
    
    return NextResponse.json(
      { error: 'Failed to remove payment method' },
      { status: 500 }
    )
  }
}
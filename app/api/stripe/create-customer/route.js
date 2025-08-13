import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

// Force Node.js runtime to support Supabase and Stripe dependencies
export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy')

export async function POST(request) {
  try {
    const { email, name, metadata = {} } = await request.json()
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if customer already exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (profile?.stripe_customer_id) {
      // Return existing customer
      const customer = await stripe.customers.retrieve(profile.stripe_customer_id)
      return NextResponse.json({
        customer: {
          id: customer.id,
          email: customer.email,
          name: customer.name,
          created: customer.created
        },
        existing: true
      })
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email: email,
      name: name || user.user_metadata?.full_name || 'User',
      metadata: {
        user_id: user.id,
        ...metadata
      }
    })

    // Update profile with Stripe customer ID
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        stripe_customer_id: customer.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating profile with Stripe customer ID:', updateError)
      // Don't fail the request, customer is created
    }

    // Log the customer creation
    await supabase.rpc('log_security_event', {
      p_user_id: user.id,
      p_event_type: 'stripe_customer_created',
      p_details: { customer_id: customer.id }
    })

    return NextResponse.json({
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        created: customer.created
      },
      existing: false
    })

  } catch (error) {
    console.error('Stripe customer creation error:', error)
    
    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    )
  }
}
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server-client'

// Force Node.js runtime to support Supabase dependencies
export const runtime = 'nodejs'

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })
  : null

export async function POST(request) {
  try {
    const supabase = createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { customerId } = await request.json()
    
    // If no customerId provided, get from database
    let stripeCustomerId = customerId
    
    if (!stripeCustomerId) {
      const { data: userData } = await supabase
        .from('users')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single()
      
      stripeCustomerId = userData?.stripe_customer_id
    }
    
    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'No Stripe customer found. Please contact support.' },
        { status: 404 }
      )
    }

    // Create Stripe billing portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://bookbarber.com'}/billing`,
      configuration: process.env.STRIPE_PORTAL_CONFIG_ID, // Set after running setup script
    })

    return NextResponse.json({
      url: portalSession.url
    })

  } catch (error) {
    console.error('Portal session creation error:', error)
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: 'Invalid customer or configuration. Please contact support.' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create billing portal session. Please try again.' },
      { status: 500 }
    )
  }
}
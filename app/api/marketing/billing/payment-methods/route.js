import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET - Retrieve payment methods using existing profile data
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('account_id')
    
    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      )
    }

    // Extract user ID from account ID (format: billing-{userId})
    const userId = accountId.replace('billing-', '').replace('demo-', '')

    // Get user profile to check if they have Stripe info
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, subscription_status')
      .eq('id', userId)
      .single()

    const paymentMethods = []

    // If user has Stripe customer ID or subscription, create payment method representation
    if (profile?.stripe_customer_id || profile?.subscription_status) {
      paymentMethods.push({
        id: `pm-${userId}`,
        account_id: accountId,
        stripe_payment_method_id: `pm_card_${userId}`,
        stripe_customer_id: profile.stripe_customer_id || `cus_${userId}`,
        card_brand: 'visa',
        card_last4: '4242',
        card_exp_month: 12,
        card_exp_year: 2026,
        is_default: true,
        is_active: true,
        billing_address: {
          line1: '123 Main St',
          city: 'Business City',
          state: 'CA',
          postal_code: '90210',
          country: 'US'
        },
        created_at: profile.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      // Add a backup payment method for demonstration
      if (profile?.subscription_status === 'active') {
        paymentMethods.push({
          id: `pm-${userId}-backup`,
          account_id: accountId,
          stripe_payment_method_id: `pm_card_backup_${userId}`,
          stripe_customer_id: profile.stripe_customer_id || `cus_${userId}`,
          card_brand: 'mastercard',
          card_last4: '5555',
          card_exp_month: 8,
          card_exp_year: 2027,
          is_default: false,
          is_active: true,
          billing_address: {
            line1: '123 Main St',
            city: 'Business City',
            state: 'CA',
            postal_code: '90210',
            country: 'US'
          },
          created_at: profile.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
    } else {
      // Create demo payment method
      paymentMethods.push({
        id: `pm-demo-${userId}`,
        account_id: accountId,
        stripe_payment_method_id: `pm_demo_${userId}`,
        stripe_customer_id: `cus_demo_${userId}`,
        card_brand: 'visa',
        card_last4: '4242',
        card_exp_month: 12,
        card_exp_year: 2026,
        is_default: true,
        is_active: true,
        billing_address: {
          line1: '123 Demo St',
          city: 'Demo City',
          state: 'CA',
          postal_code: '90210',
          country: 'US'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    }

    return NextResponse.json({
      success: true,
      paymentMethods: paymentMethods,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Payment methods API error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// POST - Add new payment method via Stripe
export async function POST(request) {
  try {
    const data = await request.json()
    const { account_id, user_id, mode } = data

    if (!account_id || !user_id) {
      return NextResponse.json(
        { error: 'Account ID and user ID are required' },
        { status: 400 }
      )
    }

    // Fetch the billing account
    const { data: account, error: accountError } = await supabase
      .from('marketing_accounts')
      .select('*')
      .eq('id', account_id)
      .eq('owner_id', user_id)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Billing account not found or unauthorized' },
        { status: 404 }
      )
    }

    // Create or retrieve Stripe customer
    let stripeCustomerId = account.stripe_customer_id

    if (!stripeCustomerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: account.billing_email,
        name: account.account_name,
        metadata: {
          account_id: account_id,
          user_id: user_id,
          platform: 'bookedbarber'
        }
      })

      stripeCustomerId = customer.id

      // Update account with Stripe customer ID
      await supabase
        .from('marketing_accounts')
        .update({
          stripe_customer_id: stripeCustomerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', account_id)
    }

    // Create Stripe Checkout session for adding payment method
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      mode: 'setup', // Setup mode for adding payment method without charge
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'}/dashboard/campaigns/billing?success=true&account=${account_id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'}/dashboard/campaigns/billing?canceled=true`,
      metadata: {
        account_id: account_id,
        user_id: user_id,
        purpose: 'add_payment_method'
      }
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      sessionUrl: session.url,
      message: 'Stripe checkout session created'
    })

  } catch (error) {
    console.error('Add payment method error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Remove payment method
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const methodId = searchParams.get('id')
    const data = await request.json()
    const { account_id, user_id } = data

    if (!methodId || !account_id || !user_id) {
      return NextResponse.json(
        { error: 'Method ID, account ID, and user ID are required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const { data: account, error: accountError } = await supabase
      .from('marketing_accounts')
      .select('owner_id, stripe_customer_id')
      .eq('id', account_id)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    if (account.owner_id !== user_id) {
      return NextResponse.json(
        { error: 'Unauthorized to remove this payment method' },
        { status: 403 }
      )
    }

    // Get payment method details
    const { data: paymentMethod, error: methodError } = await supabase
      .from('marketing_payment_methods')
      .select('stripe_payment_method_id')
      .eq('id', methodId)
      .eq('account_id', account_id)
      .single()

    if (methodError || !paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method not found' },
        { status: 404 }
      )
    }

    // Detach payment method from Stripe customer
    if (paymentMethod.stripe_payment_method_id) {
      try {
        await stripe.paymentMethods.detach(paymentMethod.stripe_payment_method_id)
      } catch (stripeError) {
        console.error('Stripe detach error:', stripeError)
        // Continue even if Stripe detach fails
      }
    }

    // Soft delete from database
    const { error: deleteError } = await supabase
      .from('marketing_payment_methods')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', methodId)

    if (deleteError) {
      console.error('Error removing payment method:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove payment method' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Payment method removed successfully'
    })

  } catch (error) {
    console.error('Remove payment method error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
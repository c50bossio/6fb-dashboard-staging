import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

/**
 * POST /api/stripe/barber-account
 * Creates a Stripe Connected Account for individual barbers (booth rental model)
 */
export async function POST(request) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { barberId, barbershopId, email, businessType, accountType, chargeType, metadata } = body

    // Verify the request is for the authenticated user
    if (barberId !== user.id) {
      return NextResponse.json(
        { error: 'You can only create an account for yourself' },
        { status: 403 }
      )
    }

    // Verify barbershop exists and allows booth rental
    const { data: barbershop, error: shopError } = await supabase
      .from('barbershops')
      .select('*')
      .eq('id', barbershopId)
      .single()

    if (shopError || !barbershop) {
      return NextResponse.json(
        { error: 'Barbershop not found' },
        { status: 404 }
      )
    }

    if (barbershop.payment_model !== 'booth_rental' && barbershop.payment_model !== 'hybrid') {
      return NextResponse.json(
        { error: 'This barbershop does not support individual payment processing' },
        { status: 400 }
      )
    }

    // Check if barber already has a Stripe account
    const { data: existingAccount } = await supabase
      .from('stripe_connected_accounts')
      .select('*')
      .eq('user_id', barberId)
      .eq('account_owner_type', 'barber')
      .single()

    if (existingAccount && existingAccount.stripe_account_id) {
      // Return existing account
      return NextResponse.json({
        accountId: existingAccount.stripe_account_id,
        onboarding_url: null,
        message: 'Account already exists'
      })
    }

    // Create Stripe Express Connected Account for barber
    const account = await stripe.accounts.create({
      type: 'express', // Express for simpler onboarding
      country: 'US',
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: businessType || 'individual',
      metadata: {
        ...metadata,
        platform: 'BookedBarber',
        account_type: 'barber',
        barbershop_id: barbershopId,
        model: 'booth_rental'
      },
      settings: {
        payouts: {
          schedule: {
            interval: 'daily',
            delay_days: 2, // Standard 2-day delay
          },
        },
      },
    })

    // Save account to database
    const { error: insertError } = await supabase
      .from('stripe_connected_accounts')
      .insert({
        user_id: barberId,
        barbershop_id: barbershopId,
        stripe_account_id: account.id,
        account_type: 'express',
        account_owner_type: 'barber',
        charge_type: 'direct', // Direct charges for booth rental
        business_type: businessType || 'individual',
        onboarding_completed: false,
        charges_enabled: false,
        payouts_enabled: false,
        metadata: {
          barbershop_name: barbershop.name,
          barber_name: metadata?.barber_name,
          created_via: 'booth_rental_setup'
        }
      })

    if (insertError) {
      console.error('Error saving Stripe account:', insertError)
      // Note: We don't delete the Stripe account here as it's already created
      // This should be handled by a cleanup process
    }

    // Update barber profile
    await supabase
      .from('profiles')
      .update({
        has_own_payment_processing: true,
        payment_processing_status: 'pending',
        stripe_connected_account_id: account.id
      })
      .eq('id', barberId)

    // Create barber payment settings
    await supabase
      .from('barber_payment_settings')
      .upsert({
        barber_id: barberId,
        barbershop_id: barbershopId,
        processes_own_payments: true,
        payment_routing: 'barber_account',
        stripe_account_id: account.id,
        stripe_onboarding_complete: false,
        is_active: true
      }, {
        onConflict: 'barber_id,barbershop_id'
      })

    // Generate account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/shop/settings/payment-setup?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/shop/settings/payment-setup?setup_complete=true`,
      type: 'account_onboarding',
    })

    return NextResponse.json({
      accountId: account.id,
      onboarding_url: accountLink.url,
      message: 'Stripe account created successfully'
    })

  } catch (error) {
    console.error('Error creating barber Stripe account:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create payment account' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/stripe/barber-account
 * Gets the status of a barber's Stripe Connected Account
 */
export async function GET(request) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get barber's Stripe account
    const { data: account, error: accountError } = await supabase
      .from('stripe_connected_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('account_owner_type', 'barber')
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'No payment account found' },
        { status: 404 }
      )
    }

    // Get account status from Stripe
    const stripeAccount = await stripe.accounts.retrieve(account.stripe_account_id)

    // Update database with latest status
    await supabase
      .from('stripe_connected_accounts')
      .update({
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
        details_submitted: stripeAccount.details_submitted,
        onboarding_completed: stripeAccount.details_submitted && stripeAccount.charges_enabled,
        verification_status: stripeAccount.individual?.verification?.status,
        requirements: stripeAccount.requirements,
        capabilities: stripeAccount.capabilities,
        updated_at: new Date().toISOString()
      })
      .eq('id', account.id)

    // Update profile status
    if (stripeAccount.charges_enabled) {
      await supabase
        .from('profiles')
        .update({
          payment_processing_status: 'active'
        })
        .eq('id', user.id)
    }

    return NextResponse.json({
      accountId: account.stripe_account_id,
      status: {
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
        details_submitted: stripeAccount.details_submitted,
        requirements: stripeAccount.requirements,
      },
      dashboardUrl: stripeAccount.details_submitted 
        ? `https://dashboard.stripe.com/${account.stripe_account_id}`
        : null
    })

  } catch (error) {
    console.error('Error fetching barber Stripe account:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payment account' },
      { status: 500 }
    )
  }
}
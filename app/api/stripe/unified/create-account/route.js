import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

/**
 * POST /api/stripe/unified/create-account
 * 
 * Unified endpoint for creating Stripe Connect accounts
 * Consolidates account creation logic from multiple components
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { 
      barbershop_id, 
      email, 
      business_type = 'individual',
      return_url
    } = body

    if (!barbershop_id || !email) {
      return NextResponse.json(
        { error: 'barbershop_id and email are required' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient({ cookies })

    // Verify user authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get barbershop information
    const { data: barbershop, error: shopError } = await supabase
      .from('barbershops')
      .select('id, name, owner_id, address, city, state, zip_code')
      .eq('id', barbershop_id)
      .single()

    if (shopError || !barbershop) {
      return NextResponse.json(
        { error: 'Barbershop not found' },
        { status: 404 }
      )
    }

    // Verify user has permission to create Connect account
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, barbershop_id, barbershop_id, role')
      .eq('id', session.user.id)
      .single()

    const hasPermission = profile?.barbershop_id === barbershop_id || 
                         profile?.barbershop_id === barbershop_id ||
                         profile?.role === 'SUPER_ADMIN' ||
                         barbershop.owner_id === session.user.id

    if (!hasPermission) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if Connect account already exists
    const { data: existingAccount } = await supabase
      .from('stripe_accounts')
      .select('account_id')
      .eq('barbershop_id', barbershop_id)
      .single()

    if (existingAccount?.account_id) {
      return NextResponse.json(
        { error: 'Stripe Connect account already exists for this barbershop' },
        { status: 409 }
      )
    }

    // Create Stripe Connect account
    const connectAccount = await stripe.accounts.create({
      type: 'standard', // Standard accounts give full control to barbershop
      email: email,
      business_type: business_type,
      business_profile: {
        name: barbershop.name,
        mcc: '7230', // Barber shops MCC
        url: `https://bookedbarber.com/shop/${barbershop_id}`
      },
      metadata: {
        barbershop_id: barbershop_id,
        created_by: session.user.id,
        platform: 'bookedbarber'
      }
    })

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: connectAccount.id,
      refresh_url: return_url || `${request.nextUrl.origin}/dashboard/settings#payments`,
      return_url: return_url || `${request.nextUrl.origin}/dashboard/settings#payments`,
      type: 'account_onboarding'
    })

    // Store Connect account information in database
    const { data: savedAccount, error: saveError } = await supabase
      .from('stripe_accounts')
      .upsert({
        barbershop_id: barbershop_id,
        account_id: connectAccount.id,
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
        onboarding_completed: false,
        created_by: session.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving Connect account to database:', saveError)
      // Try to delete the Stripe account since we couldn't save it
      try {
        await stripe.accounts.del(connectAccount.id)
      } catch (deleteError) {
        console.error('Error deleting orphaned Stripe account:', deleteError)
      }
      throw new Error('Failed to save Connect account information')
    }

    return NextResponse.json({
      success: true,
      account_id: connectAccount.id,
      onboarding_url: accountLink.url,
      barbershop_id: barbershop_id,
      message: 'Stripe Connect account created successfully'
    })

  } catch (error) {
    console.error('Error creating Stripe Connect account:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create Connect account',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
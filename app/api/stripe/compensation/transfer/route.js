/**
 * Stripe Compensation Transfer API
 * Handles Stripe transfers from shop to barber for commission payments
 * Uses Stripe Connect for platform payments
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
})

export const runtime = 'nodejs'

/**
 * POST - Create Stripe transfer to barber
 * Body:
 * {
 *   amount: number (in cents),
 *   destination: string (barber's Stripe account ID),
 *   currency?: string,
 *   transfer_group?: string,
 *   metadata?: object
 * }
 */
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      amount, 
      destination, 
      currency = 'usd',
      transfer_group,
      metadata = {} 
    } = body

    // Validate required fields
    if (!amount || amount <= 0) {
      return NextResponse.json({ 
        error: 'Valid amount required (in cents)' 
      }, { status: 400 })
    }

    if (!destination) {
      return NextResponse.json({ 
        error: 'Destination Stripe account ID required' 
      }, { status: 400 })
    }

    // Get shop's barbershop ID for validation
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.shop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    // Check permissions
    if (!['SHOP_OWNER', 'MANAGER', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get shop's Stripe account info
    const { data: shopStripe } = await supabase
      .from('barbershops')
      .select(`
        stripe_accounts (
          account_id,
          charges_enabled,
          payouts_enabled
        )
      `)
      .eq('id', profile.shop_id)
      .single()

    if (!shopStripe?.stripe_accounts?.[0]) {
      return NextResponse.json({ 
        error: 'Shop must have Stripe Connect account configured' 
      }, { status: 400 })
    }

    const shopAccountId = shopStripe.stripe_accounts[0].account_id

    // Verify destination account exists and can receive transfers
    try {
      const destinationAccount = await stripe.accounts.retrieve(destination)
      
      if (!destinationAccount.charges_enabled) {
        return NextResponse.json({ 
          error: 'Destination account cannot receive charges' 
        }, { status: 400 })
      }
    } catch (error) {
      return NextResponse.json({ 
        error: 'Invalid destination account' 
      }, { status: 400 })
    }

    // Create transfer
    const transferData = {
      amount,
      currency,
      destination,
      metadata: {
        ...metadata,
        shop_account_id: shopAccountId,
        transfer_type: 'compensation',
        created_by: user.id,
        barbershop_id: profile.shop_id
      }
    }

    // Add transfer group if provided
    if (transfer_group) {
      transferData.transfer_group = transfer_group
    }

    const transfer = await stripe.transfers.create(transferData)

    // Record transfer in our database
    const { error: dbError } = await supabase
      .from('compensation_payments')
      .insert({
        barbershop_id: profile.shop_id,
        barber_id: metadata.barber_id,
        amount: amount / 100, // Convert cents to dollars
        stripe_transfer_id: transfer.id,
        status: 'completed',
        payment_method: 'stripe_transfer',
        calculation_type: metadata.payment_type || 'manual',
        period_start: metadata.period_start,
        period_end: metadata.period_end,
        metadata: {
          stripe_transfer: {
            id: transfer.id,
            amount: transfer.amount,
            currency: transfer.currency,
            destination: transfer.destination,
            created: transfer.created,
            transfer_group: transfer.transfer_group
          },
          calculation_breakdown: metadata.calculation_breakdown
        },
        processed_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })

    if (dbError) {
      console.error('Error recording transfer in database:', dbError)
      // Transfer succeeded but recording failed - log for manual reconciliation
    }

    return NextResponse.json({
      success: true,
      transfer_id: transfer.id,
      amount: transfer.amount,
      currency: transfer.currency,
      destination: transfer.destination,
      status: 'completed',
      created: transfer.created,
      transfer_group: transfer.transfer_group
    })

  } catch (error) {
    console.error('Error in POST /api/stripe/compensation/transfer:', error)
    
    // Handle Stripe-specific errors
    if (error.type === 'StripeCardError' || error.type === 'StripeInvalidRequestError') {
      return NextResponse.json({ 
        error: 'Stripe error',
        details: error.message,
        code: error.code 
      }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Transfer failed', details: error.message }, 
      { status: 500 }
    )
  }
}

/**
 * GET - Retrieve transfer details
 * Query params:
 * - transferId: Stripe transfer ID
 */
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const transferId = searchParams.get('transferId')

    if (!transferId) {
      return NextResponse.json({ 
        error: 'transferId required' 
      }, { status: 400 })
    }

    // Get transfer from Stripe
    const transfer = await stripe.transfers.retrieve(transferId)

    // Get transfer record from our database
    const { data: dbRecord } = await supabase
      .from('compensation_payments')
      .select('*')
      .eq('stripe_transfer_id', transferId)
      .single()

    return NextResponse.json({
      stripe_transfer: transfer,
      database_record: dbRecord,
      status: transfer.amount === transfer.amount_reversed ? 'reversed' : 'completed'
    })

  } catch (error) {
    console.error('Error in GET /api/stripe/compensation/transfer:', error)
    
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json({ 
        error: 'Transfer not found',
        details: error.message 
      }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Failed to retrieve transfer', details: error.message }, 
      { status: 500 }
    )
  }
}
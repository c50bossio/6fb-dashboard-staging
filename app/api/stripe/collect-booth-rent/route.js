/**
 * Stripe Booth Rent Collection API
 * Handles automated booth rent collection from barbers
 * Uses Stripe Payment Intents for card charges
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
})

export const runtime = 'nodejs'

/**
 * POST - Collect booth rent from barber
 * Body:
 * {
 *   amount: number (in cents),
 *   customer: string (barber's Stripe customer ID),
 *   payment_method?: string,
 *   confirm?: boolean,
 *   description?: string,
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
    let { 
      amount, 
      customer,
      payment_method,
      confirm = true,
      description = 'Booth rent payment',
      metadata = {} 
    } = body

    // Validate required fields
    if (!amount || amount <= 0) {
      return NextResponse.json({ 
        error: 'Valid amount required (in cents)' 
      }, { status: 400 })
    }

    if (!customer) {
      return NextResponse.json({ 
        error: 'Customer ID required' 
      }, { status: 400 })
    }

    // Get shop's barbershop ID for validation
    const { data: profile } = await supabase
      .from('profiles')
      .select('barbershop_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    // Check permissions
    if (!['SHOP_OWNER', 'MANAGER', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Verify customer exists and get payment method if not provided
    let customerData
    try {
      customerData = await stripe.customers.retrieve(customer)
      
      // If no payment method specified, use customer's default
      if (!payment_method) {
        const paymentMethods = await stripe.paymentMethods.list({
          customer: customer,
          type: 'card'
        })
        
        if (paymentMethods.data.length === 0) {
          return NextResponse.json({ 
            error: 'No payment methods found for customer' 
          }, { status: 400 })
        }
        
        payment_method = paymentMethods.data[0].id
      }
    } catch (error) {
      return NextResponse.json({ 
        error: 'Invalid customer ID' 
      }, { status: 400 })
    }

    // Get barber ID from metadata or look it up
    let barberId = metadata.barber_id
    if (!barberId) {
      // Look up barber by customer ID
      const { data: barberProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customer)
        .single()
      
      barberId = barberProfile?.id
    }

    if (!barberId) {
      return NextResponse.json({ 
        error: 'Cannot identify barber for this customer' 
      }, { status: 400 })
    }

    // Create payment intent
    const paymentIntentData = {
      amount,
      currency: 'usd',
      customer,
      payment_method,
      confirm,
      description,
      metadata: {
        ...metadata,
        barbershop_id: profile.barbershop_id,
        barber_id: barberId,
        payment_type: 'booth_rent',
        collected_by: user.id
      }
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData)

    // Record rent payment in our database
    const rentPaymentData = {
      barbershop_id: profile.barbershop_id,
      barber_id: barberId,
      rent_amount: amount / 100, // Convert cents to dollars
      period: metadata.period || 'monthly',
      due_date: metadata.due_date || new Date().toISOString().split('T')[0],
      status: paymentIntent.status === 'succeeded' ? 'paid' : 'pending',
      paid_amount: paymentIntent.status === 'succeeded' ? amount / 100 : 0,
      paid_date: paymentIntent.status === 'succeeded' ? new Date().toISOString() : null,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_customer_id: customer,
      notes: `Collected via Stripe Payment Intent: ${paymentIntent.id}`,
      created_at: new Date().toISOString()
    }

    const { data: rentRecord, error: dbError } = await supabase
      .from('booth_rent_payments')
      .insert(rentPaymentData)
      .select()
      .single()

    if (dbError) {
      console.error('Error recording rent payment in database:', dbError)
      // Payment might have succeeded but recording failed - log for manual reconciliation
    }

    return NextResponse.json({
      success: true,
      payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      customer: paymentIntent.customer,
      created: paymentIntent.created,
      rent_record_id: rentRecord?.id,
      requires_action: paymentIntent.status === 'requires_action',
      client_secret: paymentIntent.status === 'requires_action' ? paymentIntent.client_secret : undefined
    })

  } catch (error) {
    console.error('Error in POST /api/stripe/collect-booth-rent:', error)
    
    // Handle Stripe-specific errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json({ 
        error: 'Card declined',
        details: error.message,
        code: error.code,
        decline_code: error.decline_code
      }, { status: 400 })
    }
    
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json({ 
        error: 'Stripe error',
        details: error.message,
        code: error.code 
      }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Rent collection failed', details: error.message }, 
      { status: 500 }
    )
  }
}

/**
 * GET - Retrieve booth rent payment details
 * Query params:
 * - paymentIntentId: Stripe payment intent ID
 */
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const paymentIntentId = searchParams.get('paymentIntentId')

    if (!paymentIntentId) {
      return NextResponse.json({ 
        error: 'paymentIntentId required' 
      }, { status: 400 })
    }

    // Get payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    // Get payment record from our database
    const { data: dbRecord } = await supabase
      .from('booth_rent_payments')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single()

    return NextResponse.json({
      stripe_payment_intent: paymentIntent,
      database_record: dbRecord,
      payment_successful: paymentIntent.status === 'succeeded'
    })

  } catch (error) {
    console.error('Error in GET /api/stripe/collect-booth-rent:', error)
    
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json({ 
        error: 'Payment intent not found',
        details: error.message 
      }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Failed to retrieve payment intent', details: error.message }, 
      { status: 500 }
    )
  }
}

/**
 * PUT - Update booth rent payment status (for manual adjustments)
 */
export async function PUT(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { payment_id, status, notes, waive_late_fees = false } = body

    // Validate status
    const validStatuses = ['pending', 'paid', 'overdue', 'failed', 'waived']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      }, { status: 400 })
    }

    // Get user's barbershop for permission check
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

    // Update rent payment record
    const updateData = {
      status,
      updated_at: new Date().toISOString()
    }

    // Add status-specific fields
    if (status === 'paid') {
      updateData.paid_date = new Date().toISOString()
    }

    if (status === 'waived') {
      updateData.paid_amount = 0
      updateData.paid_date = new Date().toISOString()
    }

    if (waive_late_fees) {
      updateData.late_fee_amount = 0
    }

    if (notes) {
      updateData.notes = notes
    }

    const { data, error } = await supabase
      .from('booth_rent_payments')
      .update(updateData)
      .eq('id', payment_id)
      .eq('barbershop_id', profile.barbershop_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      updated_payment: data,
      message: `Rent payment status updated to: ${status}`
    })

  } catch (error) {
    console.error('Error in PUT /api/stripe/collect-booth-rent:', error)
    return NextResponse.json(
      { error: 'Failed to update rent payment', details: error.message }, 
      { status: 500 }
    )
  }
}
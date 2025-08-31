import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16'
    })
  : null

export async function POST(request) {
  try {
    if (!stripe) {
      return NextResponse.json({
        success: false,
        error: 'Payment processing not configured'
      }, { status: 503 })
    }

    const { payment_intent_id } = await request.json()

    if (!payment_intent_id) {
      return NextResponse.json({
        success: false,
        error: 'Payment intent ID is required'
      }, { status: 400 })
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id)

    if (!paymentIntent) {
      return NextResponse.json({
        success: false,
        error: 'Payment intent not found'
      }, { status: 404 })
    }

    // CRITICAL FIX: Update booking status after successful payment
    const supabase = await createClient()
    
    try {
      if (paymentIntent.status === 'succeeded' && paymentIntent.metadata?.booking_id) {
        // Update booking status to PAID/CONFIRMED
        const { error: bookingError } = await supabase
          .from('bookings')
          .update({
            status: 'CONFIRMED',
            payment_status: 'PAID',
            payment_intent_id: payment_intent_id,
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentIntent.metadata.booking_id)

        if (bookingError) {
          console.error('Failed to update booking after payment:', bookingError)
        }

        // Create payment record for business tracking
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            id: payment_intent_id,
            booking_id: paymentIntent.metadata.booking_id,
            customer_id: paymentIntent.metadata.customer_id || null,
            barber_id: paymentIntent.metadata.barber_id || null,
            barbershop_id: paymentIntent.metadata.barbershop_id || null,
            amount: paymentIntent.amount / 100, // Convert from cents
            status: 'completed',
            payment_method: 'stripe',
            stripe_payment_intent_id: payment_intent_id,
            service_amount: parseFloat(paymentIntent.metadata.service_amount || 0),
            tip_amount: parseFloat(paymentIntent.metadata.tip_amount || 0),
            processing_fee: parseFloat(paymentIntent.metadata.processing_fee || 0),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (paymentError) {
          console.warn('Failed to create payment record:', paymentError)
        }
      }
    } catch (dbError) {
      console.error('Database update failed:', dbError.message)
    }

    return NextResponse.json({
      success: true,
      payment_intent_id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100, // Convert from cents to dollars
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata,
      receipt_url: paymentIntent.receipt_email,
      booking_id: paymentIntent.metadata?.booking_id,
      payment_status: paymentIntent.status,
      // CRITICAL: Return info for immediate business operations
      booking_status: paymentIntent.status === 'succeeded' ? 'CONFIRMED' : 'PENDING',
      next_steps: paymentIntent.status === 'succeeded' 
        ? 'Payment completed - appointment confirmed' 
        : 'Payment pending - please retry or contact support'
    })

  } catch (error) {
    console.error('Payment confirmation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
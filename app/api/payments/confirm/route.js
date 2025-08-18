import { NextResponse } from 'next/server'
import Stripe from 'stripe'

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

    try {
      // Payment tracking would be implemented here
      // payment_intent_id: payment_intent_id,
      // status: paymentIntent.status,
      // amount: paymentIntent.amount,
      // updated_at: new Date().toISOString()
    } catch (dbError) {
      console.warn('Database update failed:', dbError.message)
    }

    return NextResponse.json({
      success: true,
      payment_intent_id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata,
      receipt_url: paymentIntent.receipt_email,
      booking_id: paymentIntent.metadata?.booking_id,
      payment_status: paymentIntent.status
    })

  } catch (error) {
    console.error('Payment confirmation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
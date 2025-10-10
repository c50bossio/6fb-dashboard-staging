import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '../../../../lib/supabase/server'

// Safe Stripe initialization
const getStripeInstance = () => {
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'your_stripe_secret_key_here') {
    return null
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20'
  })
}

// Webhook endpoint secret for verifying requests
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request) {
  try {
    const stripe = getStripeInstance()
    if (!stripe) {
      console.log('Stripe webhook received but Stripe not configured')
      return NextResponse.json({ received: true }, { status: 200 })
    }

    if (!endpointSecret) {
      console.log('Stripe webhook received but no webhook secret configured')
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Get the raw body and signature
    const body = await request.text()
    const sig = request.headers.get('stripe-signature')

    let event
    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
    }

    console.log('Processing webhook event:', event.type, 'ID:', event.id)

    // Initialize Supabase client
    const supabase = createClient()

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object, supabase)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object, supabase)
        break

      case 'payment_intent.requires_action':
        await handlePaymentIntentRequiresAction(event.data.object, supabase)
        break

      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object, supabase)
        break

      case 'payment_intent.amount_capturable_updated':
        await handlePaymentIntentAmountCapturableUpdated(event.data.object, supabase)
        break

      case 'charge.dispute.created':
        await handleChargeDisputeCreated(event.data.object, supabase)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true }, { status: 200 })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

// Handle successful payment
async function handlePaymentIntentSucceeded(paymentIntent, supabase) {
  try {
    const bookingId = paymentIntent.metadata?.booking_id
    const serviceId = paymentIntent.metadata?.service_id
    const barberId = paymentIntent.metadata?.barber_id
    const customerId = paymentIntent.metadata?.customer_id
    const paymentType = paymentIntent.metadata?.payment_type || 'full_payment'

    console.log('Payment succeeded for booking:', bookingId, 'Amount:', paymentIntent.amount)

    // Update payment record in database
    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({
        status: 'succeeded',
        stripe_payment_intent_id: paymentIntent.id,
        paid_at: new Date().toISOString(),
        amount_received: paymentIntent.amount_received,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id)

    if (paymentUpdateError) {
      console.error('Failed to update payment record:', paymentUpdateError)
    }

    // Update appointment/booking status
    if (bookingId && bookingId !== 'guest') {
      const appointmentUpdate = {
        payment_status: paymentType === 'deposit' ? 'deposit_paid' : 'paid',
        stripe_payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString()
      }

      // If it's a full payment, mark booking as confirmed
      if (paymentType === 'full_payment') {
        appointmentUpdate.status = 'confirmed'
        appointmentUpdate.confirmed_at = new Date().toISOString()
      }

      const { error: appointmentUpdateError } = await supabase
        .from('appointments')
        .update(appointmentUpdate)
        .eq('id', bookingId)

      if (appointmentUpdateError) {
        console.error('Failed to update appointment:', appointmentUpdateError)
      } else {
        console.log('Updated appointment status for booking:', bookingId)
      }
    }

    // Send confirmation email/notification (if service exists)
    await sendPaymentConfirmationNotification({
      paymentIntent,
      bookingId,
      serviceId,
      barberId,
      customerId,
      paymentType,
      supabase
    })

    // Handle commission distribution if full payment
    if (paymentType === 'full_payment' && barberId) {
      await processCommissionDistribution({
        paymentIntent,
        barberId,
        supabase
      })
    }

  } catch (error) {
    console.error('Error handling payment intent succeeded:', error)
  }
}

// Handle failed payment
async function handlePaymentIntentFailed(paymentIntent, supabase) {
  try {
    const bookingId = paymentIntent.metadata?.booking_id
    const lastPaymentError = paymentIntent.last_payment_error

    console.log('Payment failed for booking:', bookingId, 'Error:', lastPaymentError?.message)

    // Update payment record
    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({
        status: 'failed',
        failure_reason: lastPaymentError?.message || 'Payment failed',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id)

    if (paymentUpdateError) {
      console.error('Failed to update payment record:', paymentUpdateError)
    }

    // Update appointment status
    if (bookingId && bookingId !== 'guest') {
      const { error: appointmentUpdateError } = await supabase
        .from('appointments')
        .update({
          payment_status: 'failed',
          status: 'payment_failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)

      if (appointmentUpdateError) {
        console.error('Failed to update appointment:', appointmentUpdateError)
      }
    }

    // Send payment failure notification
    await sendPaymentFailureNotification({
      paymentIntent,
      bookingId,
      lastPaymentError,
      supabase
    })

  } catch (error) {
    console.error('Error handling payment intent failed:', error)
  }
}

// Handle payment requiring action (3D Secure, etc.)
async function handlePaymentIntentRequiresAction(paymentIntent, supabase) {
  try {
    console.log('Payment requires action:', paymentIntent.id)

    // Update payment status to require action
    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({
        status: 'requires_action',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id)

    if (paymentUpdateError) {
      console.error('Failed to update payment record:', paymentUpdateError)
    }

    // Optionally send notification about required action
    // This could trigger an email or in-app notification

  } catch (error) {
    console.error('Error handling payment intent requires action:', error)
  }
}

// Handle canceled payment
async function handlePaymentIntentCanceled(paymentIntent, supabase) {
  try {
    const bookingId = paymentIntent.metadata?.booking_id

    console.log('Payment canceled for booking:', bookingId)

    // Update payment record
    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id)

    if (paymentUpdateError) {
      console.error('Failed to update payment record:', paymentUpdateError)
    }

    // Update appointment status
    if (bookingId && bookingId !== 'guest') {
      const { error: appointmentUpdateError } = await supabase
        .from('appointments')
        .update({
          payment_status: 'canceled',
          status: 'payment_canceled',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)

      if (appointmentUpdateError) {
        console.error('Failed to update appointment:', appointmentUpdateError)
      }
    }

  } catch (error) {
    console.error('Error handling payment intent canceled:', error)
  }
}

// Handle amount capturable updated (for manual capture)
async function handlePaymentIntentAmountCapturableUpdated(paymentIntent, supabase) {
  try {
    const bookingId = paymentIntent.metadata?.booking_id

    console.log('Payment amount capturable updated for booking:', bookingId, 'Capturable amount:', paymentIntent.amount_capturable)

    // Update payment record with capturable amount
    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({
        amount_capturable: paymentIntent.amount_capturable,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id)

    if (paymentUpdateError) {
      console.error('Failed to update payment record:', paymentUpdateError)
    }

  } catch (error) {
    console.error('Error handling payment intent amount capturable updated:', error)
  }
}

// Handle charge dispute
async function handleChargeDisputeCreated(dispute, supabase) {
  try {
    console.log('Charge dispute created:', dispute.id, 'Amount:', dispute.amount)

    // Log dispute for manual review
    const { error: disputeInsertError } = await supabase
      .from('payment_disputes')
      .insert({
        stripe_dispute_id: dispute.id,
        stripe_charge_id: dispute.charge,
        amount: dispute.amount,
        currency: dispute.currency,
        reason: dispute.reason,
        status: dispute.status,
        evidence_due_by: dispute.evidence_details?.due_by,
        created_at: new Date(dispute.created * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })

    if (disputeInsertError) {
      console.error('Failed to log dispute:', disputeInsertError)
    }

    // Send alert to admin about dispute
    console.log('ALERT: Charge dispute created requiring attention')

  } catch (error) {
    console.error('Error handling charge dispute created:', error)
  }
}

// Send payment confirmation notification
async function sendPaymentConfirmationNotification({
  paymentIntent,
  bookingId,
  serviceId,
  barberId,
  customerId,
  paymentType,
  supabase
}) {
  try {
    // Get booking and service details
    const { data: booking } = await supabase
      .from('appointments')
      .select(`
        *,
        services(name, duration_minutes),
        users:barber_id(name, email)
      `)
      .eq('id', bookingId)
      .single()

    if (!booking) {
      console.log('No booking found for notification')
      return
    }

    // Here you would integrate with your notification service
    // For now, just log the notification
    console.log('Would send payment confirmation notification:', {
      customer_email: paymentIntent.receipt_email,
      service_name: booking.services?.name,
      barber_name: booking.users?.name,
      amount: paymentIntent.amount / 100,
      payment_type: paymentType,
      booking_date: booking.appointment_date,
      booking_time: booking.appointment_time
    })

  } catch (error) {
    console.error('Error sending payment confirmation notification:', error)
  }
}

// Send payment failure notification
async function sendPaymentFailureNotification({
  paymentIntent,
  bookingId,
  lastPaymentError,
  supabase
}) {
  try {
    console.log('Would send payment failure notification:', {
      customer_email: paymentIntent.receipt_email,
      booking_id: bookingId,
      error_message: lastPaymentError?.message,
      amount: paymentIntent.amount / 100
    })

    // Here you would implement actual notification logic
    // Email, SMS, or in-app notification

  } catch (error) {
    console.error('Error sending payment failure notification:', error)
  }
}

// Process commission distribution
async function processCommissionDistribution({
  paymentIntent,
  barberId,
  supabase
}) {
  try {
    const commissionBarber = parseInt(paymentIntent.metadata?.commission_barber || '0')
    const commissionShop = parseInt(paymentIntent.metadata?.commission_shop || '0')
    const platformFee = parseInt(paymentIntent.metadata?.platform_fee || '0')

    console.log('Processing commission distribution:', {
      barber: commissionBarber / 100,
      shop: commissionShop / 100,
      platform: platformFee / 100
    })

    // Create commission records
    const { error: commissionError } = await supabase
      .from('commissions')
      .insert({
        payment_intent_id: paymentIntent.id,
        barber_id: barberId,
        barber_amount: commissionBarber,
        shop_amount: commissionShop,
        platform_fee: platformFee,
        total_amount: paymentIntent.amount,
        status: 'pending',
        created_at: new Date().toISOString()
      })

    if (commissionError) {
      console.error('Failed to create commission record:', commissionError)
    }

  } catch (error) {
    console.error('Error processing commission distribution:', error)
  }
}
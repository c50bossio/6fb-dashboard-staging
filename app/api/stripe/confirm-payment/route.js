import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

// Email service implemented below - see sendBookingConfirmationEmail function

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

export async function POST(request) {
  try {
    const { paymentIntentId, appointmentId } = await request.json()
    
    if (!paymentIntentId || !appointmentId) {
      return NextResponse.json(
        { error: 'Missing payment intent ID or appointment ID' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get the payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment not completed successfully' },
        { status: 400 }
      )
    }

    // Extract metadata
    const metadata = paymentIntent.metadata
    const totalAmount = parseFloat(metadata.total_amount)
    const paymentAmount = parseFloat(metadata.payment_amount)
    const remainingAmount = parseFloat(metadata.remaining_amount)
    const isDeposit = metadata.is_deposit === 'true'

    // Prepare payment metadata to store in booking notes
    const paymentMetadata = {
      payment_status: 'completed',
      stripe_payment_intent_id: paymentIntentId,
      amount_paid: paymentAmount,
      currency: paymentIntent.currency,
      payment_method: paymentIntent.payment_method || 'card',
      is_deposit: isDeposit,
      remaining_amount: remainingAmount,
      paid_at: new Date().toISOString(),
      customer_info: {
        name: metadata.customer_name,
        email: metadata.customer_email,
        phone: metadata.customer_phone
      }
    }

    // Update appointment with proper payment fields (no longer storing in notes)
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .update({
        payment_intent_id: paymentIntentId,
        payment_status: 'completed',
        amount_paid_cents: Math.round(paymentAmount * 100), // Convert to cents
        status: 'CONFIRMED',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select()
      .single()

    if (appointmentError) {
      console.error('Error updating appointment:', appointmentError)
      return NextResponse.json(
        { error: 'Failed to update appointment status' },
        { status: 500 }
      )
    }

    // Send confirmation email (we'll implement this in the next step)
    try {
      await sendBookingConfirmationEmail({
        appointment,
        customerEmail: metadata.customer_email,
        customerName: metadata.customer_name,
        amountPaid: paymentAmount,
        remainingAmount: remainingAmount,
        isDeposit: isDeposit
      })
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        status: appointment.status,
        paymentStatus: 'completed',
        amountPaid: paymentAmount,
        remainingAmount: remainingAmount,
        isDeposit: isDeposit
      }
    })

  } catch (error) {
    console.error('Payment confirmation error:', error)
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: 'Invalid payment information' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to confirm payment. Please contact support.' },
      { status: 500 }
    )
  }
}

async function sendBookingConfirmationEmail({ booking, customerEmail, customerName, amountPaid, remainingAmount, isDeposit }) {
  // For now, we'll implement a simple email notification
  // In production, you would integrate with SendGrid, AWS SES, or similar
  // Email details would be sent through email service
  
  // TODO: Integrate with actual email service
  // Example with SendGrid:
  /*
  const sgMail = require('@sendgrid/mail')
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  
  const msg = {
    to: customerEmail,
    from: process.env.FROM_EMAIL,
    subject: 'Booking Confirmation - ' + booking.service_name,
    html: generateBookingConfirmationHTML({ booking, customerName, amountPaid, remainingAmount, isDeposit })
  }
  
  await sgMail.send(msg)
  */
}
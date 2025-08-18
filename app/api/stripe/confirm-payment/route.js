import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

export async function POST(request) {
  try {
    const { paymentIntentId, bookingId } = await request.json()
    
    if (!paymentIntentId || !bookingId) {
      return NextResponse.json(
        { error: 'Missing payment intent ID or booking ID' },
        { status: 400 }
      )
    }

    const supabase = createClient()

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

    // Get current booking to preserve existing notes
    const { data: currentBooking } = await supabase
      .from('bookings')
      .select('notes')
      .eq('id', bookingId)
      .single()

    // Combine existing notes with payment metadata
    let updatedNotes = currentBooking?.notes || ''
    if (updatedNotes.trim()) {
      updatedNotes += '\n\n'
    }
    updatedNotes += `PAYMENT_METADATA: ${JSON.stringify(paymentMetadata)}`

    // Update booking with payment information
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        notes: updatedNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select()
      .single()

    if (bookingError) {
      console.error('Error updating booking:', bookingError)
      return NextResponse.json(
        { error: 'Failed to update booking status' },
        { status: 500 }
      )
    }

    // Send confirmation email (we'll implement this in the next step)
    try {
      await sendBookingConfirmationEmail({
        booking,
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
      booking: {
        id: booking.id,
        status: booking.status,
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
  console.log('Sending confirmation email:', {
    to: customerEmail,
    subject: 'Booking Confirmation',
    customerName,
    bookingId: booking.id,
    serviceName: booking.service_name,
    appointmentTime: booking.start_time,
    amountPaid,
    remainingAmount,
    isDeposit
  })
  
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
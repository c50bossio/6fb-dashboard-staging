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

// Refund policy configuration
const REFUND_POLICIES = {
  // Time-based refund policies (hours before appointment)
  full_refund: 24,      // Full refund if cancelled 24+ hours before
  partial_refund: 2,    // 50% refund if cancelled 2-24 hours before
  no_refund: 0,         // No refund if cancelled less than 2 hours before
  
  // Refund percentages
  full_percentage: 1.0,     // 100%
  partial_percentage: 0.5,  // 50%
  no_refund_percentage: 0.0 // 0%
}

// Calculate refund amount based on cancellation policy
function calculateRefundAmount(appointmentTime, requestTime, originalAmount) {
  const hoursUntilAppointment = (new Date(appointmentTime) - new Date(requestTime)) / (1000 * 60 * 60)
  
  if (hoursUntilAppointment >= REFUND_POLICIES.full_refund) {
    return {
      amount: Math.round(originalAmount * REFUND_POLICIES.full_percentage),
      percentage: REFUND_POLICIES.full_percentage,
      reason: 'full_refund_policy'
    }
  } else if (hoursUntilAppointment >= REFUND_POLICIES.partial_refund) {
    return {
      amount: Math.round(originalAmount * REFUND_POLICIES.partial_percentage),
      percentage: REFUND_POLICIES.partial_percentage,
      reason: 'partial_refund_policy'
    }
  } else {
    return {
      amount: 0,
      percentage: REFUND_POLICIES.no_refund_percentage,
      reason: 'no_refund_policy'
    }
  }
}

export async function POST(request) {
  try {
    const {
      payment_intent_id,
      booking_id,
      refund_reason,
      refund_type = 'automatic', // 'automatic', 'manual', 'partial'
      custom_amount = null,       // For manual refunds
      admin_override = false,     // Admin can override policies
      requested_by,              // User ID requesting refund
      notes = ''
    } = await request.json()

    // Validate required parameters
    if (!payment_intent_id && !booking_id) {
      return NextResponse.json({
        success: false,
        error: 'Either payment_intent_id or booking_id is required'
      }, { status: 400 })
    }

    if (!refund_reason) {
      return NextResponse.json({
        success: false,
        error: 'refund_reason is required'
      }, { status: 400 })
    }

    // Get Stripe instance
    const stripe = getStripeInstance()
    if (!stripe) {
      return NextResponse.json({
        success: false,
        error: 'Payment processing not configured',
        mock_response: {
          refund_id: 'r_mock_' + Date.now(),
          amount_refunded: custom_amount || 0,
          status: 'succeeded',
          reason: refund_reason,
          note: 'This is a mock refund - configure Stripe for real refunds'
        }
      }, { status: 200 })
    }

    // Initialize Supabase client
    const supabase = createClient()

    // Get payment and booking information
    let paymentData = null
    let bookingData = null

    if (payment_intent_id) {
      // Get payment data from database
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select(`
          *,
          appointments (
            id,
            scheduled_at,
            status,
            client_name,
            barber_id,
            service_id,
            services (name, price)
          )
        `)
        .eq('stripe_payment_intent_id', payment_intent_id)
        .single()

      if (paymentError || !payment) {
        return NextResponse.json({
          success: false,
          error: 'Payment not found'
        }, { status: 404 })
      }
      
      paymentData = payment
      bookingData = payment.appointments
    } else if (booking_id) {
      // Get booking data and associated payment
      const { data: booking, error: bookingError } = await supabase
        .from('appointments')
        .select(`
          *,
          payments (
            id,
            stripe_payment_intent_id,
            amount,
            status,
            payment_type
          ),
          services (name, price)
        `)
        .eq('id', booking_id)
        .single()

      if (bookingError || !booking) {
        return NextResponse.json({
          success: false,
          error: 'Booking not found'
        }, { status: 404 })
      }
      
      bookingData = booking
      paymentData = booking.payments
    }

    // Validate refund eligibility
    if (!paymentData || paymentData.status === 'refunded') {
      return NextResponse.json({
        success: false,
        error: 'Payment not eligible for refund'
      }, { status: 400 })
    }

    // Calculate refund amount based on policy
    let refundAmount = 0
    let refundCalculation = null

    if (refund_type === 'manual' && custom_amount !== null) {
      // Manual refund with custom amount
      refundAmount = Math.round(custom_amount * 100) // Convert to cents
      refundCalculation = {
        amount: refundAmount,
        percentage: custom_amount / (paymentData.amount / 100),
        reason: 'manual_override'
      }
    } else if (admin_override) {
      // Admin override - full refund
      refundAmount = paymentData.amount
      refundCalculation = {
        amount: refundAmount,
        percentage: 1.0,
        reason: 'admin_override'
      }
    } else {
      // Automatic calculation based on policy
      const currentTime = new Date().toISOString()
      const appointmentTime = bookingData?.scheduled_at
      
      if (!appointmentTime) {
        return NextResponse.json({
          success: false,
          error: 'Cannot calculate refund without appointment time'
        }, { status: 400 })
      }
      
      refundCalculation = calculateRefundAmount(appointmentTime, currentTime, paymentData.amount)
      refundAmount = refundCalculation.amount
    }

    // Check if refund amount is valid
    if (refundAmount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'No refund available based on cancellation policy',
        policy_info: {
          hours_until_appointment: bookingData ? 
            (new Date(bookingData.scheduled_at) - new Date()) / (1000 * 60 * 60) : null,
          refund_calculation
        }
      }, { status: 400 })
    }

    if (refundAmount > paymentData.amount) {
      return NextResponse.json({
        success: false,
        error: 'Refund amount cannot exceed original payment'
      }, { status: 400 })
    }

    // Process refund with Stripe
    const refund = await stripe.refunds.create({
      payment_intent: paymentData.stripe_payment_intent_id,
      amount: refundAmount,
      reason: refund_reason,
      metadata: {
        booking_id: bookingData?.id || '',
        refund_type,
        requested_by: requested_by || '',
        original_amount: paymentData.amount.toString(),
        refund_percentage: refundCalculation.percentage.toString(),
        policy_reason: refundCalculation.reason
      }
    })

    // Update payment record in database
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: refund.amount === paymentData.amount ? 'refunded' : 'partially_refunded',
        refund_amount: refundAmount,
        refund_id: refund.id,
        refund_reason,
        refund_processed_at: new Date().toISOString(),
        metadata: {
          ...paymentData.metadata,
          refund_info: {
            refund_id: refund.id,
            refund_amount: refundAmount,
            refund_reason,
            refund_calculation,
            processed_at: new Date().toISOString(),
            requested_by
          }
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentData.id)

    if (updateError) {
      console.error('Failed to update payment record:', updateError)
    }

    // Update booking status if applicable
    if (bookingData) {
      const { error: bookingUpdateError } = await supabase
        .from('appointments')
        .update({
          status: 'CANCELLED',
          cancellation_reason: refund_reason,
          cancelled_at: new Date().toISOString(),
          refund_amount: refundAmount / 100, // Convert back to dollars
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingData.id)

      if (bookingUpdateError) {
        console.error('Failed to update booking status:', bookingUpdateError)
      }
    }

    // Log refund activity
    try {
      await supabase
        .from('payment_activities')
        .insert({
          payment_id: paymentData.id,
          activity_type: 'refund',
          amount: refundAmount,
          stripe_refund_id: refund.id,
          reason: refund_reason,
          notes,
          performed_by: requested_by,
          metadata: {
            refund_calculation,
            original_payment_amount: paymentData.amount,
            refund_percentage: refundCalculation.percentage
          },
          created_at: new Date().toISOString()
        })
    } catch (activityError) {
      console.warn('Failed to log refund activity:', activityError)
    }

    // Return successful refund information
    return NextResponse.json({
      success: true,
      refund: {
        id: refund.id,
        amount: refundAmount / 100, // Convert to dollars
        amount_cents: refundAmount,
        currency: refund.currency,
        status: refund.status,
        reason: refund_reason,
        percentage_refunded: refundCalculation.percentage,
        policy_applied: refundCalculation.reason
      },
      original_payment: {
        amount: paymentData.amount / 100,
        amount_cents: paymentData.amount
      },
      booking_info: bookingData ? {
        id: bookingData.id,
        scheduled_at: bookingData.scheduled_at,
        service_name: bookingData.services?.name,
        client_name: bookingData.client_name
      } : null,
      policy_info: {
        hours_until_appointment: bookingData ? 
          (new Date(bookingData.scheduled_at) - new Date()) / (1000 * 60 * 60) : null,
        refund_policy_applied: refundCalculation.reason
      }
    })

  } catch (error) {
    console.error('Refund processing error:', error)
    
    // Enhanced error handling
    let errorMessage = 'Failed to process refund'
    let statusCode = 500
    
    if (error.type === 'StripeInvalidRequestError') {
      errorMessage = 'Invalid refund request. Payment may already be refunded or not eligible.'
      statusCode = 400
    } else if (error.code === 'charge_already_refunded') {
      errorMessage = 'This payment has already been refunded.'
      statusCode = 400
    } else if (error.code === 'amount_too_large') {
      errorMessage = 'Refund amount exceeds the original payment amount.'
      statusCode = 400
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      error_type: error.type || 'unknown',
      error_code: error.code || null
    }, { status: statusCode })
  }
}

// GET endpoint to check refund eligibility
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const payment_intent_id = searchParams.get('payment_intent_id')
    const booking_id = searchParams.get('booking_id')

    if (!payment_intent_id && !booking_id) {
      return NextResponse.json({
        success: false,
        error: 'Either payment_intent_id or booking_id is required'
      }, { status: 400 })
    }

    const supabase = createClient()
    let paymentData = null
    let bookingData = null

    // Get payment and booking information
    if (payment_intent_id) {
      const { data: payment, error } = await supabase
        .from('payments')
        .select(`
          *,
          appointments (
            id,
            scheduled_at,
            status,
            client_name,
            services (name, price)
          )
        `)
        .eq('stripe_payment_intent_id', payment_intent_id)
        .single()

      if (error || !payment) {
        return NextResponse.json({
          success: false,
          error: 'Payment not found'
        }, { status: 404 })
      }
      
      paymentData = payment
      bookingData = payment.appointments
    }

    // Calculate potential refund amounts
    const currentTime = new Date().toISOString()
    const appointmentTime = bookingData?.scheduled_at
    
    let refundEligibility = {
      is_eligible: false,
      reason: 'unknown'
    }

    if (!appointmentTime) {
      refundEligibility = {
        is_eligible: false,
        reason: 'no_appointment_time'
      }
    } else if (paymentData.status === 'refunded') {
      refundEligibility = {
        is_eligible: false,
        reason: 'already_refunded'
      }
    } else if (new Date(appointmentTime) < new Date(currentTime)) {
      refundEligibility = {
        is_eligible: false,
        reason: 'appointment_passed'
      }
    } else {
      const refundCalculation = calculateRefundAmount(appointmentTime, currentTime, paymentData.amount)
      refundEligibility = {
        is_eligible: refundCalculation.amount > 0,
        reason: refundCalculation.reason,
        refund_amount: refundCalculation.amount / 100,
        refund_percentage: refundCalculation.percentage,
        hours_until_appointment: (new Date(appointmentTime) - new Date(currentTime)) / (1000 * 60 * 60)
      }
    }

    return NextResponse.json({
      success: true,
      payment: {
        id: paymentData.id,
        amount: paymentData.amount / 100,
        status: paymentData.status,
        payment_type: paymentData.payment_type
      },
      booking: bookingData ? {
        id: bookingData.id,
        scheduled_at: bookingData.scheduled_at,
        status: bookingData.status,
        service_name: bookingData.services?.name
      } : null,
      refund_eligibility: refundEligibility,
      refund_policies: {
        full_refund_hours: REFUND_POLICIES.full_refund,
        partial_refund_hours: REFUND_POLICIES.partial_refund,
        no_refund_hours: REFUND_POLICIES.no_refund,
        partial_refund_percentage: REFUND_POLICIES.partial_percentage
      }
    })

  } catch (error) {
    console.error('Refund eligibility check error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to check refund eligibility'
    }, { status: 500 })
  }
}
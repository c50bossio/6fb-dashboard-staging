/**
 * Public Booking Creation API
 * Feature: 011-holistic-staff-management
 *
 * POST /api/book/[staffSlug]/create
 * Creates a new booking and Stripe payment intent
 * No authentication required - public endpoint
 */

import { createClient } from '@/lib/supabase/client'
import { isSlotAvailable } from '@/lib/availability-calculator'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { parseISO } from 'date-fns'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

interface CreateBookingRequest {
  serviceId: string
  scheduledAt: string // ISO 8601 datetime
  customerName: string
  customerEmail: string
  customerPhone: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: { staffSlug: string } }
) {
  try {
    const supabase = createClient()
    const { staffSlug } = params
    const body: CreateBookingRequest = await request.json()

    const { serviceId, scheduledAt, customerName, customerEmail, customerPhone } = body

    // Validate required fields
    if (!serviceId || !scheduledAt || !customerName || !customerEmail || !customerPhone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 1. Get staff member by slug
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, barbershop_id')
      .eq('booking_slug', staffSlug)
      .eq('role', 'BARBER')
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      )
    }

    // 2. Get service details
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, name, duration_minutes, price_cents')
      .eq('id', serviceId)
      .eq('barbershop_id', profile.barbershop_id)
      .single()

    if (serviceError || !service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      )
    }

    // 3. Validate time slot availability
    const requestedTime = parseISO(scheduledAt)
    const availability = await isSlotAvailable(
      profile.id,
      requestedTime,
      service.duration_minutes
    )

    if (!availability.available) {
      return NextResponse.json(
        { error: `Time slot not available: ${availability.reason}` },
        { status: 409 } // Conflict
      )
    }

    // 4. Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: service.price_cents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        barber_id: profile.id,
        barber_name: profile.name || '',
        service_id: service.id,
        service_name: service.name,
        customer_name: customerName,
        customer_email: customerEmail,
        scheduled_at: scheduledAt,
        booking_source: 'staff_link'
      }
    })

    // 5. Create booking record (PENDING until payment confirmed via webhook)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([{
        barber_id: profile.id,
        barbershop_id: profile.barbershop_id,
        service_id: service.id,
        scheduled_at: scheduledAt,
        duration_minutes: service.duration_minutes,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        status: 'PENDING',
        booking_source: 'staff_link',
        payment_intent_id: paymentIntent.id,
        total_amount_cents: service.price_cents
      }])
      .select()
      .single()

    if (bookingError) {
      console.error('Error creating booking:', bookingError)

      // Cancel payment intent if booking creation fails
      await stripe.paymentIntents.cancel(paymentIntent.id)

      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      )
    }

    // 6. Return client secret for payment confirmation
    return NextResponse.json({
      bookingId: booking.id,
      clientSecret: paymentIntent.client_secret,
      amount: (service.price_cents / 100).toFixed(2),
      serviceName: service.name,
      barberName: profile.name,
      scheduledAt: scheduledAt
    })
  } catch (error) {
    console.error('Error creating booking:', error)
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    )
  }
}

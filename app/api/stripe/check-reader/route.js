import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

/**
 * POST /api/stripe/check-reader
 * Check Stripe Terminal reader status
 */
export async function POST(request) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { readerId } = body

    if (!readerId) {
      return NextResponse.json(
        { error: 'Reader ID is required' },
        { status: 400 }
      )
    }

    // Get barber's Stripe account
    const { data: barberSettings } = await supabase
      .from('barber_payment_settings')
      .select('stripe_account_id')
      .eq('barber_id', user.id)
      .single()

    const stripeAccountId = barberSettings?.stripe_account_id

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: 'No Stripe account found for barber' },
        { status: 404 }
      )
    }

    try {
      // Check reader status
      const reader = await stripe.terminal.readers.retrieve(
        readerId,
        {
          stripeAccount: stripeAccountId
        }
      )

      return NextResponse.json({
        reader_id: reader.id,
        online: reader.status === 'online',
        status: reader.status,
        battery_level: reader.device_sw_version ? null : 'N/A', // Only some readers report battery
        location: reader.location,
        device_type: reader.device_type,
        serial_number: reader.serial_number,
        last_seen_at: reader.last_seen_at
      })

    } catch (readerError) {
      console.error('Reader check error:', readerError)
      
      if (readerError.code === 'resource_missing') {
        return NextResponse.json(
          { error: 'Reader not found or not connected to your account' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to check reader: ' + readerError.message },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Check reader error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check reader status' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/stripe/check-reader
 * List all readers for the authenticated barber
 */
export async function GET(request) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get barber's Stripe account
    const { data: barberSettings } = await supabase
      .from('barber_payment_settings')
      .select('stripe_account_id')
      .eq('barber_id', user.id)
      .single()

    const stripeAccountId = barberSettings?.stripe_account_id

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: 'No Stripe account found for barber' },
        { status: 404 }
      )
    }

    try {
      // List all readers for this account
      const readers = await stripe.terminal.readers.list({
        limit: 10
      }, {
        stripeAccount: stripeAccountId
      })

      const readerList = readers.data.map(reader => ({
        reader_id: reader.id,
        online: reader.status === 'online',
        status: reader.status,
        device_type: reader.device_type,
        serial_number: reader.serial_number,
        location: reader.location,
        last_seen_at: reader.last_seen_at
      }))

      return NextResponse.json({
        readers: readerList,
        has_readers: readerList.length > 0
      })

    } catch (listError) {
      console.error('List readers error:', listError)
      return NextResponse.json(
        { error: 'Failed to list readers: ' + listError.message },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('List readers error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to list readers' },
      { status: 500 }
    )
  }
}
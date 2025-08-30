import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

/**
 * GET: List Terminal locations for a barbershop
 */
export async function GET(request) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const barberbarbershopId = searchParams.get('barberbarbershopId')

    if (!barberbarbershopId) {
      return NextResponse.json(
        { error: 'Barbershop ID is required' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify access
    const { data: profile } = await supabase
      .from('profiles')
      .select('barberbarbershop_id, role')
      .eq('id', user.id)
      .single()

    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id, owner_id')
      .eq('id', barberbarbershopId)
      .single()

    const hasAccess = profile?.barbershop_id === barberbarbershopId || 
                     barbershop?.owner_id === user.id ||
                     profile?.role === 'admin'

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get locations from database
    const { data: locations, error: dbError } = await supabase
      .from('terminal_locations')
      .select(`
        *,
        terminal_readers (
          id,
          stripe_reader_id,
          serial_number,
          device_type,
          label,
          status,
          last_seen_at
        )
      `)
      .eq('barberbarbershop_id', barberbarbershopId)
      .order('created_at', { ascending: true })

    if (dbError) {
      console.error('Database error fetching locations:', dbError)
      return NextResponse.json(
        { error: 'Failed to fetch locations' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      locations: locations || []
    })

  } catch (error) {
    console.error('Terminal locations GET error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch locations',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST: Create a new Terminal location
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
    const { barberbarbershopId, displayName, address } = body

    if (!barberbarbershopId || !displayName) {
      return NextResponse.json(
        { error: 'Barbershop ID and display name are required' },
        { status: 400 }
      )
    }

    // Verify user is owner of barbershop
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id, owner_id, name, address')
      .eq('id', barberbarbershopId)
      .single()

    if (!barbershop || barbershop.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied - must be barbershop owner' },
        { status: 403 }
      )
    }

    // Use barbershop address if not provided
    const locationAddress = address || barbershop.address || {
      line1: '123 Main St',
      city: 'Anytown',
      state: 'NY',
      postal_code: '12345',
      country: 'US'
    }

    // Create Stripe Terminal location
    const stripeLocation = await stripe.terminal.locations.create({
      display_name: displayName,
      address: {
        line1: locationAddress.line1,
        line2: locationAddress.line2 || '',
        city: locationAddress.city,
        state: locationAddress.state,
        postal_code: locationAddress.postal_code,
        country: locationAddress.country || 'US'
      },
      metadata: {
        barberbarbershop_id: barberbarbershopId,
        barbershop_name: barbershop.name || 'Unknown',
        platform: 'bookedbarber'
      }
    })

    // Store in database
    const { data: dbLocation, error: dbError } = await supabase
      .from('terminal_locations')
      .insert({
        barberbarbershop_id: barberbarbershopId,
        stripe_location_id: stripeLocation.id,
        display_name: displayName,
        address: locationAddress,
        metadata: {
          stripe_created: stripeLocation.created,
          stripe_livemode: stripeLocation.livemode
        }
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error creating location:', dbError)
      
      // Clean up Stripe location if database insert failed
      try {
        await stripe.terminal.locations.del(stripeLocation.id)
      } catch (cleanupError) {
        console.error('Failed to cleanup Stripe location:', cleanupError)
      }
      
      return NextResponse.json(
        { error: 'Failed to save location' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      location: {
        ...dbLocation,
        stripe_location: stripeLocation
      }
    })

  } catch (error) {
    console.error('Terminal location creation error:', error)
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: 'Invalid request', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to create location',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE: Remove a Terminal location
 */
export async function DELETE(request) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get location and verify ownership
    const { data: location, error: locationError } = await supabase
      .from('terminal_locations')
      .select(`
        *,
        barbershops!inner(owner_id)
      `)
      .eq('id', locationId)
      .single()

    if (locationError || !location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    if (location.barbershops.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if location has active readers
    const { data: readers } = await supabase
      .from('terminal_readers')
      .select('id, status')
      .eq('location_id', locationId)

    if (readers && readers.length > 0) {
      const activeReaders = readers.filter(r => r.status === 'online' || r.status === 'busy')
      if (activeReaders.length > 0) {
        return NextResponse.json(
          { error: 'Cannot delete location with active readers. Please disconnect readers first.' },
          { status: 409 }
        )
      }
    }

    // Delete from Stripe
    try {
      await stripe.terminal.locations.del(location.stripe_location_id)
    } catch (stripeError) {
      console.warn('Failed to delete Stripe location (may not exist):', stripeError)
      // Continue with database deletion
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('terminal_locations')
      .delete()
      .eq('id', locationId)

    if (deleteError) {
      console.error('Database error deleting location:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete location' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Location deleted successfully'
    })

  } catch (error) {
    console.error('Terminal location deletion error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete location',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      },
      { status: 500 }
    )
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
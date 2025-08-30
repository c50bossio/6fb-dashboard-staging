import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

/**
 * GET: List Terminal readers for a barbershop
 */
export async function GET(request) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const barberbarbershopId = searchParams.get('barberbarbershopId')
    const discover = searchParams.get('discover') === 'true'

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

    let readers = []

    if (discover) {
      // Discover available readers from Stripe
      try {
        const stripeReaders = await stripe.terminal.readers.list({
          limit: 100
        })

        readers = stripeReaders.data.map(reader => ({
          id: reader.id,
          stripe_reader_id: reader.id,
          serial_number: reader.serial_number,
          device_type: reader.device_type,
          label: reader.label,
          status: reader.status,
          location: reader.location,
          ip_address: reader.ip_address,
          device_sw_version: reader.device_sw_version,
          metadata: reader.metadata,
          is_discovered: true,
          registered: false
        }))

        // Check which readers are already registered
        if (readers.length > 0) {
          const { data: registeredReaders } = await supabase
            .from('terminal_readers')
            .select('stripe_reader_id')
            .eq('barberbarbershop_id', barberbarbershopId)

          const registeredIds = new Set(registeredReaders?.map(r => r.stripe_reader_id) || [])
          
          readers = readers.map(reader => ({
            ...reader,
            registered: registeredIds.has(reader.stripe_reader_id)
          }))
        }
      } catch (stripeError) {
        console.error('Stripe reader discovery error:', stripeError)
        // Continue with database readers only
      }
    } else {
      // Get registered readers from database
      const { data: dbReaders, error: dbError } = await supabase
        .from('terminal_readers')
        .select(`
          *,
          terminal_locations (
            id,
            display_name,
            stripe_location_id
          )
        `)
        .eq('barberbarbershop_id', barberbarbershopId)
        .order('created_at', { ascending: true })

      if (dbError) {
        console.error('Database error fetching readers:', dbError)
        return NextResponse.json(
          { error: 'Failed to fetch readers' },
          { status: 500 }
        )
      }

      readers = dbReaders || []
    }

    return NextResponse.json({
      success: true,
      readers,
      discovered: discover
    })

  } catch (error) {
    console.error('Terminal readers GET error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch readers',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST: Register a Terminal reader
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
    const { barberbarbershopId, stripeReaderId, locationId, label } = body

    if (!barberbarbershopId || !stripeReaderId) {
      return NextResponse.json(
        { error: 'Barbershop ID and Stripe Reader ID are required' },
        { status: 400 }
      )
    }

    // Verify user is owner of barbershop
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id, owner_id')
      .eq('id', barberbarbershopId)
      .single()

    if (!barbershop || barbershop.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied - must be barbershop owner' },
        { status: 403 }
      )
    }

    // Get reader details from Stripe
    const stripeReader = await stripe.terminal.readers.retrieve(stripeReaderId)

    if (!stripeReader) {
      return NextResponse.json(
        { error: 'Reader not found in Stripe' },
        { status: 404 }
      )
    }

    // Verify location exists if provided
    let locationData = null
    if (locationId) {
      const { data: location } = await supabase
        .from('terminal_locations')
        .select('*')
        .eq('id', locationId)
        .eq('barberbarbershop_id', barberbarbershopId)
        .single()

      if (!location) {
        return NextResponse.json(
          { error: 'Location not found' },
          { status: 404 }
        )
      }
      
      locationData = location
    }

    // Check if reader is already registered
    const { data: existingReader } = await supabase
      .from('terminal_readers')
      .select('id')
      .eq('stripe_reader_id', stripeReaderId)
      .single()

    if (existingReader) {
      return NextResponse.json(
        { error: 'Reader is already registered' },
        { status: 409 }
      )
    }

    // Register reader in database
    const { data: dbReader, error: dbError } = await supabase
      .from('terminal_readers')
      .insert({
        barberbarbershop_id: barberbarbershopId,
        stripe_reader_id: stripeReaderId,
        serial_number: stripeReader.serial_number,
        device_type: stripeReader.device_type,
        label: label || stripeReader.label || `Reader ${stripeReader.serial_number}`,
        location_id: locationId,
        stripe_location_id: locationData?.stripe_location_id || stripeReader.location,
        status: stripeReader.status,
        last_seen_at: new Date(),
        ip_address: stripeReader.ip_address,
        device_sw_version: stripeReader.device_sw_version,
        metadata: {
          stripe_metadata: stripeReader.metadata || {},
          registered_at: new Date().toISOString(),
          registered_by: user.id
        }
      })
      .select(`
        *,
        terminal_locations (
          id,
          display_name,
          stripe_location_id
        )
      `)
      .single()

    if (dbError) {
      console.error('Database error registering reader:', dbError)
      return NextResponse.json(
        { error: 'Failed to register reader' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      reader: {
        ...dbReader,
        stripe_reader: stripeReader
      }
    })

  } catch (error) {
    console.error('Terminal reader registration error:', error)
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: 'Invalid request', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to register reader',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      },
      { status: 500 }
    )
  }
}

/**
 * PUT: Update reader configuration
 */
export async function PUT(request) {
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
    const { readerId, label, locationId } = body

    if (!readerId) {
      return NextResponse.json(
        { error: 'Reader ID is required' },
        { status: 400 }
      )
    }

    // Get reader and verify ownership
    const { data: reader, error: readerError } = await supabase
      .from('terminal_readers')
      .select(`
        *,
        barbershops!inner(owner_id)
      `)
      .eq('id', readerId)
      .single()

    if (readerError || !reader) {
      return NextResponse.json(
        { error: 'Reader not found' },
        { status: 404 }
      )
    }

    if (reader.barbershops.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Prepare update data
    const updateData = {}
    
    if (label !== undefined) {
      updateData.label = label
    }

    if (locationId !== undefined) {
      if (locationId) {
        // Verify location exists and belongs to same barbershop
        const { data: location } = await supabase
          .from('terminal_locations')
          .select('id, stripe_location_id')
          .eq('id', locationId)
          .eq('barberbarbershop_id', reader.barberbarbershop_id)
          .single()

        if (!location) {
          return NextResponse.json(
            { error: 'Location not found' },
            { status: 404 }
          )
        }

        updateData.location_id = locationId
        updateData.stripe_location_id = location.stripe_location_id
      } else {
        updateData.location_id = null
        updateData.stripe_location_id = null
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      )
    }

    // Update reader in database
    const { data: updatedReader, error: updateError } = await supabase
      .from('terminal_readers')
      .update(updateData)
      .eq('id', readerId)
      .select(`
        *,
        terminal_locations (
          id,
          display_name,
          stripe_location_id
        )
      `)
      .single()

    if (updateError) {
      console.error('Database error updating reader:', updateError)
      return NextResponse.json(
        { error: 'Failed to update reader' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      reader: updatedReader
    })

  } catch (error) {
    console.error('Terminal reader update error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update reader',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE: Unregister a Terminal reader
 */
export async function DELETE(request) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const readerId = searchParams.get('readerId')

    if (!readerId) {
      return NextResponse.json(
        { error: 'Reader ID is required' },
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

    // Get reader and verify ownership
    const { data: reader, error: readerError } = await supabase
      .from('terminal_readers')
      .select(`
        *,
        barbershops!inner(owner_id)
      `)
      .eq('id', readerId)
      .single()

    if (readerError || !reader) {
      return NextResponse.json(
        { error: 'Reader not found' },
        { status: 404 }
      )
    }

    if (reader.barbershops.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if reader is currently processing payments
    if (reader.status === 'busy') {
      return NextResponse.json(
        { error: 'Cannot unregister reader while it is processing payments' },
        { status: 409 }
      )
    }

    // Delete from database (Stripe reader remains available for re-registration)
    const { error: deleteError } = await supabase
      .from('terminal_readers')
      .delete()
      .eq('id', readerId)

    if (deleteError) {
      console.error('Database error deleting reader:', deleteError)
      return NextResponse.json(
        { error: 'Failed to unregister reader' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Reader unregistered successfully'
    })

  } catch (error) {
    console.error('Terminal reader deletion error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to unregister reader',
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
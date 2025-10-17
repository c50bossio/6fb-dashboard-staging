import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Force Node.js runtime to support Supabase dependencies
export const runtime = 'nodejs'

/**
 * GET /api/barbershops - Fetch barbershops
 * Query params:
 * - id: specific barbershop ID
 * - owner_id: filter by owner
 * - active_only: only active shops (default: true)
 */
export async function GET(request) {
  try {
    const supabase = createClient()

    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const barbershop_id = searchParams.get('id')
    const owner_id = searchParams.get('owner_id')
    const active_only = searchParams.get('active_only') !== 'false'

    // Build query
    let query = supabase
      .from('barbershops')
      .select(`
        *,
        owner:profiles!barbershops_owner_id_fkey(id, email, full_name, phone)
      `)
      .order('name', { ascending: true })

    // Apply filters
    if (barbershop_id) {
      query = query.eq('id', barbershop_id)
    }

    if (owner_id) {
      query = query.eq('owner_id', owner_id)
    }

    if (active_only) {
      query = query.eq('is_active', true)
    }

    const { data: barbershops, error } = await query

    if (error) {
      console.error('Database query failed:', error.message)
      return NextResponse.json(
        {
          error: 'Failed to fetch barbershops',
          details: error.message
        },
        { status: 500 }
      )
    }

    // Return single object if ID was specified
    if (barbershop_id && barbershops.length > 0) {
      return NextResponse.json({
        data: barbershops[0]
      })
    }

    // Return array for list queries
    return NextResponse.json({
      data: barbershops || [],
      total: barbershops?.length || 0
    })

  } catch (err) {
    console.error('Error in GET /api/barbershops:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/barbershops - Create new barbershop
 */
export async function POST(request) {
  try {
    const supabase = createClient()

    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Create barbershop
    const { data: barbershop, error } = await supabase
      .from('barbershops')
      .insert({
        ...body,
        owner_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        owner:profiles!barbershops_owner_id_fkey(id, email, full_name, phone)
      `)
      .single()

    if (error) {
      console.error('Error creating barbershop:', error)
      return NextResponse.json(
        { error: 'Failed to create barbershop', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      data: barbershop,
      message: 'Barbershop created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error in POST /api/barbershops:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/barbershops - Update barbershop
 */
export async function PUT(request) {
  try {
    const supabase = createClient()

    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Barbershop ID is required' },
        { status: 400 }
      )
    }

    // Update barbershop
    const { data: barbershop, error } = await supabase
      .from('barbershops')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        owner:profiles!barbershops_owner_id_fkey(id, email, full_name, phone)
      `)
      .single()

    if (error) {
      console.error('Error updating barbershop:', error)
      return NextResponse.json(
        { error: 'Failed to update barbershop', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      data: barbershop,
      message: 'Barbershop updated successfully'
    })

  } catch (error) {
    console.error('Unexpected error in PUT /api/barbershops:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

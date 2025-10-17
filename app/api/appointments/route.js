import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// Force Node.js runtime to support Supabase dependencies
export const runtime = 'nodejs'

// Validation schemas
const appointmentSchema = z.object({
  barbershop_id: z.string().uuid(),
  client_id: z.string().uuid().optional(),
  barber_id: z.string().uuid(),
  service_id: z.string().uuid(),
  scheduled_at: z.string().datetime(),
  duration_minutes: z.number().min(15).max(480),
  service_price: z.number().min(0),
  tip_amount: z.number().min(0).optional().default(0),
  client_name: z.string().min(1).max(255).optional(),
  client_phone: z.string().max(20).optional(),
  client_email: z.string().email().optional(),
  client_notes: z.string().max(500).optional(),
  recurrence_rule: z.string().optional(),
  is_walk_in: z.boolean().optional().default(false),
})

const updateAppointmentSchema = appointmentSchema.partial()

// GET /api/appointments - Fetch appointments with filters
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract query parameters
    const barbershop_id = searchParams.get('barbershop_id')
    const barber_id = searchParams.get('barber_id')
    const client_id = searchParams.get('client_id')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 1000)
    const offset = (page - 1) * limit

    // Build query - use correct table name and columns
    // NOTE: client_id references customers table (not profiles)
    let query = supabase
      .from('appointments')
      .select(`
        *,
        client:customers(id, full_name, email, phone),
        barber:profiles!appointments_barber_id_fkey(id, email, full_name),
        service:services(id, name, description, duration_minutes, price, category),
        barbershop:barbershops(id, name, address, phone)
      `)
      .order('scheduled_at', { ascending: true })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (barbershop_id) {
      query = query.eq('barbershop_id', barbershop_id)
    }
    if (barber_id) {
      query = query.eq('barber_id', barber_id)
    }
    if (client_id) {
      query = query.eq('client_id', client_id)
    }
    if (start_date) {
      query = query.gte('scheduled_at', start_date)
    }
    if (end_date) {
      query = query.lte('scheduled_at', end_date)
    }
    if (status) {
      query = query.eq('status', status.toUpperCase())
    }

    const { data: appointments, error } = await query

    if (error) {
      console.error('Database query failed:', error.message)
      return NextResponse.json(
        { 
          error: 'Failed to fetch appointments', 
          details: error.message,
          hint: 'Ensure database schema is properly migrated and tables exist'
        }, 
        { status: 500 }
      )
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })

    // Apply same filters for count
    if (barbershop_id) countQuery = countQuery.eq('barbershop_id', barbershop_id)
    if (barber_id) countQuery = countQuery.eq('barber_id', barber_id)
    if (client_id) countQuery = countQuery.eq('client_id', client_id)
    if (start_date) countQuery = countQuery.gte('scheduled_at', start_date)
    if (end_date) countQuery = countQuery.lte('scheduled_at', end_date)
    if (status) countQuery = countQuery.eq('status', status.toUpperCase())

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Error getting appointments count:', countError)
    }

    // Return real data from database
    return NextResponse.json({
      data: appointments || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (err) {
    console.error('Error in GET /api/appointments:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/appointments - Create new appointment
export async function POST(request) {
  try {
    const supabase = await createClient()

    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate input
    const validatedData = appointmentSchema.parse(body)
    
    // Calculate total amount
    const totalAmount = validatedData.service_price + (validatedData.tip_amount || 0)
    
    // Check for time conflicts
    const conflictCheck = await supabase
      .from('appointments')
      .select('id, scheduled_at, duration_minutes')
      .eq('barber_id', validatedData.barber_id)
      .in('status', ['CONFIRMED', 'PENDING'])

    if (conflictCheck.error) {
      console.error('Error checking conflicts:', conflictCheck.error)
      return NextResponse.json({ error: 'Failed to check time conflicts' }, { status: 500 })
    }

    // Check for overlapping appointments
    const newStart = new Date(validatedData.scheduled_at)
    const newEnd = new Date(newStart.getTime() + validatedData.duration_minutes * 60000)

    const hasConflict = conflictCheck.data?.some(existing => {
      const existingStart = new Date(existing.scheduled_at)
      const existingEnd = new Date(existingStart.getTime() + existing.duration_minutes * 60000)
      
      return (newStart < existingEnd && newEnd > existingStart)
    })

    if (hasConflict) {
      return NextResponse.json(
        { error: 'Time conflict with existing appointment' },
        { status: 409 }
      )
    }
    
    // Insert appointment
    const { data: newAppointment, error } = await supabase
      .from('appointments')
      .insert({
        ...validatedData,
        total_amount: totalAmount,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        client:customers(id, full_name, email, phone),
        barber:profiles!appointments_barber_id_fkey(id, email, full_name),
        service:services(id, name, description, duration_minutes, price, category),
        barbershop:barbershops(id, name, address, phone)
      `)
      .single()
    
    if (error) {
      console.error('Failed to create appointment:', error)
      return NextResponse.json(
        { 
          error: 'Failed to create appointment',
          details: error.message
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        data: newAppointment,
        message: 'Appointment created successfully'
      },
      { status: 201 }
    )

  } catch (err) {
    if (err.name === 'ZodError') {
      return NextResponse.json(
        { 
          error: 'Invalid input data',
          details: err.errors
        },
        { status: 400 }
      )
    }
    
    console.error('Error in POST /api/appointments:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/appointments - Update appointment
export async function PUT(request) {
  try {
    const supabase = await createClient()

    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      )
    }
    
    // Validate input
    const validatedData = updateAppointmentSchema.parse(updateData)
    
    // Calculate total amount if price fields changed
    if (validatedData.service_price || validatedData.tip_amount !== undefined) {
      const currentAppointment = await supabase
        .from('appointments')
        .select('service_price, tip_amount')
        .eq('id', id)
        .single()
        
      if (currentAppointment.data) {
        const newServicePrice = validatedData.service_price || currentAppointment.data.service_price
        const newTipAmount = validatedData.tip_amount !== undefined 
          ? validatedData.tip_amount 
          : currentAppointment.data.tip_amount || 0
        validatedData.total_amount = newServicePrice + newTipAmount
      }
    }
    
    // Update appointment
    const { data: updatedAppointment, error } = await supabase
      .from('appointments')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        client:customers(id, full_name, email, phone),
        barber:profiles!appointments_barber_id_fkey(id, email, full_name),
        service:services(id, name, description, duration_minutes, price, category),
        barbershop:barbershops(id, name, address, phone)
      `)
      .single()
    
    if (error) {
      console.error('Failed to update appointment:', error)
      return NextResponse.json(
        { 
          error: 'Failed to update appointment',
          details: error.message
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      data: updatedAppointment,
      message: 'Appointment updated successfully'
    })

  } catch (err) {
    if (err.name === 'ZodError') {
      return NextResponse.json(
        { 
          error: 'Invalid input data',
          details: err.errors
        },
        { status: 400 }
      )
    }
    
    console.error('Error in PUT /api/appointments:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/appointments - Delete appointment
export async function DELETE(request) {
  try {
    const supabase = await createClient()

    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const appointmentId = searchParams.get('id')
    
    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      )
    }
    
    // Update status to cancelled instead of hard delete
    const { data, error } = await supabase
      .from('appointments')
      .update({ 
        status: 'CANCELLED',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select()
      .single()
    
    if (error) {
      console.error('Failed to cancel appointment:', error)
      return NextResponse.json(
        { 
          error: 'Failed to cancel appointment',
          details: error.message
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      data,
      message: 'Appointment cancelled successfully'
    })

  } catch (err) {
    console.error('Error in DELETE /api/appointments:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
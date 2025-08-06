'use server'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

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
    const supabase = createClient()
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('appointments')
      .select(`
        *,
        client:users!appointments_client_id_fkey(id, name, email, phone),
        barber:users!appointments_barber_id_fkey(id, name, email),
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
      console.error('Error fetching appointments:', error)
      return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
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

    return NextResponse.json({
      appointments,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/appointments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/appointments - Create new appointment
export async function POST(request) {
  try {
    const supabase = createClient()
    
    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request body
    const validationResult = appointmentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const appointmentData = validationResult.data

    // Calculate total amount
    const total_amount = appointmentData.service_price + (appointmentData.tip_amount || 0)

    // Check for time conflicts
    const conflictCheck = await supabase
      .from('appointments')
      .select('id, scheduled_at, duration_minutes')
      .eq('barber_id', appointmentData.barber_id)
      .eq('status', 'CONFIRMED')
      .neq('id', 'ignore') // For future use in updates

    if (conflictCheck.error) {
      console.error('Error checking conflicts:', conflictCheck.error)
      return NextResponse.json({ error: 'Failed to check time conflicts' }, { status: 500 })
    }

    // Check for overlapping appointments
    const newStart = new Date(appointmentData.scheduled_at)
    const newEnd = new Date(newStart.getTime() + appointmentData.duration_minutes * 60000)

    const hasConflict = conflictCheck.data.some(existing => {
      const existingStart = new Date(existing.scheduled_at)
      const existingEnd = new Date(existingStart.getTime() + existing.duration_minutes * 60000)
      
      return (newStart < existingEnd && newEnd > existingStart)
    })

    if (hasConflict) {
      return NextResponse.json({
        error: 'Time conflict detected',
        message: 'The selected time slot conflicts with an existing appointment'
      }, { status: 409 })
    }

    // Create appointment
    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        ...appointmentData,
        total_amount,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        client:users!appointments_client_id_fkey(id, name, email, phone),
        barber:users!appointments_barber_id_fkey(id, name, email),
        service:services(id, name, description, duration_minutes, price, category),
        barbershop:barbershops(id, name, address, phone)
      `)
      .single()

    if (error) {
      console.error('Error creating appointment:', error)
      return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Appointment created successfully',
      appointment
    }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error in POST /api/appointments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
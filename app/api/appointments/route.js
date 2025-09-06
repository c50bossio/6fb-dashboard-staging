import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
// Simple console logging to prevent circular dependencies
const dbLogger = {
  error: (...args) => console.error('[DB]', ...args),
  warn: (...args) => console.warn('[DB]', ...args),
  info: (...args) => console.info('[DB]', ...args)
}

const apiLogger = {
  error: (...args) => console.error('[API]', ...args),
  warn: (...args) => console.warn('[API]', ...args),
  info: (...args) => console.info('[API]', ...args)
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const bookingSchema = z.object({
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

const updateBookingSchema = bookingSchema.partial()

export async function GET(request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const barbershop_id = searchParams.get('barbershop_id')
    const barber_id = searchParams.get('barber_id')
    const client_id = searchParams.get('client_id')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = (page - 1) * limit

    // CRITICAL FIX: Use separate queries to avoid PostgREST syntax failures
    let query = supabase
      .from('appointments')
      .select('*')
      .order('scheduled_at', { ascending: true })
      .range(offset, offset + limit - 1)

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
      dbLogger.error('Database query failed in appointments GET', error, {
        context: 'appointments_query',
        barbershop_id,
        barber_id,
        client_id
      })
      return NextResponse.json({ 
        error: 'Failed to fetch appointments',
        details: error.message 
      }, { status: 500 })
    }

    // CRITICAL FIX: Fetch related data separately to ensure reliability
    if (appointments && appointments.length > 0) {
      const clientIds = [...new Set(appointments.map(a => a.customer_id).filter(Boolean))]
      const barberIds = [...new Set(appointments.map(a => a.barber_id).filter(Boolean))]
      const serviceIds = [...new Set(appointments.map(a => a.service_id).filter(Boolean))]
      const barbershopIds = [...new Set(appointments.map(a => a.barbershop_id).filter(Boolean))]

      // Fetch related data in parallel
      const [clientsData, barbersData, servicesData, barbershopsData] = await Promise.all([
        clientIds.length > 0 ? supabase.from('customers').select('id, full_name, email, phone').in('id', clientIds) : { data: [] },
        barberIds.length > 0 ? supabase.from('profiles').select('id, full_name, email').in('id', barberIds) : { data: [] },
        serviceIds.length > 0 ? supabase.from('services').select('id, name, description, duration_minutes, price, category').in('id', serviceIds) : { data: [] },
        barbershopIds.length > 0 ? supabase.from('barbershops').select('id, name, address, phone').in('id', barbershopIds) : { data: [] }
      ])

      // Create lookup maps for better performance
      const clientsMap = new Map((clientsData.data || []).map(c => [c.id, c]))
      const barbersMap = new Map((barbersData.data || []).map(b => [b.id, b]))
      const servicesMap = new Map((servicesData.data || []).map(s => [s.id, s]))
      const barbershopsMap = new Map((barbershopsData.data || []).map(bs => [bs.id, bs]))

      // Merge related data with appointments
      appointments.forEach(appointment => {
        appointment.customer = clientsMap.get(appointment.customer_id) || null
        appointment.barber = barbersMap.get(appointment.barber_id) || null
        appointment.service = servicesMap.get(appointment.service_id) || null
        appointment.barbershop = barbershopsMap.get(appointment.barbershop_id) || null
      })
    }

    let countQuery = supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })

    if (barbershop_id) countQuery = countQuery.eq('barbershop_id', barbershop_id)
    if (barber_id) countQuery = countQuery.eq('barber_id', barber_id)
    if (client_id) countQuery = countQuery.eq('client_id', client_id)
    if (start_date) countQuery = countQuery.gte('scheduled_at', start_date)
    if (end_date) countQuery = countQuery.lte('scheduled_at', end_date)
    if (status) countQuery = countQuery.eq('status', status.toUpperCase())

    const { count, error: countError } = await countQuery

    if (countError) {
      dbLogger.error('Error getting appointments count', countError, {
        context: 'appointments_count',
        barbershop_id,
        barber_id,
        client_id
      })
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
    apiLogger.error('Unexpected error in appointments GET', error, {
      context: 'appointments_get_exception',
      endpoint: 'GET /api/appointments'
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    const validationResult = bookingSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const appointmentData = validationResult.data

    // VALIDATION: Check if barber can take appointments
    const { data: barberProfile, error: barberError } = await supabase
      .from('profiles')
      .select('can_take_appointments, is_active, role, full_name')
      .eq('id', appointmentData.barber_id)
      .single()

    if (barberError || !barberProfile) {
      return NextResponse.json({ 
        error: 'Barber not found' 
      }, { status: 404 })
    }

    if (!barberProfile.can_take_appointments) {
      return NextResponse.json({ 
        error: `${barberProfile.full_name || 'This staff member'} cannot take appointments. Please select a different service provider.`,
        details: 'Staff member has appointment capability disabled'
      }, { status: 403 })
    }

    if (!barberProfile.is_active) {
      return NextResponse.json({ 
        error: `${barberProfile.full_name || 'This staff member'} is currently inactive and cannot take appointments.`,
        details: 'Staff member is inactive'
      }, { status: 403 })
    }

    // CRITICAL FIX: Handle customer creation for walk-ins and new clients
    let finalClientId = appointmentData.client_id

    // If no client_id but we have client details, create a new customer
    if (!finalClientId && (appointmentData.client_name || appointmentData.client_phone || appointmentData.client_email)) {
      // Check if customer already exists by phone or email
      let existingCustomer = null
      
      if (appointmentData.client_phone) {
        const { data: customerByPhone } = await supabase
          .from('users')
          .select('id')
          .eq('phone', appointmentData.client_phone)
          .single()
        existingCustomer = customerByPhone
      }
      
      if (!existingCustomer && appointmentData.client_email) {
        const { data: customerByEmail } = await supabase
          .from('users')
          .select('id')
          .eq('email', appointmentData.client_email)
          .single()
        existingCustomer = customerByEmail
      }

      if (existingCustomer) {
        finalClientId = existingCustomer.id
      } else if (appointmentData.client_name) {
        // Create new customer
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: appointmentData.client_name,
            email: appointmentData.client_email,
            phone: appointmentData.client_phone,
            created_at: new Date().toISOString()
          })
          .select('id')
          .single()

        if (customerError) {
          dbLogger.error('Error creating customer during appointment creation', customerError, {
            context: 'customer_creation',
            client_email: validatedData.client_email,
            barbershop_id: validatedData.barbershop_id
          })
          return NextResponse.json({ 
            error: 'Failed to create customer record',
            details: customerError.message 
          }, { status: 500 })
        }

        finalClientId = newCustomer.id
      }
    }

    const total_amount = appointmentData.service_price + (appointmentData.tip_amount || 0)

    const conflictCheck = await supabase
      .from('appointments')
      .select('id, scheduled_at, duration_minutes')
      .eq('barber_id', appointmentData.barber_id)
      .eq('status', 'CONFIRMED')
      .neq('id', 'ignore') // For future use in updates

    if (conflictCheck.error) {
      dbLogger.error('Error checking appointment conflicts', conflictCheck.error, {
        context: 'appointment_conflict_check',
        barber_id: validatedData.barber_id,
        scheduled_at: validatedData.scheduled_at
      })
      return NextResponse.json({ error: 'Failed to check time conflicts' }, { status: 500 })
    }

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

    // CRITICAL FIX: Use proper customer_id and avoid PostgREST syntax issues
    const appointmentToInsert = {
      barbershop_id: appointmentData.barbershop_id,
      customer_id: finalClientId,
      barber_id: appointmentData.barber_id,
      service_id: appointmentData.service_id,
      scheduled_at: appointmentData.scheduled_at,
      duration_minutes: appointmentData.duration_minutes,
      service_price: appointmentData.service_price,
      tip_amount: appointmentData.tip_amount || 0,
      total_amount,
      notes: appointmentData.client_notes,
      status: 'CONFIRMED' // CRITICAL: Start as CONFIRMED for immediate business use
    }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert(appointmentToInsert)
      .select('*')
      .single()

    if (error) {
      dbLogger.error('Error creating appointment', error, {
        context: 'appointment_creation',
        barbershop_id: validatedData.barbershop_id,
        barber_id: validatedData.barber_id
      })
      return NextResponse.json({ error: 'Failed to create appointment', details: error.message }, { status: 500 })
    }

    // CRITICAL FIX: Fetch related data separately for reliable response
    if (appointment) {
      const [clientData, barberData, serviceData, barbershopData] = await Promise.all([
        finalClientId ? supabase.from('customers').select('id, full_name, email, phone').eq('id', finalClientId).single() : { data: null },
        supabase.from('profiles').select('id, full_name, email').eq('id', appointment.barber_id).single(),
        supabase.from('services').select('id, name, description, duration_minutes, price, category').eq('id', appointment.service_id).single(),
        supabase.from('barbershops').select('id, name, address, phone').eq('id', appointment.barbershop_id).single()
      ])

      appointment.client = clientData.data
      appointment.barber = barberData.data
      appointment.service = serviceData.data
      appointment.barbershop = barbershopData.data
    }

    return NextResponse.json({
      message: 'Appointment created successfully',
      appointment,
      // CRITICAL: Return info for immediate business operations
      status: 'confirmed',
      next_steps: 'Appointment is confirmed and ready for the customer'
    }, { status: 201 })

  } catch (error) {
    apiLogger.error('Unexpected error in appointments POST', error, {
      context: 'appointments_post_exception',
      endpoint: 'POST /api/appointments'
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
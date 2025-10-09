import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
export const runtime = 'edge'

export async function GET(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const barberId = searchParams.get('barber_id')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    // Development bypass for testing
    const isDevelopment = process.env.NODE_ENV === 'development'

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (!isDevelopment && (authError || !user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      )
    }

    // Use the first shop owner for development testing
    let userId = user?.id
    if (isDevelopment && !userId) {
      const { data: devUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'SHOP_OWNER')
        .limit(1)
        .single()
      userId = devUser?.id
    }

    // Get the user's profile to check role
    let profile = null
    if (userId) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      profile = profileData
    }

    // Check permissions (skip in development)
    if (!isDevelopment && (!profile || !['SHOP_OWNER', 'BARBER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role))) {
      return NextResponse.json(
        { error: 'Forbidden - Must be shop owner, barber, or admin' },
        { status: 403 }
      )
    }

    // Get the shop owned by this user
    const { data: shop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', userId)
      .single()

    if (!shop) {
      return NextResponse.json({
        appointments: [],
        barbers: [],
        services: [],
        metrics: {
          total_appointments: 0,
          completed_appointments: 0,
          cancelled_appointments: 0,
          revenue_total: 0
        }
      })
    }

    // STEP 1: Get services for this shop
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, price, duration_minutes, category, is_active')
      .eq('barbershop_id', shop.id)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (servicesError) {
      console.error('Error fetching services:', servicesError)
    }

    // STEP 2: Get barbers (staff) for this shop
    const { data: staffRelations } = await supabase
      .from('barbershop_staff')
      .select('user_id')
      .eq('barbershop_id', shop.id)
      .eq('is_active', true)

    let barbers = []
    if (staffRelations && staffRelations.length > 0) {
      const barberIds = staffRelations.map(s => s.user_id)
      const { data: barbersData } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .in('id', barberIds)
        .order('name', { ascending: true })

      barbers = barbersData || []
    }

    // STEP 3: Build appointments query with filters
    let appointmentsQuery = supabase
      .from('appointments')
      .select(`
        id,
        barbershop_id,
        client_id,
        barber_id,
        service_id,
        scheduled_at,
        duration_minutes,
        status,
        service_price,
        tip_amount,
        total_amount,
        client_name,
        client_phone,
        client_email,
        client_notes,
        barber_notes,
        created_at,
        updated_at
      `)
      .eq('barbershop_id', shop.id)

    // Apply date range filters
    if (startDate) {
      appointmentsQuery = appointmentsQuery.gte('scheduled_at', `${startDate}T00:00:00Z`)
    }
    if (endDate) {
      appointmentsQuery = appointmentsQuery.lte('scheduled_at', `${endDate}T23:59:59Z`)
    }

    // Apply barber filter
    if (barberId) {
      appointmentsQuery = appointmentsQuery.eq('barber_id', barberId)
    }

    // Apply status filter (map to database enum values)
    if (status) {
      // Map API status to database ENUM values
      const statusMap = {
        'scheduled': 'PENDING',
        'in_progress': 'PENDING', // No in_progress in DB, treat as pending
        'completed': 'COMPLETED',
        'cancelled': 'CANCELLED',
        'no_show': 'NO_SHOW'
      }
      const dbStatus = statusMap[status.toLowerCase()] || status.toUpperCase()
      appointmentsQuery = appointmentsQuery.eq('status', dbStatus)
    }

    // Apply pagination
    const offset = (page - 1) * limit
    appointmentsQuery = appointmentsQuery
      .order('scheduled_at', { ascending: true })
      .range(offset, offset + limit - 1)

    // Execute appointments query
    const { data: appointmentsRaw, error: appointmentsError } = await appointmentsQuery

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError)
      return NextResponse.json({
        appointments: [],
        barbers: barbers || [],
        services: services || [],
        metrics: {
          total_appointments: 0,
          completed_appointments: 0,
          cancelled_appointments: 0,
          revenue_total: 0
        }
      })
    }

    // STEP 4: Enrich appointments with related data
    const appointments = (appointmentsRaw || []).map(apt => {
      // Find related service
      const service = services?.find(s => s.id === apt.service_id)

      // Find related barber
      const barber = barbers?.find(b => b.id === apt.barber_id)

      // Map database appointment to API format
      return {
        id: apt.id,
        barbershop_id: apt.barbershop_id,
        customer_id: apt.client_id,
        barber_id: apt.barber_id,
        service_id: apt.service_id,
        appointment_date: apt.scheduled_at ? new Date(apt.scheduled_at).toISOString().split('T')[0] : null,
        start_time: apt.scheduled_at,
        end_time: apt.scheduled_at ? new Date(new Date(apt.scheduled_at).getTime() + apt.duration_minutes * 60000).toISOString() : null,
        status: apt.status?.toLowerCase() || 'pending',
        notes: apt.client_notes || apt.barber_notes || null,
        customer: {
          id: apt.client_id,
          name: apt.client_name,
          email: apt.client_email,
          phone: apt.client_phone
        },
        barber: barber ? {
          id: barber.id,
          full_name: barber.name,
          avatar_url: barber.avatar_url
        } : null,
        service: service ? {
          id: service.id,
          name: service.name,
          price: service.price,
          duration_minutes: service.duration_minutes
        } : null,
        created_at: apt.created_at,
        updated_at: apt.updated_at
      }
    })

    // STEP 5: Calculate metrics from real data
    const metrics = {
      total_appointments: appointments.length,
      completed_appointments: appointments.filter(a => a.status === 'completed').length,
      cancelled_appointments: appointments.filter(a => a.status === 'cancelled').length,
      revenue_total: appointments
        .filter(a => a.status === 'completed')
        .reduce((sum, a) => {
          // Use service price from appointment data
          const servicePrice = appointmentsRaw?.find(raw => raw.id === a.id)?.service_price || 0
          return sum + parseFloat(servicePrice)
        }, 0)
    }

    // STEP 6: Format barbers for FullCalendar resource grouping
    const barberResources = barbers.map(b => ({
      id: b.id,
      full_name: b.name,
      avatar_url: b.avatar_url
    }))

    return NextResponse.json({
      appointments,
      barbers: barberResources,
      services: services || [],
      metrics
    })

  } catch (error) {
    console.error('Error in /api/shop/schedule:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: isDevelopment ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Development bypass for testing
    const isDevelopment = process.env.NODE_ENV === 'development'

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (!isDevelopment && (authError || !user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      )
    }

    // Get appointment data from request
    const appointmentData = await request.json()

    // Validate required fields
    const requiredFields = ['customer_id', 'barber_id', 'service_id', 'appointment_date', 'start_time']
    const missingFields = requiredFields.filter(field => !appointmentData[field])

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    // Use the first shop owner for development testing
    let userId = user?.id
    if (isDevelopment && !userId) {
      const { data: devUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'SHOP_OWNER')
        .limit(1)
        .single()
      userId = devUser?.id
    }

    // Get the shop owned by this user
    const { data: shop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', userId)
      .single()

    if (!shop) {
      return NextResponse.json(
        { error: 'No shop found for this user' },
        { status: 404 }
      )
    }

    // Get service to calculate duration and price
    const { data: service } = await supabase
      .from('services')
      .select('duration_minutes, price')
      .eq('id', appointmentData.service_id)
      .eq('barbershop_id', shop.id)
      .single()

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      )
    }

    // Build scheduled_at timestamp
    const scheduledAt = `${appointmentData.appointment_date}T${appointmentData.start_time}`

    // Create new appointment
    const newAppointment = {
      barbershop_id: shop.id,
      client_id: appointmentData.customer_id,
      barber_id: appointmentData.barber_id,
      service_id: appointmentData.service_id,
      scheduled_at: scheduledAt,
      duration_minutes: service.duration_minutes,
      status: 'PENDING',
      service_price: service.price,
      tip_amount: 0,
      total_amount: service.price,
      client_notes: appointmentData.notes || null
    }

    // Insert appointment
    const { data: createdAppointment, error: insertError } = await supabase
      .from('appointments')
      .insert(newAppointment)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating appointment:', insertError)

      // Check for scheduling conflicts
      if (insertError.code === '23505' || insertError.message?.includes('conflict')) {
        return NextResponse.json(
          {
            error: 'Barber is not available during requested time',
            conflict_details: {
              conflicting_time: `${appointmentData.start_time}`
            }
          },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to create appointment' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      appointment: createdAppointment,
      message: 'Appointment created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating appointment:', error)
    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    )
  }
}

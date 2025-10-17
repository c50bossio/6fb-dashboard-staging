import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barbershop_id')

    if (!barbershopId) {
      return NextResponse.json(
        { error: 'barbershop_id is required' },
        { status: 400 }
      )
    }

    // Use local date to match how walk-ins are created
    const today = new Date().toLocaleDateString('en-CA')

    // Removed excessive logging to prevent console spam

    // Fetch ALL appointments (regular appointments, walk-ins, checked-in customers)
    const { data: allAppointments, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        customers (
          id,
          full_name,
          phone,
          email
        )
      `)
      .eq('barbershop_id', barbershopId)
      .gte('date', today)
      .in('status', ['confirmed', 'checked_in', 'WALK_IN_WAITING', 'WALK_IN_BEING_SERVED'])
      .order('created_at', { ascending: true })

    if (appointmentError) {
      console.error('[Unified Queue] Error fetching appointments:', appointmentError)
      throw appointmentError
    }

    // Log only on error or significant events

    // Fetch barber and service details separately to avoid PostgREST issues
    const barberIds = [...new Set(allAppointments.map(apt => apt.barber_id).filter(Boolean))]
    const serviceIds = [...new Set(allAppointments.map(apt => apt.service_id).filter(Boolean))]

    // Get barber info
    const { data: barbers } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', barberIds)

    // Get service info
    const { data: services } = await supabase
      .from('services')
      .select('id, name, price, duration_minutes')
      .in('id', serviceIds)

    // Process and enrich appointments
    const processedQueue = allAppointments.map((appointment, index) => {
      const customer = appointment.customers
      const barber = barbers?.find(b => b.id === appointment.barber_id)
      const service = services?.find(s => s.id === appointment.service_id)

      // Determine appointment type
      let type = 'appointment'
      if (appointment.status === 'WALK_IN_WAITING' || appointment.status === 'WALK_IN_BEING_SERVED') {
        type = 'walk_in'
      }

      // Calculate time display - handle different time field names
      let timeDisplay = 'Unknown'
      const timeField = appointment.start_time || appointment.time || appointment.appointment_time
      if (timeField) {
        try {
          const time = new Date(`2000-01-01 ${timeField}`)
          timeDisplay = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        } catch (e) {
          console.warn('[Unified Queue] Time parsing error:', e.message)
          timeDisplay = timeField.toString()
        }
      } else if (type === 'walk_in') {
        timeDisplay = 'Walk-in'
      }
      
      // Removed per-appointment logging to prevent console spam

      return {
        id: appointment.id,
        originalId: appointment.id,
        type: type,
        customer_name: customer?.full_name || 'Unknown Customer',
        customer_phone: customer?.phone,
        customer_email: customer?.email,
        service_name: service?.name || 'General Service',
        service_price: service?.price || 0,
        barber_name: barber?.full_name || 'Unassigned',
        barber_id: appointment.barber_id,
        time: timeDisplay,
        status: appointment.status,
        priority: appointment.queue_priority || (index + 1),
        duration_minutes: service?.duration_minutes || appointment.duration_minutes || 30,
        notes: appointment.notes,
        checked_in_at: appointment.checked_in_at,
        created_at: appointment.created_at
      }
    })

    // Sort by priority, then by created time for consistent ordering
    const sortedQueue = processedQueue.sort((a, b) => {
      // Priority first (lower numbers = higher priority)
      if (a.priority !== b.priority) {
        return (a.priority || 999) - (b.priority || 999)
      }
      // Then by creation time
      return new Date(a.created_at) - new Date(b.created_at)
    })

    // Only log significant events to prevent console spam

    return NextResponse.json({
      success: true,
      queue: sortedQueue,
      total_items: sortedQueue.length,
      summary: {
        appointments: sortedQueue.filter(item => item.type === 'appointment').length,
        walk_ins: sortedQueue.filter(item => item.type === 'walk_in').length,
        checked_in: sortedQueue.filter(item => item.status === 'checked_in').length
      }
    })

  } catch (error) {
    console.error('[Unified Queue] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch queue data' },
      { status: 500 }
    )
  }
}
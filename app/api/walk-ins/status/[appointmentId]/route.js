import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estimateSmartWaitTime } from '@/lib/service-duration-config.js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request, { params }) {
  try {
    const { appointmentId } = params

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      )
    }

    // Get appointment details with customer and barbershop info
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        customers (
          id,
          full_name,
          phone
        )
      `)
      .eq('id', appointmentId)
      .single()

    if (appointmentError || !appointment) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Get barbershop details
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id, name, address, phone')
      .eq('id', appointment.barbershop_id)
      .single()

    // Calculate current queue position if still waiting
    let currentQueuePosition = 1
    if (appointment.status === 'WALK_IN_WAITING') {
      const { count } = await supabase
        .from('appointments')
        .select('*', { count: 'exact' })
        .eq('barbershop_id', appointment.barbershop_id)
        .gte('date', new Date().toISOString().split('T')[0])
        .eq('status', 'WALK_IN_WAITING')
        .lt('created_at', appointment.created_at)

      currentQueuePosition = (count || 0) + 1
    }

    // Get service name if service_id exists
    let serviceName = 'Walk-in Service'
    if (appointment.service_id) {
      const { data: service } = await supabase
        .from('services')
        .select('name')
        .eq('id', appointment.service_id)
        .single()
      
      if (service) {
        serviceName = service.name
      }
    }

    // Calculate smart wait time if still waiting
    let waitTimeInfo = null
    if (appointment.status === 'WALK_IN_WAITING') {
      const waitTimeEstimation = estimateSmartWaitTime(serviceName, currentQueuePosition)
      waitTimeInfo = {
        estimated_wait_minutes: waitTimeEstimation.estimatedWaitMinutes,
        service_duration: waitTimeEstimation.serviceDuration,
        active_barbers: waitTimeEstimation.activeBarbers
      }
    }

    // Format response
    const statusResponse = {
      id: appointment.id,
      customer_name: appointment.customers?.full_name || 'Walk-in Customer',
      service_name: serviceName,
      status: appointment.status,
      queue_position: currentQueuePosition,
      date: appointment.date,
      time: appointment.time,
      created_at: appointment.created_at,
      updated_at: appointment.updated_at,
      notes: appointment.notes,
      barbershop: barbershop ? {
        name: barbershop.name,
        address: barbershop.address,
        phone: barbershop.phone
      } : null,
      ...waitTimeInfo // Include smart wait time information if available
    }

    return NextResponse.json({
      success: true,
      appointment: statusResponse
    })

  } catch (error) {
    console.error('Walk-in status error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get walk-in status' },
      { status: 500 }
    )
  }
}